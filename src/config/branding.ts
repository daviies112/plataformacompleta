export const brandConfig = {
  companyName: "Sua Empresa",
  logoUrl: "",
  footerText: "© 2024 Sua Empresa. Todos os direitos reservados.",
  contactEmail: "contato@suaempresa.com",
  contactPhone: "(11) 99999-9999",
};

export const govbrConfig = {
  title: "Confirme sua Identidade",
  description: "Para garantir a segurança e validade jurídica do contrato, precisamos verificar sua identidade através do GOV.BR",
  buttonText: "Entrar com GOV.BR",
  buttonLoadingText: "Autenticando...",
  disclaimer: "Você será redirecionado para o site oficial do governo para realizar o login de forma segura. Seus dados não são compartilhados conosco.",
  securityFeatures: [
    "Autenticação de dois fatores",
    "Dados protegidos pela LGPD",
    "Validade jurídica garantida",
    "Criptografia de ponta a ponta",
  ],
  successTitle: "Autenticação realizada!",
  successDescription: "Sua identidade foi verificada com sucesso via GOV.BR.",
};

export const landingConfig = {
  badge: "Processo 100% digital e seguro",
  title: "Assine seu contrato de forma",
  titleHighlight: "rápida e segura",
  subtitle: "Utilizamos a autenticação GOV.BR para garantir a validade jurídica da sua assinatura digital. Simples, rápido e sem complicações.",
  ctaButton: "Começar agora",
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

export const contractConfig = {
  pageTitle: "Revise e Assine o Contrato",
  title: "CONTRATO DE PRESTAÇÃO DE SERVIÇOS",
  contractorSection: "CONTRATANTE",
  clausesSection: "CLÁUSULAS CONTRATUAIS",
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
  signature: {
    title: "ASSINATURA ELETRÔNICA",
    signedText: "Este contrato foi assinado eletronicamente em",
    authMethod: "Método de autenticação:",
    authValue: "GOV.BR (Governo Federal)",
    securityLevel: "Nível de segurança:",
    signedVia: "✓ Assinado eletronicamente via GOV.BR",
  },
  agreementText: "Li e concordo com todos os termos e condições do contrato acima. Declaro que as informações fornecidas são verdadeiras e que estou ciente da validade jurídica desta assinatura digital.",
  scrollWarning: "Role até o final para continuar",
  signButton: "Assinar Contrato",
  signButtonLoading: "Assinando...",
  toastScrollTitle: "Ação necessária",
  toastScrollDescription: "Por favor, leia todo o contrato e marque a caixa de concordância.",
  toastSuccessTitle: "Contrato assinado!",
  toastSuccessDescription: "Sua assinatura digital foi registrada com sucesso.",
  toastErrorTitle: "Erro ao assinar",
  toastErrorDescription: "Ocorreu um erro ao processar sua assinatura. Tente novamente.",
};

export const successConfig = {
  title: "Contrato Assinado com Sucesso!",
  subtitle: "Sua assinatura digital foi registrada e validada.",
  instruction: "Você receberá uma cópia do contrato no seu e-mail cadastrado no GOV.BR.",
  finalButton: "Voltar ao início",
};
