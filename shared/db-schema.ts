import { pgTable, serial, varchar, text, timestamp, integer, json, boolean, date, uuid, jsonb, index, numeric, uniqueIndex } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Notification Settings Table
export const notificationSettings = pgTable('notification_settings', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  tenantId: text('tenant_id').notNull(),
  email: text('email'),
  phone: text('phone'),
  emailEnabled: varchar('email_enabled', { length: 10 }).default('true'),
  whatsappEnabled: varchar('whatsapp_enabled', { length: 10 }).default('false'),
  enabled: varchar('enabled', { length: 10 }).default('true'),
  sound: varchar('sound', { length: 10 }).default('true'),
  vibration: varchar('vibration', { length: 10 }).default('true'),
  badge: varchar('badge', { length: 10 }).default('true'),
  showPreview: varchar('show_preview', { length: 10 }).default('true'),
  quietHoursEnabled: varchar('quiet_hours_enabled', { length: 10 }).default('false'),
  quietHoursStart: varchar('quiet_hours_start', { length: 10 }).default('22:00'),
  quietHoursEnd: varchar('quiet_hours_end', { length: 10 }).default('08:00'),
  supabaseEnabled: varchar('supabase_enabled', { length: 10 }).default('true'),
  calendarEnabled: varchar('calendar_enabled', { length: 10 }).default('true'),
  pluggyEnabled: varchar('pluggy_enabled', { length: 10 }).default('true'),
  systemEnabled: varchar('system_enabled', { length: 10 }).default('true'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_notification_settings_tenant').on(table.tenantId),
  userIdx: uniqueIndex('idx_notification_settings_user_tenant').on(table.userId, table.tenantId),
}));

// Biometric Credentials Table
export const biometricCredentials = pgTable('biometric_credentials', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  credentialId: text('credential_id').notNull(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  transports: text('transports').array(),
  deviceName: text('device_name'),
  lastUsedAt: timestamp('last_used_at'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_biometric_credentials_tenant').on(table.tenantId),
}));

// Pluggy Configuration Table
export const pluggyConfig = pgTable('pluggy_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_pluggy_tenant_unique').on(table.tenantId),
}));

// Pluggy Items Table
export const pluggyItems = pgTable('pluggy_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  tenantId: text('tenant_id').notNull(),
  connectorId: varchar('connector_id', { length: 255 }),
  connectorName: varchar('connector_name', { length: 255 }),
  status: varchar('status', { length: 100 }),
  executionStatus: varchar('execution_status', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_pluggy_items_tenant').on(table.tenantId),
}));

// Supabase Configuration Table
export const supabaseConfig = pgTable('supabase_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  supabaseUrl: text('supabase_url').notNull(),
  supabaseAnonKey: text('supabase_anon_key').notNull(),
  supabaseBucket: text('supabase_bucket').default('receipts'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_supabase_tenant_unique').on(table.tenantId),
}));

// N8N Configuration Table
export const n8nConfig = pgTable('n8n_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  webhookUrl: text('webhook_url').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_n8n_tenant_unique').on(table.tenantId),
}));

// Google Calendar Configuration Table
export const googleCalendarConfig = pgTable('google_calendar_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  clientSecret: text('client_secret').notNull(),
  refreshToken: text('refresh_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_google_calendar_tenant_unique').on(table.tenantId),
}));

// Redis Configuration Table
export const redisConfig = pgTable('redis_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  redisUrl: text('redis_url').notNull(),
  redisToken: text('redis_token'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_redis_tenant_unique').on(table.tenantId),
}));

// Sentry Configuration Table
export const sentryConfig = pgTable('sentry_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  dsn: text('dsn').notNull(),
  authToken: text('auth_token'),
  organization: text('organization'),
  project: text('project'),
  environment: text('environment').default('production'),
  tracesSampleRate: text('traces_sample_rate').default('0.1'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_sentry_tenant_unique').on(table.tenantId),
}));

// Resend Configuration Table
export const resendConfig = pgTable('resend_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  apiKey: text('api_key').notNull(),
  fromEmail: text('from_email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_resend_tenant_unique').on(table.tenantId),
}));

// Cloudflare Configuration Table
export const cloudflareConfig = pgTable('cloudflare_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  zoneId: text('zone_id').notNull(),
  apiToken: text('api_token').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_cloudflare_tenant_unique').on(table.tenantId),
}));

// Better Stack Configuration Table
export const betterStackConfig = pgTable('better_stack_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  sourceToken: text('source_token').notNull(),
  ingestingHost: text('ingesting_host').default('in.logs.betterstack.com'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_better_stack_tenant_unique').on(table.tenantId),
}));

// BigDataCorp Configuration Table (CPF Consultation)
export const bigdatacorpConfig = pgTable('bigdatacorp_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  tokenId: text('token_id').notNull(),
  chaveToken: text('chave_token').notNull(),
  supabaseMasterUrl: text('supabase_master_url'),
  supabaseMasterServiceRoleKey: text('supabase_master_service_role_key'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_bigdatacorp_tenant_unique').on(table.tenantId),
}));

// Supabase Master Configuration Table (Centralized CPF Cache)
export const supabaseMasterConfig = pgTable('supabase_master_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  supabaseMasterUrl: text('supabase_master_url').notNull(),
  supabaseMasterServiceRoleKey: text('supabase_master_service_role_key').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_supabase_master_tenant_unique').on(table.tenantId),
}));

// Evolution API Configuration Table (WhatsApp)
export const evolutionApiConfig = pgTable('evolution_api_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  apiUrl: text('api_url').notNull(),
  apiKey: text('api_key').notNull(),
  instance: text('instance').default('nexus-whatsapp'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_evolution_api_tenant_unique').on(table.tenantId),
}));

// 100ms Configuration Table (Video Conferencing)
export const hms100msConfig = pgTable('hms_100ms_config', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  appAccessKey: text('app_access_key').notNull(),
  appSecret: text('app_secret').notNull(),
  managementToken: text('management_token'),
  templateId: text('template_id'),
  apiBaseUrl: text('api_base_url').default('https://api.100ms.live/v2'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantUnique: uniqueIndex('idx_hms_100ms_tenant_unique').on(table.tenantId),
}));

// WhatsApp QR Codes Table
export const whatsappQrCodes = pgTable('whatsapp_qr_codes', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  clientId: text('client_id').notNull(),
  qrCodeData: text('qr_code_data').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_whatsapp_qr_codes_tenant').on(table.tenantId),
  clientIdx: index('idx_whatsapp_qr_codes_client').on(table.clientId),
}));

// Files Table (for file uploads)
export const files = pgTable('files', {
  id: text('id').primaryKey(),
  userId: text('user_id'),
  tenantId: text('tenant_id').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  type: varchar('type', { length: 50 }),
  category: text('category'),
  amount: text('amount'),
  date: date('date'),
  description: text('description'),
  storageType: varchar('storage_type', { length: 50 }).default('supabase'),
  n8nProcessed: varchar('n8n_processed', { length: 10 }).default('false'),
  n8nData: json('n8n_data'),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_files_tenant').on(table.tenantId),
}));

// Attachments Table
export const attachments = pgTable('attachments', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  fileName: text('file_name').notNull(),
  fileUrl: text('file_url').notNull(),
  fileSize: integer('file_size'),
  mimeType: text('mime_type'),
  type: varchar('type', { length: 50 }),
  category: text('category'),
  amount: text('amount'),
  date: date('date'),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_attachments_tenant').on(table.tenantId),
}));

// Transaction Attachments (many-to-many)
export const transactionAttachments = pgTable('transaction_attachments', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  transactionId: text('transaction_id').notNull(),
  attachmentId: text('attachment_id').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_transaction_attachments_tenant').on(table.tenantId),
}));

// Cached Transactions Table
export const cachedTransactions = pgTable('cached_transactions', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  itemId: text('item_id'),
  accountId: text('account_id'),
  accountName: text('account_name'),
  accountType: varchar('account_type', { length: 50 }),
  bankItemId: text('bank_item_id'),
  description: text('description'),
  amount: text('amount'),
  date: text('date'),
  type: varchar('type', { length: 50 }),
  category: text('category'),
  categoryId: text('category_id'),
  merchant: text('merchant'),
  creditCardMetadata: json('credit_card_metadata'),
  balance: text('balance'),
  operationCategory: text('operation_category'),
  source: varchar('source', { length: 50 }),
  billId: text('bill_id'),
  rawData: json('raw_data')
}, (table) => ({
  tenantIdx: index('idx_cached_transactions_tenant').on(table.tenantId),
}));

// Cached Invoices Table
export const cachedInvoices = pgTable('cached_invoices', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  itemId: text('item_id'),
  accountId: text('account_id'),
  dueDate: text('due_date'),
  totalAmount: text('total_amount'),
  lineItemsCount: integer('line_items_count'),
  rawData: json('raw_data')
}, (table) => ({
  tenantIdx: index('idx_cached_invoices_tenant').on(table.tenantId),
}));

// Cache Metadata Table
export const cacheMetadata = pgTable('cache_metadata', {
  itemId: text('item_id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  lastSync: timestamp('last_sync').defaultNow(),
  totalAccounts: integer('total_accounts'),
  totalTransactions: integer('total_transactions'),
  totalInvoices: integer('total_invoices'),
  periodStart: date('period_start'),
  periodEnd: date('period_end'),
  rawStats: json('raw_stats')
}, (table) => ({
  tenantIdx: index('idx_cache_metadata_tenant').on(table.tenantId),
}));

// Google Calendar Webhooks Table
export const googleCalendarWebhooks = pgTable('google_calendar_webhooks', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  channelId: text('channel_id').notNull(),
  resourceId: text('resource_id').notNull(),
  expiration: timestamp('expiration').notNull(),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_google_calendar_webhooks_tenant').on(table.tenantId),
}));

// Pluggy Connections Table
export const pluggyConnections = pgTable('pluggy_connections', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  itemId: text('item_id').notNull(),
  connectorId: text('connector_id'),
  createdAt: timestamp('created_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_pluggy_connections_tenant').on(table.tenantId),
}));

// Google Tokens Table
export const googleTokens = pgTable('google_tokens', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_google_tokens_tenant').on(table.tenantId),
}));

// Device Tokens Table (for push notifications)
export const deviceTokens = pgTable('device_tokens', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  token: text('token').notNull().unique(),
  subscriptionData: text('subscription_data'),
  deviceType: varchar('device_type', { length: 50 }),
  deviceName: text('device_name'),
  deviceModel: text('device_model'),
  userAgent: text('user_agent'),
  deviceInfo: json('device_info'),
  lastActive: timestamp('last_active').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_device_tokens_tenant').on(table.tenantId),
  userTenantIdx: index('idx_device_tokens_user_tenant').on(table.userId, table.tenantId),
}));

// Notification History Table
export const notificationHistory = pgTable('notification_history', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  userId: text('user_id').notNull(),
  type: varchar('type', { length: 50 }).notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  data: json('data'),
  devicesSent: integer('devices_sent').default(0),
  success: varchar('success', { length: 10 }).default('true'),
  read: varchar('read', { length: 10 }).default('false'),
  readAt: timestamp('read_at'),
  sentAt: timestamp('sent_at').defaultNow(),
  deviceTokens: json('device_tokens')
}, (table) => ({
  tenantIdx: index('idx_notification_history_tenant').on(table.tenantId),
  userTenantIdx: index('idx_notification_history_user_tenant').on(table.userId, table.tenantId),
}));

// Workspace Themes Table
export const workspaceThemes = pgTable('workspace_themes', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  icon: text('icon'),
  color: text('color').default('#6366f1'),
  userId: text('user_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_workspace_themes_tenant').on(table.tenantId),
}));

// Workspace Pages Table
export const workspacePages = pgTable('workspace_pages', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  icon: text('icon'),
  cover: text('cover'),
  blocks: json('blocks').default([]),
  parentId: text('parent_id'),
  userId: text('user_id'),
  themeId: text('theme_id'),
  tenantId: text('tenant_id'),
  clientId: text('client_id'),
  content: text('content'),
  type: text('type'),
  properties: json('properties').default({}),
  databases: json('databases').default([]),
  fontStyle: text('font_style'),
  smallText: boolean('small_text'),
  fullWidth: boolean('full_width'),
  locked: boolean('locked'),
  favorited: boolean('favorited'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_workspace_pages_tenant').on(table.tenantId),
}));

// Workspace Databases Table
export const workspaceDatabases = pgTable('workspace_databases', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  icon: text('icon'),
  cover: text('cover'),
  description: text('description'),
  fields: json('fields').default([]),
  columns: json('columns').default([]),
  rows: json('rows').default([]),
  views: json('views').default([]),
  viewType: text('view_type'),
  currentViewId: text('current_view_id'),
  userId: text('user_id'),
  themeId: text('theme_id'),
  tenantId: text('tenant_id'),
  clientId: text('client_id'),
  locked: boolean('locked'),
  favorited: boolean('favorited'),
  chartType: text('chart_type'),
  chartXAxis: text('chart_x_axis'),
  chartYAxis: text('chart_y_axis'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_workspace_databases_tenant').on(table.tenantId),
}));

// Workspace Boards Table (Kanban)
export const workspaceBoards = pgTable('workspace_boards', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  icon: text('icon'),
  cover: text('cover'),
  lists: json('lists').default([]),
  cards: json('cards').default([]),
  labels: json('labels').default([]),
  members: json('members').default([]),
  settings: json('settings').default({}),
  background: text('background'),
  userId: text('user_id'),
  themeId: text('theme_id'),
  tenantId: text('tenant_id'),
  clientId: text('client_id'),
  favorited: boolean('favorited'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_workspace_boards_tenant').on(table.tenantId),
}));

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  email: text('email').notNull(),
  name: text('name'),
  role: varchar('role', { length: 50 }).default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_users_tenant').on(table.tenantId),
}));

// Clients Table
export const clients = pgTable('clients', {
  id: text('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  email: text('email'),
  phone: text('phone'),
  status: varchar('status', { length: 50 }).default('active'),
  plan: varchar('plan', { length: 50 }),
  contactHistory: json('contact_history').default([]),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
}, (table) => ({
  tenantIdx: index('idx_clients_tenant').on(table.tenantId),
}));

// Evolution QR Codes Table (for WhatsApp integration)
export const evolutionQrCodes = pgTable('evolution_qr_codes', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  qrCode: text('qr_code').notNull(),
  instanceName: text('instance_name').notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at')
}, (table) => ({
  tenantIdx: index('idx_evolution_qr_codes_tenant').on(table.tenantId),
}));

// Rate Limiter Table
export const limiter = pgTable('limiter', {
  id: serial('id').primaryKey(),
  key: text('key').notNull(),
  points: integer('points').default(0),
  expire: timestamp('expire'),
  createdAt: timestamp('created_at').defaultNow()
});

// Cache Configuration Table
export const cacheConfig = pgTable('cache_config', {
  id: serial('id').primaryKey(),
  progressiveTtl: boolean('progressive_ttl').default(true),
  thresholds: json('thresholds'),
  defaultTtl: integer('default_ttl').default(3600),
  batchInvalidation: boolean('batch_invalidation').default(true),
  cacheWarming: boolean('cache_warming').default(false),
  compression: boolean('compression').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Optimizer Configuration Table
export const optimizerConfig = pgTable('optimizer_config', {
  id: serial('id').primaryKey(),
  fieldSet: varchar('field_set', { length: 50 }).default('default'),
  pageSize: integer('page_size').default(50),
  paginationType: varchar('pagination_type', { length: 50 }).default('cursor'),
  queryCaching: boolean('query_caching').default(true),
  aggregation: boolean('aggregation').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Monitoring Configuration Table
export const monitoringConfig = pgTable('monitoring_config', {
  id: serial('id').primaryKey(),
  redisUsage: boolean('redis_usage').default(true),
  supabaseUsage: boolean('supabase_usage').default(true),
  thresholds: json('thresholds'),
  alerts: boolean('alerts').default(true),
  autoActions: boolean('auto_actions').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ============================================================================
// WHATSAPP & FORMS TABLES - Lead qualification and form management
// ============================================================================

// Completion Pages Table - Form completion pages with custom styling
export const completionPages = pgTable("completion_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
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
  tenantIdx: index("idx_completion_pages_tenant").on(table.tenantId),
}));

// Forms Table - Form definitions with scoring
// Inclui campo 'slug' para URLs amigáveis (ex: /empresa/form/cadastro-clientes)
export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  slug: text("slug"),
  description: text("description"),
  welcomeTitle: text("welcome_title"),
  welcomeMessage: text("welcome_message"),
  welcomeConfig: jsonb("welcome_config"),
  questions: jsonb("questions").notNull(),
  elements: jsonb("elements"),
  passingScore: integer("passing_score").notNull().default(0),
  scoreTiers: jsonb("score_tiers"),
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
  tenantId: text("tenant_id").notNull(),
  isPublic: boolean("is_public").default(false),
}, (table) => ({
  createdAtIdx: index("idx_forms_created_at").on(table.createdAt.desc()),
  completionPageIdx: index("idx_forms_completion_page").on(table.completionPageId),
  tenantIdIdx: index("idx_forms_tenant_id").on(table.tenantId),
  slugTenantIdx: index("idx_forms_slug_tenant").on(table.slug, table.tenantId),
}));

// Form Tenant Mapping Table - Single source of truth for tenant resolution
// Stores metadata for ALL forms (local PostgreSQL + Supabase) for public access
// Inclui 'slug' para permitir busca por URL amigável
export const formTenantMapping = pgTable("form_tenant_mapping", {
  formId: uuid("form_id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow()
}, (table) => ({
  tenantIdIdx: index("idx_form_mapping_tenant").on(table.tenantId),
  isPublicIdx: index("idx_form_mapping_public").on(table.isPublic),
  slugIdx: index("idx_form_mapping_slug").on(table.slug),
  companySlugIdx: index("idx_form_mapping_company_slug").on(table.companySlug)
}));

export const insertFormTenantMappingSchema = createInsertSchema(formTenantMapping);

// Form Submissions Table - Responses to forms
export const formSubmissions = pgTable("form_submissions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id"),  // NULLABLE - backend ainda não envia
  formId: uuid("form_id").notNull().references(() => forms.id, { onDelete: "cascade" }),
  answers: jsonb("answers").notNull(),
  totalScore: integer("total_score").notNull(),
  passed: boolean("passed").notNull(),
  
  // Dados de contato
  contactName: text("contact_name"),
  contactEmail: text("contact_email"),
  contactPhone: text("contact_phone"),
  contactCpf: text("contact_cpf"),
  instagramHandle: text("instagram_handle"),
  birthDate: date("birth_date"),
  
  // Dados de endereço
  addressCep: text("address_cep"),
  addressStreet: text("address_street"),
  addressNumber: text("address_number"),
  addressComplement: text("address_complement"),
  addressNeighborhood: text("address_neighborhood"),
  addressCity: text("address_city"),
  addressState: text("address_state"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  formIdIdx: index("idx_submissions_form_id").on(table.formId),
  createdAtIdx: index("idx_submissions_created_at").on(table.createdAt.desc()),
  tenantIdx: index("idx_submissions_tenant").on(table.tenantId),
  cpfIdx: index("idx_submissions_cpf").on(table.contactCpf),
  phoneIdx: index("idx_submissions_phone").on(table.contactPhone),
}));

// Form Templates Table - Reusable form templates
export const formTemplates = pgTable("form_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  thumbnailUrl: text("thumbnail_url"),
  designConfig: jsonb("design_config").notNull(),
  questions: jsonb("questions").notNull(),
  isDefault: boolean("is_default").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_form_templates_tenant").on(table.tenantId),
}));

// App Settings Table - Application-wide settings
export const appSettings = pgTable("app_settings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  companyName: text("company_name"),
  companySlug: text("company_slug"),
  supabaseUrl: text("supabase_url"),
  supabaseAnonKey: text("supabase_anon_key"),
  activeFormId: uuid("active_form_id"),
  activeFormUrl: text("active_form_url"),
  redisCommandsToday: integer("redis_commands_today").default(0),
  redisCommandsDate: date("redis_commands_date"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// WhatsApp Configuration Table - Evolution API credentials per tenant
export const configurationsWhatsapp = pgTable("configurations_whatsapp", {
  id: serial("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  apiUrlWhatsapp: text("api_url_whatsapp").notNull(),
  apiKeyWhatsapp: text("api_key_whatsapp").notNull(),
  instanceWhatsapp: text("instance_whatsapp").notNull(),
  createdAtWhatsapp: timestamp("created_at_whatsapp").defaultNow().notNull(),
  updatedAtWhatsapp: timestamp("updated_at_whatsapp").defaultNow().notNull(),
}, (table) => ({
  tenantIdx: index("idx_configurations_whatsapp_tenant").on(table.tenantId),
  tenantUniqueIdx: uniqueIndex("idx_configurations_whatsapp_tenant_unique").on(table.tenantId),
}));

// Leads Table - Lead tracking with WhatsApp and form status
export const leads = pgTable("leads", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  
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
  whatsappLabelId: uuid("whatsapp_label_id").references(() => whatsappLabels.id, { onDelete: "set null" }),
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
  
  // Qualificação
  pontuacao: integer("pontuacao"),
  statusQualificacao: text("status_qualificacao").default("pending"),
  qualificationStatus: text("qualification_status").default("pending"),
  motivoReprovacao: text("motivo_reprovacao"),
  
  // Link do formulário enviado
  formularioId: uuid("formulario_id").references(() => forms.id, { onDelete: "set null" }),
  submissionId: uuid("submission_id").references(() => formSubmissions.id, { onDelete: "set null" }),
  
  // CPF para matching (secondary identifier after phone)
  cpf: text("cpf"),
  cpfNormalizado: text("cpf_normalizado"),
  
  // FK para CPF check (consulta de compliance)
  cpfCheckId: uuid("cpf_check_id"),
  cpfStatus: text("cpf_status"), // pending, approved, rejected
  cpfCheckedAt: timestamp("cpf_checked_at", { withTimezone: true }),
  
  // FK para dados_cliente (reunião)
  meetingId: uuid("meeting_id"),
  meetingStatus: text("meeting_status"), // pending, scheduled, completed, cancelled
  meetingScheduledAt: timestamp("meeting_scheduled_at", { withTimezone: true }),
  
  // Pipeline status unificado (para Kanban)
  pipelineStatus: text("pipeline_status").default("contato-inicial"),
  
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
  tenantIdx: index("idx_leads_tenant").on(table.tenantId),
  cpfNormIdx: index("idx_leads_cpf_norm").on(table.cpfNormalizado),
  cpfCheckIdx: index("idx_leads_cpf_check").on(table.cpfCheckId),
  meetingIdx: index("idx_leads_meeting").on(table.meetingId),
  pipelineStatusIdx: index("idx_leads_pipeline_status").on(table.pipelineStatus),
}));

// WhatsApp Labels Table - Custom conversation labels
export const whatsappLabels = pgTable("whatsapp_labels", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Nome e cor da etiqueta
  nome: text("nome").notNull(),
  cor: text("cor").notNull(),
  
  // Mapeamento de status
  formStatus: text("form_status").notNull(),
  qualificationStatus: text("qualification_status"),
  
  // Configurações
  ordem: integer("ordem").notNull().default(0),
  ativo: boolean("ativo").default(true),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusIdx: index("idx_whatsapp_labels_status").on(table.formStatus, table.qualificationStatus),
  ordemIdx: index("idx_whatsapp_labels_ordem").on(table.ordem),
}));

// Form Sessions Table - Real tracking of form sessions
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

// Lead History Table - Audit trail for lead events
export const leadHistorico = pgTable("lead_historico", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  leadId: uuid("lead_id").notNull().references(() => leads.id, { onDelete: "cascade" }),
  
  tipoEvento: text("tipo_evento").notNull(),
  descricao: text("descricao"),
  dados: jsonb("dados"),
  ipAddress: text("ip_address"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  leadIdIdx: index("idx_historico_lead_id").on(table.leadId),
  tipoEventoIdx: index("idx_historico_tipo_evento").on(table.tipoEvento),
  createdAtIdx: index("idx_historico_created_at").on(table.createdAt.desc()),
}));

// ============================================================================
// MEETING/CLIENT DATA TABLE - For tracking meetings and client status
// ============================================================================

// Dados Cliente Table - Meeting scheduling and client data for pipeline
export const dadosCliente = pgTable("dados_cliente", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  
  // Identificação - Link com lead
  leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
  
  // Dados do cliente
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  telefoneNormalizado: text("telefone_normalizado"),
  email: text("email"),
  cpf: text("cpf"),
  
  // Status da reunião
  reuniaoStatus: text("reuniao_status").default("pendente"), // pendente, agendada, realizada, cancelada
  reuniaoData: timestamp("reuniao_data", { withTimezone: true }),
  reuniaoHora: text("reuniao_hora"),
  reuniaoLocal: text("reuniao_local"),
  reuniaoTipo: text("reuniao_tipo"), // presencial, online
  reuniaoLink: text("reuniao_link"), // Link do Google Meet, Zoom, etc
  
  // Consultor responsável
  consultorNome: text("consultor_nome"),
  consultorEmail: text("consultor_email"),
  
  // Notas e observações
  observacoes: text("observacoes"),
  
  // Resultado da reunião
  resultadoReuniao: text("resultado_reuniao"), // aprovado, em_analise, recusado
  motivoRecusa: text("motivo_recusa"),
  
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_dados_cliente_tenant").on(table.tenantId),
  leadIdx: index("idx_dados_cliente_lead").on(table.leadId),
  telefoneNormIdx: index("idx_dados_cliente_telefone_norm").on(table.telefoneNormalizado),
  statusIdx: index("idx_dados_cliente_status").on(table.reuniaoStatus),
}));

// ============================================================================
// KANBAN PLATFORM - Lead pipeline management
// ============================================================================

// Kanban Leads Table - Lead pipeline for Kanban board
export const kanbanLeads = pgTable("kanban_leads", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  value: text("value").notNull(),
  contactDate: text("contact_date").notNull(),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  statusIdx: index("idx_kanban_leads_status").on(table.status),
  emailIdx: index("idx_kanban_leads_email").on(table.email),
  createdAtIdx: index("idx_kanban_leads_created_at").on(table.createdAt.desc()),
}));

// ============================================================================
// INSERT SCHEMAS AND TYPES - For validation and type safety
// ============================================================================

export const insertFormSchema = createInsertSchema(forms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormSubmissionSchema = createInsertSchema(formSubmissions).omit({
  id: true,
  createdAt: true,
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

export const insertAppSettingsSchema = createInsertSchema(appSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertConfigurationWhatsappSchema = createInsertSchema(configurationsWhatsapp).omit({
  id: true,
  createdAtWhatsapp: true,
  updatedAtWhatsapp: true,
});

export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertWhatsappLabelSchema = createInsertSchema(whatsappLabels).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertFormularioSessaoSchema = createInsertSchema(formularioSessoes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertLeadHistoricoSchema = createInsertSchema(leadHistorico).omit({
  id: true,
  createdAt: true,
});

export const insertDadosClienteSchema = createInsertSchema(dadosCliente).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKanbanLeadSchema = createInsertSchema(kanbanLeads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// TypeScript types
export type InsertForm = z.infer<typeof insertFormSchema>;
export type Form = typeof forms.$inferSelect;

export type InsertFormSubmission = z.infer<typeof insertFormSubmissionSchema>;
export type FormSubmission = typeof formSubmissions.$inferSelect;

export type InsertFormTemplate = z.infer<typeof insertFormTemplateSchema>;
export type FormTemplate = typeof formTemplates.$inferSelect;

export type InsertCompletionPage = z.infer<typeof insertCompletionPageSchema>;
export type CompletionPage = typeof completionPages.$inferSelect;

export type InsertAppSettings = z.infer<typeof insertAppSettingsSchema>;
export type AppSettings = typeof appSettings.$inferSelect;

export type InsertConfigurationWhatsapp = z.infer<typeof insertConfigurationWhatsappSchema>;
export type ConfigurationWhatsapp = typeof configurationsWhatsapp.$inferSelect;

export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;

export type InsertWhatsappLabel = z.infer<typeof insertWhatsappLabelSchema>;
export type WhatsappLabel = typeof whatsappLabels.$inferSelect;

export type InsertFormularioSessao = z.infer<typeof insertFormularioSessaoSchema>;
export type FormularioSessao = typeof formularioSessoes.$inferSelect;

export type InsertLeadHistorico = z.infer<typeof insertLeadHistoricoSchema>;
export type LeadHistorico = typeof leadHistorico.$inferSelect;

export type InsertDadosCliente = z.infer<typeof insertDadosClienteSchema>;
export type DadosCliente = typeof dadosCliente.$inferSelect;

export type InsertKanbanLead = z.infer<typeof insertKanbanLeadSchema>;
export type KanbanLead = typeof kanbanLeads.$inferSelect;

// Formularios Table (for form selection and N8N integration)
export const formularios = pgTable('formularios', {
  id: uuid('id').primaryKey().default(sql`gen_random_uuid()`),
  nome: text('nome').notNull(),
  url: text('url').notNull(),
  ativo: boolean('ativo').default(false).notNull(),
  criadoEm: timestamp('criado_em').defaultNow(),
  atualizadoEm: timestamp('atualizado_em').defaultNow()
}, (table) => ({
  ativoIdx: index('idx_formularios_ativo').on(table.ativo).where(sql`${table.ativo} = true`)
}));

export const insertFormularioSchema = createInsertSchema(formularios).omit({
  id: true,
  criadoEm: true,
  atualizadoEm: true,
});

export type InsertFormulario = z.infer<typeof insertFormularioSchema>;
export type Formulario = typeof formularios.$inferSelect;

// ============================================================================
// PRODUCT MANAGEMENT TABLES - Inventory and supplier management
// ============================================================================

// Products Table - Product catalog
export const products = pgTable("products", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  codigo: text("codigo").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  categoria: text("categoria"),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
  precoCompra: text("preco_compra"),
  precoVenda: text("preco_venda"),
  estoque: integer("estoque").default(0),
  estoqueMinimo: integer("estoque_minimo").default(0),
  fornecedorId: uuid("fornecedor_id").references(() => suppliers.id, { onDelete: "set null" }),
  revendedorId: uuid("revendedor_id").references(() => resellers.id, { onDelete: "set null" }),
  ativo: boolean("ativo").default(true),
  imagemUrl: text("imagem_url"),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  codigoIdx: index("idx_products_codigo").on(table.codigo),
  nomeIdx: index("idx_products_nome").on(table.nome),
  categoriaIdx: index("idx_products_categoria").on(table.categoria),
  fornecedorIdx: index("idx_products_fornecedor").on(table.fornecedorId),
}));

// Suppliers Table - Supplier management
export const suppliers = pgTable("suppliers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  contato: text("contato"),
  telefone: text("telefone"),
  email: text("email"),
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true),
}, (table) => ({
  nomeIdx: index("idx_suppliers_nome").on(table.nome),
}));

// Resellers Table - Reseller management
export const resellers = pgTable("resellers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  cnpj: text("cnpj"),
  contato: text("contato"),
  telefone: text("telefone"),
  email: text("email"),
  endereco: text("endereco"),
  comissao: text("comissao"),
  observacoes: text("observacoes"),
  ativo: boolean("ativo").default(true),
}, (table) => ({
  nomeIdx: index("idx_resellers_nome").on(table.nome),
}));

// Categories Table - Product categories
export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull().unique(),
  descricao: text("descricao"),
  cor: text("cor").default("#3B82F6"),
  icone: text("icone"),
  ordem: integer("ordem").default(0),
  etiquetaCustomizada: text("etiqueta_customizada"),
  produtosVinculados: integer("produtos_vinculados").default(0),
}, (table) => ({
  nomeIdx: index("idx_categories_nome").on(table.nome),
}));

// Print Queue Table - Label printing queue
export const printQueue = pgTable("print_queue", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  product: jsonb("product").notNull(),
  quantity: integer("quantity").notNull(),
  parcelas: integer("parcelas"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  createdAtIdx: index("idx_print_queue_created").on(table.createdAt.desc()),
}));

// ============================================================================
// DASHBOARD MODULE - Legacy dashboard table
// ============================================================================

// Dashboard Complete V5 Base - Legacy compatibility table
export const dashboardCompletoV5Base = pgTable("dashboard_completo_v5_base", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  nome: text("nome").notNull(),
  email: text("email"),
  telefone: text("telefone"),
  status: text("status"),
  ultimoContato: timestamp("ultimo_contato", { withTimezone: true }),
  valorTotal: text("valor_total"),
  tags: text("tags").array(),
  observacoes: text("observacoes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => ({
  nomeIdx: index("idx_dashboard_nome").on(table.nome),
  ultimoContatoIdx: index("idx_dashboard_ultimo_contato").on(table.ultimoContato.desc()),
  statusIdx: index("idx_dashboard_status").on(table.status),
}));

// ============================================================================
// CONSULTAR CPF / COMPLIANCE PLATFORM TABLES
// ============================================================================

// Enums for compliance
export const complianceStatus = ["approved", "rejected", "manual_review", "error", "pending"] as const;
export type ComplianceStatus = typeof complianceStatus[number];

export const auditAction = ["view", "check", "reprocess", "export", "delete"] as const;
export type AuditAction = typeof auditAction[number];

// Tenants Registry for multi-tenant compliance isolation
export const tenantsRegistry = pgTable("tenants_registry", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  slug: text("slug").notNull().unique(),
  companyName: text("company_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  slugIdx: index("idx_tenant_slug").on(table.slug),
  activeIdx: index("idx_tenant_active").on(table.isActive),
}));

// Compliance Users (renamed from 'users' to avoid conflict)
export const complianceUsers = pgTable("compliance_users", {
  id: uuid("id").primaryKey(),
  email: text("email").notNull().unique(),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsRegistry.id, { onDelete: "cascade" }),
  name: text("name"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailIdx: index("idx_compliance_user_email").on(table.email),
  tenantIdx: index("idx_compliance_user_tenant").on(table.tenantId),
}));

// Datacorp Checks - Main CPF compliance checks table with intelligent cache
export const datacorpChecks = pgTable("datacorp_checks", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Identification (NEVER stores plain CPF for LGPD compliance)
  cpfHash: text("cpf_hash").notNull(),
  cpfEncrypted: text("cpf_encrypted").notNull(),
  
  // Person data (for display)
  personName: text("person_name"),
  personCpf: text("person_cpf"),
  
  // Multi-tenant isolation
  tenantId: uuid("tenant_id").notNull().references(() => tenantsRegistry.id, { onDelete: "cascade" }),
  leadId: uuid("lead_id"),
  submissionId: uuid("submission_id"),
  
  // Cache reuse tracking
  originCheckId: uuid("origin_check_id"),
  
  // Bigdatacorp API result
  status: text("status").notNull().$type<ComplianceStatus>().default("pending"),
  riskScore: numeric("risk_score", { precision: 5, scale: 2 }),
  payload: jsonb("payload").notNull(),
  
  // Metadata
  consultedAt: timestamp("consulted_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at").notNull(),
  source: text("source").notNull().default("bigdatacorp_v1"),
  apiCost: numeric("api_cost", { precision: 10, scale: 2 }).notNull().default("0.07"),
  
  // Audit
  createdBy: uuid("created_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  cpfHashIdx: index("idx_cpf_hash").on(table.cpfHash),
  tenantIdx: index("idx_datacorp_tenant_id").on(table.tenantId),
  statusIdx: index("idx_datacorp_status").on(table.status),
  consultedAtIdx: index("idx_consulted_at").on(table.consultedAt),
  expiresAtIdx: index("idx_expires_at").on(table.expiresAt),
  originCheckIdx: index("idx_origin_check_id").on(table.originCheckId),
  cacheLookupIdx: index("idx_cache_lookup").on(table.tenantId, table.cpfHash, table.expiresAt),
  uniqueCpfTenantTime: uniqueIndex("unique_cpf_tenant_time").on(table.cpfHash, table.tenantId, table.consultedAt),
}));

// Compliance Audit Log
export const complianceAuditLog = pgTable("compliance_audit_log", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  checkId: uuid("check_id").references(() => datacorpChecks.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsRegistry.id, { onDelete: "cascade" }),
  action: text("action").notNull().$type<AuditAction>(),
  userId: uuid("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
}, (table) => ({
  checkIdx: index("idx_audit_check").on(table.checkId),
  tenantIdx: index("idx_audit_tenant").on(table.tenantId),
  timestampIdx: index("idx_audit_timestamp").on(table.timestamp),
  actionIdx: index("idx_audit_action").on(table.action),
}));

// Form Submissions Compliance Tracking
export const formSubmissionsComplianceTracking = pgTable("form_submissions_compliance_tracking", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  submissionId: text("submission_id").notNull().unique(),
  checkId: uuid("check_id").references(() => datacorpChecks.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenantsRegistry.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("pending"),
  processedAt: timestamp("processed_at"),
  lastAttemptAt: timestamp("last_attempt_at"),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  submissionIdx: index("idx_submission_id").on(table.submissionId),
  tenantIdx: index("idx_forms_compliance_tenant_id").on(table.tenantId),
  statusIdx: index("idx_forms_compliance_status").on(table.status),
  statusLastAttemptIdx: index("idx_forms_status_last_attempt").on(table.status, table.lastAttemptAt),
}));

// ============================================================================
// INSERT SCHEMAS FOR NEW TABLES
// ============================================================================

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertSupplierSchema = createInsertSchema(suppliers).omit({
  id: true,
});

export const insertResellerSchema = createInsertSchema(resellers).omit({
  id: true,
});

export const insertCategorySchema = createInsertSchema(categories).omit({
  id: true,
});

export const insertPrintQueueSchema = createInsertSchema(printQueue).omit({
  id: true,
  createdAt: true,
});

export const insertDashboardCompletoV5BaseSchema = createInsertSchema(dashboardCompletoV5Base).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertTenantSchema = createInsertSchema(tenantsRegistry, {
  slug: z.string().min(3).max(50).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
  companyName: z.string().min(3).max(200),
}).omit({ id: true, createdAt: true });

export const insertComplianceUserSchema = createInsertSchema(complianceUsers, {
  email: z.string().email("Email inválido"),
  name: z.string().min(2).max(200).optional(),
}).omit({ createdAt: true });

export const insertDatacorpCheckSchema = createInsertSchema(datacorpChecks, {
  cpfHash: z.string().length(64, "Hash SHA-256 inválido"),
  cpfEncrypted: z.string(),
  status: z.enum(complianceStatus),
  riskScore: z.string().optional(),
  payload: z.record(z.any()),
  apiCost: z.string().optional(),
}).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  consultedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(complianceAuditLog, {
  action: z.enum(auditAction),
  ipAddress: z.string().optional(),
}).omit({ id: true, timestamp: true });

export const insertFormSubmissionComplianceTrackingSchema = createInsertSchema(formSubmissionsComplianceTracking).omit({
  id: true,
  createdAt: true,
});

// ============================================================================
// PRINTER CONFIGURATION TABLE
// ============================================================================

// Printer Configuration Table - Stores printer settings per tenant
export const printerConfigs = pgTable('printer_configs', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  
  // Printer identification
  printerName: text('printer_name').notNull(), // Name from QZ Tray
  printerModel: text('printer_model'), // User-friendly model name
  printerType: text('printer_type').default('thermal'), // thermal, laser, inkjet
  
  // Connection settings
  connectionType: text('connection_type').default('qz-tray'), // qz-tray, usb, network
  printerPort: text('printer_port'), // COM1, USB001, IP address, etc
  
  // Label configuration
  labelWidthMm: numeric('label_width_mm', { precision: 10, scale: 2 }).default('60'),
  labelHeightMm: numeric('label_height_mm', { precision: 10, scale: 2 }).default('40'),
  labelGapMm: numeric('label_gap_mm', { precision: 10, scale: 2 }).default('2'),
  
  // Print format
  printFormat: text('print_format').default('zpl'), // zpl, epl, escpos, pdf
  dpi: integer('dpi').default(203),
  
  // Barcode settings
  barcodeType: text('barcode_type').default('CODE128'),
  
  // Enabled fields for printing
  enabledFields: jsonb('enabled_fields').default({
    description: true,
    barcode: true,
    price: true,
    reference: false,
    supplier: false,
    weight: false,
    qrcode: false
  }),
  
  // Status
  isDefault: boolean('is_default').default(false),
  isActive: boolean('is_active').default(true),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_printer_configs_tenant').on(table.tenantId),
  defaultIdx: index('idx_printer_configs_default').on(table.tenantId, table.isDefault),
}));

// Zod schemas for printer config validation
export const insertPrinterConfigSchema = createInsertSchema(printerConfigs).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updatePrinterConfigSchema = insertPrinterConfigSchema.partial();

// ============================================================================
// LABEL DESIGNER TABLES - Templates de Etiquetas
// ============================================================================

// Label Templates Table - Stores custom label designs
export const labelTemplates = pgTable('label_templates', {
  id: serial('id').primaryKey(),
  tenantId: text('tenant_id').notNull(),
  name: text('name').notNull(),
  description: text('description'),
  
  // Tamanho da etiqueta em milímetros
  widthMm: numeric('width_mm', { precision: 10, scale: 2 }).notNull(),
  heightMm: numeric('height_mm', { precision: 10, scale: 2 }).notNull(),
  
  // Design data (JSON com elementos Fabric.js)
  // Format: { objects: [...], background: '...', version: '...' }
  designData: jsonb('design_data').notNull(),
  
  // Preview thumbnail (base64 ou URL)
  previewUrl: text('preview_url'),
  
  // Metadata
  isPublic: boolean('is_public').default(false),
  category: text('category'),
  tags: text('tags').array(),
  
  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ({
  tenantIdx: index('idx_label_templates_tenant').on(table.tenantId),
  categoryIdx: index('idx_label_templates_category').on(table.category),
  nameIdx: index('idx_label_templates_name').on(table.name),
}));

// Zod schemas for validation
export const insertLabelTemplateSchema = createInsertSchema(labelTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateLabelTemplateSchema = insertLabelTemplateSchema.partial();

// ============================================================================
// MEETING SYSTEM TABLES - Video conferencing with 100ms integration
// ============================================================================

// Meeting Tenants Table - Multi-tenant support for meeting system (renamed from tenants)
export const meetingTenants = pgTable("meeting_tenants", {
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
}, (table) => ({
  slugIdx: index("idx_meeting_tenants_slug").on(table.slug),
}));

// Meeting Users Table - Users per tenant (renamed from usuariosTenant)
export const meetingUsuarios = pgTable("meeting_usuarios", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  nome: text("nome").notNull(),
  email: text("email").notNull(),
  telefone: text("telefone"),
  role: text("role").default("user"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  tenantIdx: index("idx_meeting_usuarios_tenant").on(table.tenantId),
  emailIdx: index("idx_meeting_usuarios_email").on(table.email),
}));

// Reunioes Table - Meeting records
export const reunioes = pgTable("reunioes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: text("tenant_id").notNull(),
  usuarioId: text("usuario_id"),
  nome: text("nome"),
  email: text("email"),
  telefone: text("telefone"),
  titulo: text("titulo"),
  descricao: text("descricao"),
  dataInicio: timestamp("data_inicio").notNull(),
  dataFim: timestamp("data_fim").notNull(),
  duracao: integer("duracao"),
  roomId100ms: text("room_id_100ms"),
  roomCode100ms: text("room_code_100ms"),
  linkReuniao: text("link_reuniao"),
  status: text("status").default("agendada"),
  participantes: jsonb("participantes").default([]),
  gravacaoUrl: text("gravacao_url"),
  metadata: jsonb("metadata").default({}),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  tenantIdx: index("idx_reunioes_tenant").on(table.tenantId),
  usuarioIdx: index("idx_reunioes_usuario").on(table.usuarioId),
  dataInicioIdx: index("idx_reunioes_data_inicio").on(table.dataInicio),
  statusIdx: index("idx_reunioes_status").on(table.status),
  roomIdIdx: index("idx_reunioes_room_id").on(table.roomId100ms),
}));

// Transcricoes Table - Meeting transcriptions
export const transcricoes = pgTable("transcricoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id).notNull(),
  tenantId: text("tenant_id").notNull(),
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
}, (table) => ({
  reuniaoIdx: index("idx_transcricoes_reuniao").on(table.reuniaoId),
  tenantIdx: index("idx_transcricoes_tenant").on(table.tenantId),
  roomIdx: index("idx_transcricoes_room").on(table.roomId100ms),
  statusIdx: index("idx_transcricoes_status").on(table.status),
}));

// Gravacoes Table - Meeting recordings
export const gravacoes = pgTable("gravacoes", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  reuniaoId: uuid("reuniao_id").references(() => reunioes.id).notNull(),
  tenantId: text("tenant_id").notNull(),
  roomId100ms: text("room_id_100ms"),
  sessionId100ms: text("session_id_100ms"),
  recordingId100ms: text("recording_id_100ms"),
  assetId: text("asset_id"),
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
}, (table) => ({
  reuniaoIdx: index("idx_gravacoes_reuniao").on(table.reuniaoId),
  tenantIdx: index("idx_gravacoes_tenant").on(table.tenantId),
  statusIdx: index("idx_gravacoes_status").on(table.status),
  roomIdIdx: index("idx_gravacoes_room_id").on(table.roomId100ms),
}));

// Meeting Confirmation Pages Table
export const meetingConfirmationPages = pgTable("meeting_confirmation_pages", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => meetingTenants.id).notNull(),
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
}, (table) => ({
  tenantIdx: index("idx_meeting_confirmation_pages_tenant").on(table.tenantId),
}));

// Meeting Types Table - Configurable booking pages
export const meetingTypes = pgTable("meeting_types", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => meetingTenants.id).notNull(),
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
}, (table) => ({
  tenantIdx: index("idx_meeting_types_tenant").on(table.tenantId),
  slugIdx: index("idx_meeting_types_slug").on(table.slug),
  publicIdx: index("idx_meeting_types_public").on(table.isPublic),
}));

// Meeting Tenant Mapping Table - For public access
export const meetingTenantMapping = pgTable("meeting_tenant_mapping", {
  meetingTypeId: uuid("meeting_type_id").primaryKey().references(() => meetingTypes.id, { onDelete: "cascade" }),
  tenantId: uuid("tenant_id").references(() => meetingTenants.id).notNull(),
  slug: text("slug"),
  companySlug: text("company_slug"),
  isPublic: boolean("is_public").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
}, (table) => ({
  tenantIdx: index("idx_meeting_mapping_tenant").on(table.tenantId),
  publicIdx: index("idx_meeting_mapping_public").on(table.isPublic),
  slugIdx: index("idx_meeting_mapping_slug").on(table.slug),
  companySlugIdx: index("idx_meeting_mapping_company_slug").on(table.companySlug),
}));

// Meeting Bookings Table - Client appointments
export const meetingBookings = pgTable("meeting_bookings", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => meetingTenants.id),
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
}, (table) => ({
  tenantIdx: index("idx_meeting_bookings_tenant").on(table.tenantId),
  meetingTypeIdx: index("idx_meeting_bookings_meeting_type").on(table.meetingTypeId),
  scheduledIdx: index("idx_meeting_bookings_scheduled").on(table.scheduledDateTime),
  statusIdx: index("idx_meeting_bookings_status").on(table.status),
  phoneIdx: index("idx_meeting_bookings_phone").on(table.contactPhone),
  reuniaoIdx: index("idx_meeting_bookings_reuniao").on(table.reuniaoId),
}));

// Meeting Templates Table
export const meetingTemplates = pgTable("meeting_templates", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: uuid("tenant_id").references(() => meetingTenants.id).notNull(),
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
}, (table) => ({
  tenantIdx: index("idx_meeting_templates_tenant").on(table.tenantId),
}));

// ============================================================================
// MEETING SYSTEM INSERT SCHEMAS
// ============================================================================

export const insertMeetingTenantSchema = createInsertSchema(meetingTenants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertMeetingUsuarioSchema = createInsertSchema(meetingUsuarios).omit({
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

// ============================================================================
// TYPES FOR NEW TABLES
// ============================================================================

export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliers.$inferSelect;

export type InsertReseller = z.infer<typeof insertResellerSchema>;
export type Reseller = typeof resellers.$inferSelect;

export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;

export type InsertPrintQueue = z.infer<typeof insertPrintQueueSchema>;
export type PrintQueue = typeof printQueue.$inferSelect;

export type InsertDashboardCompletoV5Base = z.infer<typeof insertDashboardCompletoV5BaseSchema>;
export type DashboardCompletoV5Base = typeof dashboardCompletoV5Base.$inferSelect;

export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type Tenant = typeof tenantsRegistry.$inferSelect;

export type InsertComplianceUser = z.infer<typeof insertComplianceUserSchema>;
export type ComplianceUser = typeof complianceUsers.$inferSelect;

export type InsertDatacorpCheck = z.infer<typeof insertDatacorpCheckSchema>;
export type DatacorpCheck = typeof datacorpChecks.$inferSelect;

export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AuditLog = typeof complianceAuditLog.$inferSelect;

export type InsertFormSubmissionComplianceTracking = z.infer<typeof insertFormSubmissionComplianceTrackingSchema>;
export type FormSubmissionComplianceTracking = typeof formSubmissionsComplianceTracking.$inferSelect;

export type InsertLabelTemplate = z.infer<typeof insertLabelTemplateSchema>;
export type UpdateLabelTemplate = z.infer<typeof updateLabelTemplateSchema>;
export type LabelTemplate = typeof labelTemplates.$inferSelect;

export type InsertPrinterConfig = z.infer<typeof insertPrinterConfigSchema>;
export type UpdatePrinterConfig = z.infer<typeof updatePrinterConfigSchema>;
export type PrinterConfig = typeof printerConfigs.$inferSelect;

// Meeting System Types
export type InsertMeetingTenant = z.infer<typeof insertMeetingTenantSchema>;
export type MeetingTenant = typeof meetingTenants.$inferSelect;

export type InsertMeetingUsuario = z.infer<typeof insertMeetingUsuarioSchema>;
export type MeetingUsuario = typeof meetingUsuarios.$inferSelect;

export type InsertReuniao = z.infer<typeof insertReuniaoSchema>;
export type Reuniao = typeof reunioes.$inferSelect;

export type InsertTranscricao = z.infer<typeof insertTranscricaoSchema>;
export type Transcricao = typeof transcricoes.$inferSelect;

export type InsertGravacao = z.infer<typeof insertGravacaoSchema>;
export type Gravacao = typeof gravacoes.$inferSelect;

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

// Aliases for backwards compatibility
export const insertConfigurationSchema = insertConfigurationWhatsappSchema;
export type InsertConfiguration = InsertConfigurationWhatsapp;
export type Configuration = ConfigurationWhatsapp;
