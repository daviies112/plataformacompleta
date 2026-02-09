/**
 * Helper function to download data as JSON file
 * @param data - Data to be downloaded
 * @param filename - Name of the file (without extension)
 */
export function downloadJSON(data: any, filename: string) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

/**
 * Format date for filename (YYYY-MM-DD-HHmmss)
 */
export function formatDateForFilename(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}-${month}-${day}-${hours}${minutes}${seconds}`;
}

/**
 * Download a single compliance check as PDF
 * @param checkId - The ID of the check to download
 */
export async function downloadPDF(checkId: string): Promise<void> {
  try {
    const response = await fetch(`/api/compliance/download-pdf/${checkId}`, {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Falha ao gerar PDF');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'relatorio-compliance.pdf';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao baixar PDF:', error);
    throw error;
  }
}

/**
 * Download multiple compliance checks as a single PDF
 * @param ids - Optional array of check IDs to download. If not provided, downloads all.
 */
export async function downloadBulkPDF(ids?: string[]): Promise<void> {
  try {
    const response = await fetch('/api/compliance/download-pdf-bulk', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ ids }),
    });
    
    if (!response.ok) {
      throw new Error('Falha ao gerar PDF em lote');
    }
    
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    
    const contentDisposition = response.headers.get('Content-Disposition');
    let filename = 'historico-compliance.pdf';
    if (contentDisposition) {
      const match = contentDisposition.match(/filename="(.+)"/);
      if (match) {
        filename = match[1];
      }
    }
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Erro ao baixar PDF em lote:', error);
    throw error;
  }
}
