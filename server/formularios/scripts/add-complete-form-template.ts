import { db } from '../db.js';
import { formTemplates } from '../../../shared/formularios/schema.js';

const completeFormTemplate = {
  name: "Formulário Completo de Cadastro",
  description: "Template completo com todos os campos essenciais de cadastro de clientes",
  thumbnailUrl: null,
  isDefault: true,
  designConfig: {
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
  },
  questions: [
    {
      id: "q1",
      type: "short_text",
      title: "CPF/CNPJ",
      description: "Informe seu CPF ou CNPJ",
      required: true,
      fieldType: "cpf_cnpj",
      validation: {
        type: "cpf_cnpj"
      }
    },
    {
      id: "q2",
      type: "short_text",
      title: "Nome/Razão Social",
      description: "Nome completo ou razão social da empresa",
      required: true,
      validation: {
        minLength: 3,
        maxLength: 200
      }
    },
    {
      id: "q3",
      type: "date",
      title: "Data de nascimento",
      description: "Informe sua data de nascimento",
      required: false
    },
    {
      id: "q4",
      type: "email",
      title: "E-mail",
      description: "Seu melhor e-mail para contato",
      required: true,
      validation: {
        type: "email"
      }
    },
    {
      id: "q5",
      type: "phone_number",
      title: "Contato",
      description: "Telefone ou WhatsApp para contato",
      required: true,
      validation: {
        type: "phone"
      }
    },
    {
      id: "q6",
      type: "short_text",
      title: "Endereço",
      description: "Rua, avenida, travessa, etc.",
      required: false,
      validation: {
        maxLength: 200
      }
    },
    {
      id: "q7",
      type: "short_text",
      title: "Número",
      description: "Número do endereço",
      required: false,
      validation: {
        maxLength: 20
      }
    },
    {
      id: "q8",
      type: "short_text",
      title: "Bairro",
      description: "Nome do bairro",
      required: false,
      validation: {
        maxLength: 100
      }
    },
    {
      id: "q9",
      type: "short_text",
      title: "Cidade",
      description: "Cidade - UF (ex: BELO HORIZONTE - MG)",
      required: false,
      validation: {
        maxLength: 100
      }
    },
    {
      id: "q10",
      type: "short_text",
      title: "CEP",
      description: "CEP do endereço",
      required: false,
      fieldType: "cep",
      validation: {
        type: "cep",
        pattern: "^[0-9]{5}-?[0-9]{3}$"
      }
    },
    {
      id: "q11",
      type: "short_text",
      title: "Redes sociais / Instagram",
      description: "Link do seu Instagram ou outras redes sociais",
      required: false,
      validation: {
        type: "url",
        maxLength: 200
      }
    }
  ]
};

async function addTemplate() {
  try {
    console.log('🔄 Adicionando template de formulário completo...');
    
    const result = await db.insert(formTemplates).values(completeFormTemplate).returning();
    
    console.log('✅ Template criado com sucesso!');
    console.log('📋 ID do template:', result[0].id);
    console.log('📝 Nome:', result[0].name);
    console.log('🎯 Total de campos:', completeFormTemplate.questions.length);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao criar template:', error);
    process.exit(1);
  }
}

addTemplate();
