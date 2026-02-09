/**
 * Tipos TypeScript para a Plataforma de Formulários
 * 
 * Este arquivo contém as definições de tipos para formulários,
 * campos, submissões e configurações.
 */

/**
 * Tipos de campos disponíveis no formulário
 */
export type TipoCampo =
  | 'texto'
  | 'texto_longo'
  | 'email'
  | 'telefone'
  | 'numero'
  | 'data'
  | 'hora'
  | 'data_hora'
  | 'select'
  | 'select_multiplo'
  | 'radio'
  | 'checkbox'
  | 'arquivo'
  | 'url'
  | 'cpf'
  | 'cnpj'
  | 'cep'
  | 'moeda'
  | 'avaliacao'
  | 'escala'
  | 'assinatura';

/**
 * Regras de validação para campos
 */
export interface RegrasValidacao {
  obrigatorio?: boolean;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  customValidation?: string;
}

/**
 * Campo individual do formulário
 */
export interface CampoFormulario {
  id: string;
  tipo: TipoCampo;
  label: string;
  placeholder?: string;
  descricao?: string;
  validacao: RegrasValidacao;
  opcoes?: string[]; // Para select, radio, checkbox
  condicional?: {
    campoId: string;
    valor: any;
    operador: 'igual' | 'diferente' | 'contem' | 'maior' | 'menor';
  };
  largura?: 'completa' | 'metade' | 'terco' | 'dois_tercos';
  ordem: number;
}

/**
 * Configurações de estilo do formulário
 */
export interface EstiloFormulario {
  tema?: 'claro' | 'escuro' | 'auto';
  corPrimaria?: string;
  corFundo?: string;
  corTexto?: string;
  corBotao?: string;
  fonte?: string;
  logoUrl?: string;
  logo?: string;
  logoSize?: number;
  logoAlignment?: 'left' | 'center' | 'right';
  extractedColors?: string[];
}

/**
 * Configurações de notificação
 */
export interface ConfiguracoesNotificacao {
  notificarPorEmail?: boolean;
  emailsNotificacao?: string[];
  mensagemSucesso?: string;
  redirecionarAposEnvio?: boolean;
  urlRedirecionamento?: string;
}

/**
 * Formulário completo
 */
export interface Formulario {
  id: string;
  userId: string;
  titulo: string;
  descricao?: string;
  campos: CampoFormulario[];
  estilo: EstiloFormulario;
  notificacoes: ConfiguracoesNotificacao;
  ativo: boolean;
  publico: boolean;
  linkPublico?: string;
  permitirEdicao?: boolean;
  permitirMultiplasSubmissoes?: boolean;
  dataExpiracao?: Date;
  limiteTentativas?: number;
  criadoEm: Date;
  atualizadoEm: Date;
  totalSubmissoes: number;
}

/**
 * Resposta de um campo
 */
export interface RespostaCampo {
  campoId: string;
  valor: any;
  label: string;
  tipo: TipoCampo;
}

/**
 * Submissão do formulário
 */
export interface SubmissaoFormulario {
  id: string;
  formularioId: string;
  respostas: RespostaCampo[];
  ip?: string;
  userAgent?: string;
  localizacao?: {
    cidade?: string;
    estado?: string;
    pais?: string;
  };
  enviadoEm: Date;
  editadoEm?: Date;
  status: 'pendente' | 'aprovado' | 'rejeitado' | 'arquivado';
  notas?: string;
}

/**
 * Estatísticas do formulário
 */
export interface EstatisticasFormulario {
  formularioId: string;
  totalSubmissoes: number;
  totalVisitas: number;
  taxaConversao: number;
  tempoMedioPreenchimento: number; // em segundos
  submissoesPorDia: {
    data: string;
    quantidade: number;
  }[];
  camposPopulares: {
    campoId: string;
    label: string;
    taxaPreenchimento: number;
  }[];
  dispositivosUsados: {
    tipo: 'desktop' | 'mobile' | 'tablet';
    quantidade: number;
    porcentagem: number;
  }[];
}

/**
 * Filtros para listagem de formulários
 */
export interface FiltrosFormulario {
  busca?: string;
  ativo?: boolean;
  publico?: boolean;
  dataInicio?: Date;
  dataFim?: Date;
  ordenarPor?: 'titulo' | 'criado_em' | 'atualizado_em' | 'total_submissoes';
  ordem?: 'asc' | 'desc';
  pagina?: number;
  limite?: number;
}

/**
 * Resposta paginada de formulários
 */
export interface FormulariosResponse {
  formularios: Formulario[];
  total: number;
  pagina: number;
  totalPaginas: number;
}

/**
 * Template de formulário
 */
export interface TemplateFormulario {
  id: string;
  nome: string;
  descricao: string;
  categoria: string;
  campos: Omit<CampoFormulario, 'id'>[];
  icone?: string;
  popular?: boolean;
}

/**
 * Exportação de dados
 */
export interface ExportacaoFormulario {
  formularioId: string;
  formato: 'csv' | 'excel' | 'json' | 'pdf';
  incluirEstatisticas?: boolean;
  filtroStatus?: SubmissaoFormulario['status'][];
  dataInicio?: Date;
  dataFim?: Date;
}
