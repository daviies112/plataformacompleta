import { Card } from "../ui/card";
import { CheckCircle2, XCircle, Award } from "lucide-react";
import type { FormSubmission } from "../../../../../shared/db-schema";

interface SubmissionStatsProps {
  submissions: FormSubmission[];
}

export function SubmissionStats({ submissions }: SubmissionStatsProps) {
  const approvedCount = submissions.filter(s => s.passed).length;
  const rejectedCount = submissions.filter(s => !s.passed).length;
  const avgScore = submissions.length > 0 
    ? Math.round(submissions.reduce((sum, s) => sum + (s.totalScore || 0), 0) / submissions.length)
    : 0;

  return (
    <div className="flex gap-4 animate-fade-in flex-wrap">
      <Card className="p-6 glass border-2 border-green-500/20 shadow-lg hover:scale-105 transition-transform">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-green-500/20">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          </div>
          <div className="text-3xl font-extrabold text-green-500" data-testid="text-approved-count">
            {approvedCount}
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-medium">Aprovados</div>
      </Card>
      <Card className="p-6 glass border-2 border-destructive/20 shadow-lg hover:scale-105 transition-transform">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-destructive/20">
            <XCircle className="h-5 w-5 text-destructive" />
          </div>
          <div className="text-3xl font-extrabold text-destructive" data-testid="text-rejected-count">
            {rejectedCount}
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-medium">Reprovados</div>
      </Card>
      <Card className="p-6 glass border-2 border-primary/20 shadow-lg hover:scale-105 transition-transform">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/20">
            <Award className="h-5 w-5 text-primary" />
          </div>
          <div className="text-3xl font-extrabold text-primary" data-testid="text-avg-score">
            {avgScore}
          </div>
        </div>
        <div className="text-sm text-muted-foreground font-medium">Pontuação Média</div>
      </Card>
    </div>
  );
}
