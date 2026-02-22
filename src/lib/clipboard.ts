/**
 * Copia texto para a área de transferência com fallback
 * Funciona mesmo sem HTTPS (usando document.execCommand como fallback)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Tentar usar Clipboard API moderna (requer HTTPS ou localhost)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback para navegadores sem suporte ou contexto não seguro
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      document.body.removeChild(textArea);
      console.error('Fallback: Erro ao copiar:', err);
      return false;
    }
  } catch (err) {
    console.error('Erro ao copiar para clipboard:', err);
    return false;
  }
}
