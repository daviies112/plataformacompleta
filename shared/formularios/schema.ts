import { pgTable, text, integer, boolean, timestamp, jsonb, uuid, index, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const completionPages = pgTable("completion_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  title: text("title").notNull().default("Obrigado!"),
  subtitle: text("subtitle"),
  successMessage: text("success_message").notNull().default("Parabéns! Você está qualificado. Entraremos em contato em breve."),
  failureMessage: text("failure_message").notNull().default("Obrigado pela sua participação. Infelizmente você não atingiu a pontuação mínima."),
  showScore: boolean("show_score").default(true),
  showTierBadge: boolean("show_tier_badge").default(true),
  logo: text("logo"),
  logoAlign: text("logo_align").default("center"),
  successIconColor: text("success_icon_color").default("hsl(142, 71%, 45%)"),
  failureIconColor: text("failure_icon_color").default("hsl(0, 84%, 60%)"),
  successIconImage: text("success_icon_image"),
  failureIconImage: text("failure_icon_image"),
  successIconType: text("success_icon_type").default("check-circle"),
  failureIconType: text("failure_icon_type").default("x-circle"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  customContent: text("custom_content"),
  designConfig: jsonb("design_config").default(sql`'{
    "colors": {
      "primary": "hsl(221, 83%, 53%)",
      "secondary": "hsl(210, 40%, 96%)",
      "background": "hsl(0, 0%, 100%)",
      "text": "hsl(222, 47%, 11%)"
    },
    "typography": {
      "fontFamily": "Inter",
      "titleSize": "2xl",
      "textSize": "base"
    },
    "spacing": "comfortable"
  }'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdAtIdx: index("idx_completion_pages_created_at").on(table.createdAt.desc()),
}));

export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  questions: jsonb("questions").notNull(),
  passingScore: integer("passing_score").notNull().default(0),
  scoreTiers: jsonb("score_tiers"),
  welcomeConfig: jsonb("welcome_config").default(sql`'{
    "title": "Bem-vindo!",
    "description": "Por favor, preencha o formulário a seguir.",
    "imageUrl": null
  }'::jsonb`),
  designConfig: jsonb("design_config").default(sql`'{
    "colors": {
      "primary": "hsl(221, 83%, 53%)",
      "secondary": "hsl(210, 40%, 96%)",
      "background": "hsl(0, 0%, 100%)",
      "text": "hsl(222, 47%, 11%)"
    },
    "typography": {
      "fontFamily": "Inter",
      "titleSize": "2xl",
      "textSize": "base"
    },
    "logo": null,
    "spacing": "comfortable"
  }'::jsonb`),
  completionPageId: uuid("completion_page_id").references(() => completionPages.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdAtIdx: index("idx_forms_created_at").on(table.createdAt.desc()),
  completionPageIdx: index("idx_forms_completion_page").on(table.completionPageId),
}));

export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  totalScore: integer("total_score").notNull(),
  passed: boolean("passed").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactCpf: text("contact_cpf"),
  tenantId: text("tenant_id"),
  instagramHandle: text("instagram_handle"),
  birthDate: text("birth_date"),
  addressCep: text("address_cep"),
  addressStreet: text("address_street"),
  addressNumber: text("address_number"),
  addressComplement: text("address_complement"),
  addressNeighborhood: text("address_neighborhood"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  processadoWhatsapp: boolean("processado_whatsapp").default(false),
  agendouReuniao: boolean("agendou_reuniao").default(false),
  dataAgendamento: timestamp("data_agendamento", { withTimezone: true }),
  followUpCount: integer("follow_up_count").default(0),
  ultimoFollowUp: timestamp("ultimo_follow_up", { withTimezone: true }),
  followUpEncerrado: boolean("follow_up_encerrado").default(false),
  participantId: text("participant_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  formIdIdx: index("idx_submissions_form_id").on(table.formId),
  createdAtIdx: index("idx_submissions_created_at").on(table.createdAt.desc()),
  cpfIdx: index("idx_form_submissions_cpf").on(table.contactCpf),
  tenantIdx: index("idx_form_submissions_tenant_id").on(table.tenantId),
  participantIdx: index("idx_form_submissions_participant_id").on(table.participantId),
}));

export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  designConfig: jsonb("design_config").notNull(),
  questions: jsonb("questions").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  supabaseUrl: text("supabase_url"),
  supabaseAnonKey: text("supabase_anon_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormTemplateSchema = createInsertSchema(formTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertCompletionPageSchema = createInsertSchema(completionPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

export type InsertCompletionPage = z.infer<typeof insertCompletionPageSchema>;
export type CompletionPage = typeof completionPages.$inferSelect;

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;

// ============================================================================
// WHATSAPP PLATFORM SCHEMA - Configuration table for Evolution API settings
// ============================================================================

export const configurationsWhatsapp = pgTable("configurations_whatsapp", {
  id: serial("id").primaryKey(),
  userIdWhatsapp: text("user_id_whatsapp").notNull().default("default"),
  apiUrlWhatsapp: text("api_url_whatsapp").notNull(),
  apiKeyWhatsapp: text("api_key_whatsapp").notNull(),
  instanceWhatsapp: text("instance_whatsapp").notNull(),
  updatedAtWhatsapp: timestamp("updated_at_whatsapp").defaultNow().notNull(),
});

export const insertConfigurationWhatsappSchema = createInsertSchema(configurationsWhatsapp).omit({
  id: true,
  updatedAtWhatsapp: true,
});

export type InsertConfigurationWhatsapp = z.infer<typeof insertConfigurationWhatsappSchema>;
export type ConfigurationWhatsapp = typeof configurationsWhatsapp.$inferSelect;

// Aliases for backwards compatibility
export const insertConfigurationSchema = insertConfigurationWhatsappSchema;
export type InsertConfiguration = InsertConfigurationWhatsapp;
export type Configuration = ConfigurationWhatsapp;

// ============================================================================
// LEADS TABLE - Sistema de Qualificação de Leads (WhatsApp + Formulários)
// ============================================================================

export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identificação
  telefone: text("telefone").notNull(),
  telefoneNormalizado: text("telefone_normalizado").notNull().unique(),
  nome: text("nome"),
  email: text("email"),
  
  // Origem do lead
  origem: text("origem").default("whatsapp"),
  
  // WhatsApp Data
  whatsappId: text("whatsapp_id"),
  whatsappInstance: text("whatsapp_instance"),
  primeiraMensagemEm: timestamp("primeira_mensagem_em", { withTimezone: true }),
  ultimaMensagemEm: timestamp("ultima_mensagem_em", { withTimezone: true }),
  totalMensagens: integer("total_mensagens").default(0),
  
  // STATUS DO FORMULÁRIO (TRACKING REAL)
  formularioUrl: text("formulario_url"),
  formularioEnviado: boolean("formulario_enviado").default(false),
  formularioEnviadoEm: timestamp("formulario_enviado_em", { withTimezone: true }),
  
  formularioAberto: boolean("formulario_aberto").default(false),
  formularioAbertoEm: timestamp("formulario_aberto_em", { withTimezone: true }),
  formularioVisualizacoes: integer("formulario_visualizacoes").default(0),
  
  formularioIniciado: boolean("formulario_iniciado").default(false),
  formularioIniciadoEm: timestamp("formulario_iniciado_em", { withTimezone: true }),
  
  formularioConcluido: boolean("formulario_concluido").default(false),
  formularioConcluidoEm: timestamp("formulario_concluido_em", { withTimezone: true }),
  
  // Status consolidado do formulário (para facilitar queries)
  formStatus: text("form_status").default("not_sent"),
  // Valores: 'not_sent', 'sent', 'opened', 'incomplete', 'completed'
  
  // Qualificação
  pontuacao: integer("pontuacao"),
  statusQualificacao: text("status_qualificacao").default("pending"),
  // Valores: 'approved', 'rejected', 'pending'
  qualificationStatus: text("qualification_status").default("pending"),
  // Alias para statusQualificacao (mantém compatibilidade)
  motivoReprovacao: text("motivo_reprovacao"),
  
  // Link do formulário enviado
  formularioId: uuid("formulario_id").references(() => forms.id, { onDelete: "set null" }),
  submissionId: uuid("submission_id").references(() => formSubmissions.id, { onDelete: "set null" }),
  
  // Metadados
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  tags: jsonb("tags").default(sql`'[]'::jsonb`),
  observacoes: text("observacoes"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  telefoneNormIdx: index("idx_leads_telefone_norm").on(table.telefoneNormalizado),
  whatsappIdIdx: index("idx_leads_whatsapp_id").on(table.whatsappId),
  statusQualificacaoIdx: index("idx_leads_status_qualificacao").on(table.statusQualificacao),
  formularioEnviadoIdx: index("idx_leads_formulario_enviado").on(table.formularioEnviado),
  formularioConcluidoIdx: index("idx_leads_formulario_concluido").on(table.formularioConcluido),
}));

// Relations for leads
export const leadsRelations = {
  formulario: {
    fields: [leads.formularioId],
    references: [forms.id]
  },
  submission: {
    fields: [leads.submissionId],
    references: [formSubmissions.id]
  }
};

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

// ============================================================================
// FORMULARIO SESSOES - Tracking REAL de sessões de formulário
// ============================================================================

export const formularioSessoes = pgTable("formulario_sessoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  
  // Token único e seguro para acesso
  token: text("token").notNull().unique(),
  sessaoId: text("sessao_id").notNull().unique(),
  
  // Status da sessão
  aberto: boolean("aberto").default(false),
  primeiraAberturaEm: timestamp("primeira_abertura_em", { withTimezone: true }),
  ultimaAtividadeEm: timestamp("ultima_atividade_em", { withTimezone: true }),
  totalAcessos: integer("total_acessos").default(0),
  
  // Progresso do formulário
  camposPreenchidos: jsonb("campos_preenchidos").default(sql`'{}'::jsonb`),
  progressoPercentual: integer("progresso_percentual").default(0),
  paginaAtual: integer("pagina_atual").default(1),
  
  // Tracking (arrays para múltiplos acessos)
  ipAddresses: jsonb("ip_addresses").default(sql`'[]'::jsonb`),
  userAgents: jsonb("user_agents").default(sql`'[]'::jsonb`),
  
  // Expiração
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  concluido: boolean("concluido").default(false),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  tokenIdx: index("idx_sessoes_token").on(table.token),
  leadIdIdx: index("idx_sessoes_lead_id").on(table.leadId),
  sessaoIdIdx: index("idx_sessoes_sessao_id").on(table.sessaoId),
}));

export const insertFormularioSessaoSchema = createInsertSchema(formularioSessoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertFormularioSessao = z.infer<typeof insertFormularioSessaoSchema>;
export type FormularioSessao = typeof formularioSessoes.$inferSelect;

// ============================================================================
// LEAD HISTORICO - Auditoria de eventos
// ============================================================================

export const leadHistorico = pgTable("lead_historico", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  
  tipoEvento: text("tipo_evento").notNull(),
  // Valores: 'formulario_enviado', 'formulario_aberto', 'formulario_iniciado', 
  //          'formulario_concluido', 'lead_aprovado', 'lead_reprovado'
  
  descricao: text("descricao"),
  dados: jsonb("dados"),
  ipAddress: text("ip_address"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  leadIdIdx: index("idx_historico_lead_id").on(table.leadId),
  tipoEventoIdx: index("idx_historico_tipo_evento").on(table.tipoEvento),
  createdAtIdx: index("idx_historico_created_at").on(table.createdAt.desc()),
}));

export const insertLeadHistoricoSchema = createInsertSchema(leadHistorico).omit({
  id: true,
  createdAt: true,
});

export type InsertLeadHistorico = z.infer<typeof insertLeadHistoricoSchema>;
export type LeadHistorico = typeof leadHistorico.$inferSelect;

// ============================================================================
// WHATSAPP LABELS - Etiquetas Personalizáveis para WhatsApp Dashboard
// ============================================================================

export const whatsappLabels = pgTable("whatsapp_labels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Nome e cor da etiqueta
  nome: text("nome").notNull(),
  cor: text("cor").notNull(), // HSL string, ex: "hsl(0, 70%, 50%)"
  
  // Mapeamento de status
  formStatus: text("form_status").notNull(),
  // Valores possíveis: 'not_sent', 'sent', 'opened', 'incomplete', 'completed'
  
  qualificationStatus: text("qualification_status"),
  // Valores possíveis: 'approved', 'rejected', 'pending', null
  // null = aplica para qualquer qualification_status
  
  // Configurações
  ordem: integer("ordem").notNull().default(0),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusIdx: index("idx_whatsapp_labels_status").on(table.formStatus, table.qualificationStatus),
  ordemIdx: index("idx_whatsapp_labels_ordem").on(table.ordem),
}));

export const insertWhatsappLabelSchema = createInsertSchema(whatsappLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertWhatsappLabel = z.infer<typeof insertWhatsappLabelSchema>;
export type WhatsappLabel = typeof whatsappLabels.$inferSelect;
