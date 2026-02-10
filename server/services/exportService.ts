import { db } from "../db";
import * as schema from "../../shared/db-schema";
import { sql } from "drizzle-orm";
import * as XLSX from "xlsx";

export interface ExportOptions {
  tables: string[];
  format: 'json' | 'excel';
  includeMetadata?: boolean;
}

export interface ExportResult {
  success: boolean;
  data?: any;
  filename?: string;
  error?: string;
  metadata?: {
    exportedAt: string;
    totalTables: number;
    totalRecords: number;
  };
}

const availableTables = {
  // Configuration tables
  notificationSettings: { table: schema.notificationSettings, name: 'Configurações de Notificação' },
  biometricCredentials: { table: schema.biometricCredentials, name: 'Credenciais Biométricas' },
  pluggyConfig: { table: schema.pluggyConfig, name: 'Configuração Pluggy' },
  pluggyItems: { table: schema.pluggyItems, name: 'Itens Pluggy' },
  supabaseConfig: { table: schema.supabaseConfig, name: 'Configuração Supabase' },
  n8nConfig: { table: schema.n8nConfig, name: 'Configuração N8N' },
  redisConfig: { table: schema.redisConfig, name: 'Configuração Redis' },
  sentryConfig: { table: schema.sentryConfig, name: 'Configuração Sentry' },
  resendConfig: { table: schema.resendConfig, name: 'Configuração Resend' },
  cloudflareConfig: { table: schema.cloudflareConfig, name: 'Configuração Cloudflare' },
  betterStackConfig: { table: schema.betterStackConfig, name: 'Configuração Better Stack' },
  evolutionApiConfig: { table: schema.evolutionApiConfig, name: 'Configuração Evolution API' },
  
  // Data tables
  files: { table: schema.files, name: 'Arquivos' },
  attachments: { table: schema.attachments, name: 'Anexos' },
  transactionAttachments: { table: schema.transactionAttachments, name: 'Anexos de Transações' },
  cachedTransactions: { table: schema.cachedTransactions, name: 'Transações em Cache' },
  cachedInvoices: { table: schema.cachedInvoices, name: 'Faturas em Cache' },
  cacheMetadata: { table: schema.cacheMetadata, name: 'Metadados de Cache' },
  
  // Integration tables
  pluggyConnections: { table: schema.pluggyConnections, name: 'Conexões Pluggy' },
  deviceTokens: { table: schema.deviceTokens, name: 'Tokens de Dispositivo' },
  notificationHistory: { table: schema.notificationHistory, name: 'Histórico de Notificações' },
  
  // Workspace tables
  workspaceThemes: { table: schema.workspaceThemes, name: 'Temas do Workspace' },
  workspacePages: { table: schema.workspacePages, name: 'Páginas do Workspace' },
  workspaceDatabases: { table: schema.workspaceDatabases, name: 'Bancos de Dados do Workspace' },
  workspaceBoards: { table: schema.workspaceBoards, name: 'Quadros Kanban do Workspace' },
  
  // User tables
  users: { table: schema.users, name: 'Usuários' },
  clients: { table: schema.clients, name: 'Clientes' },
  
  // WhatsApp & Forms
  completionPages: { table: schema.completionPages, name: 'Páginas de Conclusão' },
  forms: { table: schema.forms, name: 'Formulários' },
  formSubmissions: { table: schema.formSubmissions, name: 'Respostas de Formulários' },
  formTemplates: { table: schema.formTemplates, name: 'Templates de Formulários' },
  appSettings: { table: schema.appSettings, name: 'Configurações do App' },
  configurationsWhatsapp: { table: schema.configurationsWhatsapp, name: 'Configurações WhatsApp' },
  leads: { table: schema.leads, name: 'Leads' },
  whatsappLabels: { table: schema.whatsappLabels, name: 'Etiquetas WhatsApp' },
  formularioSessoes: { table: schema.formularioSessoes, name: 'Sessões de Formulário' },
  leadHistorico: { table: schema.leadHistorico, name: 'Histórico de Leads' },
  kanbanLeads: { table: schema.kanbanLeads, name: 'Leads Kanban' },
  
  // System tables
  evolutionQrCodes: { table: schema.evolutionQrCodes, name: 'QR Codes Evolution' },
  limiter: { table: schema.limiter, name: 'Limitador de Taxa' },
  cacheConfig: { table: schema.cacheConfig, name: 'Configuração de Cache' },
  optimizerConfig: { table: schema.optimizerConfig, name: 'Configuração de Otimização' },
  monitoringConfig: { table: schema.monitoringConfig, name: 'Configuração de Monitoramento' },
};

export class ExportService {
  async getAvailableTables() {
    return Object.keys(availableTables).map(key => ({
      id: key,
      name: availableTables[key as keyof typeof availableTables].name
    }));
  }

  async exportData(options: ExportOptions): Promise<ExportResult> {
    try {
      const exportData: Record<string, any[]> = {};
      let totalRecords = 0;

      for (const tableName of options.tables) {
        if (!availableTables[tableName as keyof typeof availableTables]) {
          continue;
        }

        const tableInfo = availableTables[tableName as keyof typeof availableTables];
        
        try {
          const data = await db.select().from(tableInfo.table);
          exportData[tableName] = data;
          totalRecords += data.length;
        } catch (error) {
          console.error(`Error exporting table ${tableName}:`, error);
          exportData[tableName] = [];
        }
      }

      const metadata = {
        exportedAt: new Date().toISOString(),
        totalTables: options.tables.length,
        totalRecords,
      };

      if (options.format === 'json') {
        return {
          success: true,
          data: options.includeMetadata ? { metadata, tables: exportData } : exportData,
          filename: `executiveai-export-${Date.now()}.json`,
          metadata,
        };
      } else if (options.format === 'excel') {
        const buffer = await this.generateExcelFile(exportData, metadata);
        return {
          success: true,
          data: buffer,
          filename: `executiveai-export-${Date.now()}.xlsx`,
          metadata,
        };
      }

      return {
        success: false,
        error: 'Invalid export format',
      };
    } catch (error) {
      console.error('Export error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  private async generateExcelFile(
    exportData: Record<string, any[]>,
    metadata: any
  ): Promise<Buffer> {
    const workbook = XLSX.utils.book_new();

    // Add metadata sheet
    const metadataSheet = XLSX.utils.json_to_sheet([
      { Campo: 'Data de Exportação', Valor: metadata.exportedAt },
      { Campo: 'Total de Tabelas', Valor: metadata.totalTables },
      { Campo: 'Total de Registros', Valor: metadata.totalRecords },
    ]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadados');

    // Add data sheets
    for (const [tableName, data] of Object.entries(exportData)) {
      if (data.length > 0) {
        const tableInfo = availableTables[tableName as keyof typeof availableTables];
        const sheetName = tableInfo?.name.substring(0, 31) || tableName.substring(0, 31);
        
        const processedData = data.map(row => {
          const processed: Record<string, any> = {};
          for (const [key, value] of Object.entries(row)) {
            if (typeof value === 'object' && value !== null) {
              processed[key] = JSON.stringify(value);
            } else {
              processed[key] = value;
            }
          }
          return processed;
        });

        const sheet = XLSX.utils.json_to_sheet(processedData);
        XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
      }
    }

    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  async getTableStats() {
    const stats: Record<string, { count: number; name: string }> = {};

    for (const [key, tableInfo] of Object.entries(availableTables)) {
      try {
        const result = await db.select({ count: sql<number>`count(*)` }).from(tableInfo.table);
        stats[key] = {
          count: Number(result[0]?.count || 0),
          name: tableInfo.name,
        };
      } catch (error) {
        console.error(`Error getting stats for ${key}:`, error);
        stats[key] = { count: 0, name: tableInfo.name };
      }
    }

    return stats;
  }
}

export const exportService = new ExportService();
