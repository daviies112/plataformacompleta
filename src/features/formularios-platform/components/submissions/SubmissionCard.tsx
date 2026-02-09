import { Card } from "../ui/card";
import { Badge } from "../ui/badge";
import { CheckCircle2, XCircle, Mail, Phone, Calendar, Award, Sparkles, CreditCard, MapPin, Instagram } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale/pt-BR";
import type { FormSubmission } from "../../../../../shared/db-schema";

interface SubmissionCardProps {
  submission: FormSubmission;
  index: number;
}

export function SubmissionCard({ submission, index }: SubmissionCardProps) {
  const getStatusColor = (passed: boolean) => {
    return passed 
      ? "bg-green-500/20 text-green-500 border-green-500/30" 
      : "bg-destructive/20 text-destructive border-destructive/30";
  };

  return (
    <Card 
      className="p-8 glass border-2 border-border/50 hover:border-primary/30 hover-lift shadow-card group animate-slide-up"
      data-testid={`card-submission-${submission.id}`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start gap-8">
        <div className={`p-5 rounded-2xl ${getStatusColor(submission.passed)} border-2 shadow-lg group-hover:scale-110 transition-transform`}>
          {submission.passed ? (
            <CheckCircle2 className="h-8 w-8" />
          ) : (
            <XCircle className="h-8 w-8" />
          )}
        </div>

        <div className="flex-1 space-y-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <h3 className="text-2xl font-bold" data-testid={`text-name-${submission.id}`}>
                  {submission.contactName || "Anônimo"}
                </h3>
                <Badge className={`${getStatusColor(submission.passed)} px-3 py-1 text-sm font-semibold`}>
                  {submission.passed ? "Aprovado" : "Reprovado"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 p-2 glass rounded-lg">
                  <div className="p-1.5 rounded bg-primary/10">
                    <Mail className="h-4 w-4 text-primary" />
                  </div>
                  <span data-testid={`text-email-${submission.id}`} className="font-medium">
                    {submission.contactEmail || "Não informado"}
                  </span>
                </div>
                {submission.contactCpf && (
                  <div className="flex items-center gap-2 p-2 glass rounded-lg">
                    <div className="p-1.5 rounded bg-blue-500/10">
                      <CreditCard className="h-4 w-4 text-blue-500" />
                    </div>
                    <span data-testid={`text-cpf-${submission.id}`} className="font-medium">{submission.contactCpf}</span>
                  </div>
                )}
                {submission.contactPhone && (
                  <div className="flex items-center gap-2 p-2 glass rounded-lg">
                    <div className="p-1.5 rounded bg-accent/10">
                      <Phone className="h-4 w-4 text-accent" />
                    </div>
                    <span className="font-medium">{submission.contactPhone}</span>
                  </div>
                )}
                {submission.instagramHandle && (
                  <div className="flex items-center gap-2 p-2 glass rounded-lg">
                    <div className="p-1.5 rounded bg-pink-500/10">
                      <Instagram className="h-4 w-4 text-pink-500" />
                    </div>
                    <a 
                      href={`https://instagram.com/${submission.instagramHandle.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-pink-500 hover:underline"
                    >
                      {submission.instagramHandle}
                    </a>
                  </div>
                )}
                <div className="flex items-center gap-2 p-2 glass rounded-lg">
                  <div className="p-1.5 rounded bg-primary-glow/10">
                    <Calendar className="h-4 w-4 text-primary-glow" />
                  </div>
                  <span className="font-medium">
                    {submission.createdAt ? format(new Date(submission.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR }) : "Data não disponível"}
                  </span>
                </div>
              </div>
              
              {/* Dados de endereço */}
              {(submission.addressStreet || submission.addressCity) && (
                <div className="mt-3 p-3 glass rounded-lg border border-border/50">
                  <div className="flex items-start gap-2">
                    <div className="p-1.5 rounded bg-green-500/10 mt-0.5">
                      <MapPin className="h-4 w-4 text-green-500" />
                    </div>
                    <div className="flex-1 text-sm">
                      {submission.addressStreet && (
                        <p className="font-medium">
                          {submission.addressStreet}
                          {submission.addressNumber && `, ${submission.addressNumber}`}
                          {submission.addressComplement && ` - ${submission.addressComplement}`}
                        </p>
                      )}
                      <p className="text-muted-foreground">
                        {submission.addressNeighborhood && `${submission.addressNeighborhood}, `}
                        {submission.addressCity && `${submission.addressCity}`}
                        {submission.addressState && ` - ${submission.addressState}`}
                        {submission.addressCep && ` | CEP: ${submission.addressCep}`}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="text-right glass p-6 rounded-xl border-2 border-primary/20 shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <Award className="h-6 w-6 text-primary" />
                <span className="text-4xl font-extrabold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent" data-testid={`text-score-${submission.id}`}>
                  {submission.totalScore}
                </span>
              </div>
              <p className="text-sm text-muted-foreground font-semibold">pontos</p>
            </div>
          </div>

          <div className="pt-5 border-t-2 border-border/50">
            <details className="cursor-pointer group/details">
              <summary className="text-sm font-semibold text-primary hover:text-primary-glow transition-colors flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Ver respostas detalhadas
              </summary>
              <div className="mt-5 space-y-3 pl-4">
                {(() => {
                  const answersArray = Array.isArray(submission.answers) 
                    ? submission.answers 
                    : submission.answers && typeof submission.answers === 'object'
                      ? Object.entries(submission.answers).map(([questionId, answer], idx) => ({
                          questionId,
                          answer: answer as string,
                          questionText: `Pergunta ${idx + 1}`,
                          points: 0
                        }))
                      : [];
                  
                  if (answersArray.length === 0) {
                    return (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma resposta detalhada disponível
                      </p>
                    );
                  }
                  
                  return answersArray.map((answer: any, idx: number) => (
                    <div key={idx} className="p-4 glass rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="text-xs text-muted-foreground mb-1 font-semibold">
                            Pergunta {idx + 1}
                          </p>
                          {answer.questionText && (
                            <p className="text-sm font-medium text-foreground mb-2">
                              {answer.questionText}
                            </p>
                          )}
                          <p className="text-sm font-medium text-foreground leading-relaxed">
                            Resposta: <span className="text-primary">{answer.answer || 'N/A'}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="font-mono">
                            {answer.points || 0} pts
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </details>
          </div>
        </div>
      </div>
    </Card>
  );
}
