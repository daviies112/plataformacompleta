/**
 * Funções utilitárias para gerar slugs seguros para URLs
 * Usadas para criar URLs profissionais para empresas e formulários
 * 
 * Exemplos de URLs geradas:
 * - /minha-empresa/form/cadastro-clientes
 * - /acme-ltda/form/pesquisa-satisfacao
 */

/**
 * Gera um slug seguro para URL a partir do nome da empresa
 * 
 * Exemplos:
 * - "Sua Empresa" → "sua-empresa"
 * - "Café & Companhia" → "cafe-companhia"
 * - "Açaí do João" → "acai-do-joao"
 * 
 * @param companyName - Nome da empresa para converter em slug
 * @returns Slug seguro para URL
 */
export function generateCompanySlug(companyName: string): string {
  if (!companyName || companyName.trim() === '') {
    return 'empresa';
  }

  return companyName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'empresa';
}

/**
 * Gera um slug seguro para URL a partir do título do formulário
 * 
 * Exemplos:
 * - "Cadastro de Clientes" → "cadastro-de-clientes"
 * - "Pesquisa de Satisfação 2024" → "pesquisa-de-satisfacao-2024"
 * - "Formulário #1 - Inicial" → "formulario-1-inicial"
 * 
 * @param title - Título do formulário para converter em slug
 * @returns Slug seguro para URL
 */
export function generateFormSlug(title: string): string {
  if (!title || title.trim() === '') {
    return 'formulario';
  }

  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    || 'formulario';
}

/**
 * Gera um slug único adicionando sufixo numérico se necessário
 * Usado quando já existe um formulário com o mesmo slug no tenant
 * 
 * @param baseSlug - Slug base gerado do título
 * @param existingSlugs - Lista de slugs já existentes no tenant
 * @returns Slug único (ex: "cadastro-clientes-2" se "cadastro-clientes" já existe)
 */
export function generateUniqueFormSlug(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }

  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

/**
 * Valida se um slug é seguro para URL
 * 
 * @param slug - Slug para validar
 * @returns true se válido, false caso contrário
 */
export function isValidSlug(slug: string): boolean {
  if (!slug || slug.trim() === '') {
    return false;
  }
  
  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
  return slugPattern.test(slug);
}

/**
 * Sanitiza um slug para garantir que seja seguro para URL
 * Se inválido, gera um novo slug
 * 
 * @param slug - Slug para sanitizar
 * @returns Slug válido e seguro para URL
 */
export function sanitizeSlug(slug: string): string {
  if (isValidSlug(slug)) {
    return slug;
  }
  
  return generateFormSlug(slug);
}
