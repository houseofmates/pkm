import React from 'react';
import type { WidgetType } from './components/WidgetSidebar';
import { StreakWidget } from './widgets/StreakWidget';
import { MoodRingWidget } from './widgets/MoodRingWidget';
import { PetStatusWidget } from './widgets/PetStatusWidget';
import { QuestRowsWidget } from './widgets/QuestRowsWidget';
import { QuickVoiceWidget } from './widgets/QuickVoiceWidget';

interface WidgetRendererProps {
  type: WidgetType;
  className?: string;
}

export function WidgetRenderer({ type, className }: WidgetRendererProps) {
  switch (type) {
    case 'streak':
      return <StreakWidget className={className} />;
    case 'mood':
      return <MoodRingWidget className={className} />;
    case 'pet':
      return <PetStatusWidget className={className} />;
    case 'quest':
      return <QuestRowsWidget className={className} />;
    case 'voice':
      return <QuickVoiceWidget className={className} />;
    default:
      return null;
  }
}
