import { db } from "../db";
import { kanbanLeads, type InsertKanbanLead, type KanbanLead } from "../../shared/db-schema";
import { eq } from "drizzle-orm";

export interface IKanbanStorage {
  getAllLeads(): Promise<KanbanLead[]>;
  getLead(id: string): Promise<KanbanLead | undefined>;
  createLead(lead: InsertKanbanLead): Promise<KanbanLead>;
  updateLead(id: string, lead: Partial<InsertKanbanLead>): Promise<KanbanLead | undefined>;
  deleteLead(id: string): Promise<boolean>;
}

export class KanbanStorage implements IKanbanStorage {
  async getAllLeads(): Promise<KanbanLead[]> {
    if (!db) {
      console.warn('Database not available, returning empty array');
      return [];
    }

    try {
      const leads = await db.select().from(kanbanLeads);
      return leads;
    } catch (error) {
      console.error('Error fetching kanban leads:', error);
      return [];
    }
  }

  async getLead(id: string): Promise<KanbanLead | undefined> {
    if (!db) {
      console.warn('Database not available');
      return undefined;
    }

    try {
      const [lead] = await db
        .select()
        .from(kanbanLeads)
        .where(eq(kanbanLeads.id, id))
        .limit(1);
      
      return lead;
    } catch (error) {
      console.error('Error fetching kanban lead:', error);
      return undefined;
    }
  }

  async createLead(lead: InsertKanbanLead): Promise<KanbanLead> {
    if (!db) {
      throw new Error('Database not available');
    }

    try {
      const [newLead] = await db
        .insert(kanbanLeads)
        .values(lead)
        .returning();
      
      return newLead;
    } catch (error) {
      console.error('Error creating kanban lead:', error);
      throw error;
    }
  }

  async updateLead(id: string, lead: Partial<InsertKanbanLead>): Promise<KanbanLead | undefined> {
    if (!db) {
      console.warn('Database not available');
      return undefined;
    }

    try {
      const [updatedLead] = await db
        .update(kanbanLeads)
        .set({
          ...lead,
          updatedAt: new Date(),
        })
        .where(eq(kanbanLeads.id, id))
        .returning();
      
      return updatedLead;
    } catch (error) {
      console.error('Error updating kanban lead:', error);
      return undefined;
    }
  }

  async deleteLead(id: string): Promise<boolean> {
    if (!db) {
      console.warn('Database not available');
      return false;
    }

    try {
      const result = await db
        .delete(kanbanLeads)
        .where(eq(kanbanLeads.id, id));
      
      return true;
    } catch (error) {
      console.error('Error deleting kanban lead:', error);
      return false;
    }
  }
}

// Export singleton instance
export const kanbanStorage = new KanbanStorage();
