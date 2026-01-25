import { sql } from "drizzle-orm";
import { pgTable, text, varchar, uuid, timestamp, integer, jsonb, index, boolean, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  slug: text("slug").unique().notNull(),
  email: text("email"),
  telefone: text("telefone"),
  logoUrl: text("logo_url"),
  configuracoes: jsonb("configuracoes").default({
    horario_comercial: { inicio: "09:00", fim: "18:00" },
    duracao_padrao: 30,
    cores: { primaria: "#3B82F6", secundaria: "#1E40AF" }
  }),
  roomDesignConfig: jsonb("room_design_config").default({
    branding: {
      logo: null,
      logoSize: 40,
      companyName: '',
      showCompanyName: true
    },
    colors: {
      background: '#0f172a',
      controlsBackground: '#18181b',
      controlsText: '#ffffff',
      primaryButton: '#3b82f6',
      dangerButton: '#ef4444',
      avatarBackground: '#3b82f6',
      avatarText: '#ffffff',
      participantNameBackground: 'rgba(0, 0, 0, 0.6)',
      participantNameText: '#ffffff'
    },
    lobby: {
      title: 'Pronto para participar?',
      subtitle: '',
      buttonText: 'Participar agora',
      showDeviceSelectors: true,
      showCameraPreview: true,
      backgroundImage: null
    },
    meeting: {
      showParticipantCount: true,
      showMeetingCode: true,
      showRecordingIndicator: true,
      enableReactions: true,
      enableChat: true,
      enableScreenShare: true,
      enableRaiseHand: true
    },
    endScreen: {
      title: 'Reunião Encerrada',
      message: 'Obrigado por participar!',
      showFeedback: false,
      redirectUrl: null
    }
  }),
  token100ms: text("token_100ms"),
  appAccessKey: text("app_access_key"),
  appSecret: text("app_secret"),
  templateId100ms: text("template_id_100ms"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("tenants_slug_idx").on(table.slug),
]);

// 100ms Configuration Table (matches shared/db-schema.ts for cross-app compatibility)
export const hms100msConfig = pgTable('hms_100ms_config', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  tenantId: text('tenant_id').notNull(),
  appAccessKey: text('app_access_key').notNull(),
  appSecret: text('app_secret').notNull(),
  managementToken: text('management_token'),
  templateId: text('template_id'),
  apiBaseUrl: text('api_base_url').default('https://api.100ms.live/v2'),
  roomDesignConfig: jsonb('room_design_config').default({
    branding: {
      logo: null,
      logoSize: 40,
      logoPosition: 'left',
      companyName: '',
      showCompanyName: true,
      showLogoInLobby: true,
      showLogoInMeeting: true,
      showLogoInEnd: true
    },
    colors: {
      background: '#0f172a',
      controlsBackground: '#18181b',
      controlsText: '#ffffff',
      primaryButton: '#3b82f6',
      dangerButton: '#ef4444',
      avatarBackground: '#3b82f6',
      avatarText: '#ffffff',
      participantNameBackground: 'rgba(0, 0, 0, 0.6)',
      participantNameText: '#ffffff'
    },
    lobby: {
      title: 'Pronto para participar?',
      subtitle: '',
      buttonText: 'Participar agora',
      showDeviceSelectors: true,
      showCameraPreview: true,
      backgroundImage: null
    },
    meeting: {
      showParticipantCount: true,
      showMeetingCode: true,
      showRecordingIndicator: true,
      enableReactions: true,
      enableChat: true,
      enableScreenShare: true,
      enableRaiseHand: true
    },
    endScreen: {
      title: 'Reunião Encerrada',
      message: 'Obrigado por participar!',
      showFeedback: false,
      redirectUrl: null
    }
  }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const usuariosTenant = pgTable("usuarios_tenant", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  userId: varchar("user_id").references(() => users.id),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  role: text("role").default("user"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("usuarios_tenant_tenant_idx").on(table.tenantId),
  index("usuarios_tenant_user_idx").on(table.userId),
  index("usuarios_tenant_email_idx").on(table.email),
]);

export const reunioes = pgTable("reunioes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  usuarioId: uuid("usuario_id").references(() => usuariosTenant.id),
  nome: text("nome"),
  email: text("email"),
  telefone: text("telefone"),
  titulo: text("titulo"),
  descricao: text("descricao"),
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim").notNull(),
  duracao: integer("duracao"),
  roomId100ms: text("room_id_100ms").unique(),
  roomCode100ms: text("room_code_100ms"),
  linkReuniao: text("link_reuniao"),
  status: text("status").default("agendada"),
  participantes: jsonb("participantes").default([]),
  gravacaoUrl: text("gravacao_url"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("reunioes_tenant_idx").on(table.tenantId),
  index("reunioes_usuario_idx").on(table.usuarioId),
  index("reunioes_data_inicio_idx").on(table.dataInicio),
  index("reunioes_status_idx").on(table.status),
  index("reunioes_room_id_idx").on(table.roomId100ms),
]);

export const transcricoes = pgTable("transcricoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  roomId100ms: text("room_id_100ms"),
  status: text("status").default("pending"),
  startedAt: timestamp("started_at"),
  stoppedAt: timestamp("stopped_at"),
  transcricaoCompleta: text("transcricao_completa"),
  resumo: text("resumo"),
  topicos: jsonb("topicos"),
  acoes: jsonb("acoes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("transcricoes_reuniao_idx").on(table.reuniaoId),
  index("transcricoes_tenant_idx").on(table.tenantId),
  index("transcricoes_room_idx").on(table.roomId100ms),
  index("transcricoes_status_idx").on(table.status),
]);

export const gravacoes = pgTable("gravacoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id).notNull(),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  roomId100ms: text("room_id_100ms"),
  sessionId100ms: text("session_id_100ms"),
  recordingId100ms: text("recording_id_100ms"),
  status: text("status").default("recording"),
  startedAt: timestamp("started_at").defaultNow(),
  stoppedAt: timestamp("stopped_at"),
  duration: integer("duration"),
  fileUrl: text("file_url"),
  fileSize: integer("file_size"),
  thumbnailUrl: text("thumbnail_url"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("gravacoes_reuniao_idx").on(table.reuniaoId),
  index("gravacoes_tenant_idx").on(table.tenantId),
  index("gravacoes_status_idx").on(table.status),
  index("gravacoes_room_id_idx").on(table.roomId100ms),
]);

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertUsuarioTenantSchema = createInsertSchema(usuariosTenant).omit({
  id: true,
  createdAt: true,
});

export const insertReuniaoSchema = createInsertSchema(reunioes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTranscricaoSchema = createInsertSchema(transcricoes).omit({
  id: true,
  createdAt: true,
});

export const insertGravacaoSchema = createInsertSchema(gravacoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenants.$inferSelect;

export type InsertUsuarioTenant = z.infer<typeof insertUsuarioTenantSchema>;
export type UsuarioTenant = typeof usuariosTenant.$inferSelect;

export type InsertReuniao = z.infer<typeof insertReuniaoSchema>;
export type Reuniao = typeof reunioes.$inferSelect;

export type InsertTranscricao = z.infer<typeof insertTranscricaoSchema>;
export type Transcricao = typeof transcricoes.$inferSelect;

export type InsertGravacao = z.infer<typeof insertGravacaoSchema>;
export type Gravacao = typeof gravacoes.$inferSelect;

// ==================== MEETING BOOKING SYSTEM ====================

// Confirmation pages for meeting bookings
export const meetingConfirmationPages = pgTable("meeting_confirmation_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  title: text("title").notNull().default("Reunião Agendada!"),
  subtitle: text("subtitle"),
  confirmationMessage: text("confirmation_message").notNull().default("Sua reunião foi agendada com sucesso. Você receberá um e-mail de confirmação em breve."),
  showDateTime: boolean("show_date_time").default(true),
  showLocation: boolean("show_location").default(true),
  showAddToCalendar: boolean("show_add_to_calendar").default(true),
  logo: text("logo"),
  logoAlign: text("logo_align").default("center"),
  iconColor: text("icon_color").default("hsl(142, 71%, 45%)"),
  iconImage: text("icon_image"),
  iconType: text("icon_type").default("calendar-check"),
  ctaText: text("cta_text"),
  ctaUrl: text("cta_url"),
  customContent: text("custom_content"),
  designConfig: jsonb("design_config").default({
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "2xl",
      textSize: "base"
    },
    spacing: "comfortable"
  }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("meeting_confirmation_pages_tenant_idx").on(table.tenantId),
]);

// Meeting types (configurable booking pages)
export const meetingTypes = pgTable("meeting_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description"),
  duration: integer("duration").notNull().default(30),
  bufferBefore: integer("buffer_before").default(0),
  bufferAfter: integer("buffer_after").default(0),
  availabilityConfig: jsonb("availability_config").notNull().default({
    weekdays: [1, 2, 3, 4, 5],
    timeSlots: [
      { start: "09:00", end: "12:00" },
      { start: "14:00", end: "18:00" }
    ],
    timezone: "America/Sao_Paulo",
    exceptions: []
  }),
  locationType: text("location_type").default("video"),
  locationConfig: jsonb("location_config").default({
    provider: "100ms",
    customUrl: "",
    address: ""
  }),
  welcomeTitle: text("welcome_title"),
  welcomeMessage: text("welcome_message"),
  welcomeConfig: jsonb("welcome_config"),
  bookingFields: jsonb("booking_fields").notNull().default([
    { id: "nome", type: "short_text", title: "Nome completo", required: true },
    { id: "email", type: "email", title: "E-mail", required: true },
    { id: "telefone", type: "phone_number", title: "WhatsApp", required: true },
    { id: "motivo", type: "textarea", title: "Motivo da reunião", required: false }
  ]),
  designConfig: jsonb("design_config").default({
    colors: {
      primary: "hsl(221, 83%, 53%)",
      secondary: "hsl(210, 40%, 96%)",
      background: "hsl(0, 0%, 100%)",
      text: "hsl(222, 47%, 11%)"
    },
    typography: {
      fontFamily: "Inter",
      titleSize: "2xl",
      textSize: "base"
    },
    logo: null,
    spacing: "comfortable"
  }),
  confirmationPageId: uuid("confirmation_page_id").references(() => meetingConfirmationPages.id, { onDelete: "set null" }),
  isPublic: boolean("is_public").default(false),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("meeting_types_tenant_idx").on(table.tenantId),
  index("meeting_types_slug_idx").on(table.slug),
  index("meeting_types_public_idx").on(table.isPublic),
]);

// Meeting tenant mapping for public access
export const meetingTenantMapping = pgTable("meeting_tenant_mapping", {
  meetingTypeId: uuid("meeting_type_id").primaryKey().references(() => meetingTypes.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("meeting_mapping_tenant_idx").on(table.tenantId),
  index("meeting_mapping_public_idx").on(table.isPublic),
  index("meeting_mapping_slug_idx").on(table.slug),
  index("meeting_mapping_company_slug_idx").on(table.companySlug),
]);

// Meeting bookings (client appointments)
export const meetingBookings = pgTable("meeting_bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id),
  meetingTypeId: uuid("meeting_type_id").references(() => meetingTypes.id, { onDelete: "cascade" }).notNull(),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id, { onDelete: "set null" }),
  scheduledDate: date("scheduled_date").notNull(),
  scheduledTime: text("scheduled_time").notNull(),
  scheduledDateTime: timestamp("scheduled_date_time", { withTimezone: true }).notNull(),
  duration: integer("duration").notNull(),
  timezone: text("timezone").default("America/Sao_Paulo"),
  status: text("status").default("pending"),
  answers: jsonb("answers").notNull(),
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  locationUrl: text("location_url"),
  locationDetails: text("location_details"),
  googleEventId: text("google_event_id"),
  calendarLink: text("calendar_link"),
  reminderSentAt: timestamp("reminder_sent_at", { withTimezone: true }),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("meeting_bookings_tenant_idx").on(table.tenantId),
  index("meeting_bookings_meeting_type_idx").on(table.meetingTypeId),
  index("meeting_bookings_scheduled_idx").on(table.scheduledDateTime),
  index("meeting_bookings_status_idx").on(table.status),
  index("meeting_bookings_phone_idx").on(table.contactPhone),
  index("meeting_bookings_reuniao_idx").on(table.reuniaoId),
]);

// Meeting templates
export const meetingTemplates = pgTable("meeting_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  duration: integer("duration").notNull().default(30),
  designConfig: jsonb("design_config").notNull(),
  bookingFields: jsonb("booking_fields").notNull(),
  availabilityConfig: jsonb("availability_config").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => [
  index("meeting_templates_tenant_idx").on(table.tenantId),
]);

// Insert schemas for new tables
export const insertMeetingConfirmationPageSchema = createInsertSchema(meetingConfirmationPages).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTypeSchema = createInsertSchema(meetingTypes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTenantMappingSchema = createInsertSchema(meetingTenantMapping).omit({
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingBookingSchema = createInsertSchema(meetingBookings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingTemplateSchema = createInsertSchema(meetingTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Type exports for new tables
export type InsertMeetingConfirmationPage = z.infer<typeof insertMeetingConfirmationPageSchema>;
export type MeetingConfirmationPage = typeof meetingConfirmationPages.$inferSelect;

export type InsertMeetingType = z.infer<typeof insertMeetingTypeSchema>;
export type MeetingType = typeof meetingTypes.$inferSelect;

export type InsertMeetingTenantMapping = z.infer<typeof insertMeetingTenantMappingSchema>;
export type MeetingTenantMapping = typeof meetingTenantMapping.$inferSelect;

export type InsertMeetingBooking = z.infer<typeof insertMeetingBookingSchema>;
export type MeetingBooking = typeof meetingBookings.$inferSelect;

export type InsertMeetingTemplate = z.infer<typeof insertMeetingTemplateSchema>;
export type MeetingTemplate = typeof meetingTemplates.$inferSelect;
