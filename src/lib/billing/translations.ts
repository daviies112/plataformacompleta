// Traduções para categorias do Pluggy
export const translateCategory = (category: string | null | undefined): string => {
  if (!category) return "Outros";
  
  const translations: Record<string, string> = {
    // Categorias comuns
    "Online Shopping": "Compras Online",
    "Groceries": "Supermercado",
    "Eating Out": "Restaurantes",
    "Transfers": "Transferências",
    "Credit Card": "Cartão de Crédito",
    "Credit Card Payment": "Pagamento de Cartão",
    "Houseware": "Utensílios Domésticos",
    "Entertainment": "Entretenimento",
    "Transport": "Transporte",
    "Healthcare": "Saúde",
    "Education": "Educação",
    "Bills": "Contas",
    "Utilities": "Serviços Públicos",
    "Shopping": "Compras",
    "Travel": "Viagens",
    "Salary": "Salário",
    "Investment": "Investimento",
    "Insurance": "Seguro",
    "Taxes": "Impostos",
    "Fees": "Taxas",
    "Interest": "Juros",
    "Savings": "Poupança",
    "Loan": "Empréstimo",
    "Rent": "Aluguel",
    "Mortgage": "Hipoteca",
    "Subscription": "Assinatura",
    "Donation": "Doação",
    "Gift": "Presente",
    "Refund": "Reembolso",
    "Withdrawal": "Saque",
    "Deposit": "Depósito",
    "Payment": "Pagamento",
    "Income": "Receita",
    "Other": "Outros",
    "Others": "Outros",
    // Categorias adicionais
    "Gas stations": "Postos de Gasolina",
    "Parking": "Estacionamento",
    "Bookstore": "Livraria",
    "Supermarket": "Supermercado",
  };
  
  return translations[category] || category;
};

// Traduções para status de transações
export const translateStatus = (status: string | null | undefined): string => {
  if (!status) return "";
  
  const translations: Record<string, string> = {
    "POSTED": "Confirmado",
    "PENDING": "Pendente",
    "COMPLETED": "Completo",
    "PROCESSING": "Processando",
    "FAILED": "Falhou",
    "CANCELLED": "Cancelado",
  };
  
  return translations[status] || status;
};

// Traduções para tipos de transação
export const translateType = (type: string | null | undefined): string => {
  if (!type) return "";
  
  const translations: Record<string, string> = {
    "DEBIT": "Débito",
    "CREDIT": "Crédito",
  };
  
  return translations[type] || type;
};
