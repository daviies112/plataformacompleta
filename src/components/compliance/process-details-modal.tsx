import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Loader2, User, CreditCard, Scale, AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { downloadPDF } from "@/lib/download-utils";
import { toast } from "sonner";
import { calculateUnifiedRisk, getRiskColor } from "@/lib/riskCalculation";

// Helper function to format CPF inside the component since @shared/schema might have path issues
function formatCPFLocal(cpf: string | null) {
  if (!cpf) return "N/A";
  const numeric = cpf.replace(/\D/g, "");
  if (numeric.length !== 11) return cpf;
  return `${numeric.slice(0, 3)}.${numeric.slice(3, 6)}.${numeric.slice(6, 9)}-${numeric.slice(9)}`;
}

function StatusBadgeLocal({ status }: { status: string }) {
  const config: Record<string, { label: string, color: string }> = {
    approved: { label: "Aprovado", color: "bg-green-600" },
    rejected: { label: "Reprovado", color: "bg-red-600" },
    pending: { label: "Pendente", color: "bg-yellow-600" },
    review: { label: "Em Revisão", color: "bg-blue-600" }
  };
  const s = config[status] || { label: status, color: "bg-zinc-600" };
  return <Badge className={s.color}>{s.label}</Badge>;
}

function ScoreGauge({ score }: { score: number }) {
  // Score de 0 a 1000
  // Lógica de cores: 0-300 Vermelho, 301-600 Laranja/Amarelo, 601-800 Verde Claro, 801-1000 Verde
  const getScoreColor = (val: number) => {
    if (val <= 300) return "#ef4444"; // Red
    if (val <= 500) return "#f97316"; // Orange
    if (val <= 700) return "#eab308"; // Yellow
    if (val <= 850) return "#84cc16"; // Lime
    return "#22c55e"; // Green
  };

  const color = getScoreColor(score);
  const percentage = score / 1000;
  const strokeDasharray = 251.2; // 2 * PI * r (r=40)
  const strokeDashoffset = strokeDasharray * (1 - percentage / 2); // Metade do círculo

  return (
    <div className="flex flex-col items-center justify-center p-6 bg-zinc-900/50 rounded-xl border border-zinc-700/50 mb-6">
      <div className="relative w-48 h-24 overflow-hidden">
        <svg viewBox="0 0 100 50" className="w-full h-full">
          {/* Background track */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke="#27272a"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Active segments logic - Simplified to 5 segments for visual appeal like the image */}
          <path
            d="M 10 50 A 40 40 0 0 1 90 50"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="125.6"
            strokeDashoffset={125.6 * (1 - percentage)}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-4xl font-bold text-zinc-100 leading-none">{Math.round(score)}</span>
          <span className="text-xs text-zinc-400 mt-1 uppercase tracking-wider">de 1000</span>
        </div>
      </div>
      <div className="mt-4 flex flex-col items-center">
        <Badge style={{ backgroundColor: color }} className="text-white border-0 px-4 py-1">
          {score > 800 ? "Excelente" : score > 600 ? "Bom" : score > 400 ? "Regular" : "Risco Alto"}
        </Badge>
        <p className="text-[10px] text-zinc-500 mt-2 text-center max-w-[200px]">
          Score Universal calculado com base em dados cadastrais, histórico de processos e restrições financeiras.
        </p>
      </div>
    </div>
  );
}

interface ProcessDetailsModalProps {
  check: DatacorpCheck | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProcessDetailsModal({ check, open, onOpenChange }: ProcessDetailsModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  
  if (!check) return null;

  const payload = check.payload as any;
  const result = payload?.Result?.[0];
  const processData = result?.Processes;
  const lawsuits = processData?.Lawsuits || [];
  const totalLawsuits = processData?.TotalLawsuits || 0;
  const storedRiskScore = typeof check.riskScore === 'string' ? parseFloat(check.riskScore) : check.riskScore;
  const calculatedRiskScore = calculateUnifiedRisk(payload);
  const riskScore = calculatedRiskScore || storedRiskScore;
  const riskInteger = riskScore !== null && riskScore !== undefined ? Math.round(riskScore) : null;
  
  const queryId = payload?.QueryId;
  const elapsedMs = payload?.ElapsedMilliseconds;
  const queryDate = payload?.QueryDate;
  const matchKeys = result?.MatchKeys;
  const statusInfo = payload?.Status;
  
  const basicDataPayload = payload?._basic_data?.Result?.[0]?.BasicData;
  const collectionsPayload = payload?._collections?.Result?.[0]?.Collections;
  const metadata = payload?._metadata;
  const isCompleteConsultation = payload?._datacorp_complete === true;
  const hasDebt = collectionsPayload?.HasActiveCollections || (collectionsPayload?.TotalOccurrences && collectionsPayload.TotalOccurrences > 0);
  
  // Lógica de Metodologia para o Score (0-1000)
  const universalScore = useMemo(() => {
    let score = 850; // Base "Boa"

    // 1. Processos Judiciais (Impacto Alto se Réu)
    const defendantCount = processData?.TotalLawsuitsAsDefendant || 0;
    const totalLawsuits = processData?.TotalLawsuits || 0;
    score -= defendantCount * 50;
    score -= (totalLawsuits - defendantCount) * 10;

    // 2. Restrições Financeiras (Impacto Crítico)
    if (collectionsPayload?.HasActiveCollections) {
      score -= 300;
    } else if (collectionsPayload?.TotalOccurrences > 0) {
      score -= 150;
    }

    // 3. Status CPF (Impacto Bloqueante)
    if (basicDataPayload?.TaxIdStatus && basicDataPayload.TaxIdStatus !== 'Regular') {
      score -= 400;
    }

    // 4. Idade do Histórico
    if (processData?.FirstLawsuitDate) {
      const firstDate = new Date(processData.FirstLawsuitDate);
      const yearsSince = (new Date().getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (yearsSince < 2) score -= 50; // Histórico muito recente pode ser instável
    }

    // 5. Histórico de Processos Recentes (Tendência)
    const recentLawsuits = (processData?.Last30DaysLawsuits || 0) + (processData?.Last90DaysLawsuits || 0);
    if (recentLawsuits > 0) {
      score -= recentLawsuits * 20;
    }

    // Bônus por consistência
    if (isCompleteConsultation && !hasDebt && defendantCount === 0) {
      score += 50;
    }

    return Math.min(Math.max(score, 0), 1000);
  }, [processData, collectionsPayload, basicDataPayload, isCompleteConsultation, hasDebt]);

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadPDF(check.id);
      toast.success('PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle>Detalhes da Consulta de Processos Judiciais</DialogTitle>
              <DialogDescription>
                Informações completas retornadas pela API Bigdatacorp
              </DialogDescription>
            </div>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              className="gap-2"
              disabled={isDownloading}
              data-testid="button-download-check"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
              {isDownloading ? 'Gerando PDF...' : 'Baixar PDF'}
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Score Universal - Início do Popup conforme solicitado */}
          <ScoreGauge score={universalScore} />

          {/* Informações da Consulta */}
          {(queryId || elapsedMs || queryDate || matchKeys) && (
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader>
                <CardTitle className="text-base text-zinc-100">Informações da Consulta (API Bigdatacorp)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {queryId && (
                    <div>
                      <p className="text-zinc-400">Query ID</p>
                      <p className="font-mono text-xs text-zinc-100">{queryId}</p>
                    </div>
                  )}
                  {queryDate && (
                    <div>
                      <p className="text-zinc-400">Data da Consulta</p>
                      <p className="font-medium text-zinc-100">{formatDate(queryDate)}</p>
                    </div>
                  )}
                  {elapsedMs !== undefined && (
                    <div>
                      <p className="text-zinc-400">Tempo de Resposta</p>
                      <p className="font-medium text-zinc-100">{elapsedMs}ms</p>
                    </div>
                  )}
                  {matchKeys && (
                    <div>
                      <p className="text-zinc-400">Match Keys</p>
                      <p className="font-mono text-xs text-zinc-100">{matchKeys}</p>
                    </div>
                  )}
                  {statusInfo?.processes && statusInfo.processes.length > 0 && (
                    <div className="col-span-2">
                      <p className="text-zinc-400 mb-2">Status da Consulta</p>
                      <div className="space-y-1">
                        {statusInfo.processes.map((proc: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2">
                            <Badge variant={proc.Code === 200 ? "default" : "destructive"}>
                              Code: {proc.Code}
                            </Badge>
                            <span className="text-xs text-zinc-300">{proc.Message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
          
          {/* Resumo Geral */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <StatusBadgeLocal status={check.status} />
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Risco (1-10)</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge 
                  variant={riskInteger && riskInteger > 6 ? "destructive" : riskInteger && riskInteger > 3 ? "secondary" : "default"} 
                  className={`text-lg ${riskInteger && riskInteger <= 3 ? 'bg-green-600' : riskInteger && riskInteger <= 6 ? 'bg-amber-500' : ''}`}
                >
                  {riskInteger !== null ? riskInteger : "N/A"}
                </Badge>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Total Processos</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold text-zinc-100">{totalLawsuits}</p>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900 border-zinc-700">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-zinc-400">Nome/CPF</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs font-medium truncate text-zinc-100">
                  {check.personName || 'N/A'}
                </p>
                <p className="text-xs text-zinc-400 font-mono">
                  {formatCPFLocal(check.personCpf)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Métricas Detalhadas */}
          {processData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-100">Como Autor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-zinc-100">{processData.TotalLawsuitsAsAuthor || 0}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-100">Como Réu</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-red-500">{processData.TotalLawsuitsAsDefendant || 0}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm text-zinc-100">Outros</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xl font-semibold text-blue-400">{processData.TotalLawsuitsAsOther || 0}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">Primeiro Processo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-zinc-100">{formatDate(processData.FirstLawsuitDate)}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">Último Processo</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm font-medium text-zinc-100">{formatDate(processData.LastLawsuitDate)}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">Últimos 30 dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold text-zinc-100">{processData.Last30DaysLawsuits || 0}</p>
                  </CardContent>
                </Card>
                
                <Card className="bg-zinc-900 border-zinc-700">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-zinc-400">Últimos 90 dias</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold text-zinc-100">{processData.Last90DaysLawsuits || 0}</p>
                  </CardContent>
                </Card>
              </div>
              
              {(processData.Last180DaysLawsuits !== undefined || processData.Last365DaysLawsuits !== undefined) && (
                <div className="grid grid-cols-2 gap-4">
                  <Card className="bg-zinc-900 border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-zinc-400">Últimos 180 dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-zinc-100">{processData.Last180DaysLawsuits || 0}</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-zinc-900 border-zinc-700">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-xs text-zinc-400">Últimos 365 dias</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-lg font-semibold text-zinc-100">{processData.Last365DaysLawsuits || 0}</p>
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

          {/* Dados Cadastrais (SEMPRE exibido) */}
          <Card className="border-zinc-700 bg-zinc-800/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base text-zinc-100">Dados Cadastrais</CardTitle>
                <Badge variant="outline" className="text-xs text-amber-500 border-amber-500/50">CPF Receita Federal</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {basicDataPayload ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Nome Completo</p>
                    <p className="font-medium text-zinc-100">{basicDataPayload.Name || check.personName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Status do CPF</p>
                    <Badge variant={basicDataPayload.TaxIdStatus === 'Regular' ? 'default' : 'destructive'} className={basicDataPayload.TaxIdStatus === 'Regular' ? 'bg-green-600' : ''}>
                      {basicDataPayload.TaxIdStatus || 'N/A'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-zinc-400">Data Status</p>
                    <p className="font-medium text-zinc-100">{basicDataPayload.TaxIdStatusDate ? formatDate(basicDataPayload.TaxIdStatusDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Data de Nascimento</p>
                    <p className="font-medium text-zinc-100">{basicDataPayload.BirthDate ? formatDate(basicDataPayload.BirthDate) : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Idade</p>
                    <p className="font-medium text-zinc-100">{basicDataPayload.Age !== undefined ? `${basicDataPayload.Age} anos` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Sexo</p>
                    <p className="font-medium text-zinc-100">
                      {basicDataPayload.Gender 
                        ? (basicDataPayload.Gender === 'M' ? 'Masculino' : basicDataPayload.Gender === 'F' ? 'Feminino' : basicDataPayload.Gender) 
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="col-span-2 md:col-span-3">
                    <p className="text-zinc-400">Nome da Mãe</p>
                    <p className="font-medium text-zinc-100">{basicDataPayload.MotherName || 'N/A'}</p>
                  </div>
                  {basicDataPayload.FatherName && (
                    <div className="col-span-2 md:col-span-3">
                      <p className="text-zinc-400">Nome do Pai</p>
                      <p className="font-medium text-zinc-100">{basicDataPayload.FatherName}</p>
                    </div>
                  )}
                  {basicDataPayload.DeathDate && (
                    <div>
                      <p className="text-zinc-400">Data de Óbito</p>
                      <Badge variant="destructive">{formatDate(basicDataPayload.DeathDate)}</Badge>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-sm text-zinc-400">
                  <p>Dados cadastrais não disponíveis para esta consulta.</p>
                  <p className="mt-1 text-xs">Marque "Forçar Atualização" para buscar dados completos nas 3 APIs.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Presença em Cobrança (SEMPRE exibido) */}
          <Card className="border-zinc-700 bg-zinc-800/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-amber-500" />
                <CardTitle className="text-base text-zinc-100">Presença em Cobrança</CardTitle>
                {collectionsPayload ? (
                  collectionsPayload.HasActiveCollections ? (
                    <Badge variant="destructive" className="text-xs bg-red-600">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Cobranças Ativas
                    </Badge>
                  ) : (collectionsPayload.TotalOccurrences || 0) === 0 ? (
                    <Badge variant="default" className="text-xs bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Sem Ocorrências
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Histórico
                    </Badge>
                  )
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Histórico
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {collectionsPayload ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Total de Ocorrências</p>
                    <p className={`text-2xl font-bold ${(collectionsPayload.TotalOccurrences || 0) > 0 ? 'text-amber-500' : 'text-green-500'}`}>
                      {collectionsPayload.TotalOccurrences ?? 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Últimos 3 meses</p>
                    <p className="text-xl font-semibold text-zinc-100">{collectionsPayload.Last3Months ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Últimos 12 meses</p>
                    <p className="text-xl font-semibold text-zinc-100">{collectionsPayload.Last12Months ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Meses Consecutivos</p>
                    <p className="text-xl font-semibold text-zinc-100">{collectionsPayload.ConsecutiveMonths ?? 0}</p>
                  </div>
                  {(collectionsPayload.FirstOccurrenceDate || collectionsPayload.LastOccurrenceDate) && (
                    <>
                      <div>
                        <p className="text-zinc-400">Primeira Ocorrência</p>
                        <p className="font-medium text-zinc-100">{collectionsPayload.FirstOccurrenceDate ? formatDate(collectionsPayload.FirstOccurrenceDate) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-zinc-400">Última Ocorrência</p>
                        <p className="font-medium text-zinc-100">{collectionsPayload.LastOccurrenceDate ? formatDate(collectionsPayload.LastOccurrenceDate) : 'N/A'}</p>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Total de Ocorrências</p>
                    <p className="text-2xl font-bold text-green-500">0</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-zinc-400 text-xs mt-2">
                      Dados de cobrança não disponíveis para esta consulta. Marque "Forçar Atualização" para buscar dados completos.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Indicador de consulta completa (SEMPRE exibido) */}
          <Card className="border-zinc-700 bg-zinc-800/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-base text-zinc-100">Consulta Completa DataCorp</CardTitle>
                </div>
                <Badge variant="outline" className={`text-xs ${isCompleteConsultation ? 'text-amber-500 border-amber-500/50' : 'text-zinc-500 border-zinc-500/50'}`}>
                  {isCompleteConsultation ? '3 APIs em paralelo' : 'Consulta simples'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {isCompleteConsultation && metadata ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Tempo de Consulta</p>
                    <p className="font-medium text-zinc-100">{metadata.tempoConsulta || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Custo Total</p>
                    <p className="font-medium text-amber-500">R$ {metadata.custoTotal || '0.170'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-400">Dados Cadastrais:</p>
                    {metadata.basicDataSuccess ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-400">Cobranças:</p>
                    {metadata.collectionsSuccess ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-zinc-400">Tempo de Consulta</p>
                    <p className="font-medium text-zinc-100">{elapsedMs ? `${elapsedMs}ms` : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Custo Estimado</p>
                    <p className="font-medium text-amber-500">R$ 0.070</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-400">Dados Cadastrais:</p>
                    {basicDataPayload ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-zinc-400">Cobranças:</p>
                    {collectionsPayload ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Processos */}
          <Tabs defaultValue="processos" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="processos">Processos ({lawsuits.length})</TabsTrigger>
              <TabsTrigger value="json">JSON Completo</TabsTrigger>
            </TabsList>
            
            <TabsContent value="processos" className="space-y-4 mt-4">
              {lawsuits.length > 0 ? (
                <div className="space-y-4">
                  {lawsuits.map((lawsuit: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-primary">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-2 flex-1">
                            <CardTitle className="text-base">
                              {lawsuit.Number || lawsuit.ProcessNumber || 'N/A'}
                            </CardTitle>
                            <div className="flex gap-2 flex-wrap">
                              {lawsuit.Status && (
                                <Badge variant={lawsuit.Status === 'Ativo' ? 'default' : 'secondary'}>
                                  {lawsuit.Status}
                                </Badge>
                              )}
                              {lawsuit.InferredCNJProcedureTypeName && (
                                <Badge variant="outline">{lawsuit.InferredCNJProcedureTypeName}</Badge>
                              )}
                            </div>
                          </div>
                          {lawsuit.Value && lawsuit.Value > 0 && (
                            <div className="text-right ml-2">
                              <p className="text-xs text-muted-foreground">Valor da Causa</p>
                              <p className="text-lg font-bold text-green-600">
                                {new Intl.NumberFormat('pt-BR', { 
                                  style: 'currency', 
                                  currency: 'BRL' 
                                }).format(lawsuit.Value)}
                              </p>
                            </div>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {/* Sub-tabs para cada processo */}
                        <Tabs defaultValue="info" className="w-full">
                          <TabsList className="grid w-full grid-cols-5">
                            <TabsTrigger value="info">Informações</TabsTrigger>
                            <TabsTrigger value="partes">
                              Partes ({lawsuit.Parties?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="movimentacoes">
                              Movimentações ({lawsuit.Updates?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="decisoes">
                              Decisões ({lawsuit.Decisions?.length || 0})
                            </TabsTrigger>
                            <TabsTrigger value="peticoes">
                              Petições ({lawsuit.Petitions?.length || 0})
                            </TabsTrigger>
                          </TabsList>
                          
                          {/* Aba de Informações Gerais */}
                          <TabsContent value="info" className="mt-4">
                            <div className="space-y-6">
                              {/* Informações do Tribunal */}
                              <div>
                                <h4 className="font-semibold text-sm mb-3">Informações do Tribunal</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Tribunal</p>
                                    <p className="font-medium">{lawsuit.CourtName || lawsuit.Court || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Nível da Corte</p>
                                    <p className="font-medium">{lawsuit.CourtLevel || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Tipo da Corte</p>
                                    <p className="font-medium">{lawsuit.CourtType || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Distrito</p>
                                    <p className="font-medium">{lawsuit.CourtDistrict || 'N/A'}</p>
                                  </div>
                                  {lawsuit.CourtSection && (
                                    <div>
                                      <p className="text-muted-foreground">Seção</p>
                                      <p className="font-medium">{lawsuit.CourtSection}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-muted-foreground">Estado</p>
                                    <p className="font-medium">{lawsuit.State || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Classificação do Processo */}
                              <div>
                                <h4 className="font-semibold text-sm mb-3">Classificação</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Classe</p>
                                    <p className="font-medium">{lawsuit.Class || 'N/A'}</p>
                                  </div>
                                  {lawsuit.Type && (
                                    <div>
                                      <p className="text-muted-foreground">Tipo</p>
                                      <p className="font-medium">{lawsuit.Type}</p>
                                    </div>
                                  )}
                                  <div className="col-span-2">
                                    <p className="text-muted-foreground">Assunto Principal</p>
                                    <p className="font-medium">{lawsuit.MainSubject || lawsuit.Subject || 'N/A'}</p>
                                  </div>
                                  {lawsuit.InferredCNJSubjectName && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Assunto CNJ Inferido</p>
                                      <p className="font-medium">{lawsuit.InferredCNJSubjectName}</p>
                                    </div>
                                  )}
                                  {lawsuit.InferredBroadCNJSubjectName && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Assunto CNJ Amplo</p>
                                      <p className="font-medium">{lawsuit.InferredBroadCNJSubjectName}</p>
                                    </div>
                                  )}
                                  {lawsuit.SubjectCodes && lawsuit.SubjectCodes.length > 0 && (
                                    <div className="col-span-2">
                                      <p className="text-muted-foreground">Códigos de Assunto</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {lawsuit.SubjectCodes.map((code: string, idx: number) => (
                                          <Badge key={idx} variant="outline" className="text-xs">
                                            {code}
                                          </Badge>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-muted-foreground">Área</p>
                                    <p className="font-medium">{lawsuit.Area || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Instância</p>
                                    <p className="font-medium">{lawsuit.Instance || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Responsáveis */}
                              <div>
                                <h4 className="font-semibold text-sm mb-3">Responsáveis</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Juiz(a)</p>
                                    <p className="font-medium">{lawsuit.Judge || 'N/A'}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Órgão Julgador</p>
                                    <p className="font-medium">{lawsuit.JudgingBody || 'N/A'}</p>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Datas */}
                              <div>
                                <h4 className="font-semibold text-sm mb-3">Datas Importantes</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Data de Distribuição</p>
                                    <p className="font-medium">{formatDate(lawsuit.NoticeDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Data de Publicação</p>
                                    <p className="font-medium">{formatDate(lawsuit.PublicationDate)}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Última Movimentação</p>
                                    <p className="font-medium">{formatDate(lawsuit.LastMovementDate)}</p>
                                  </div>
                                  {lawsuit.LastUpdate && (
                                    <div>
                                      <p className="text-muted-foreground">Última Atualização</p>
                                      <p className="font-medium">{formatDate(lawsuit.LastUpdate)}</p>
                                    </div>
                                  )}
                                  <div>
                                    <p className="text-muted-foreground">Data de Captura</p>
                                    <p className="font-medium">{formatDate(lawsuit.CaptureDate)}</p>
                                  </div>
                                  {lawsuit.CloseDate && (
                                    <div>
                                      <p className="text-muted-foreground">Data de Encerramento</p>
                                      <p className="font-medium">{formatDate(lawsuit.CloseDate)}</p>
                                    </div>
                                  )}
                                  {lawsuit.RedistributionDate && (
                                    <div>
                                      <p className="text-muted-foreground">Data de Redistribuição</p>
                                      <p className="font-medium">{formatDate(lawsuit.RedistributionDate)}</p>
                                    </div>
                                  )}
                                  {lawsuit.ResJudicataDate && (
                                    <div>
                                      <p className="text-muted-foreground">Data de Trânsito em Julgado</p>
                                      <p className="font-medium">{formatDate(lawsuit.ResJudicataDate)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              {/* Métricas do Processo */}
                              <div>
                                <h4 className="font-semibold text-sm mb-3">Métricas</h4>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="text-muted-foreground">Número de Partes</p>
                                    <p className="font-medium">{lawsuit.NumberOfParties || 0}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Número de Movimentações</p>
                                    <p className="font-medium">{lawsuit.NumberOfUpdates || 0}</p>
                                  </div>
                                  {lawsuit.NumberOfPages !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">Número de Páginas</p>
                                      <p className="font-medium">{lawsuit.NumberOfPages}</p>
                                    </div>
                                  )}
                                  {lawsuit.NumberOfVolumes !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">Número de Volumes</p>
                                      <p className="font-medium">{lawsuit.NumberOfVolumes}</p>
                                    </div>
                                  )}
                                  {lawsuit.LawSuitAge !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">Idade do Processo (dias)</p>
                                      <p className="font-medium">{lawsuit.LawSuitAge}</p>
                                    </div>
                                  )}
                                  {lawsuit.AverageNumberOfUpdatesPerMonth !== undefined && (
                                    <div>
                                      <p className="text-muted-foreground">Média de Atualizações/Mês</p>
                                      <p className="font-medium">{lawsuit.AverageNumberOfUpdatesPerMonth.toFixed(2)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TabsContent>
                          
                          {/* Aba de Partes */}
                          <TabsContent value="partes" className="mt-4">
                            <PartyList parties={lawsuit.Parties || []} />
                          </TabsContent>
                          
                          {/* Aba de Movimentações */}
                          <TabsContent value="movimentacoes" className="mt-4">
                            <UpdateTimeline updates={lawsuit.Updates || []} />
                          </TabsContent>
                          
                          {/* Aba de Decisões */}
                          <TabsContent value="decisoes" className="mt-4">
                            <DecisionList decisions={lawsuit.Decisions || []} />
                          </TabsContent>
                          
                          {/* Aba de Petições */}
                          <TabsContent value="peticoes" className="mt-4">
                            <PetitionList petitions={lawsuit.Petitions || []} />
                          </TabsContent>
                        </Tabs>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhum processo encontrado</p>
                </div>
              )}
            </TabsContent>
            
            {/* Aba de JSON Completo */}
            <TabsContent value="json" className="mt-4">
              <pre className="text-xs bg-muted p-4 rounded-lg overflow-auto max-h-[400px]">
                {JSON.stringify(check.payload, null, 2)}
              </pre>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}
