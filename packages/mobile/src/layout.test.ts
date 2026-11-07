import { describe, expect, it } from 'vitest';
import {
  COMPACT_HEIGHT,
  KEYBOARD_WINDOW_SHRINK,
  TABLET_BREAKPOINT,
  WIDE_CONTENT_MAX_WIDTH,
  contentMaxWidth,
  isCompactLayout,
  isKeyboardCoveringWindow,
  showAuxiliaryTools,
  type LayoutMetrics,
} from './layout';

const phone: LayoutMetrics = { width: 411, height: 880, keyboardVisible: false };

describe('isCompactLayout', () => {
  it('keeps the full layout on a tall phone', () => {
    expect(isCompactLayout(phone)).toBe(false);
  });

  it('collapses as soon as the keyboard is visible', () => {
    expect(isCompactLayout({ ...phone, keyboardVisible: true })).toBe(true);
  });

  it('collapses on short windows', () => {
    expect(isCompactLayout({ ...phone, height: COMPACT_HEIGHT - 1 })).toBe(true);
    expect(isCompactLayout({ ...phone, height: COMPACT_HEIGHT })).toBe(false);
  });

  it('always collapses while the keyboard is open, even on a tablet', () => {
    expect(
      isCompactLayout({ width: 900, height: 1200, keyboardVisible: true })
    ).toBe(true);
  });

  it('supports a device specific compact threshold', () => {
    expect(
      isCompactLayout({ ...phone, height: 700, compactHeight: 740 })
    ).toBe(true);
  });
});

describe('showAuxiliaryTools', () => {
  it('is the inverse of the compact decision', () => {
    expect(showAuxiliaryTools(phone)).toBe(true);
    expect(showAuxiliaryTools({ ...phone, keyboardVisible: true })).toBe(false);
    expect(showAuxiliaryTools({ ...phone, height: 480 })).toBe(false);
  });
});

describe('isKeyboardCoveringWindow', () => {
  it('ignores small window changes such as the status bar', () => {
    expect(isKeyboardCoveringWindow(880, 840)).toBe(false);
  });

  it('detects a shrunken window while the IME is up', () => {
    expect(isKeyboardCoveringWindow(880, 880 - KEYBOARD_WINDOW_SHRINK)).toBe(true);
    expect(isKeyboardCoveringWindow(880, 560)).toBe(true);
  });

  it('recovers as soon as the window grows back', () => {
    expect(isKeyboardCoveringWindow(880, 880)).toBe(false);
    expect(isKeyboardCoveringWindow(880, 900)).toBe(false);
  });
});

describe('contentMaxWidth', () => {
  it('stays full bleed on phones', () => {
    expect(contentMaxWidth(411)).toBeUndefined();
    expect(contentMaxWidth(TABLET_BREAKPOINT - 1)).toBeUndefined();
  });

  it('caps the column on tablets and unfolded devices', () => {
    expect(contentMaxWidth(TABLET_BREAKPOINT)).toBe(WIDE_CONTENT_MAX_WIDTH);
    expect(contentMaxWidth(1200)).toBe(WIDE_CONTENT_MAX_WIDTH);
  });
});
