import { db } from './db.js';
import { forms, formSubmissions, formTemplates, completionPages, appSettings, configurationsWhatsapp, leads, formularioSessoes, leadHistorico, InsertForm, Form, InsertFormSubmission, FormSubmission, InsertFormTemplate, FormTemplate, InsertCompletionPage, CompletionPage, InsertAppSettings, AppSettings, InsertConfigurationWhatsapp, ConfigurationWhatsapp, InsertLead, Lead, InsertFormularioSessao, FormularioSessao, InsertLeadHistorico, LeadHistorico } from "../../shared/db-schema";
import { eq, desc } from 'drizzle-orm';

export interface IStorage {
  // Forms
  getForms(): Promise<Form[]>;
  getFormById(id: string): Promise<Form | null>;
  createForm(form: InsertForm): Promise<Form>;
  updateForm(id: string, form: Partial<InsertForm>): Promise<Form>;
  deleteForm(id: string): Promise<void>;
  
  // Form Submissions
  getAllSubmissions(): Promise<FormSubmission[]>;
  getFormSubmissions(formId: string): Promise<FormSubmission[]>;
  createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission>;
  
  // Form Templates
  getFormTemplates(): Promise<FormTemplate[]>;
  getFormTemplateById(id: string): Promise<FormTemplate | null>;
  createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate>;
  
  // Completion Pages
  getCompletionPages(): Promise<CompletionPage[]>;
  getCompletionPageById(id: string): Promise<CompletionPage | null>;
  createCompletionPage(page: InsertCompletionPage): Promise<CompletionPage>;
  updateCompletionPage(id: string, page: Partial<InsertCompletionPage>): Promise<CompletionPage>;
  deleteCompletionPage(id: string): Promise<void>;
  
  // App Settings
  getAppSettings(): Promise<AppSettings | null>;
  saveAppSettings(settings: InsertAppSettings): Promise<AppSettings>;
  
  // WhatsApp Configuration
  getConfiguration(tenantId: string): Promise<ConfigurationWhatsapp | undefined>;
  setConfiguration(config: InsertConfigurationWhatsapp): Promise<ConfigurationWhatsapp>;
  
  // Leads
  getLeads(): Promise<Lead[]>;
  getLeadByTelefone(telefoneNormalizado: string): Promise<Lead | null>;
  getLeadByWhatsappId(whatsappId: string): Promise<Lead | null>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead>;
  
  // Formulario Sessoes
  createSessao(sessao: InsertFormularioSessao): Promise<FormularioSessao>;
  getSessaoByToken(token: string): Promise<FormularioSessao | null>;
  getSessoesByLeadId(leadId: string): Promise<FormularioSessao[]>;
  updateSessao(id: string, sessao: Partial<InsertFormularioSessao>): Promise<FormularioSessao>;
  
  // Lead Historico
  createHistorico(historico: InsertLeadHistorico): Promise<LeadHistorico>;
  getHistoricoByLeadId(leadId: string): Promise<LeadHistorico[]>;
}

export class DatabaseStorage implements IStorage {
  async getForms(): Promise<Form[]> {
    return await db.select().from(forms).orderBy(desc(forms.createdAt));
  }

  async getFormById(id: string): Promise<Form | null> {
    const result = await db.select().from(forms).where(eq(forms.id, id));
    return result[0] || null;
  }

  async createForm(form: InsertForm): Promise<Form> {
    const result = await db.insert(forms).values(form).returning();
    return result[0];
  }

  async updateForm(id: string, form: Partial<InsertForm>): Promise<Form> {
    const result = await db.update(forms)
      .set({ ...form, updatedAt: new Date() })
      .where(eq(forms.id, id))
      .returning();
    return result[0];
  }

  async deleteForm(id: string): Promise<void> {
    await db.delete(forms).where(eq(forms.id, id));
  }

  async getAllSubmissions(): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions).orderBy(desc(formSubmissions.createdAt));
  }

  async getFormSubmissions(formId: string): Promise<FormSubmission[]> {
    return await db.select().from(formSubmissions)
      .where(eq(formSubmissions.formId, formId))
      .orderBy(desc(formSubmissions.createdAt));
  }

  async createFormSubmission(submission: any): Promise<FormSubmission> {
    const result = await db.insert(formSubmissions).values(submission).returning();
    return result[0];
  }

  async getFormTemplates(): Promise<FormTemplate[]> {
    return await db.select().from(formTemplates).orderBy(desc(formTemplates.createdAt));
  }

  async getFormTemplateById(id: string): Promise<FormTemplate | null> {
    const result = await db.select().from(formTemplates).where(eq(formTemplates.id, id));
    return result[0] || null;
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    const result = await db.insert(formTemplates).values(template).returning();
    return result[0];
  }

  async getCompletionPages(): Promise<CompletionPage[]> {
    return await db.select().from(completionPages).orderBy(desc(completionPages.createdAt));
  }

  async getCompletionPageById(id: string): Promise<CompletionPage | null> {
    const result = await db.select().from(completionPages).where(eq(completionPages.id, id));
    return result[0] || null;
  }

  async createCompletionPage(page: InsertCompletionPage): Promise<CompletionPage> {
    const result = await db.insert(completionPages).values(page).returning();
    return result[0];
  }

  async updateCompletionPage(id: string, page: Partial<InsertCompletionPage>): Promise<CompletionPage> {
    const result = await db.update(completionPages)
      .set({ ...page, updatedAt: new Date() })
      .where(eq(completionPages.id, id))
      .returning();
    return result[0];
  }

  async deleteCompletionPage(id: string): Promise<void> {
    await db.delete(completionPages).where(eq(completionPages.id, id));
  }

  async getAppSettings(): Promise<AppSettings | null> {
    const result = await db.select().from(appSettings).limit(1);
    return result[0] || null;
  }

  async saveAppSettings(settings: InsertAppSettings): Promise<AppSettings> {
    const existing = await this.getAppSettings();
    
    if (existing) {
      const result = await db.update(appSettings)
        .set({ ...settings, updatedAt: new Date() })
        .where(eq(appSettings.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(appSettings).values(settings).returning();
      return result[0];
    }
  }

  // ============================================================================
  // WHATSAPP PLATFORM STORAGE - Configuration methods
  // ============================================================================

  async getConfiguration(tenantId: string): Promise<ConfigurationWhatsapp | undefined> {
    const result = await db.select()
      .from(configurationsWhatsapp)
      .where(eq(configurationsWhatsapp.tenantId, tenantId))
      .limit(1);
    return result[0];
  }

  async setConfiguration(config: InsertConfigurationWhatsapp): Promise<ConfigurationWhatsapp> {
    const existing = await this.getConfiguration(config.tenantId || "default");
    
    if (existing) {
      const result = await db.update(configurationsWhatsapp)
        .set({ 
          ...config, 
          updatedAtWhatsapp: new Date() 
        })
        .where(eq(configurationsWhatsapp.id, existing.id))
        .returning();
      return result[0];
    } else {
      const result = await db.insert(configurationsWhatsapp)
        .values(config)
        .returning();
      return result[0];
    }
  }

  // ============================================================================
  // LEADS STORAGE - Sistema de Qualificação
  // ============================================================================

  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLeadByTelefone(telefoneNormalizado: string): Promise<Lead | null> {
    const result = await db.select().from(leads).where(eq(leads.telefoneNormalizado, telefoneNormalizado));
    return result[0] || null;
  }

  async getLeadByWhatsappId(whatsappId: string): Promise<Lead | null> {
    const result = await db.select().from(leads).where(eq(leads.whatsappId, whatsappId));
    return result[0] || null;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const result = await db.insert(leads).values(lead).returning();
    return result[0];
  }

  async updateLead(id: string, lead: Partial<InsertLead>): Promise<Lead> {
    const result = await db.update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return result[0];
  }

  // ============================================================================
  // FORMULARIO SESSOES STORAGE
  // ============================================================================

  async createSessao(sessao: InsertFormularioSessao): Promise<FormularioSessao> {
    const result = await db.insert(formularioSessoes).values(sessao).returning();
    return result[0];
  }

  async getSessaoByToken(token: string): Promise<FormularioSessao | null> {
    const result = await db.select().from(formularioSessoes).where(eq(formularioSessoes.token, token));
    return result[0] || null;
  }

  async getSessoesByLeadId(leadId: string): Promise<FormularioSessao[]> {
    return await db.select().from(formularioSessoes)
      .where(eq(formularioSessoes.leadId, leadId))
      .orderBy(desc(formularioSessoes.createdAt));
  }

  async updateSessao(id: string, sessao: Partial<InsertFormularioSessao>): Promise<FormularioSessao> {
    const result = await db.update(formularioSessoes)
      .set({ ...sessao, updatedAt: new Date() })
      .where(eq(formularioSessoes.id, id))
      .returning();
    return result[0];
  }

  // ============================================================================
  // LEAD HISTORICO STORAGE
  // ============================================================================

  async createHistorico(historico: InsertLeadHistorico): Promise<LeadHistorico> {
    const result = await db.insert(leadHistorico).values(historico).returning();
    return result[0];
  }

  async getHistoricoByLeadId(leadId: string): Promise<LeadHistorico[]> {
    return await db.select().from(leadHistorico)
      .where(eq(leadHistorico.leadId, leadId))
      .orderBy(desc(leadHistorico.createdAt));
  }
}

export const storage = new DatabaseStorage();
