import { Sparkles, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface XPDisplayProps {
  currentXP: number;
  level: number;
  className?: string;
}

export function XPDisplay({ currentXP, level, className }: XPDisplayProps) {
  const xpForCurrentLevel = level === 1 ? 0 : Math.floor(100 * Math.pow(level, 1.5));
  const xpForNextLevel = Math.floor(100 * Math.pow(level + 1, 1.5));
  const xpProgress = Math.max(0, currentXP - xpForCurrentLevel);
  const xpNeeded = xpForNextLevel - xpForCurrentLevel;
  const progressPercent = Math.min(Math.max(0, (xpProgress / xpNeeded) * 100), 100);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <span className="text-white font-bold text-lg">{level}</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nível</p>
              <p className="font-semibold text-foreground">Level {level}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-purple-500">
            <Sparkles className="w-4 h-4" />
            <span className="font-bold">{currentXP.toLocaleString()} XP</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Progresso para Level {level + 1}</span>
            <span className="flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {xpProgress.toLocaleString()} / {xpNeeded.toLocaleString()} XP
            </span>
          </div>
          
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute inset-0 bg-gradient-to-r from-purple-500 via-fuchsia-500 to-pink-500 transition-all duration-700 ease-out animate-pulse"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute inset-0 bg-gradient-to-r from-purple-400/50 to-pink-400/50 transition-all duration-700 ease-out"
              style={{ 
                width: `${progressPercent}%`,
                animation: 'shimmer 2s infinite linear'
              }}
            />
          </div>
        </div>

        <style>{`
          @keyframes shimmer {
            0% { opacity: 0.5; }
            50% { opacity: 1; }
            100% { opacity: 0.5; }
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
