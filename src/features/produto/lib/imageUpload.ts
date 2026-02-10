import { getSupabaseClient } from '@/lib/supabase';

/**
 * Faz upload de uma imagem para o Supabase Storage
 * @param file - Arquivo de imagem ou base64 string
 * @param productId - ID do produto (usado para nomear o arquivo)
 * @returns URL pública da imagem ou a string base64 original
 */
export async function uploadProductImage(
  file: File | string,
  productId: string
): Promise<string> {
  // Se for uma string base64 ou URL, retornar diretamente
  if (typeof file === 'string') {
    // Se já for uma URL do Supabase, retornar
    if (file.includes('supabase')) {
      return file;
    }
    // Se for base64, pode optar por fazer upload ou retornar
    // Por enquanto, vamos retornar a string base64
    return file;
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
    }

    // Gerar nome único para o arquivo
    const fileExt = file.name.split('.').pop();
    const fileName = `${productId}-${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    // Fazer upload do arquivo
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
      });

    if (error) {
      console.error('Erro ao fazer upload da imagem:', error);
      throw error;
    }

    // Obter URL pública da imagem
    const { data: { publicUrl } } = supabase.storage
      .from('product-images')
      .getPublicUrl(filePath);

    return publicUrl;
  } catch (error) {
    console.error('Erro no upload:', error);
    // Em caso de erro, tentar converter para base64 como fallback
    if (file instanceof File) {
      return await fileToBase64(file);
    }
    throw error;
  }
}

/**
 * Converte um File para base64
 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
}

/**
 * Deleta uma imagem do Supabase Storage
 * @param imageUrl - URL da imagem no Supabase
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  // Extrair o caminho do arquivo da URL
  if (!imageUrl.includes('supabase') || !imageUrl.includes('product-images')) {
    // Não é uma imagem do Storage, ignorar
    return;
  }

  try {
    const supabase = await getSupabaseClient();
    if (!supabase) {
      throw new Error('Supabase não configurado. Configure as credenciais em /configuracoes');
    }

    const urlParts = imageUrl.split('/product-images/');
    if (urlParts.length < 2) return;

    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from('product-images')
      .remove([filePath]);

    if (error) {
      console.error('Erro ao deletar imagem:', error);
    }
  } catch (error) {
    console.error('Erro ao processar deleção:', error);
  }
}
