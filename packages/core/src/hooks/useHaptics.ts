import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactOptions } from '@capacitor/haptics';
import { toast } from 'sonner';

const HapticTypeMap = {
  light: 'light' as ImpactOptions['style'],
  medium: 'medium' as ImpactOptions['style'],
  heavy: 'heavy' as ImpactOptions['style'],
  success: 'success' as ImpactOptions['style'],
  error: 'error' as ImpactOptions['style'],
} as const;

export function useHaptics() {
  const impact = async (type: keyof typeof HapticTypeMap, intensity: 0.2 | 0.4 | 0.6 | 1 = 0.4) => {
    if (!Capacitor.isNativePlatform()) return;

    try {
      await Haptics.impact({
        style: HapticTypeMap[type],
        intensity,
      });
    } catch (e) {
      // fallback vibrate for older devices
      if ('vibrate' in navigator) {
        (navigator.vibrate as any)(50);
      }
    }
  };

  const selectionStart = () => impact('light', 0.2);
  const selectionChanged = () => impact('light', 0.4);
  const complete = () => impact('success', 0.6);

  return {
    impact,
    selectionStart,
    selectionChanged,
    complete,
    light: () => impact('light'),
    medium: () => impact('medium'),
    heavy: () => impact('heavy'),
    success: () => impact('success'),
    error: () => impact('error'),
  };
}
