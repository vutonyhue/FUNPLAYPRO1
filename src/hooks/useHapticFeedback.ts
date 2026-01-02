import { useCallback } from 'react';

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';

export const useHapticFeedback = () => {
  const vibrate = useCallback((type: HapticType = 'light') => {
    // Check if vibration API is supported
    if (!navigator.vibrate) {
      return;
    }

    // Different vibration patterns for different feedback types
    const patterns: Record<HapticType, number | number[]> = {
      light: 10,
      medium: 25,
      heavy: 50,
      success: [10, 50, 20],
      warning: [30, 30, 30],
      error: [50, 100, 50],
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Silently fail if vibration is not available
      console.debug('Haptic feedback not available');
    }
  }, []);

  const lightTap = useCallback(() => vibrate('light'), [vibrate]);
  const mediumTap = useCallback(() => vibrate('medium'), [vibrate]);
  const heavyTap = useCallback(() => vibrate('heavy'), [vibrate]);
  const successFeedback = useCallback(() => vibrate('success'), [vibrate]);
  const warningFeedback = useCallback(() => vibrate('warning'), [vibrate]);
  const errorFeedback = useCallback(() => vibrate('error'), [vibrate]);

  return {
    vibrate,
    lightTap,
    mediumTap,
    heavyTap,
    successFeedback,
    warningFeedback,
    errorFeedback,
  };
};

export default useHapticFeedback;
