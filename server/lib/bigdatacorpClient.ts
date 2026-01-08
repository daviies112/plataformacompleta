import axios, { AxiosError } from "axios";
import { db } from "../db";
import { bigdatacorpConfig } from "../../shared/db-schema";
import { eq } from "drizzle-orm";
import { decrypt } from "./credentialsManager";

const BIGDATACORP_API_URL = process.env.BIGDATACORP_API_URL || "https://plataforma.bigdatacorp.com.br/pessoas";

interface BigdatacorpCredentials {
  tokenId: string;
  chaveToken: string;
  supabaseMasterUrl?: string | null;
  supabaseMasterServiceRoleKey?: string | null;
}

async function getCredentials(tenantId?: string): Promise<BigdatacorpCredentials | null> {
  console.log(`[bigdatacorp] getCredentials chamado com tenantId: ${tenantId || 'undefined'}`);
  
  if (tenantId) {
    try {
      const configFromDb = await db.select().from(bigdatacorpConfig)
        .where(eq(bigdatacorpConfig.tenantId, tenantId))
        .limit(1);
      
      console.log(`[bigdatacorp] Registros encontrados no DB para tenant ${tenantId}: ${configFromDb.length}`);
      
      if (configFromDb[0]) {
        console.log(`[bigdatacorp] ✅ Credenciais encontradas no DB para tenant: ${tenantId}`);
        return {
          tokenId: decrypt(configFromDb[0].tokenId),
          chaveToken: decrypt(configFromDb[0].chaveToken),
          supabaseMasterUrl: configFromDb[0].supabaseMasterUrl ? decrypt(configFromDb[0].supabaseMasterUrl) : null,
          supabaseMasterServiceRoleKey: configFromDb[0].supabaseMasterServiceRoleKey ? decrypt(configFromDb[0].supabaseMasterServiceRoleKey) : null,
        };
      } else {
        console.log(`[bigdatacorp] ⚠️ Nenhuma credencial no DB para tenant: ${tenantId}`);
      }
    } catch (error) {
      console.log('[bigdatacorp] Erro ao buscar credenciais do DB, usando env vars como fallback:', error);
    }
  } else {
    console.log('[bigdatacorp] ⚠️ tenantId não fornecido, tentando env vars');
  }
  
  const tokenId = process.env.TOKEN_ID;
  const chaveToken = process.env.CHAVE_TOKEN;
  
  if (tokenId && chaveToken) {
    console.log('[bigdatacorp] ✅ Usando credenciais das env vars');
    return {
      tokenId,
      chaveToken,
      supabaseMasterUrl: process.env.SUPABASE_MASTER_URL,
      supabaseMasterServiceRoleKey: process.env.SUPABASE_MASTER_SERVICE_ROLE_KEY,
    };
  }
  
  console.log('[bigdatacorp] ❌ Nenhuma credencial encontrada (nem DB, nem env vars)');
  return null;
}

class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number;

  constructor(requestsPerSecond: number = 2) {
    this.maxTokens = requestsPerSecond;
    this.tokens = requestsPerSecond;
    this.refillRate = requestsPerSecond;
    this.lastRefill = Date.now();
  }

  private refillTokens(): void {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    const waitTime = ((1 - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    
    this.refillTokens();
    this.tokens -= 1;
  }
}

const rateLimiter = new RateLimiter(2);

export interface BigdatacorpProcessesRequest {
  Datasets: string;
  q: string;
  returnupdates?: boolean;
  applyFiltersToStats?: boolean;
  returncvmprocesses?: boolean;
  updateslimit?: number;
}

export interface BigdatacorpParty {
  Name?: string;
  Document?: string;
  Type?: string;
  Polarity?: string;
  OAB?: string;
  OABState?: string;
}

export interface BigdatacorpUpdate {
  Date?: string;
  Description?: string;
  Content?: string;
  PublicationDate?: string;
  CaptureDate?: string;
}

export interface BigdatacorpDecision {
  Date?: string;
  Content?: string;
  Description?: string;
}

export interface BigdatacorpPetition {
  Date?: string;
  Content?: string;
  Type?: string;
}

export interface BigdatacorpLawsuit {
  Number?: string;
  ProcessNumber?: string;
  Court?: string;
  CourtName?: string;
  CourtType?: string;
  CourtLevel?: number;
  CourtDistrict?: string;
  CourtSection?: string;
  State?: string;
  Status?: string;
  Value?: number;
  Type?: string;
  Class?: string;
  Area?: string;
  Instance?: string;
  Judge?: string;
  JudgingBody?: string;
  CaptureDate?: string;
  CloseDate?: string;
  LastMovementDate?: string;
  LastUpdate?: string;
  NoticeDate?: string;
  PublicationDate?: string;
  RedistributionDate?: string;
  ResJudicataDate?: string;
  Subject?: string;
  MainSubject?: string;
  SubjectCodes?: string[];
  InferredCNJSubjectName?: string;
  InferredBroadCNJSubjectName?: string;
  InferredCNJProcedureTypeName?: string;
  LawSuitAge?: number;
  NumberOfParties?: number;
  NumberOfUpdates?: number;
  NumberOfPages?: number;
  NumberOfVolumes?: number;
  AverageNumberOfUpdatesPerMonth?: number;
  Parties?: BigdatacorpParty[];
  Updates?: BigdatacorpUpdate[];
  Decisions?: BigdatacorpDecision[];
  Petitions?: BigdatacorpPetition[];
}

export interface BigdatacorpProcessesResponse {
  Result: Array<{
    MatchKeys: string;
    Processes: {
      Lawsuits: BigdatacorpLawsuit[];
      TotalLawsuits: number;
      TotalLawsuitsAsAuthor: number;
      TotalLawsuitsAsDefendant: number;
      TotalLawsuitsAsOther: number;
      FirstLawsuitDate?: string;
      LastLawsuitDate?: string;
      Last30DaysLawsuits?: number;
      Last90DaysLawsuits?: number;
      Last180DaysLawsuits?: number;
      Last365DaysLawsuits?: number;
    };
  }>;
  QueryId: string;
  ElapsedMilliseconds: number;
  QueryDate: string;
  Evidences?: any;
  Status: {
    processes: Array<{
      Code: number;
      Message: string;
    }>;
  };
}

function log(message: string, data?: any) {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} [bigdatacorp]`, message, data || "");
}

export async function consultarProcessosJudiciais(
  cpf: string,
  options: {
    returnupdates?: boolean;
    updateslimit?: number;
    tenantId?: string;
  } = {}
): Promise<BigdatacorpProcessesResponse> {
  const credentials = await getCredentials(options.tenantId);
  
  if (!credentials) {
    throw new Error("CHAVE_TOKEN ou TOKEN_ID não configurado. Configure na página de Configurações ou nas secrets do Replit.");
  }

  const requestPayload: BigdatacorpProcessesRequest = {
    Datasets: "processes",
    q: `doc{${cpf}}`,
    returnupdates: options.returnupdates ?? true,
    updateslimit: options.updateslimit ?? 100,
  };

  log("Consultando Bigdatacorp API", { cpf: cpf.substring(0, 3) + "***" });

  await rateLimiter.acquire();

  try {
    const response = await axios.post<BigdatacorpProcessesResponse>(
      BIGDATACORP_API_URL,
      requestPayload,
      {
        headers: {
          AccessToken: credentials.chaveToken,
          TokenId: credentials.tokenId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const statusCode = response.data.Status?.processes?.[0]?.Code;
    const statusMessage = response.data.Status?.processes?.[0]?.Message;
    
    if (!response.data.Status || statusCode !== 0) {
      const errorMsg = statusMessage || JSON.stringify(response.data);
      log("Erro na API Bigdatacorp", { 
        code: statusCode, 
        message: errorMsg,
        fullResponse: response.data 
      });
      throw new Error(`Bigdatacorp retornou erro: ${errorMsg}`);
    }

    const processData = response.data.Result?.[0]?.Processes;
    if (!processData) {
      log("Resposta da API não contém dados de processos", { response: response.data });
      throw new Error("Resposta da API não contém dados de processos");
    }

    log("Consulta Bigdatacorp bem-sucedida", {
      totalProcessos: processData.TotalLawsuits,
      statusCode: statusCode,
    });

    return response.data;
  } catch (error) {
    if (error instanceof AxiosError) {
      log("Erro HTTP na API Bigdatacorp", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
      });
      
      const errorDetail = error.response?.data?.Status?.Message 
        || error.response?.data?.message 
        || error.response?.statusText 
        || error.message;
      
      throw new Error(`Bigdatacorp API falhou (${error.response?.status || 'network error'}): ${errorDetail}`);
    }
    throw error;
  }
}

export async function consultarProcessosJudiciaisComRetry(
  cpf: string,
  maxRetries = 3
): Promise<BigdatacorpProcessesResponse> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await consultarProcessosJudiciais(cpf);
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt) * 1000;
        log(`Tentativa ${attempt} falhou, aguardando ${delayMs}ms antes de retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  throw new Error(`Falha após ${maxRetries} tentativas: ${lastError!.message}`);
}

export async function isBigdatacorpConfigured(tenantId?: string): Promise<boolean> {
  const credentials = await getCredentials(tenantId);
  return credentials !== null;
}

// ============================================================================
// DADOS CADASTRAIS (basic_data) - Custo: R$ 0,030 por consulta
// ============================================================================

export interface BigdatacorpBasicDataResponse {
  Result: Array<{
    MatchKeys: string;
    BasicData: {
      Name?: string;
      TaxIdStatus?: string;
      TaxIdStatusDate?: string;
      BirthDate?: string;
      MotherName?: string;
      FatherName?: string;
      Gender?: string;
      Age?: number;
      DeathDate?: string;
      DeathYear?: number;
      Nationality?: string;
      Origin?: string;
      Signo?: string;
      SimilarityScore?: {
        Name?: number;
        MotherName?: number;
      };
      MatchBirthDate?: boolean;
      TaxIdOrigin?: string;
      TaxIdType?: string;
      TaxIdCountry?: string;
    };
  }>;
  QueryId: string;
  ElapsedMilliseconds: number;
  QueryDate: string;
  Status: {
    basic_data: Array<{
      Code: number;
      Message: string;
    }>;
  };
}

export interface DadosCadastraisResult {
  success: boolean;
  data?: BigdatacorpBasicDataResponse;
  error?: string;
  custo: number;
}

export async function consultarDadosCadastrais(
  cpf: string,
  nome?: string,
  dataNascimento?: string,
  tenantId?: string
): Promise<DadosCadastraisResult> {
  const credentials = await getCredentials(tenantId);
  
  if (!credentials) {
    return {
      success: false,
      error: "CHAVE_TOKEN ou TOKEN_ID não configurado",
      custo: 0.030,
    };
  }

  let query = `doc{${cpf}}`;
  if (nome) {
    query += ` name{${nome}}`;
  }
  if (dataNascimento) {
    query += ` birthdate{${dataNascimento}}`;
  }

  const requestPayload = {
    Datasets: "basic_data",
    q: query,
  };

  log("Consultando Dados Cadastrais", { cpf: cpf.substring(0, 3) + "***" });

  await rateLimiter.acquire();

  try {
    const response = await axios.post<BigdatacorpBasicDataResponse>(
      BIGDATACORP_API_URL,
      requestPayload,
      {
        headers: {
          AccessToken: credentials.chaveToken,
          TokenId: credentials.tokenId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const statusCode = response.data.Status?.basic_data?.[0]?.Code;
    const statusMessage = response.data.Status?.basic_data?.[0]?.Message;

    if (statusCode !== 0 && statusCode !== undefined) {
      log("Erro ao consultar dados cadastrais", { 
        code: statusCode, 
        message: statusMessage 
      });
      return {
        success: false,
        error: statusMessage || `Código de erro: ${statusCode}`,
        custo: 0.030,
      };
    }

    log("Dados Cadastrais obtidos com sucesso", {
      nome: response.data.Result?.[0]?.BasicData?.Name,
      cpfStatus: response.data.Result?.[0]?.BasicData?.TaxIdStatus,
    });

    return {
      success: true,
      data: response.data,
      custo: 0.030,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      log("Erro HTTP ao consultar dados cadastrais", {
        status: error.response?.status,
        message: error.message,
      });
      return {
        success: false,
        error: `Erro HTTP: ${error.response?.status || error.message}`,
        custo: 0.030,
      };
    }
    return {
      success: false,
      error: (error as Error).message,
      custo: 0.030,
    };
  }
}

// ============================================================================
// PRESENÇA EM COBRANÇA (collections) - Custo: R$ 0,070 por consulta
// ============================================================================

export interface BigdatacorpCollectionsResponse {
  Result: Array<{
    MatchKeys: string;
    Collections: {
      TotalOccurrences?: number;
      ConsecutiveMonths?: number;
      Last3Months?: number;
      Last6Months?: number;
      Last12Months?: number;
      Last24Months?: number;
      Last36Months?: number;
      FirstOccurrenceDate?: string;
      LastOccurrenceDate?: string;
      HasActiveCollections?: boolean;
      CollectionDetails?: Array<{
        Date?: string;
        Value?: number;
        Creditor?: string;
        Type?: string;
        Status?: string;
      }>;
    };
  }>;
  QueryId: string;
  ElapsedMilliseconds: number;
  QueryDate: string;
  Status: {
    collections: Array<{
      Code: number;
      Message: string;
    }>;
  };
}

export interface PresencaCobrancaResult {
  success: boolean;
  data?: BigdatacorpCollectionsResponse;
  error?: string;
  custo: number;
}

export async function consultarPresencaCobranca(
  cpf: string,
  dataNascimento?: string,
  tenantId?: string
): Promise<PresencaCobrancaResult> {
  const credentials = await getCredentials(tenantId);
  
  if (!credentials) {
    return {
      success: false,
      error: "CHAVE_TOKEN ou TOKEN_ID não configurado",
      custo: 0.070,
    };
  }

  let query = `doc{${cpf}}`;
  if (dataNascimento) {
    query += ` birthdate{${dataNascimento}} dateformat{yyyy-MM-dd}`;
  }

  const requestPayload = {
    Datasets: "collections",
    q: query,
  };

  log("Consultando Presença em Cobrança", { cpf: cpf.substring(0, 3) + "***" });

  await rateLimiter.acquire();

  try {
    const response = await axios.post<BigdatacorpCollectionsResponse>(
      BIGDATACORP_API_URL,
      requestPayload,
      {
        headers: {
          AccessToken: credentials.chaveToken,
          TokenId: credentials.tokenId,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        timeout: 30000,
      }
    );

    const statusCode = response.data.Status?.collections?.[0]?.Code;
    const statusMessage = response.data.Status?.collections?.[0]?.Message;

    if (statusCode !== 0 && statusCode !== undefined) {
      log("Erro ao consultar presença em cobrança", { 
        code: statusCode, 
        message: statusMessage 
      });
      return {
        success: false,
        error: statusMessage || `Código de erro: ${statusCode}`,
        custo: 0.070,
      };
    }

    const collections = response.data.Result?.[0]?.Collections;
    log("Presença em Cobrança obtida com sucesso", {
      totalOcorrencias: collections?.TotalOccurrences || 0,
      ultimos12Meses: collections?.Last12Months || 0,
    });

    return {
      success: true,
      data: response.data,
      custo: 0.070,
    };
  } catch (error) {
    if (error instanceof AxiosError) {
      log("Erro HTTP ao consultar presença em cobrança", {
        status: error.response?.status,
        message: error.message,
      });
      return {
        success: false,
        error: `Erro HTTP: ${error.response?.status || error.message}`,
        custo: 0.070,
      };
    }
    return {
      success: false,
      error: (error as Error).message,
      custo: 0.070,
    };
  }
}

// ============================================================================
// CONSULTA COMPLETA DO CANDIDATO - 3 APIs em paralelo
// ============================================================================

export interface ConsultaCompletaResult {
  dadosCadastrais: DadosCadastraisResult;
  presencaCobranca: PresencaCobrancaResult;
  processosJudiciais: {
    success: boolean;
    data?: BigdatacorpProcessesResponse;
    error?: string;
    custo: number;
  };
  metadata: {
    tempoConsulta: string;
    custoTotal: string;
    timestamp: string;
  };
}

export async function consultarCandidatoCompleto(
  cpf: string,
  nome?: string,
  dataNascimento?: string,
  tenantId?: string
): Promise<ConsultaCompletaResult> {
  log(`🔍 Iniciando consulta completa para CPF: ${cpf.substring(0, 3)}*** (tenant: ${tenantId || 'none'})`);
  
  const inicioConsulta = Date.now();

  const [dadosCadastrais, presencaCobranca, processosJudiciais] = await Promise.all([
    consultarDadosCadastrais(cpf, nome, dataNascimento, tenantId),
    consultarPresencaCobranca(cpf, dataNascimento, tenantId),
    consultarProcessosJudiciais(cpf, { tenantId })
      .then(data => ({ success: true, data, custo: 0.070 }))
      .catch(error => ({ success: false, error: (error as Error).message, custo: 0.070, data: undefined })),
  ]);

  const tempoConsulta = Date.now() - inicioConsulta;
  const custoTotal = dadosCadastrais.custo + presencaCobranca.custo + processosJudiciais.custo;

  log(`✅ Consulta completa concluída em ${tempoConsulta}ms`);
  log(`💰 Custo total: R$ ${custoTotal.toFixed(3)}`);

  return {
    dadosCadastrais,
    presencaCobranca,
    processosJudiciais,
    metadata: {
      tempoConsulta: `${tempoConsulta}ms`,
      custoTotal: custoTotal.toFixed(3),
      timestamp: new Date().toISOString(),
    },
  };
}
