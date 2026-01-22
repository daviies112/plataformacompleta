import { db } from '../db';
import { wallets, walletTransactions, servicePrices } from '../../shared/db-schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';

// Idempotency cache to prevent duplicate webhook credits
const processedWebhookEvents = new Map<string, { timestamp: number; result: any }>();
const WEBHOOK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
import type { Wallet, WalletTransaction, WalletTransactionType, WalletTransactionStatus } from '../../shared/db-schema';

export interface DebitResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

export interface CreditResult {
  success: boolean;
  transactionId?: string;
  newBalance?: number;
  error?: string;
}

export interface TransactionFilters {
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

class WalletService {
  async getOrCreateWallet(tenantId: string): Promise<Wallet> {
    const existing = await db.select().from(wallets).where(eq(wallets.tenantId, tenantId)).limit(1);
    
    if (existing.length > 0) {
      return existing[0];
    }

    const [newWallet] = await db.insert(wallets).values({
      tenantId,
      balance: "0.00",
      currency: "BRL",
    }).returning();

    console.log(`[WalletService] Created new wallet for tenant ${tenantId}`);
    return newWallet;
  }

  async getBalance(tenantId: string): Promise<number> {
    const wallet = await this.getOrCreateWallet(tenantId);
    return parseFloat(wallet.balance);
  }

  async getWallet(tenantId: string): Promise<Wallet> {
    return this.getOrCreateWallet(tenantId);
  }

  async checkBalance(tenantId: string, requiredAmount: number): Promise<{ sufficient: boolean; currentBalance: number; required: number }> {
    const balance = await this.getBalance(tenantId);
    return {
      sufficient: balance >= requiredAmount,
      currentBalance: balance,
      required: requiredAmount,
    };
  }

  async addFunds(
    tenantId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    type: WalletTransactionType = 'CREDIT',
    metadata?: Record<string, any>
  ): Promise<CreditResult> {
    try {
      const wallet = await this.getOrCreateWallet(tenantId);
      
      if (wallet.isFrozen) {
        return { success: false, error: 'Carteira congelada' };
      }

      const currentBalance = parseFloat(wallet.balance);
      const newBalance = currentBalance + amount;

      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type,
        amount: amount.toFixed(2),
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        referenceId,
        referenceType,
        status: 'COMPLETED',
        metadata,
      }).returning();

      await db.update(wallets)
        .set({ 
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));

      console.log(`[WalletService] Added R$ ${amount.toFixed(2)} to tenant ${tenantId}. New balance: R$ ${newBalance.toFixed(2)}`);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };
    } catch (error: any) {
      console.error(`[WalletService] Error adding funds:`, error);
      return { success: false, error: error.message };
    }
  }

  async debitFunds(
    tenantId: string,
    amount: number,
    description: string,
    referenceId?: string,
    referenceType?: string,
    metadata?: Record<string, any>
  ): Promise<DebitResult> {
    try {
      const wallet = await this.getOrCreateWallet(tenantId);
      
      if (wallet.isFrozen) {
        return { success: false, error: 'Carteira congelada' };
      }

      const currentBalance = parseFloat(wallet.balance);
      
      if (currentBalance < amount) {
        return { 
          success: false, 
          error: `Saldo insuficiente. Necessário: R$ ${amount.toFixed(2)}, Disponível: R$ ${currentBalance.toFixed(2)}` 
        };
      }

      const newBalance = currentBalance - amount;

      // ATOMIC UPDATE: Only debit if balance is still sufficient (prevents race conditions)
      const updateResult = await db.update(wallets)
        .set({ 
          balance: newBalance.toFixed(2),
          updatedAt: new Date(),
        })
        .where(and(
          eq(wallets.id, wallet.id),
          sql`CAST(balance AS NUMERIC) >= ${amount}` // Atomic check
        ))
        .returning();

      if (updateResult.length === 0) {
        // Another transaction already debited, re-check balance
        const freshWallet = await db.select().from(wallets).where(eq(wallets.id, wallet.id)).limit(1);
        const freshBalance = freshWallet[0] ? parseFloat(freshWallet[0].balance) : 0;
        return { 
          success: false, 
          error: `Saldo insuficiente. Necessário: R$ ${amount.toFixed(2)}, Disponível: R$ ${freshBalance.toFixed(2)}` 
        };
      }

      // Record transaction after successful balance update
      const [transaction] = await db.insert(walletTransactions).values({
        walletId: wallet.id,
        type: 'DEBIT',
        amount: amount.toFixed(2),
        balanceBefore: currentBalance.toFixed(2),
        balanceAfter: newBalance.toFixed(2),
        description,
        referenceId,
        referenceType,
        status: 'COMPLETED',
        metadata,
      }).returning();

      console.log(`[WalletService] Debited R$ ${amount.toFixed(2)} from tenant ${tenantId}. New balance: R$ ${newBalance.toFixed(2)}`);

      await this.checkAutoRecharge(wallet.id, newBalance);

      return {
        success: true,
        transactionId: transaction.id,
        newBalance,
      };
    } catch (error: any) {
      console.error(`[WalletService] Error debiting funds:`, error);
      return { success: false, error: error.message };
    }
  }

  async refund(
    tenantId: string,
    amount: number,
    description: string,
    originalTransactionId?: string,
    metadata?: Record<string, any>
  ): Promise<CreditResult> {
    return this.addFunds(
      tenantId,
      amount,
      description,
      originalTransactionId,
      'REFUND',
      'REFUND',
      metadata
    );
  }

  async getTransactions(
    tenantId: string,
    filters: TransactionFilters = {}
  ): Promise<{ transactions: WalletTransaction[]; total: number }> {
    const wallet = await this.getOrCreateWallet(tenantId);
    
    let query = db.select().from(walletTransactions).where(eq(walletTransactions.walletId, wallet.id));

    const conditions = [eq(walletTransactions.walletId, wallet.id)];
    
    if (filters.type) {
      conditions.push(eq(walletTransactions.type, filters.type));
    }
    if (filters.status) {
      conditions.push(eq(walletTransactions.status, filters.status));
    }
    if (filters.startDate) {
      conditions.push(gte(walletTransactions.createdAt, filters.startDate));
    }
    if (filters.endDate) {
      conditions.push(lte(walletTransactions.createdAt, filters.endDate));
    }

    const transactions = await db.select()
      .from(walletTransactions)
      .where(and(...conditions))
      .orderBy(desc(walletTransactions.createdAt))
      .limit(filters.limit || 50)
      .offset(filters.offset || 0);

    const [countResult] = await db.select({ count: sql<number>`count(*)` })
      .from(walletTransactions)
      .where(and(...conditions));

    return {
      transactions,
      total: Number(countResult?.count || 0),
    };
  }

  async freezeWallet(tenantId: string, frozen: boolean = true): Promise<boolean> {
    try {
      const wallet = await this.getOrCreateWallet(tenantId);
      await db.update(wallets)
        .set({ isFrozen: frozen, updatedAt: new Date() })
        .where(eq(wallets.id, wallet.id));
      
      console.log(`[WalletService] Wallet ${frozen ? 'frozen' : 'unfrozen'} for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error(`[WalletService] Error freezing wallet:`, error);
      return false;
    }
  }

  async configureAutoRecharge(
    tenantId: string,
    enabled: boolean,
    triggerAmount?: number,
    rechargeAmount?: number,
    cardToken?: string
  ): Promise<boolean> {
    try {
      const wallet = await this.getOrCreateWallet(tenantId);
      await db.update(wallets)
        .set({
          autoRecharge: enabled,
          autoRechargeTrigger: triggerAmount?.toFixed(2),
          autoRechargeAmount: rechargeAmount?.toFixed(2),
          savedCardToken: cardToken,
          updatedAt: new Date(),
        })
        .where(eq(wallets.id, wallet.id));
      
      console.log(`[WalletService] Auto-recharge ${enabled ? 'enabled' : 'disabled'} for tenant ${tenantId}`);
      return true;
    } catch (error) {
      console.error(`[WalletService] Error configuring auto-recharge:`, error);
      return false;
    }
  }

  private async checkAutoRecharge(walletId: string, currentBalance: number): Promise<void> {
    try {
      const [wallet] = await db.select().from(wallets).where(eq(wallets.id, walletId));
      
      if (!wallet?.autoRecharge || !wallet.autoRechargeTrigger || !wallet.autoRechargeAmount || !wallet.savedCardToken) {
        return;
      }

      const trigger = parseFloat(wallet.autoRechargeTrigger);
      if (currentBalance < trigger) {
        console.log(`[WalletService] Auto-recharge triggered for wallet ${walletId}. Balance: R$ ${currentBalance.toFixed(2)} < Trigger: R$ ${trigger.toFixed(2)}`);
      }
    } catch (error) {
      console.error(`[WalletService] Error checking auto-recharge:`, error);
    }
  }

  async getServicePrice(serviceCode: string): Promise<number | null> {
    const [service] = await db.select()
      .from(servicePrices)
      .where(and(
        eq(servicePrices.serviceCode, serviceCode),
        eq(servicePrices.isActive, true)
      ));
    
    return service ? parseFloat(service.price) : null;
  }

  async getAllServicePrices(): Promise<typeof servicePrices.$inferSelect[]> {
    return db.select()
      .from(servicePrices)
      .where(eq(servicePrices.isActive, true));
  }

  async updateServicePrice(serviceCode: string, price: number): Promise<boolean> {
    try {
      await db.update(servicePrices)
        .set({ price: price.toFixed(2), updatedAt: new Date() })
        .where(eq(servicePrices.serviceCode, serviceCode));
      return true;
    } catch (error) {
      console.error(`[WalletService] Error updating service price:`, error);
      return false;
    }
  }

  async createServicePrice(
    serviceCode: string,
    serviceName: string,
    price: number,
    costPrice: number = 0,
    description?: string
  ): Promise<boolean> {
    try {
      await db.insert(servicePrices).values({
        serviceCode,
        serviceName,
        price: price.toFixed(2),
        costPrice: costPrice.toFixed(2),
        description,
      }).onConflictDoUpdate({
        target: servicePrices.serviceCode,
        set: {
          serviceName,
          price: price.toFixed(2),
          costPrice: costPrice.toFixed(2),
          description,
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      console.error(`[WalletService] Error creating service price:`, error);
      return false;
    }
  }

  async initializeDefaultPrices(): Promise<void> {
    // Only CPF consultation is charged per-use
    // Shipping uses dynamic pricing (TotalExpress cost + 35% margin)
    // Other services are included in the monthly subscription
    const defaultPrices = [
      { code: 'CPF_CONSULTA', name: 'Consulta CPF', price: 2.00, cost: 0.17, desc: 'Consulta de dados e validação de CPF via BigDataCorp' },
    ];

    for (const p of defaultPrices) {
      await this.createServicePrice(p.code, p.name, p.price, p.cost, p.desc);
    }
    
    console.log('[WalletService] Default service prices initialized (CPF only - other services included in subscription)');
  }

  // Calculate shipping price with 35% margin
  calculateShippingPrice(costPrice: number): number {
    const margin = 0.35; // 35% margin
    return costPrice * (1 + margin);
  }

  // Idempotency check for webhook events
  isWebhookProcessed(eventId: string): boolean {
    const cached = processedWebhookEvents.get(eventId);
    if (cached) {
      // Clean up old entries
      const now = Date.now();
      for (const [key, value] of processedWebhookEvents) {
        if (now - value.timestamp > WEBHOOK_CACHE_TTL) {
          processedWebhookEvents.delete(key);
        }
      }
      return true;
    }
    return false;
  }

  markWebhookProcessed(eventId: string, result: any): void {
    processedWebhookEvents.set(eventId, { timestamp: Date.now(), result });
  }

  getWebhookResult(eventId: string): any {
    return processedWebhookEvents.get(eventId)?.result;
  }
}

export const walletService = new WalletService();
