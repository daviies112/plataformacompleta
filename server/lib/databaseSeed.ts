/**
 * Database Seed - Inicialização automática de dados padrão
 * Este script roda automaticamente no startup para garantir que labels padrão existam
 * e um formulário de demonstração exista para novas importações do GitHub
 */

import { db } from "../db";
import { whatsappLabels, forms, formTenantMapping } from "../../shared/db-schema";
import { eq } from "drizzle-orm";

// Labels padrão do sistema
const DEFAULT_LABELS = [
  {
    nome: "Contato inicial",
    cor: "hsl(0, 0%, 70%)", // Cinza
    formStatus: "not_sent",
    qualificationStatus: null,
    ordem: 1,
    ativo: true,
  },
  {
    nome: "Formulário incompleto",
    cor: "hsl(45, 100%, 51%)", // Amarelo
    formStatus: "incomplete",
    qualificationStatus: null,
    ordem: 2,
    ativo: true,
  },
  {
    nome: "Aprovado formulário",
    cor: "hsl(142, 76%, 36%)", // Verde
    formStatus: "completed",
    qualificationStatus: "approved",
    ordem: 3,
    ativo: true,
  },
  {
    nome: "Reprovado formulário",
    cor: "hsl(0, 84%, 60%)", // Vermelho
    formStatus: "completed",
    qualificationStatus: "rejected",
    ordem: 4,
    ativo: true,
  },
  {
    nome: "CPF aprovado",
    cor: "hsl(330, 80%, 60%)", // Rosa
    formStatus: "cpf_approved",
    qualificationStatus: null,
    ordem: 5,
    ativo: true,
  },
  {
    nome: "CPF reprovado",
    cor: "hsl(180, 70%, 45%)", // Ciano/Turquesa
    formStatus: "cpf_rejected",
    qualificationStatus: null,
    ordem: 6,
    ativo: true,
  },
  {
    nome: "Marcação de reunião pendente",
    cor: "hsl(30, 100%, 50%)", // Laranja
    formStatus: "meeting_pending",
    qualificationStatus: null,
    ordem: 7,
    ativo: true,
  },
  {
    nome: "Assinatura pendente",
    cor: "hsl(217, 91%, 60%)", // Azul
    formStatus: "meeting_completed",
    qualificationStatus: null,
    ordem: 8,
    ativo: true,
  },
  {
    nome: "Revendedora",
    cor: "hsl(280, 70%, 50%)", // Roxo
    formStatus: "consultor",
    qualificationStatus: null,
    ordem: 9,
    ativo: true,
  },
];

/**
 * Inicializa as labels padrão do sistema
 * Verifica se já existem para evitar duplicatas
 */
export async function seedWhatsAppLabels(): Promise<void> {
  try {
    console.log('🌱 [SEED] Verificando labels do sistema...');

    // Verificar se já existem labels
    const existingLabels = await db.select().from(whatsappLabels);

    if (existingLabels && existingLabels.length > 0) {
      console.log(`✅ [SEED] ${existingLabels.length} labels já existem no banco`);
      return;
    }

    // Inserir labels padrão
    console.log('📝 [SEED] Inserindo labels padrão...');

    for (const label of DEFAULT_LABELS) {
      await db.insert(whatsappLabels).values(label);
      console.log(`   ✓ Label criada: ${label.nome} (${label.cor})`);
    }

    console.log(`✅ [SEED] ${DEFAULT_LABELS.length} labels padrão criadas com sucesso!`);
  } catch (error: any) {
    console.error('❌ [SEED] Erro ao criar labels padrão:', error.message);
    // Não interrompe o servidor se falhar - apenas loga o erro
  }
}

/**
 * Seed do formulário de demonstração
 * Cria um formulário de exemplo para novas importações do GitHub
 * Usa slug único (demo/exemplo) para não conflitar com formulários do Supabase
 * URL de exemplo: /formulario/demo/form/exemplo
 */
export async function seedDemoForm(): Promise<void> {
  try {
    console.log('🌱 [SEED] Verificando formulário de demonstração...');

    // Verificar se já existem formulários
    const existingForms = await db.select().from(forms).limit(1);

    if (existingForms && existingForms.length > 0) {
      console.log(`✅ [SEED] Formulários já existem no banco - pulando seed de demo`);
      return;
    }

    // Criar formulário de demonstração
    console.log('📝 [SEED] Criando formulário de demonstração...');

    const demoFormId = crypto.randomUUID();
    const demoTenantId = 'demo-tenant';
    const demoCompanySlug = 'demo';
    const demoFormSlug = 'exemplo';

    const demoQuestions = [
      {
        id: crypto.randomUUID(),
        text: "Qual é o seu nível de experiência?",
        type: "radio",
        required: true,
        options: [
          { text: "Iniciante", value: "iniciante", points: 1 },
          { text: "Intermediário", value: "intermediario", points: 2 },
          { text: "Avançado", value: "avancado", points: 3 }
        ]
      },
      {
        id: crypto.randomUUID(),
        text: "Como você conheceu nossa empresa?",
        type: "radio",
        required: true,
        options: [
          { text: "Redes Sociais", value: "redes_sociais", points: 2 },
          { text: "Indicação", value: "indicacao", points: 3 },
          { text: "Busca Google", value: "google", points: 1 },
          { text: "Outros", value: "outros", points: 1 }
        ]
      },
      {
        id: crypto.randomUUID(),
        text: "Qual é o seu interesse principal?",
        type: "radio",
        required: true,
        options: [
          { text: "Consultoria", value: "consultoria", points: 3 },
          { text: "Produtos", value: "produtos", points: 2 },
          { text: "Parceria", value: "parceria", points: 3 },
          { text: "Apenas conhecer", value: "conhecer", points: 1 }
        ]
      }
    ];

    // Inserir o formulário
    await db.insert(forms).values({
      id: demoFormId,
      title: "Formulário de Demonstração",
      slug: demoFormSlug,
      description: "Este é um formulário de exemplo criado automaticamente. Você pode editá-lo ou criar novos formulários no painel.",
      welcomeTitle: "Bem-vindo!",
      welcomeMessage: "Este formulário de demonstração mostra como o sistema funciona. Preencha para testar.",
      welcomeConfig: {
        title: "Bem-vindo ao Formulário Demo",
        description: "Este é um exemplo de formulário público. Você pode personalizar completamente.",
        imageUrl: null
      },
      questions: demoQuestions,
      passingScore: 5,
      scoreTiers: [
        { name: "Bronze", minScore: 0, maxScore: 4, color: "hsl(30, 80%, 50%)" },
        { name: "Prata", minScore: 5, maxScore: 7, color: "hsl(0, 0%, 70%)" },
        { name: "Ouro", minScore: 8, maxScore: 9, color: "hsl(45, 100%, 50%)" }
      ],
      designConfig: {
        colors: {
          primary: "hsl(221, 83%, 53%)",
          secondary: "hsl(210, 40%, 96%)",
          background: "hsl(0, 0%, 100%)",
          text: "hsl(222, 47%, 11%)",
          button: "hsl(221, 83%, 53%)",
          buttonText: "hsl(0, 0%, 100%)"
        },
        typography: {
          fontFamily: "Inter",
          titleSize: "2xl",
          textSize: "base"
        },
        spacing: "comfortable"
      },
      tenantId: demoTenantId,
      isPublic: true
    });

    console.log(`   ✓ Formulário criado: ${demoFormId}`);

    // Criar mapeamento para acesso público via slug
    await db.insert(formTenantMapping).values({
      formId: demoFormId,
      tenantId: demoTenantId,
      slug: demoFormSlug,
      companySlug: demoCompanySlug,
      isPublic: true
    });

    console.log(`   ✓ Mapeamento criado: /${demoCompanySlug}/form/${demoFormSlug}`);
    console.log(`✅ [SEED] Formulário de demonstração criado com sucesso!`);
    console.log(`   📝 Acesse: /formulario/${demoCompanySlug}/form/${demoFormSlug}`);
  } catch (error: any) {
    console.error('❌ [SEED] Erro ao criar formulário de demonstração:', error.message);
  }
}

/**
 * Auto-seleciona o primeiro formulário disponível como ativo
 * Executado apenas se nenhum formulário estiver ativo
 */
export async function autoSelectActiveForm(): Promise<void> {
  try {
    console.log('🔍 [SEED] Verificando formulário ativo...');

    // Importar appSettings
    const { appSettings, formTenantMapping } = await import('../../shared/db-schema');

    // Verificar se já tem um formulário ativo
    const existingSettings = await db.select().from(appSettings).limit(1);

    if (existingSettings.length > 0 && existingSettings[0].activeFormId) {
      console.log(`✅ [SEED] Formulário ativo já configurado: ${existingSettings[0].activeFormId}`);
      return;
    }

    // Buscar primeiro formulário disponível com mapeamento
    const firstMapping = await db.select()
      .from(formTenantMapping)
      .where(eq(formTenantMapping.isPublic, true))
      .limit(1);

    if (firstMapping.length === 0) {
      console.log('⚠️ [SEED] Nenhum formulário público disponível para auto-seleção');
      return;
    }

    const mapping = firstMapping[0];
    const companySlug = mapping.companySlug || 'demo';
    const formSlug = mapping.slug || mapping.formId;

    // Gerar URL dinâmica
    const domain = process.env.APP_DOMAIN || process.env.REPLIT_DOMAINS?.split(',')[0] ||
      (process.env.REPL_SLUG && process.env.REPL_OWNER ?
        `${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co` :
        'localhost:5000');
    const protocol = domain.includes('localhost') ? 'http' : 'https';
    const formUrl = `${protocol}://${domain}/formulario/${companySlug}/form/${formSlug}`;

    // Criar ou atualizar app_settings
    if (existingSettings.length === 0) {
      await db.insert(appSettings).values({
        activeFormId: mapping.formId,
        activeFormUrl: formUrl,
        companySlug: companySlug,
        companyName: 'Minha Empresa'
      });
      console.log(`✅ [SEED] Formulário auto-selecionado: ${mapping.formId}`);
      console.log(`   📝 URL: ${formUrl}`);
    } else {
      await db.update(appSettings)
        .set({
          activeFormId: mapping.formId,
          activeFormUrl: formUrl,
          companySlug: companySlug,
          updatedAt: new Date()
        })
        .where(eq(appSettings.id, existingSettings[0].id));
      console.log(`✅ [SEED] Formulário auto-selecionado: ${mapping.formId}`);
      console.log(`   📝 URL: ${formUrl}`);
    }
  } catch (error: any) {
    console.error('❌ [SEED] Erro ao auto-selecionar formulário:', error.message);
  }
}

/**
 * Função de inicialização geral do banco de dados
 * Adicione aqui outros seeds conforme necessário
 */
export async function initializeDatabase(): Promise<void> {
  console.log('🚀 [SEED] Inicializando banco de dados...');

  try {
    // Seed de labels do WhatsApp
    await seedWhatsAppLabels();

    // Seed de formulário de demonstração (para novas importações do GitHub)
    await seedDemoForm();

    // Auto-selecionar formulário ativo se nenhum estiver configurado
    await autoSelectActiveForm();

    console.log('✅ [SEED] Inicialização do banco de dados concluída!');
  } catch (error: any) {
    console.error('❌ [SEED] Erro na inicialização do banco:', error.message);
  }
}
