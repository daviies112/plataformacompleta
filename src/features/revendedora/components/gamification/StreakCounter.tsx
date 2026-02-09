import { Flame, Trophy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StreakCounterProps {
  currentStreak: number;
  longestStreak: number;
  className?: string;
}

export function StreakCounter({ currentStreak, longestStreak, className }: StreakCounterProps) {
  const getStreakColor = () => {
    if (currentStreak >= 100) return "from-red-600 to-yellow-400";
    if (currentStreak >= 30) return "from-orange-600 to-red-500";
    if (currentStreak >= 7) return "from-orange-500 to-yellow-500";
    return "from-orange-400 to-yellow-400";
  };

  const getFlameSize = () => {
    if (currentStreak >= 100) return "w-12 h-12";
    if (currentStreak >= 30) return "w-10 h-10";
    if (currentStreak >= 7) return "w-8 h-8";
    return "w-6 h-6";
  };

  const getFlameAnimationClass = () => {
    if (currentStreak >= 100) return "animate-bounce";
    if (currentStreak >= 30) return "animate-pulse";
    if (currentStreak >= 7) return "animate-pulse";
    return "";
  };

  const isNewRecord = currentStreak >= longestStreak && currentStreak > 0;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={cn(
              "relative flex items-center justify-center",
              getFlameAnimationClass()
            )}>
              <div className={cn(
                "absolute inset-0 rounded-full bg-gradient-to-br opacity-30 blur-lg",
                getStreakColor()
              )} />
              <Flame className={cn(
                "text-orange-500 drop-shadow-lg",
                getFlameSize()
              )} 
                style={{
                  filter: currentStreak >= 30 ? 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.6))' : undefined
                }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent",
                  getStreakColor()
                )}>
                  {currentStreak}
                </span>
                <span className="text-sm text-muted-foreground">dias</span>
              </div>
              <p className="text-xs text-muted-foreground">Sequência atual</p>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-medium">{longestStreak} dias</span>
            </div>
            <p className="text-xs text-muted-foreground">Recorde</p>
            {isNewRecord && (
              <span className="inline-block mt-1 px-2 py-0.5 text-xs font-semibold bg-gradient-to-r from-yellow-400 to-orange-500 text-white rounded-full animate-pulse">
                Novo Recorde!
              </span>
            )}
          </div>
        </div>

        {currentStreak > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Bônus de sequência:</span>
              <span className={cn(
                "font-semibold",
                currentStreak >= 30 ? "text-orange-500" : currentStreak >= 7 ? "text-yellow-500" : "text-muted-foreground"
              )}>
                {currentStreak >= 30 ? "+30% XP" : currentStreak >= 7 ? "+10% XP" : "Alcance 7 dias para bônus"}
              </span>
            </div>
          </div>
        )}

        <style>{`
          @keyframes flicker {
            0%, 100% { opacity: 1; transform: scale(1); }
            25% { opacity: 0.9; transform: scale(0.98); }
            50% { opacity: 1; transform: scale(1.02); }
            75% { opacity: 0.95; transform: scale(0.99); }
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
