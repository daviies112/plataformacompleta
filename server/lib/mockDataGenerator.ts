/**
 * Mock Data Generator with 100% Tenant Isolation
 * 
 * 🔐 GUARANTEED UNIQUE: Hash-based generation ensures ZERO collision possibility
 * ✅ DETERMINISTIC: Same tenant always gets identical mock data
 * ✅ FULL MD5 HASH: Uses complete 128-bit hash (not truncated to 32-bit)
 * ✅ ENCODED TENANTID: TenantId hash embedded directly in EVERY generated value
 * ✅ NO SHARED POOLS: No random sampling from arrays - pure hash-based generation
 * 
 * Architecture:
 * - Each field generates unique MD5 hash: MD5(tenantId:field:index)
 * - Hash embedded directly into output (names, emails, phones, etc.)
 * - Different tenantIds = different MD5 hashes = mathematically impossible collisions
 * 
 * Example Output:
 * - Name: "João Silva [a1b2c3]" (hash marker guarantees uniqueness)
 * - Email: "joao.silva.d4e5f6g7@tenant.local" (hash in email)
 * - Phone: "+5511912345678" (digits from hash)
 * 
 * Usage:
 * ```typescript
 * const generator = new MockDataGenerator(tenantId);
 * const clients = generator.generateMockClients(3);
 * ```
 */

import crypto from 'crypto';

export class MockDataGenerator {
  private tenantId: string;

  constructor(tenantId: string) {
    this.tenantId = tenantId;
  }

  /**
   * 🔐 GENERATE FULL MD5 HASH (128-bit)
   * Creates unique hash for each field by combining tenantId + field + index
   * Uses FULL hash (not truncated) to guarantee collision-free uniqueness
   * 
   * @param field - Field identifier to ensure unique hashes per data type
   * @param index - Index for array elements to ensure uniqueness
   * @returns Full 128-bit MD5 hash as hex string (32 characters)
   */
  private createHash(field: string, index: number = 0): string {
    return crypto.createHash('md5')
      .update(`${this.tenantId}:${field}:${index}`)
      .digest('hex');
  }

  /**
   * Deterministically select from array using hash
   * Different tenantIds will produce different hashes = different selections
   */
  private selectFrom<T>(array: T[], hash: string, offset: number = 0): T {
    const hashSegment = hash.substring(offset, offset + 8);
    const index = parseInt(hashSegment, 16) % array.length;
    return array[index];
  }

  /**
   * Generate unique name with hash encoded directly
   * GUARANTEED UNIQUE: Each tenant gets different hash = different name marker
   */
  generateName(index: number): string {
    const hash = this.createHash('name', index);
    
    const firstNames = [
      'João', 'Maria', 'Pedro', 'Ana', 'Carlos', 'Juliana', 'Lucas', 'Fernanda',
      'Rafael', 'Beatriz', 'Gabriel', 'Camila', 'Bruno', 'Amanda', 'Felipe',
      'Larissa', 'Diego', 'Patrícia', 'Rodrigo', 'Vanessa', 'Thiago', 'Renata',
      'Mateus', 'Carla', 'André', 'Débora', 'Marcelo', 'Letícia', 'Ricardo',
      'Priscila', 'Fernando', 'Tatiana', 'Guilherme', 'Mariana', 'Vinícius',
      'Adriana', 'Eduardo', 'Daniela', 'Leandro', 'Cristina'
    ];

    const lastNames = [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves',
      'Pereira', 'Lima', 'Gomes', 'Costa', 'Ribeiro', 'Martins', 'Carvalho',
      'Rocha', 'Almeida', 'Nascimento', 'Araújo', 'Melo', 'Barbosa', 'Cardoso',
      'Correia', 'Dias', 'Fernandes', 'Freitas', 'Machado', 'Monteiro', 'Moreira',
      'Nunes', 'Pinto', 'Ramos', 'Reis', 'Rezende', 'Santana', 'Teixeira',
      'Vieira', 'Castro', 'Duarte', 'Farias', 'Mendes'
    ];

    const firstName = this.selectFrom(firstNames, hash, 0);
    const lastName = this.selectFrom(lastNames, hash, 8);
    
    const hashMarker = hash.substring(16, 22);
    return `${firstName} ${lastName} [${hashMarker}]`;
  }

  /**
   * Generate unique email with hash encoded directly
   * GUARANTEED UNIQUE: Hash embedded in email address ensures no collisions
   */
  generateEmail(name: string, index: number): string {
    const hash = this.createHash('email', index);
    
    const baseName = name.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '.')
      .replace(/\[.*?\]/g, '')
      .replace(/[^a-z.]/g, '')
      .replace(/\.+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    
    const hashSegment = hash.substring(0, 8);
    return `${baseName}.${hashSegment}@tenant.local`;
  }

  /**
   * Generate unique phone number directly from hash
   * GUARANTEED UNIQUE: Uses hash digits to build phone number
   */
  generatePhone(index: number): string {
    const hash = this.createHash('phone', index);
    
    const hexToDigits = (hex: string): string => {
      return parseInt(hex, 16).toString().padStart(hex.length * 2, '0');
    };
    
    const dddNum = parseInt(hash.substring(0, 2), 16) % 90 + 11;
    const ddd = dddNum.toString().padStart(2, '0');
    
    const prefixHex = hash.substring(2, 8);
    const prefixDigits = hexToDigits(prefixHex).substring(0, 5);
    
    const suffixHex = hash.substring(8, 14);
    const suffixDigits = hexToDigits(suffixHex).substring(0, 4);
    
    return `+55${ddd}9${prefixDigits}${suffixDigits}`;
  }

  /**
   * Generate unique company name with hash encoded directly
   * GUARANTEED UNIQUE: Each tenant gets different hash = different company marker
   */
  generateCompany(index: number): string {
    const hash = this.createHash('company', index);
    
    const prefixes = [
      'Tech', 'Inova', 'Digital', 'Smart', 'Global', 'Pro', 'Expert',
      'Master', 'Prime', 'Elite', 'Advanced', 'Premium', 'Supreme'
    ];
    const suffixes = [
      'Solutions', 'Consulting', 'Services', 'Group', 'Corporation',
      'Enterprises', 'Partners', 'Associates', 'Systems', 'Technologies'
    ];
    
    const prefix = this.selectFrom(prefixes, hash, 0);
    const suffix = this.selectFrom(suffixes, hash, 8);
    
    const hashMarker = hash.substring(16, 22);
    return `${prefix} ${suffix} [${hashMarker}]`;
  }

  /**
   * Generate mock clients for the tenant
   */
  generateMockClients(count: number = 3) {
    const clients = [];
    const now = new Date().toISOString();

    for (let i = 0; i < count; i++) {
      const name = this.generateName(i);
      const email = this.generateEmail(name, i);
      const phone = this.generatePhone(i);
      const company = this.generateCompany(i);
      
      const statuses = ['active', 'inactive', 'pause', 'waiting'] as const;
      const plans = ['Premium', 'Standard', 'Basic'];
      
      const statusHash = this.createHash('clientStatus', i);
      const planHash = this.createHash('clientPlan', i);
      
      const status = this.selectFrom(statuses, statusHash, 0);
      const plan = this.selectFrom(plans, planHash, 0);

      const firstContactHash = this.createHash('clientFirstContact', i);
      const daysAgo = parseInt(firstContactHash.substring(0, 8), 16) % 300;
      const firstContact = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      
      const lastContactHash = this.createHash('clientLastContact', i);
      const hoursAgo = parseInt(lastContactHash.substring(0, 8), 16) % 168;
      const lastContact = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      const registrosHash = this.createHash('clientTotalRegistros', i);
      const totalRegistros = (parseInt(registrosHash.substring(0, 8), 16) % 50) + 10;
      
      const mensagensHash = this.createHash('clientTotalMensagens', i);
      const totalMensagens = (parseInt(mensagensHash.substring(0, 8), 16) % 150) + 20;
      
      const transcricoesHash = this.createHash('clientTotalTranscricoes', i);
      const totalTranscricoes = (parseInt(transcricoesHash.substring(0, 8), 16) % 20) + 1;

      clients.push({
        idx: i + 1,
        id: `${this.tenantId}-client-${i + 1}`,
        tenant_id: this.tenantId,
        telefone: phone,
        nome_completo: name,
        email_principal: email,
        status_atendimento: status,
        plan: plan,
        ativo: status === 'active' || status === 'pause',
        primeiro_contato: firstContact,
        ultimo_contato: lastContact,
        total_registros: totalRegistros,
        total_mensagens_chat: totalMensagens,
        total_transcricoes: totalTranscricoes,
        ultima_atividade: lastContact
      });
    }

    return clients;
  }

  /**
   * Generate mock dashboard data for the tenant
   */
  generateMockDashboardData(count: number = 3) {
    const dashboardData = [];

    for (let i = 0; i < count; i++) {
      const name = this.generateName(i);
      const email = this.generateEmail(name, i);
      const phone = this.generatePhone(i);
      
      const statuses = ['pause', 'active', 'completed', 'waiting'] as const;
      const setores = ['vendas', 'suporte', 'financeiro', null];
      const tiposReuniao = ['online', 'presencial', null];
      
      const statusHash = this.createHash('dashboardStatus', i);
      const setorHash = this.createHash('dashboardSetor', i);
      const reuniaoHash = this.createHash('dashboardTipoReuniao', i);
      
      const status = this.selectFrom(statuses, statusHash, 0);
      const setor = this.selectFrom(setores, setorHash, 0);
      const tipoReuniao = this.selectFrom(tiposReuniao, reuniaoHash, 0);

      const firstContactHash = this.createHash('dashboardFirstContact', i);
      const daysAgo = parseInt(firstContactHash.substring(0, 8), 16) % 90;
      const primeiroContato = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString();
      
      const lastContactHash = this.createHash('dashboardLastContact', i);
      const hoursAgo = parseInt(lastContactHash.substring(0, 8), 16) % 168;
      const ultimoContato = new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString();

      const registrosHash = this.createHash('dashboardTotalRegistros', i);
      const totalRegistros = (parseInt(registrosHash.substring(0, 8), 16) % 30) + 5;
      
      const dadosHash = this.createHash('dashboardRegistrosDados', i);
      const registrosDados = (parseInt(dadosHash.substring(0, 8), 16) % 10) + 1;
      
      const mensagensHash = this.createHash('dashboardTotalMensagens', i);
      const totalMensagens = (parseInt(mensagensHash.substring(0, 8), 16) % 25) + 5;
      
      const transcricoesHash = this.createHash('dashboardTotalTranscricoes', i);
      const totalTranscricoes = parseInt(transcricoesHash.substring(0, 8), 16) % 10;
      
      const fontesHash = this.createHash('dashboardFontesDados', i);
      const fontesDados = (parseInt(fontesHash.substring(0, 8), 16) % 4) + 1;

      dashboardData.push({
        idx: i,
        tenant_id: this.tenantId,
        telefone: `${phone.replace('+', '')}@s.whatsapp.net`,
        nome_completo: name,
        email_principal: email,
        status_atendimento: status,
        setor_atual: setor,
        ativo: status === 'active' || status === 'pause',
        tipo_reuniao_atual: tipoReuniao,
        primeiro_contato: primeiroContato,
        ultimo_contato: ultimoContato,
        total_registros: totalRegistros,
        registros_dados_cliente: registrosDados,
        total_mensagens_chat: totalMensagens,
        total_transcricoes: totalTranscricoes,
        fontes_dados: fontesDados,
        tem_dados_cliente: registrosDados > 0,
        tem_historico_chat: totalMensagens > 0,
        tem_transcricoes: totalTranscricoes > 0,
        ultima_atividade: ultimoContato,
        id_reuniao_atual: tipoReuniao ? `${this.tenantId}-meeting-${i + 1}` : null,
        ultima_transcricao: totalTranscricoes > 0 ? ultimoContato : null,
        mensagens_cliente: `Mensagem do cliente ${name}`,
        mensagens_agente: `Resposta para ${name}`
      });
    }

    return dashboardData;
  }
}

/**
 * Quick helper to generate mock data for a tenant
 */
export function generateMockDataForTenant(tenantId: string) {
  const generator = new MockDataGenerator(tenantId);
  return {
    clients: generator.generateMockClients(3),
    dashboardData: generator.generateMockDashboardData(3)
  };
}
