import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sun, Zap, Moon, Layout } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LAYOUT_PROFILES, type LayoutProfile } from './registry';

const THEME_COLOR = '#f6b012';

interface LayoutSwitcherProps {
  currentProfile: LayoutProfile;
  onProfileChange: (profile: LayoutProfile) => void;
}

export function LayoutSwitcher({ currentProfile, onProfileChange }: LayoutSwitcherProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const profiles: LayoutProfile[] = ['morning', 'active', 'rest'];
  const icons = { morning: Sun, active: Zap, rest: Moon };

  return (
    <div 
      className="flex items-center gap-1 p-1 rounded-lg"
      style={{ 
        background: 'rgba(5, 5, 5, 0.8)',
        border: `1px solid ${THEME_COLOR}30`,
      }}
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <Layout className="w-4 h-4 mx-2" style={{ color: THEME_COLOR }} />
      
      {profiles.map((profile) => {
        const config = LAYOUT_PROFILES[profile];
        const Icon = icons[profile];
        const isActive = currentProfile === profile;

        return (
          <Button
            key={profile}
            size="sm"
            variant="ghost"
            onClick={() => onProfileChange(profile)}
            className={cn(
              "h-7 px-2 text-[11px] lowercase transition-all duration-200",
              isActive ? "font-medium" : "opacity-60 hover:opacity-100"
            )}
            style={{
              background: isActive ? `${THEME_COLOR}20` : 'transparent',
              color: isActive ? THEME_COLOR : '#ffffff',
              border: isActive ? `1px solid ${THEME_COLOR}50` : '1px solid transparent',
            }}
            title={config.description}
          >
            <Icon className="w-3 h-3 mr-1" />
            {config.label}
          </Button>
        );
      })}
    </div>
  );
}
