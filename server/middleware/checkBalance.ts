import { Request, Response, NextFunction } from 'express';
import { walletService } from '../services/walletService';

export interface WalletRequest extends Request {
  wallet?: {
    id: string;
    tenantId: string;
    balance: number;
    isFrozen: boolean;
  };
  servicePrice?: number;
  serviceName?: string;
}

export const checkBalance = (serviceCode: string) => {
  return async (req: WalletRequest, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).user?.tenantId;
      
      if (!tenantId) {
        return res.status(401).json({
          error: 'UNAUTHORIZED',
          message: 'Usuário não autenticado',
        });
      }

      const price = await walletService.getServicePrice(serviceCode);
      
      if (price === null) {
        console.warn(`[checkBalance] Service ${serviceCode} not configured, allowing request`);
        return next();
      }

      const wallet = await walletService.getWallet(tenantId);
      
      if (wallet.isFrozen) {
        return res.status(403).json({
          error: 'WALLET_FROZEN',
          message: 'Sua carteira está congelada. Entre em contato com o suporte.',
        });
      }

      const currentBalance = parseFloat(wallet.balance);
      
      if (currentBalance < price) {
        return res.status(402).json({
          error: 'INSUFFICIENT_FUNDS',
          message: 'Saldo insuficiente para realizar esta operação.',
          required: price,
          current: currentBalance,
          serviceCode,
        });
      }

      req.wallet = {
        id: wallet.id,
        tenantId: wallet.tenantId,
        balance: currentBalance,
        isFrozen: wallet.isFrozen,
      };
      req.servicePrice = price;
      req.serviceName = serviceCode;

      next();
    } catch (error: any) {
      console.error('[checkBalance] Error:', error);
      return res.status(500).json({
        error: 'WALLET_ERROR',
        message: 'Erro ao verificar saldo',
      });
    }
  };
};

export const debitAfterSuccess = async (
  tenantId: string,
  serviceCode: string,
  description: string,
  referenceId?: string,
  metadata?: Record<string, any>
): Promise<boolean> => {
  try {
    const price = await walletService.getServicePrice(serviceCode);
    
    if (price === null) {
      console.warn(`[debitAfterSuccess] Service ${serviceCode} not configured, skipping debit`);
      return true;
    }

    const result = await walletService.debitFunds(
      tenantId,
      price,
      description,
      referenceId,
      serviceCode,
      metadata
    );

    return result.success;
  } catch (error) {
    console.error('[debitAfterSuccess] Error:', error);
    return false;
  }
};

export const checkBalanceSimple = async (
  tenantId: string,
  serviceCode: string
): Promise<{ 
  sufficient: boolean; 
  price: number; 
  balance: number; 
  error?: string 
}> => {
  try {
    const price = await walletService.getServicePrice(serviceCode);
    
    if (price === null) {
      return { sufficient: true, price: 0, balance: 0 };
    }

    const wallet = await walletService.getWallet(tenantId);
    
    if (wallet.isFrozen) {
      return { 
        sufficient: false, 
        price, 
        balance: parseFloat(wallet.balance),
        error: 'WALLET_FROZEN'
      };
    }

    const balance = parseFloat(wallet.balance);
    
    return {
      sufficient: balance >= price,
      price,
      balance,
    };
  } catch (error: any) {
    console.error('[checkBalanceSimple] Error:', error);
    return { 
      sufficient: false, 
      price: 0, 
      balance: 0,
      error: error.message 
    };
  }
};
