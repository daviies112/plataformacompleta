/**
 * Normaliza números de telefone para um formato padrão
 * 
 * Aceita múltiplos formatos:
 * - WhatsApp: 553192267220@s.whatsapp.net
 * - Internacional: +55 31 9226-7220
 * - Nacional: (31) 9226-7220
 * - Apenas números: 31992267220
 * - Com código país: 5531992267220
 * 
 * Retorna sempre: +5531992267220
 */
export function normalizarTelefone(telefone: string): string {
  if (!telefone) {
    return '';
  }

  // 1. Remover sufixo do WhatsApp (@s.whatsapp.net, @c.us, etc)
  let limpo = telefone.split('@')[0];
  
  // 2. Remover todos os caracteres não numéricos
  const apenasNumeros = limpo.replace(/\D/g, '');
  
  // 3. Se já tem código do país 55, adicionar apenas o +
  if (apenasNumeros.startsWith('55')) {
    return `+${apenasNumeros}`;
  }
  
  // 4. Se não tem código do país, adicionar +55
  return `+55${apenasNumeros}`;
}

/**
 * Verifica se dois números de telefone são iguais após normalização
 */
export function telefonesIguais(telefone1: string, telefone2: string): boolean {
  const norm1 = normalizarTelefone(telefone1);
  const norm2 = normalizarTelefone(telefone2);
  return norm1 === norm2;
}
