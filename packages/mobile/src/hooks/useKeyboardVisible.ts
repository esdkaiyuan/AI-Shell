import { useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import { isKeyboardCoveringWindow } from '../layout';

/**
 * Derives the IME state from the window height instead of Keyboard events.
 * Android's `adjustResize` reliably shrinks the window, while emulators with a
 * hardware keyboard often skip keyboardDidShow/DidHide entirely — which would
 * otherwise leave the auxiliary controls permanently hidden.
 *
 * The baseline resets on a width change so rotating the device is not mistaken
 * for a keyboard.
 */
export const useKeyboardVisible = (): boolean => {
  const { width, height } = useWindowDimensions();
  const baseline = useRef({ width, height });
  if (baseline.current.width !== width) {
    baseline.current = { width, height };
  }
  return isKeyboardCoveringWindow(baseline.current.height, height);
};
