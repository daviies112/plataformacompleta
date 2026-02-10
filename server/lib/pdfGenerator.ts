import PDFDocument from 'pdfkit';
import type { DatacorpCheck } from '../../shared/db-schema.js';

const COLORS = {
  primary: '#D4AF37',
  primaryDark: '#B8942D',
  secondary: '#1e1e1e',
  accent: '#C5A028',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#64748b',
  background: '#1a1a1a',
  cardBg: '#f8fafc',
  cardBgDark: '#2a2a2a',
  border: '#e2e8f0',
  borderDark: '#334155',
  text: '#1e293b',
  textLight: '#ffffff',
  textMuted: '#64748b',
  gold: '#D4AF37',
  goldLight: '#E8D48A',
};

function getStatusColor(status: string): string {
  switch (status) {
    case 'approved': return COLORS.success;
    case 'rejected': return COLORS.danger;
    case 'manual_review': return COLORS.warning;
    default: return COLORS.muted;
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case 'approved': return 'Aprovado';
    case 'rejected': return 'Reprovado';
    case 'manual_review': return 'Revisão Manual';
    case 'pending': return 'Pendente';
    case 'error': return 'Erro';
    default: return status;
  }
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

function formatCurrency(value?: number | null): string {
  if (value === null || value === undefined || value < 0) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

function truncateText(text: string, maxLength: number): string {
  if (!text) return 'N/A';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function checkPageBreak(doc: any, currentY: number, neededHeight: number): number {
  if (currentY + neededHeight > 750) {
    doc.addPage();
    return 50;
  }
  return currentY;
}

function drawHeader(doc: any, title: string, subtitle: string): number {
  doc.save();
  doc.rect(0, 0, doc.page.width, 80)
    .fillColor(COLORS.secondary)
    .fill();
  
  doc.rect(0, 75, doc.page.width, 5)
    .fillColor(COLORS.gold)
    .fill();
  
  doc.fontSize(20)
    .fillColor(COLORS.gold)
    .font('Helvetica-Bold')
    .text(title, 50, 25);
  
  doc.fontSize(10)
    .fillColor('#aaaaaa')
    .font('Helvetica')
    .text(subtitle, 50, 50);
  
  doc.fontSize(8)
    .fillColor(COLORS.goldLight)
    .text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 400, 50, { width: 145, align: 'right' });
  doc.restore();
  
  return 95;
}

function drawSectionHeader(doc: any, y: number, title: string, count?: number): number {
  doc.save();
  doc.rect(50, y, 495, 25)
    .fillColor(COLORS.secondary)
    .fill();
  
  doc.rect(50, y, 4, 25)
    .fillColor(COLORS.gold)
    .fill();
  
  const displayTitle = count !== undefined ? `${title} (${count})` : title;
  
  doc.fontSize(11)
    .fillColor(COLORS.textLight)
    .font('Helvetica-Bold')
    .text(displayTitle, 60, y + 7);
  doc.restore();
  
  return y + 30;
}

function drawInfoCard(doc: any, x: number, y: number, width: number, label: string, value: string, dark: boolean = false): number {
  const height = 45;
  
  doc.save();
  doc.roundedRect(x, y, width, height, 4)
    .fillColor(dark ? COLORS.cardBgDark : COLORS.cardBg)
    .fill();
  
  doc.roundedRect(x, y, width, height, 4)
    .strokeColor(dark ? COLORS.borderDark : COLORS.border)
    .lineWidth(0.5)
    .stroke();
  
  doc.fontSize(8)
    .fillColor(dark ? COLORS.textLight : COLORS.textMuted)
    .font('Helvetica')
    .text(label, x + 8, y + 8, { width: width - 16 });
  
  doc.fontSize(10)
    .fillColor(dark ? COLORS.textLight : COLORS.text)
    .font('Helvetica-Bold')
    .text(truncateText(value, 25), x + 8, y + 22, { width: width - 16 });
  doc.restore();
  
  return height;
}

function drawStatusBadge(doc: any, x: number, y: number, status: string, width: number = 80): void {
  const label = status === 'ARQUIVADO' ? 'ARQUIVADO' : 
                status === 'Ativo' ? 'ATIVO' : 
                status.toUpperCase();
  const color = status === 'ARQUIVADO' || status === 'Arquivado' ? COLORS.muted : 
                status === 'Ativo' || status === 'ATIVO' ? COLORS.success : COLORS.warning;
  
  doc.save();
  doc.roundedRect(x, y, width, 18, 3)
    .fillColor(color)
    .fill();
  
  doc.fontSize(8)
    .fillColor(COLORS.textLight)
    .font('Helvetica-Bold')
    .text(label, x, y + 5, { width: width, align: 'center' });
  doc.restore();
}

function drawProcessHeader(doc: any, y: number, processNumber: string, type: string, status: string): number {
  doc.save();
  doc.roundedRect(50, y, 495, 50, 4)
    .fillColor(COLORS.cardBgDark)
    .fill();
  
  doc.rect(50, y, 4, 50)
    .fillColor(COLORS.gold)
    .fill();
  
  doc.fontSize(12)
    .fillColor(COLORS.textLight)
    .font('Helvetica-Bold')
    .text(processNumber || 'Número não disponível', 60, y + 10, { width: 340 });
  
  drawStatusBadge(doc, 460, y + 8, status);
  
  doc.fontSize(9)
    .fillColor(COLORS.goldLight)
    .font('Helvetica')
    .text(truncateText(type || 'Tipo não especificado', 60), 60, y + 30, { width: 430 });
  
  doc.restore();
  return y + 55;
}

function drawInfoRow(doc: any, x: number, y: number, label: string, value: string, width: number): number {
  doc.save();
  doc.fontSize(8)
    .fillColor(COLORS.textMuted)
    .font('Helvetica')
    .text(label, x, y);
  
  doc.fontSize(9)
    .fillColor(COLORS.text)
    .font('Helvetica')
    .text(value || 'N/A', x, y + 11, { width: width - 10 });
  doc.restore();
  
  return 28;
}

function drawTableHeader(doc: any, y: number, columns: {label: string, x: number, width: number}[]): number {
  doc.save();
  doc.rect(50, y, 495, 22)
    .fillColor(COLORS.gold)
    .fill();
  
  doc.fontSize(8)
    .fillColor(COLORS.textLight)
    .font('Helvetica-Bold');
  
  columns.forEach(col => {
    doc.text(col.label, col.x, y + 7, { width: col.width });
  });
  
  doc.restore();
  return y + 22;
}

function drawTableRow(doc: any, y: number, columns: {value: string, x: number, width: number}[], index: number): number {
  const bgColor = index % 2 === 0 ? '#f8fafc' : '#ffffff';
  
  doc.save();
  doc.rect(50, y, 495, 35)
    .fillColor(bgColor)
    .fill();
  
  doc.rect(50, y, 495, 35)
    .strokeColor(COLORS.border)
    .lineWidth(0.3)
    .stroke();
  
  doc.fontSize(8)
    .fillColor(COLORS.text)
    .font('Helvetica');
  
  columns.forEach(col => {
    doc.text(col.value || 'N/A', col.x, y + 5, { width: col.width, height: 25 });
  });
  
  doc.restore();
  return y + 35;
}

export function generateCompliancePDF(check: DatacorpCheck): typeof PDFDocument.prototype {
  const doc = new (PDFDocument as any)({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
    bufferPages: true,
  });

  const payload = check.payload as any;
  const result = payload?.Result?.[0];
  const processData = result?.Processes;
  const lawsuits = processData?.Lawsuits || [];
  
  const basicData = payload?._basic_data?.Result?.[0]?.BasicData;
  const collectionsData = payload?._collections?.Result?.[0]?.Collections;
  
  const checkAny = check as any;
  const personName = checkAny.personName || 'N/A';
  const personCpf = checkAny.personCpf || 'N/A';
  const riskScore = typeof check.riskScore === 'string' ? parseFloat(check.riskScore) : check.riskScore;

  let currentY = drawHeader(doc, 'Relatório de Compliance CPF', 'Consulta de Processos Judiciais - BigDataCorp');

  currentY = drawSectionHeader(doc, currentY, 'Informações do Titular');
  
  const cardWidth = 118;
  const cardGap = 8;
  let cardX = 50;
  
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Nome Completo', personName, true);
  cardX += cardWidth + cardGap;
  drawInfoCard(doc, cardX, currentY, cardWidth, 'CPF', personCpf, true);
  cardX += cardWidth + cardGap;
  
  const scoreText = riskScore !== null && riskScore !== undefined ? Math.round(riskScore).toString() : 'N/A';
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Risco', scoreText, true);
  cardX += cardWidth + cardGap;
  
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Status', getStatusLabel(check.status), true);
  
  currentY += 55;

  if (basicData) {
    currentY = checkPageBreak(doc, currentY, 100);
    currentY = drawSectionHeader(doc, currentY, 'Dados Cadastrais');
    
    doc.save();
    doc.roundedRect(50, currentY, 495, 75, 4)
      .fillColor(COLORS.cardBgDark)
      .fill();
    doc.roundedRect(50, currentY, 495, 75, 4)
      .strokeColor(COLORS.borderDark)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    
    let infoY = currentY + 10;
    const col1 = 60;
    const col2 = 300;
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Nome Completo', col1, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(truncateText(basicData.Name || 'N/A', 35), col1, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Status do CPF', col2, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    const taxStatusColor = basicData.TaxIdStatus === 'Regular' ? COLORS.success : COLORS.danger;
    doc.fillColor(taxStatusColor);
    doc.text(basicData.TaxIdStatus || 'N/A', col2, infoY + 10);
    doc.restore();
    
    infoY += 28;
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Data de Nascimento', col1, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(formatDate(basicData.BirthDate), col1, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Nome da Mãe', col2, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(truncateText(basicData.MotherName || 'N/A', 30), col2, infoY + 10);
    doc.restore();
    
    infoY += 28;
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Idade', col1, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(basicData.Age !== undefined ? `${basicData.Age} anos` : 'N/A', col1, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Sexo', col2, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    const genderLabel = basicData.Gender === 'M' ? 'Masculino' : basicData.Gender === 'F' ? 'Feminino' : basicData.Gender || 'N/A';
    doc.text(genderLabel, col2, infoY + 10);
    doc.restore();
    
    currentY += 85;
  }

  if (collectionsData) {
    currentY = checkPageBreak(doc, currentY, 100);
    currentY = drawSectionHeader(doc, currentY, 'Presença em Cobrança');
    
    doc.save();
    doc.roundedRect(50, currentY, 495, 65, 4)
      .fillColor(COLORS.cardBgDark)
      .fill();
    doc.roundedRect(50, currentY, 495, 65, 4)
      .strokeColor(COLORS.borderDark)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    
    let infoY = currentY + 10;
    const col1 = 60;
    const col2 = 180;
    const col3 = 300;
    const col4 = 420;
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Total Ocorrências', col1, infoY);
    doc.fontSize(14).font('Helvetica-Bold');
    const totalOcc = collectionsData.TotalOccurrences || 0;
    doc.fillColor(totalOcc > 0 ? COLORS.gold : COLORS.success);
    doc.text(String(totalOcc), col1, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Cobranças Ativas', col2, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    const hasActive = collectionsData.HasActiveCollections === true;
    doc.fillColor(hasActive ? COLORS.danger : COLORS.success);
    doc.text(hasActive ? 'Sim' : 'Não', col2, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Últimos 12 meses', col3, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(String(collectionsData.Last12Months || 0), col3, infoY + 10);
    doc.restore();
    
    doc.save();
    doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
    doc.text('Meses Consecutivos', col4, infoY);
    doc.fontSize(9).font('Helvetica-Bold');
    doc.text(String(collectionsData.ConsecutiveMonths || 0), col4, infoY + 10);
    doc.restore();
    
    infoY += 32;
    
    if (collectionsData.FirstOccurrenceDate || collectionsData.LastOccurrenceDate) {
      doc.save();
      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
      doc.text('Primeira Ocorrência', col1, infoY);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(formatDate(collectionsData.FirstOccurrenceDate), col1, infoY + 10);
      doc.restore();
      
      doc.save();
      doc.fontSize(8).fillColor(COLORS.textLight).font('Helvetica');
      doc.text('Última Ocorrência', col2, infoY);
      doc.fontSize(9).font('Helvetica-Bold');
      doc.text(formatDate(collectionsData.LastOccurrenceDate), col2, infoY + 10);
      doc.restore();
    }
    
    currentY += 75;
  }

  if (processData) {
    currentY = drawSectionHeader(doc, currentY, 'Estatísticas de Processos');
    
    cardX = 50;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Total de Processos', String(processData.TotalLawsuits || 0), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Como Autor', String(processData.TotalLawsuitsAsAuthor || 0), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Como Réu', String(processData.TotalLawsuitsAsDefendant || 0), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Outros', String(processData.TotalLawsuitsAsOther || 0), true);
    
    currentY += 55;
    
    cardX = 50;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Primeiro Processo', formatDate(processData.FirstLawsuitDate), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Último Processo', formatDate(processData.LastLawsuitDate), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Últimos 30 dias', String(processData.Last30DaysLawsuits || 0), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Últimos 90 dias', String(processData.Last90DaysLawsuits || 0), true);
    
    currentY += 55;
    
    cardX = 50;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Últimos 180 dias', String(processData.Last180DaysLawsuits || 0), true);
    cardX += cardWidth + cardGap;
    drawInfoCard(doc, cardX, currentY, cardWidth, 'Últimos 365 dias', String(processData.Last365DaysLawsuits || 0), true);
    
    currentY += 60;
  }

  lawsuits.forEach((lawsuit: any, lawsuitIndex: number) => {
    currentY = checkPageBreak(doc, currentY, 200);
    
    if (lawsuitIndex > 0) {
      currentY += 10;
    }
    
    currentY = drawSectionHeader(doc, currentY, `Processo ${lawsuitIndex + 1}`, lawsuits.length);
    
    currentY = drawProcessHeader(
      doc, 
      currentY, 
      lawsuit.Number || lawsuit.ProcessNumber,
      lawsuit.Type || lawsuit.Class,
      lawsuit.Status || 'N/A'
    );
    
    currentY = checkPageBreak(doc, currentY, 120);
    
    doc.save();
    doc.fontSize(10)
      .fillColor(COLORS.text)
      .font('Helvetica-Bold')
      .text('Informações do Tribunal', 50, currentY);
    doc.restore();
    currentY += 18;
    
    doc.save();
    doc.roundedRect(50, currentY, 495, 85, 4)
      .fillColor(COLORS.cardBg)
      .fill();
    doc.roundedRect(50, currentY, 495, 85, 4)
      .strokeColor(COLORS.border)
      .lineWidth(0.5)
      .stroke();
    doc.restore();
    
    let infoY = currentY + 10;
    const col1 = 60;
    const col2 = 300;
    
    drawInfoRow(doc, col1, infoY, 'Tribunal', lawsuit.CourtName || lawsuit.Court || 'N/A', 220);
    drawInfoRow(doc, col2, infoY, 'Nível da Corte', lawsuit.CourtLevel || 'N/A', 220);
    infoY += 28;
    
    drawInfoRow(doc, col1, infoY, 'Tipo da Corte', lawsuit.CourtType || lawsuit.Type || 'N/A', 220);
    drawInfoRow(doc, col2, infoY, 'Distrito', lawsuit.District || 'N/A', 220);
    infoY += 28;
    
    drawInfoRow(doc, col1, infoY, 'Estado', lawsuit.State || 'N/A', 220);
    drawInfoRow(doc, col2, infoY, 'Área', lawsuit.Area || 'N/A', 220);
    
    currentY += 95;
    
    if (lawsuit.MainSubject || lawsuit.Subject || lawsuit.Class) {
      currentY = checkPageBreak(doc, currentY, 60);
      
      doc.save();
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text('Classificação', 50, currentY);
      doc.restore();
      currentY += 18;
      
      doc.save();
      doc.roundedRect(50, currentY, 495, 40, 4)
        .fillColor(COLORS.cardBg)
        .fill();
      doc.roundedRect(50, currentY, 495, 40, 4)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
      
      const subjects = [];
      if (lawsuit.MainSubject) subjects.push(lawsuit.MainSubject);
      if (lawsuit.Subject && lawsuit.Subject !== lawsuit.MainSubject) subjects.push(lawsuit.Subject);
      if (lawsuit.Class) subjects.push(`Classe: ${lawsuit.Class}`);
      
      doc.fontSize(9)
        .fillColor(COLORS.text)
        .font('Helvetica')
        .text(subjects.join(' | ') || 'N/A', 60, currentY + 12, { width: 475 });
      doc.restore();
      
      currentY += 50;
    }
    
    const parties = lawsuit.Parties || [];
    if (parties.length > 0) {
      currentY = checkPageBreak(doc, currentY, 80);
      
      doc.save();
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`Partes (${parties.length})`, 50, currentY);
      doc.restore();
      currentY += 18;
      
      currentY = drawTableHeader(doc, currentY, [
        { label: 'Nome', x: 55, width: 200 },
        { label: 'Tipo', x: 260, width: 100 },
        { label: 'Polo', x: 365, width: 80 },
        { label: 'Doc', x: 450, width: 90 }
      ]);
      
      parties.forEach((party: any, idx: number) => {
        currentY = checkPageBreak(doc, currentY, 40);
        
        currentY = drawTableRow(doc, currentY, [
          { value: truncateText(party.Name || 'N/A', 35), x: 55, width: 200 },
          { value: party.Type || party.PartyDetails?.SpecificType || 'N/A', x: 260, width: 100 },
          { value: party.Polarity === 'ACTIVE' ? 'Ativo' : party.Polarity === 'PASSIVE' ? 'Passivo' : party.Polarity || 'N/A', x: 365, width: 80 },
          { value: party.Doc || 'N/A', x: 450, width: 90 }
        ], idx);
      });
      
      currentY += 10;
    }
    
    const movements = lawsuit.Movements || lawsuit.Updates || [];
    if (movements.length > 0) {
      currentY = checkPageBreak(doc, currentY, 80);
      
      doc.save();
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`Movimentações (${movements.length})`, 50, currentY);
      doc.restore();
      currentY += 18;
      
      currentY = drawTableHeader(doc, currentY, [
        { label: 'Data', x: 55, width: 70 },
        { label: 'Descrição', x: 130, width: 410 }
      ]);
      
      movements.slice(0, 20).forEach((movement: any, idx: number) => {
        currentY = checkPageBreak(doc, currentY, 40);
        
        const movementDate = movement.Date || movement.MovementDate || movement.date;
        const movementDesc = movement.Description || movement.Content || movement.Text || movement.description || 'N/A';
        
        currentY = drawTableRow(doc, currentY, [
          { value: formatDate(movementDate), x: 55, width: 70 },
          { value: truncateText(movementDesc, 80), x: 130, width: 410 }
        ], idx);
      });
      
      if (movements.length > 20) {
        doc.save();
        doc.fontSize(8)
          .fillColor(COLORS.textMuted)
          .font('Helvetica-Oblique')
          .text(`... e mais ${movements.length - 20} movimentação(ões)`, 50, currentY + 5);
        doc.restore();
        currentY += 20;
      }
      
      currentY += 10;
    }
    
    const decisions = lawsuit.Decisions || [];
    if (decisions.length > 0) {
      currentY = checkPageBreak(doc, currentY, 80);
      
      doc.save();
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`Decisões (${decisions.length})`, 50, currentY);
      doc.restore();
      currentY += 18;
      
      currentY = drawTableHeader(doc, currentY, [
        { label: 'Data', x: 55, width: 70 },
        { label: 'Tipo', x: 130, width: 120 },
        { label: 'Descrição', x: 255, width: 285 }
      ]);
      
      decisions.slice(0, 10).forEach((decision: any, idx: number) => {
        currentY = checkPageBreak(doc, currentY, 40);
        
        currentY = drawTableRow(doc, currentY, [
          { value: formatDate(decision.Date || decision.DecisionDate), x: 55, width: 70 },
          { value: truncateText(decision.Type || 'N/A', 20), x: 130, width: 120 },
          { value: truncateText(decision.Description || decision.Content || 'N/A', 50), x: 255, width: 285 }
        ], idx);
      });
      
      currentY += 10;
    }
    
    const petitions = lawsuit.Petitions || [];
    if (petitions.length > 0) {
      currentY = checkPageBreak(doc, currentY, 80);
      
      doc.save();
      doc.fontSize(10)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`Petições (${petitions.length})`, 50, currentY);
      doc.restore();
      currentY += 18;
      
      currentY = drawTableHeader(doc, currentY, [
        { label: 'Data', x: 55, width: 70 },
        { label: 'Tipo', x: 130, width: 150 },
        { label: 'Descrição', x: 285, width: 255 }
      ]);
      
      petitions.slice(0, 10).forEach((petition: any, idx: number) => {
        currentY = checkPageBreak(doc, currentY, 40);
        
        currentY = drawTableRow(doc, currentY, [
          { value: formatDate(petition.Date || petition.PetitionDate), x: 55, width: 70 },
          { value: truncateText(petition.Type || 'N/A', 25), x: 130, width: 150 },
          { value: truncateText(petition.Description || petition.Content || 'N/A', 45), x: 285, width: 255 }
        ], idx);
      });
      
      currentY += 10;
    }
    
    if (lawsuit.Value && lawsuit.Value > 0) {
      currentY = checkPageBreak(doc, currentY, 50);
      
      doc.save();
      doc.roundedRect(50, currentY, 200, 35, 4)
        .fillColor(COLORS.cardBg)
        .fill();
      doc.roundedRect(50, currentY, 200, 35, 4)
        .strokeColor(COLORS.border)
        .lineWidth(0.5)
        .stroke();
      
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .font('Helvetica')
        .text('Valor da Causa', 60, currentY + 6);
      
      doc.fontSize(12)
        .fillColor(COLORS.success)
        .font('Helvetica-Bold')
        .text(formatCurrency(lawsuit.Value), 60, currentY + 18);
      doc.restore();
      
      currentY += 45;
    }
    
    if (lawsuit.LastMovementDate || lawsuit.NoticeDate) {
      currentY = checkPageBreak(doc, currentY, 50);
      
      doc.save();
      doc.roundedRect(50, currentY, 495, 35, 4)
        .fillColor('#f0f9ff')
        .fill();
      doc.roundedRect(50, currentY, 495, 35, 4)
        .strokeColor('#bae6fd')
        .lineWidth(0.5)
        .stroke();
      
      doc.fontSize(8)
        .fillColor(COLORS.textMuted)
        .font('Helvetica');
      
      if (lawsuit.LastMovementDate) {
        doc.text('Última Movimentação', 60, currentY + 6);
        doc.fontSize(9)
          .fillColor(COLORS.text)
          .font('Helvetica-Bold')
          .text(formatDate(lawsuit.LastMovementDate), 60, currentY + 18);
      }
      
      if (lawsuit.NoticeDate) {
        doc.fontSize(8)
          .fillColor(COLORS.textMuted)
          .font('Helvetica')
          .text('Data de Distribuição', 300, currentY + 6);
        doc.fontSize(9)
          .fillColor(COLORS.text)
          .font('Helvetica-Bold')
          .text(formatDate(lawsuit.NoticeDate), 300, currentY + 18);
      }
      
      doc.restore();
      currentY += 45;
    }
  });

  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    
    doc.save();
    doc.rect(0, 780, doc.page.width, 60)
      .fillColor('#f8fafc')
      .fill();
    
    doc.rect(0, 780, doc.page.width, 1)
      .fillColor(COLORS.border)
      .fill();
    
    doc.fontSize(7)
      .fillColor(COLORS.textMuted)
      .font('Helvetica')
      .text('Este documento foi gerado automaticamente pelo sistema de compliance.', 50, 790, { width: 400, align: 'left' })
      .text(`ID: ${check.id}`, 50, 802, { width: 400, align: 'left' });
    
    doc.fontSize(8)
      .text(`Página ${i + 1} de ${pageRange.count}`, 450, 795, { width: 95, align: 'right' });
    doc.restore();
  }

  return doc;
}

export function generateBulkCompliancePDF(checks: DatacorpCheck[]): typeof PDFDocument.prototype {
  const doc = new (PDFDocument as any)({
    size: 'A4',
    margins: { top: 40, bottom: 40, left: 50, right: 50 },
    bufferPages: true,
  });

  let currentY = drawHeader(doc, 'Relatório de Compliance', `Histórico de ${checks.length} Consultas`);

  currentY = drawSectionHeader(doc, currentY, 'Estatísticas Gerais');
  
  const approved = checks.filter(c => c.status === 'approved').length;
  const rejected = checks.filter(c => c.status === 'rejected').length;
  const manualReview = checks.filter(c => c.status === 'manual_review').length;
  
  const cardWidth = 118;
  const cardGap = 8;
  let cardX = 50;
  
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Total Consultas', String(checks.length));
  cardX += cardWidth + cardGap;
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Aprovados', String(approved));
  cardX += cardWidth + cardGap;
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Reprovados', String(rejected));
  cardX += cardWidth + cardGap;
  drawInfoCard(doc, cardX, currentY, cardWidth, 'Revisão Manual', String(manualReview));
  
  currentY += 60;

  currentY = drawSectionHeader(doc, currentY, 'Lista de Consultas');

  currentY = drawTableHeader(doc, currentY, [
    { label: 'Data/Hora', x: 55, width: 80 },
    { label: 'Nome', x: 140, width: 140 },
    { label: 'CPF', x: 285, width: 90 },
    { label: 'Status', x: 380, width: 60 },
    { label: 'Score', x: 445, width: 40 },
    { label: 'Proc.', x: 490, width: 50 }
  ]);
  
  checks.forEach((check, index) => {
    currentY = checkPageBreak(doc, currentY, 40);
    
    if (currentY === 50) {
      currentY = drawTableHeader(doc, currentY, [
        { label: 'Data/Hora', x: 55, width: 80 },
        { label: 'Nome', x: 140, width: 140 },
        { label: 'CPF', x: 285, width: 90 },
        { label: 'Status', x: 380, width: 60 },
        { label: 'Score', x: 445, width: 40 },
        { label: 'Proc.', x: 490, width: 50 }
      ]);
    }
    
    const checkAny = check as any;
    const personName = checkAny.personName || 'N/A';
    const personCpf = checkAny.personCpf || 'N/A';
    const payload = check.payload as any;
    const totalProcesses = payload?.Result?.[0]?.Processes?.TotalLawsuits || 0;
    const riskScore = typeof check.riskScore === 'string' ? parseFloat(check.riskScore) : check.riskScore;
    
    currentY = drawTableRow(doc, currentY, [
      { value: formatDateTime(check.consultedAt), x: 55, width: 80 },
      { value: truncateText(personName, 25), x: 140, width: 140 },
      { value: personCpf, x: 285, width: 90 },
      { value: getStatusLabel(check.status), x: 380, width: 60 },
      { value: riskScore !== null && riskScore !== undefined ? riskScore.toFixed(1) : 'N/A', x: 445, width: 40 },
      { value: String(totalProcesses), x: 490, width: 50 }
    ], index);
  });

  const pageRange = doc.bufferedPageRange();
  for (let i = 0; i < pageRange.count; i++) {
    doc.switchToPage(i);
    
    doc.save();
    doc.fontSize(8)
      .fillColor(COLORS.textMuted)
      .font('Helvetica')
      .text('Este documento foi gerado automaticamente pelo sistema de compliance.', 50, 785, { width: 400 })
      .text(`Página ${i + 1} de ${pageRange.count}`, 450, 785, { width: 95, align: 'right' });
    doc.restore();
  }

  return doc;
}
