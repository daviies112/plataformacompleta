import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';

/**
 * Formata uma data para o horário de Brasília (UTC-3)
 * @param date - Data a ser formatada (Date ou string)
 * @param formatStr - String de formato (padrão: "dd/MM/yyyy HH:mm")
 * @returns String formatada no horário de Brasília
 */
export function formatInBRT(date: Date | string, formatStr: string = "dd/MM/yyyy HH:mm"): string {
  if (!date) return '';
  
  try {
    // Converter para Date se for string
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    // Verificar se a data é válida
    if (isNaN(dateObj.getTime())) {
      return '';
    }
    
    // UTC-3 para Brasília (Brasília Time - BRT)
    // Adicionar 3 horas negativas (UTC-3)
    const brasiliaOffset = -3 * 60; // -3 horas em minutos
    const utcOffset = dateObj.getTimezoneOffset(); // offset atual em minutos
    const totalOffset = brasiliaOffset - utcOffset; // diferença total
    
    // Criar nova data ajustada para Brasília
    const brasiliaDate = new Date(dateObj.getTime() + totalOffset * 60 * 1000);
    
    // Formatar usando date-fns com locale pt-BR
    return format(brasiliaDate, formatStr, { locale: ptBR });
  } catch (error) {
    console.error('Erro ao formatar data:', error);
    return '';
  }
}

/**
 * Formata uma data para exibição curta (apenas data)
 */
export function formatDateBRT(date: Date | string): string {
  return formatInBRT(date, "dd/MM/yyyy");
}

/**
 * Formata uma data para exibição completa (data e hora)
 */
export function formatDateTimeBRT(date: Date | string): string {
  return formatInBRT(date, "dd/MM/yyyy HH:mm");
}
