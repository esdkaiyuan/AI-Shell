/**
 * Apple Human Interface Guidelines — Dark appearance design tokens.
 *
 * Values follow the iOS system colour / Dynamic Type tables, expressed in
 * density-independent points so React Native renders them consistently.
 * This module is intentionally free of React Native imports: the same tokens
 * drive the UI and the unit tests.
 *
 * References: HIG "Color" (iOS system colors, dark variant), HIG "Typography"
 * (Dynamic Type, Default size category), HIG "Layout" (8pt grid, 44pt minimum
 * touch target), HIG "Modality" (sheets / tray presentation).
 */

/** iOS system colors, dark variant. */
export const systemColors = {
  // Backgrounds — system / grouped hierarchy (base → elevated).
  systemBackground: '#000000',
  secondarySystemBackground: '#1C1C1E',
  tertiarySystemBackground: '#2C2C2E',
  systemGroupedBackground: '#000000',
  secondarySystemGroupedBackground: '#1C1C1E',
  tertiarySystemGroupedBackground: '#2C2C2E',

  // Labels.
  label: '#FFFFFF',
  secondaryLabel: 'rgba(235, 235, 245, 0.60)',
  tertiaryLabel: 'rgba(235, 235, 245, 0.30)',
  quaternaryLabel: 'rgba(235, 235, 245, 0.18)',

  // Fills and separators.
  systemFill: 'rgba(120, 120, 128, 0.36)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.32)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.24)',
  quaternarySystemFill: 'rgba(116, 116, 128, 0.18)',
  separator: 'rgba(84, 84, 88, 0.65)',
  opaqueSeparator: '#38383A',

  // Accents (dark variant).
  systemBlue: '#0A84FF',
  systemGreen: '#30D158',
  systemIndigo: '#5E5CE6',
  systemOrange: '#FF9F0A',
  systemPink: '#FF375F',
  systemPurple: '#BF5AF2',
  systemRed: '#FF453A',
  systemTeal: '#40C8E0',
  systemYellow: '#FFD60A',
  systemCyan: '#64D2FF',
  systemMint: '#63E6E2',

  // Neutral gray ramp (iOS 13+ systemGray family, dark variant).
  systemGray: '#8E8E93',
  systemGray2: '#636366',
  systemGray3: '#48484A',
  systemGray4: '#3A3A3C',
  systemGray5: '#2C2C2E',
  systemGray6: '#1C1C1E',

  // Sheet scrim — HIG dims the presenting context behind a modal sheet.
  scrim: 'rgba(0, 0, 0, 0.55)',
} as const;

/**
 * The same system colour table in the light appearance. HIG requires both
 * appearances to be first-class, so the tokens are declared per scheme
 * rather than baked into the styles.
 */
export const lightSystemColors = {
  // Backgrounds — system / grouped hierarchy (base → elevated).
  systemBackground: '#FFFFFF',
  secondarySystemBackground: '#F2F2F7',
  tertiarySystemBackground: '#FFFFFF',
  systemGroupedBackground: '#F2F2F7',
  secondarySystemGroupedBackground: '#FFFFFF',
  tertiarySystemGroupedBackground: '#F2F2F7',

  // Labels.
  label: '#000000',
  secondaryLabel: 'rgba(60, 60, 67, 0.60)',
  tertiaryLabel: 'rgba(60, 60, 67, 0.30)',
  quaternaryLabel: 'rgba(60, 60, 67, 0.18)',

  // Fills and separators.
  systemFill: 'rgba(120, 120, 128, 0.20)',
  secondarySystemFill: 'rgba(120, 120, 128, 0.16)',
  tertiarySystemFill: 'rgba(118, 118, 128, 0.12)',
  quaternarySystemFill: 'rgba(116, 116, 128, 0.08)',
  separator: 'rgba(60, 60, 67, 0.29)',
  opaqueSeparator: '#C6C6C8',

  // Accents (light variant).
  systemBlue: '#007AFF',
  systemGreen: '#34C759',
  systemIndigo: '#5856D6',
  systemOrange: '#FF9500',
  systemPink: '#FF2D55',
  systemPurple: '#AF52DE',
  systemRed: '#FF3B30',
  systemTeal: '#30B0C7',
  systemYellow: '#FFCC00',
  systemCyan: '#32ADE6',
  systemMint: '#00C7BE',

  // Neutral gray ramp.
  systemGray: '#8E8E93',
  systemGray2: '#AEAEB2',
  systemGray3: '#C7C7CC',
  systemGray4: '#D1D1D6',
  systemGray5: '#E5E5EA',
  systemGray6: '#F2F2F7',

  // Sheet scrim.
  scrim: 'rgba(0, 0, 0, 0.28)',
} as const;

export type ColorScheme = 'light' | 'dark';

export interface TypeStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
  /** Tracking in points at the Default Dynamic Type size category. */
  letterSpacing: number;
}

/** Dynamic Type, Default (Large) size category — point sizes, leading, tracking. */
export const typeScale: Record<string, TypeStyle> = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '400', letterSpacing: 0.37 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '400', letterSpacing: 0.36 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '400', letterSpacing: 0.35 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '400', letterSpacing: 0.38 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.41 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.41 },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.32 },
  subheadline: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.24 },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.06 },
};

/** 8pt grid from the HIG layout guidance. */
export const grid = {
  half: 4,
  unit: 8,
  tight: 12,
  base: 16,
  comfortable: 20,
  loose: 24,
  section: 32,
  groupedSection: 35,
} as const;

/** Continuous-corner radii (RN approximates the squircle with circular radii). */
export const corner = {
  control: 10,
  card: 12,
  /** Inset grouped list containers sit at roughly a 12pt corner. */
  grouped: 12,
  sheet: 20,
  pill: 999,
} as const;

/**
 * iOS materials. They are translucent chrome surfaces that float above
 * content; where the platform cannot blur, the opaque fallback carries the
 * same separation.
 */
export const materials = {
  /** Navigation bar chrome. */
  bar: 'rgba(28, 28, 30, 0.94)',
  /** Compact toolbars and the bottom command dock. */
  chrome: 'rgba(28, 28, 30, 0.90)',
} as const;

/** The light appearance uses a pale chrome instead of a dark one. */
export const lightMaterials = {
  bar: 'rgba(249, 249, 249, 0.94)',
  chrome: 'rgba(249, 249, 249, 0.92)',
} as const;

/**
 * iOS shadows are neutral black — a tinted shadow reads as a Material
 * elevation halo rather than an Apple surface lift.
 */
export const elevation = {
  level1: { shadowOpacity: 0.16, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  level2: { shadowOpacity: 0.22, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  level3: { shadowOpacity: 0.34, shadowRadius: 26, shadowOffset: { width: 0, height: 10 } },
} as const;

/** Light surfaces read their lift from the shadow, so it is dialed back. */
export const lightElevation = {
  level1: { shadowOpacity: 0.10, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  level2: { shadowOpacity: 0.14, shadowRadius: 14, shadowOffset: { width: 0, height: 6 } },
  level3: { shadowOpacity: 0.20, shadowRadius: 26, shadowOffset: { width: 0, height: 10 } },
} as const;

/** Monospaced face for console surfaces (SF Mono on Apple platforms). */
export const monoFont = {
  family: 'Courier',
  size: 13,
  lineHeight: 20,
} as const;

/** HIG minimum tappable area, in points. */
export const MIN_TOUCH_TARGET = 44;

/** iOS standard navigation bar / toolbar heights. */
export const barHeight = {
  navigation: 44,
  largeTitle: 52,
  toolbar: 49,
  tabBar: 49,
} as const;

/** Sheet presentation: spring-like timing plus a grabber per HIG modality. */
export const motion = {
  presentMs: 340,
  dismissMs: 260,
  /** Duration 0 when the user enables Reduce Motion. */
  reducedMs: 0,
  scrimOpacity: 1,
} as const;

export const grabber = {
  width: 36,
  height: 5,
  topInset: 5,
  color: 'rgba(235, 235, 245, 0.30)',
} as const;

export interface PanelMetrics {
  width: number;
  height: number;
  /** Optional override for tests / unusual devices. */
  compactWidth?: number;
}

/** Below this width a trailing sheet covers nearly the whole screen. */
export const PANEL_COMPACT_BREAKPOINT = 600;

/** On wider screens the sheet becomes a fixed-width trailing panel (HIG tray). */
export const PANEL_REGULAR_WIDTH = 390;

/** Leave a sliver of the presenting context visible behind a compact sheet. */
export const PANEL_COMPACT_INSET = 44;

/**
 * Trailing sheet width. Compact screens get an almost-full-width sheet that
 * still reveals the dimmed context behind it; regular width gets a fixed
 * inspector-like panel. Never wider than the window itself.
 */
export const sidePanelWidth = ({
  width,
  compactWidth = PANEL_COMPACT_BREAKPOINT,
}: PanelMetrics): number => {
  if (width <= 0) return 0;
  if (width < compactWidth) return Math.max(0, Math.min(width, width - PANEL_COMPACT_INSET));
  return Math.min(width, PANEL_REGULAR_WIDTH);
};

/** A panel is "full height" on compact screens and inset on regular ones. */
export const sidePanelTopInset = ({
  width,
  compactWidth = PANEL_COMPACT_BREAKPOINT,
}: PanelMetrics): number => (width < compactWidth ? grid.unit : grid.comfortable);

/** HIG: sheets on compact screens attach to the bottom edge, no floating gap. */
export const usesFullHeightSheet = ({
  width,
  compactWidth = PANEL_COMPACT_BREAKPOINT,
}: PanelMetrics): boolean => width < compactWidth;

/** Reduce Motion must collapse the transition instead of merely speeding it up. */
export const transitionDuration = (
  baseMs: number,
  reduceMotion: boolean
): number => (reduceMotion ? motion.reducedMs : baseMs);
