// ===========================================
// CONFIGURAÇÃO DE MARCA E PERSONALIZAÇÃO
// Altere os valores abaixo para personalizar
// ===========================================

export const brandConfig = {
  // Nome da empresa
  companyName: "Sua Empresa",
  
  // Logo (coloque o arquivo em src/assets/ ou use URL externa)
  logoUrl: "",
  
  // Texto do rodapé
  footerText: "© 2024 Sua Empresa. Todos os direitos reservados.",
  
  // Contato
  contactEmail: "contato@suaempresa.com",
  contactPhone: "(11) 99999-9999",
};

// ===========================================
// CONFIGURAÇÃO DA PÁGINA GOV.BR
// ===========================================

export const govbrConfig = {
  // Título da página
  title: "Confirme sua Identidade",
  
  // Descrição
  description: "Para garantir a segurança e validade jurídica do contrato, precisamos verificar sua identidade através do GOV.BR",
  
  // Texto do botão
  buttonText: "Entrar com GOV.BR",
  buttonLoadingText: "Autenticando...",
  
  // Texto do rodapé
  disclaimer: "Você será redirecionado para o site oficial do governo para realizar o login de forma segura. Seus dados não são compartilhados conosco.",
  
  // Recursos de segurança listados
  securityFeatures: [
    "Autenticação de dois fatores",
    "Dados protegidos pela LGPD",
    "Validade jurídica garantida",
    "Criptografia de ponta a ponta",
  ],
  
  // Toast de sucesso
  successTitle: "Autenticação realizada!",
  successDescription: "Sua identidade foi verificada com sucesso via GOV.BR.",
};

// ===========================================
// CONFIGURAÇÃO DA PÁGINA INICIAL
// ===========================================

export const landingConfig = {
  // Badge (selo) no topo
  badge: "Processo 100% digital e seguro",
  
  // Título principal (pode usar quebra de linha com \n)
  title: "Assine seu contrato de forma",
  titleHighlight: "rápida e segura",
  
  // Subtítulo
  subtitle: "Utilizamos a autenticação GOV.BR para garantir a validade jurídica da sua assinatura digital. Simples, rápido e sem complicações.",
  
  // Botão de início
  ctaButton: "Começar agora",
  
  // Recursos/Features
  features: [
    {
      title: "Autenticação Segura",
      description: "Login via GOV.BR com validade jurídica",
    },
    {
      title: "Assinatura Digital",
      description: "Contrato assinado digitalmente em conformidade com a lei",
    },
    {
      title: "Rápido e Simples",
      description: "Todo o processo em menos de 5 minutos",
    },
  ],
};

// ===========================================
// CONFIGURAÇÃO DO CONTRATO
// Personalize o texto do seu contrato aqui
// ===========================================

export const contractConfig = {
  // Título da página
  pageTitle: "Revise e Assine o Contrato",
  
  // Título do contrato
  title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
  
  // Seção do contratante
  contractorSection: "CONTRATANTE",
  
  // Seção das cláusulas
  clausesSection: "CLÁUSULAS CONTRATUAIS",
  
  // Cláusulas do contrato (adicione ou remova conforme necessário)
  clauses: [
    {
      title: "CLÁUSULA PRIMEIRA - DO OBJETO",
      content: "O presente contrato tem por objeto a prestação de serviços conforme especificações acordadas entre as partes, em conformidade com a legislação brasileira vigente.",
    },
    {
      title: "CLÁUSULA SEGUNDA - DO PRAZO",
      content: "Este contrato terá vigência de 12 (doze) meses a partir da data de assinatura, podendo ser renovado mediante acordo entre as partes.",
    },
    {
      title: "CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES",
      content: "As partes se comprometem a cumprir fielmente todas as condições estabelecidas neste instrumento, sob pena de rescisão contratual e aplicação das penalidades cabíveis.",
    },
    {
      title: "CLÁUSULA QUARTA - DA CONFIDENCIALIDADE",
      content: "As partes se obrigam a manter sigilo sobre todas as informações confidenciais a que tiverem acesso em razão deste contrato, em conformidade com a Lei Geral de Proteção de Dados (LGPD).",
    },
    {
      title: "CLÁUSULA QUINTA - DO FORO",
      content: "Fica eleito o foro da comarca de São Paulo/SP para dirimir quaisquer dúvidas oriundas do presente contrato.",
    },
  ],
  
  // Configuração da assinatura eletrônica
  signature: {
    title: "ASSINATURA ELETRÔNICA",
    signedText: "Este contrato foi assinado eletronicamente em",
    authMethod: "Método de autenticação:",
    authValue: "GOV.BR (Governo Federal)",
    securityLevel: "Nível de segurança:",
    signedVia: "✓ Assinado eletronicamente via GOV.BR",
  },
  
  // Texto do checkbox de concordância
  agreementText: "Li e concordo com todos os termos e condições do contrato acima. Declaro que as informações fornecidas são verdadeiras e que estou ciente da validade jurídica desta assinatura digital.",
  
  // Aviso de rolagem
  scrollWarning: "Role até o final para continuar",
  
  // Botão de assinatura
  signButton: "Assinar Contrato",
  signButtonLoading: "Assinando...",
  
  // Mensagens de toast
  toastScrollTitle: "Ação necessária",
  toastScrollDescription: "Por favor, leia todo o contrato e marque a caixa de concordância.",
  toastSuccessTitle: "Contrato assinado!",
  toastSuccessDescription: "Sua assinatura digital foi registrada com sucesso.",
  toastErrorTitle: "Erro ao assinar",
  toastErrorDescription: "Ocorreu um erro ao processar sua assinatura. Tente novamente.",
};

// ===========================================
// CONFIGURAÇÃO DA PÁGINA DE SUCESSO
// ===========================================

export const successConfig = {
  title: "Contrato Assinado com Sucesso!",
  subtitle: "Sua assinatura digital foi registrada e validada.",
  
  // Mensagem de instrução
  instruction: "Você receberá uma cópia do contrato no seu e-mail cadastrado no GOV.BR.",
  
  // Botão final
  finalButton: "Voltar ao início",
};
