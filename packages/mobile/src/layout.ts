/**
 * Pure layout decisions shared by every workspace.
 *
 * Keeping these as plain functions lets the same rules drive the rendered UI
 * and the unit tests, without pulling React Native into the test environment.
 */

export interface LayoutMetrics {
  /** Window width in dp. */
  width: number;
  /** Window height in dp. */
  height: number;
  /** Whether the soft keyboard is currently covering part of the window. */
  keyboardVisible: boolean;
  /** Optional override, mostly useful for tests and unusual devices. */
  compactHeight?: number;
}

/** Below this window height the terminal should drop its secondary controls. */
export const COMPACT_HEIGHT = 620;

/** From this width upwards the content column is centred and capped. */
export const TABLET_BREAKPOINT = 720;

/** Comfortable reading width for a phone layout on a tablet / foldable. */
export const WIDE_CONTENT_MAX_WIDTH = 560;

/** Android-only fade length that hints a horizontal list can be scrolled. */
export const HORIZONTAL_FADE_LENGTH = 24;

/**
 * `adjustResize` shrinks the app window when the IME appears. Emulators with a
 * hardware keyboard do not reliably emit keyboardDidShow/DidHide, so the
 * window height delta is the dependable signal.
 */
export const KEYBOARD_WINDOW_SHRINK = 90;

export const isKeyboardCoveringWindow = (
  baselineHeight: number,
  currentHeight: number
): boolean => baselineHeight - currentHeight >= KEYBOARD_WINDOW_SHRINK;

export const isCompactLayout = ({
  height,
  keyboardVisible,
  compactHeight = COMPACT_HEIGHT,
}: LayoutMetrics): boolean => keyboardVisible || height < compactHeight;

/**
 * Secondary controls (terminal key strip, quick commands, AI context panel)
 * are useful on a tall screen but steal the output area once the keyboard is
 * open or the device is short. The command input itself is never hidden.
 */
export const showAuxiliaryTools = (metrics: LayoutMetrics): boolean =>
  !isCompactLayout(metrics);

/** Cap the reading column on wide screens; undefined means full-bleed phone layout. */
export const contentMaxWidth = (width: number): number | undefined =>
  width >= TABLET_BREAKPOINT ? WIDE_CONTENT_MAX_WIDTH : undefined;
