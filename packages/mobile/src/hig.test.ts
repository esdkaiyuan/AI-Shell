import { describe, expect, it } from 'vitest';
import {
  MIN_TOUCH_TARGET,
  PANEL_COMPACT_BREAKPOINT,
  PANEL_COMPACT_INSET,
  PANEL_REGULAR_WIDTH,
  corner,
  grid,
  motion,
  sidePanelTopInset,
  sidePanelWidth,
  systemColors,
  transitionDuration,
  typeScale,
  usesFullHeightSheet,
} from './hig';

describe('Apple HIG system colors', () => {
  it('uses the iOS dark system palette', () => {
    expect(systemColors.systemBlue).toBe('#0A84FF');
    expect(systemColors.secondarySystemGroupedBackground).toBe('#1C1C1E');
    expect(systemColors.label).toBe('#FFFFFF');
  });

  it('keeps a dimming scrim behind modal sheets', () => {
    expect(systemColors.scrim).toContain('rgba(0, 0, 0');
  });
});

describe('Dynamic Type scale', () => {
  it('descends monotonically from large title to caption 2', () => {
    const order = [
      'largeTitle', 'title1', 'title2', 'title3', 'headline', 'body',
      'callout', 'subheadline', 'footnote', 'caption1', 'caption2',
    ];
    const sizes = order.map(key => typeScale[key].fontSize);
    expect(sizes).toEqual([...sizes].sort((a, b) => b - a));
  });

  it('keeps line height above font size for every style', () => {
    for (const style of Object.values(typeScale)) {
      expect(style.lineHeight).toBeGreaterThan(style.fontSize);
    }
  });

  it('uses the 44pt minimum touch target', () => {
    expect(MIN_TOUCH_TARGET).toBe(44);
    expect(grid.unit).toBe(8);
    expect(corner.sheet).toBeGreaterThan(corner.control);
  });
});

describe('sidePanelWidth', () => {
  it('leaves a sliver of the presenting context on compact screens', () => {
    expect(sidePanelWidth({ width: 411, height: 880 })).toBe(411 - PANEL_COMPACT_INSET);
  });

  it('caps a regular-width sheet like a trailing inspector', () => {
    expect(sidePanelWidth({ width: 820, height: 1180 })).toBe(PANEL_REGULAR_WIDTH);
    expect(sidePanelWidth({ width: 1200, height: 900 })).toBe(PANEL_REGULAR_WIDTH);
  });

  it('never exceeds the window width', () => {
    expect(sidePanelWidth({ width: 240, height: 400 })).toBe(240 - PANEL_COMPACT_INSET);
    expect(sidePanelWidth({ width: 0, height: 0 })).toBe(0);
    expect(sidePanelWidth({ width: 300, height: 600, compactWidth: 1000 })).toBe(
      300 - PANEL_COMPACT_INSET
    );
    for (const width of [1, 40, 120, 320, 599, 600, 768, 1024]) {
      expect(sidePanelWidth({ width, height: 800 })).toBeLessThanOrEqual(width);
    }
  });

  it('switches presentation at the compact breakpoint', () => {
    expect(sidePanelWidth({ width: PANEL_COMPACT_BREAKPOINT - 1, height: 800 })).toBe(
      PANEL_COMPACT_BREAKPOINT - 1 - PANEL_COMPACT_INSET
    );
    expect(sidePanelWidth({ width: PANEL_COMPACT_BREAKPOINT, height: 800 })).toBe(
      PANEL_REGULAR_WIDTH
    );
  });
});

describe('sheet geometry', () => {
  it('is full height on compact screens and inset on regular ones', () => {
    expect(usesFullHeightSheet({ width: 411, height: 880 })).toBe(true);
    expect(usesFullHeightSheet({ width: 820, height: 1180 })).toBe(false);
    expect(sidePanelTopInset({ width: 411, height: 880 })).toBe(grid.unit);
    expect(sidePanelTopInset({ width: 820, height: 1180 })).toBe(grid.comfortable);
  });
});

describe('Reduce Motion', () => {
  it('collapses the transition duration when Reduce Motion is enabled', () => {
    expect(transitionDuration(motion.presentMs, true)).toBe(0);
    expect(transitionDuration(motion.dismissMs, true)).toBe(0);
  });

  it('keeps the standard duration otherwise', () => {
    expect(transitionDuration(motion.presentMs, false)).toBe(motion.presentMs);
    expect(transitionDuration(motion.dismissMs, false)).toBe(motion.dismissMs);
  });
});
