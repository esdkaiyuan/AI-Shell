import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/**
 * Reports the system's "Reduce Motion" setting and keeps it in sync.
 *
 * HIG treats this as an accessibility switch, not a preference: when it is on,
 * every animation must collapse to a near-instant change. Reading it from one
 * shared hook keeps that decision in a single place instead of letting each
 * screen decide for itself.
 */
export const useReduceMotion = (): boolean => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(value => {
        if (alive) setReduceMotion(value);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', () => {
      AccessibilityInfo.isReduceMotionEnabled()
        .then(value => setReduceMotion(value))
        .catch(() => undefined);
    });
    return () => {
      alive = false;
      subscription?.remove?.();
    };
  }, []);

  return reduceMotion;
};
