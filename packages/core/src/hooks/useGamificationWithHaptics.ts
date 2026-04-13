import { useCallback } from 'react';
import { useGamificationStore } from '../../../apps/web/src/stores/gamification-store';
import { useHaptics } from './useHaptics';

export function useGamificationWithHaptics() {
  const store = useGamificationStore();
  const { success, light } = useHaptics();

  const earnXp = useCallback((amount: number, reason?: string) => {
    const result = store.earnXp(amount, reason);

    if (amount >= 10) {
      success();
    } else {
      light();
    }

    return result;
  }, [store, success, light]);

  const completeQuest = useCallback((questId: string) => {
    const result = store.completeQuest(questId);
    success();
    return result;
  }, [store, success]);

  const toggleGoal = useCallback((goalId: string) => {
    const result = store.toggleGoal(goalId);
    light();
    return result;
  }, [store, light]);

  const unlockAchievement = useCallback((id: string) => {
    const result = store.unlockAchievement(id);
    success();
    return result;
  }, [store, success]);

  return {
    ...store,
    earnXp,
    completeQuest,
    toggleGoal,
    unlockAchievement
  };
}
