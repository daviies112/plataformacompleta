/**
 * Standard Fields Definition for Complete Registration Forms
 * 
 * This file contains the canonical definition of standard fields
 * for complete customer registration forms.
 * 
 * These fields follow the JSONB questions structure used in form_templates
 * and forms tables.
 */

export interface QuestionField {
  id: string;
  type: string;
  title: string;
  description?: string;
  required: boolean;
  fieldType?: string;
  validation?: {
    type?: string;
    pattern?: string;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
  options?: string[];
  score?: number;
}

/**
 * Standard fields for complete customer registration
 * 11 essential fields following best practices
 */
export const STANDARD_REGISTRATION_FIELDS: QuestionField[] = [
  {
    id: "cpf_cnpj",
    type: "short_text",
    title: "CPF/CNPJ",
    description: "Informe seu CPF ou CNPJ",
    required: true,
    fieldType: "cpf_cnpj",
    validation: {
      type: "cpf_cnpj"
    },
    score: 0
  },
  {
    id: "nome_razao_social",
    type: "short_text",
    title: "Nome/Razão Social",
    description: "Nome completo ou razão social da empresa",
    required: true,
    validation: {
      minLength: 3,
      maxLength: 200
    },
    score: 0
  },
  {
    id: "data_nascimento",
    type: "date",
    title: "Data de nascimento",
    description: "Informe sua data de nascimento",
    required: false,
    score: 0
  },
  {
    id: "email",
    type: "email",
    title: "E-mail",
    description: "Seu melhor e-mail para contato",
    required: true,
    validation: {
      type: "email"
    },
    score: 0
  },
  {
    id: "contato",
    type: "phone_number",
    title: "Contato",
    description: "Telefone ou WhatsApp para contato",
    required: true,
    validation: {
      type: "phone"
    },
    score: 0
  },
  {
    id: "endereco",
    type: "short_text",
    title: "Endereço",
    description: "Rua, avenida, travessa, etc.",
    required: false,
    validation: {
      maxLength: 200
    },
    score: 0
  },
  {
    id: "numero",
    type: "short_text",
    title: "Número",
    description: "Número do endereço",
    required: false,
    validation: {
      maxLength: 20
    },
    score: 0
  },
  {
    id: "bairro",
    type: "short_text",
    title: "Bairro",
    description: "Nome do bairro",
    required: false,
    validation: {
      maxLength: 100
    },
    score: 0
  },
  {
    id: "cidade",
    type: "short_text",
    title: "Cidade",
    description: "Cidade - UF (ex: São Paulo - SP)",
    required: false,
    validation: {
      maxLength: 100
    },
    score: 0
  },
  {
    id: "cep",
    type: "short_text",
    title: "CEP",
    description: "CEP do endereço",
    required: false,
    fieldType: "cep",
    validation: {
      type: "cep",
      pattern: "^[0-9]{5}-?[0-9]{3}$"
    },
    score: 0
  },
  {
    id: "redes_sociais",
    type: "short_text",
    title: "Redes sociais / Instagram",
    description: "Link do seu Instagram ou outras redes sociais",
    required: false,
    validation: {
      type: "url",
      maxLength: 200
    },
    score: 0
  }
];

/**
 * Default design configuration for registration forms
 */
export const DEFAULT_REGISTRATION_DESIGN_CONFIG = {
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
};

/**
 * Get standard fields with unique IDs (prevents conflicts)
 * @param prefix Optional prefix for field IDs
 */
export function getStandardFields(prefix: string = "q"): QuestionField[] {
  return STANDARD_REGISTRATION_FIELDS.map((field, index) => ({
    ...field,
    id: `${prefix}${index + 1}`
  }));
}

/**
 * Check if a field is a CPF/CNPJ field
 */
export function isCpfCnpjField(field: QuestionField): boolean {
  return field.fieldType === "cpf_cnpj" || 
         field.id === "cpf_cnpj" ||
         field.title.toLowerCase().includes("cpf") ||
         field.title.toLowerCase().includes("cnpj");
}

/**
 * Filter out duplicate CPF/CNPJ fields from a list
 */
export function removeDuplicateCpfCnpj(existingFields: QuestionField[], newFields: QuestionField[]): QuestionField[] {
  const hasCpfCnpj = existingFields.some(field => isCpfCnpjField(field));
  
  if (!hasCpfCnpj) {
    return newFields;
  }
  
  // Remove CPF/CNPJ field from new fields if already exists
  return newFields.filter(field => !isCpfCnpjField(field));
}
