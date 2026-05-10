import { useIdentityBadges } from '@/hooks/use-identity-badges';
import { cn } from '@/lib/utils';

interface IdentityBadgesProps {
  className?: string;
}

export function IdentityBadges({ className }: IdentityBadgesProps) {
  const { badges, earnedCount, totalCount } = useIdentityBadges();

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40 lowercase">identity</span>
        <span className="text-xs text-white/60">{earnedCount}/{totalCount}</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {badges.map((badge) => (
          <div
            key={badge.id}
            className={cn(
              "p-2 rounded-lg border transition-all duration-300",
              badge.earned
                ? "bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border-yellow-500/30"
                : "bg-white/5 border-white/10 opacity-50 grayscale"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">{badge.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-xs font-medium lowercase truncate",
                  badge.earned ? "text-yellow-200" : "text-white/40"
                )}>
                  {badge.name}
                </p>
                <p className="text-[10px] text-white/30 lowercase truncate">
                  {badge.description}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
