import { Target, CheckCircle2, Clock, Calendar, CalendarDays, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GamificationChallenge } from "@/features/revendedora/types/gamification";

interface ChallengeCardProps {
  challenge: GamificationChallenge;
  progress: number;
  isCompleted: boolean;
  className?: string;
}

const typeConfig: Record<string, { 
  label: string; 
  bg: string; 
  border: string;
  icon: React.ElementType;
  badge: string;
}> = {
  daily: {
    label: "Diário",
    bg: "bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/50",
    border: "border-green-200 dark:border-green-800",
    icon: Clock,
    badge: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  weekly: {
    label: "Semanal",
    bg: "bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/50",
    border: "border-blue-200 dark:border-blue-800",
    icon: Calendar,
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  monthly: {
    label: "Mensal",
    bg: "bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/50 dark:to-pink-950/50",
    border: "border-purple-200 dark:border-purple-800",
    icon: CalendarDays,
    badge: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  special: {
    label: "Especial",
    bg: "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/50",
    border: "border-amber-200 dark:border-amber-800",
    icon: Sparkles,
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
};

export function ChallengeCard({ challenge, progress, isCompleted, className }: ChallengeCardProps) {
  const config = typeConfig[challenge.type] || typeConfig.daily;
  const TypeIcon = config.icon;
  const progressPercent = Math.min((progress / challenge.criteria_value) * 100, 100);

  return (
    <Card className={cn(
      "overflow-hidden transition-all duration-300",
      config.border,
      isCompleted && "ring-2 ring-green-500/50",
      className
    )}>
      <div className={cn("h-1", isCompleted ? "bg-green-500" : "bg-muted")}>
        {!isCompleted && (
          <div 
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        )}
      </div>
      
      <CardContent className={cn("p-4", config.bg)}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              isCompleted 
                ? "bg-green-100 dark:bg-green-900" 
                : "bg-white/80 dark:bg-gray-800/80"
            )}>
              {isCompleted ? (
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
              ) : (
                <Target className="w-5 h-5 text-muted-foreground" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className={cn(
                  "font-semibold",
                  isCompleted && "text-green-700 dark:text-green-300"
                )}>
                  {challenge.name}
                </h4>
                <Badge variant="outline" className={cn("text-xs shrink-0 border-0", config.badge)}>
                  <TypeIcon className="w-3 h-3 mr-1" />
                  {config.label}
                </Badge>
              </div>
              
              {challenge.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {challenge.description}
                </p>
              )}
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="flex items-center gap-1 text-purple-600 dark:text-purple-400">
              <Sparkles className="w-4 h-4" />
              <span className="font-bold">+{challenge.xp_reward}</span>
            </div>
            <span className="text-xs text-muted-foreground">XP</span>
          </div>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Progresso</span>
            <span className={cn(
              "text-sm font-medium",
              isCompleted ? "text-green-600 dark:text-green-400" : "text-foreground"
            )}>
              {progress} / {challenge.criteria_value}
            </span>
          </div>
          
          <div className="relative h-2 bg-white/50 dark:bg-gray-900/50 rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isCompleted 
                  ? "bg-green-500" 
                  : "bg-gradient-to-r from-purple-500 to-pink-500"
              )}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {isCompleted && (
          <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">Desafio Completo!</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
