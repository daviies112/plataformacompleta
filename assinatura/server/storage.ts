import { db } from "./db";
import { users, contracts, signatureLogs, auditTrail } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  type User,
  type Contract,
  type SignatureLog,
  type AuditTrail,
  type InsertUser,
  type InsertContract,
  type InsertSignatureLog,
  type InsertAuditTrail,
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByCpf(cpf: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  upsertUser(user: InsertUser): Promise<User>;
  
  getAllContracts(): Promise<Contract[]>;
  getContract(id: string): Promise<Contract | undefined>;
  getContractByToken(token: string): Promise<Contract | undefined>;
  createContract(contract: InsertContract): Promise<Contract>;
  updateContract(id: string, data: Partial<InsertContract>): Promise<Contract | undefined>;
  
  createSignatureLog(log: InsertSignatureLog): Promise<SignatureLog>;
  createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByCpf(cpf: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.cpf, cpf)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async upsertUser(user: InsertUser): Promise<User> {
    const existing = await this.getUserByCpf(user.cpf);
    if (existing) {
      const result = await db.update(users)
        .set(user)
        .where(eq(users.cpf, user.cpf))
        .returning();
      return result[0];
    }
    return this.createUser(user);
  }

  async getAllContracts(): Promise<Contract[]> {
    return db.select().from(contracts).orderBy(contracts.created_at);
  }

  async getContract(id: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.id, id)).limit(1);
    return result[0];
  }

  async getContractByToken(token: string): Promise<Contract | undefined> {
    const result = await db.select().from(contracts).where(eq(contracts.access_token, token)).limit(1);
    return result[0];
  }

  async createContract(contract: InsertContract): Promise<Contract> {
    const result = await db.insert(contracts).values(contract).returning();
    return result[0];
  }

  async updateContract(id: string, updateData: Partial<InsertContract>): Promise<Contract | undefined> {
    const result = await db.update(contracts)
      .set(updateData)
      .where(eq(contracts.id, id))
      .returning();
    return result[0];
  }

  async createSignatureLog(log: InsertSignatureLog): Promise<SignatureLog> {
    const result = await db.insert(signatureLogs).values(log).returning();
    return result[0];
  }

  async createAuditTrail(audit: InsertAuditTrail): Promise<AuditTrail> {
    const result = await db.insert(auditTrail).values(audit).returning();
    return result[0];
  }
}

export const storage = new DatabaseStorage();
