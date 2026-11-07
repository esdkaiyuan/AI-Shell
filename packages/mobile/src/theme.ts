/**
 * App-wide theme tokens.
 *
 * Values are aligned with the Apple HIG system palette in `hig.ts` so
 * existing components and the new trailing-sheet surfaces stay consistent.
 * `colors` / `spacing` / `radius` / `typography` keep their historical keys
 * to avoid churn across the existing workspaces; new UI should prefer `hig.ts`.
 *
 * The palette is produced by `createTheme` so every screen can render in both
 * appearances — HIG treats light and dark as first-class, not as a variant.
 */
import {
  corner,
  elevation as darkElevation,
  grid,
  lightElevation,
  lightMaterials,
  lightSystemColors,
  materials as darkMaterials,
  systemColors as darkSystemColors,
  typeScale,
  type ColorScheme,
  type TypeStyle,
} from './hig';

export interface ThemeColors {
  bg: string;
  appBg: string;
  panel: string;
  panelRaised: string;
  panelHover: string;
  border: string;
  borderSoft: string;
  text: string;
  textMuted: string;
  textDim: string;
  accent: string;
  accentSoft: string;
  green: string;
  yellow: string;
  red: string;
  cyan: string;
  toolbar: string;
  selection: string;
  /** Tinted backgrounds for semantic states; each pairs with its system colour. */
  accentTint: string;
  successTint: string;
  warningTint: string;
  dangerTint: string;
}

export interface ThemeSurfaces {
  terminal: string;
  outline: string;
  dock: string;
  sheet: string;
  sheetRaised: string;
  scrim: string;
}

/**
 * The console keeps its own palette: a terminal is a dark window into a
 * session whatever the system appearance is, and the ANSI-ish colours stay
 * legible on it in both appearances.
 */
export interface ConsoleColors {
  background: string;
  surface: string;
  text: string;
  dim: string;
  prompt: string;
  info: string;
  warning: string;
  error: string;
}

export interface ElevationTokens {
  level1: { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  level2: { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
  level3: { shadowOpacity: number; shadowRadius: number; shadowOffset: { width: number; height: number } };
}

export interface Theme {
  scheme: ColorScheme;
  /** The user's Dynamic Type setting. */
  fontScale: number;
  /** The raw system palette for this appearance. */
  system: Record<string, string>;
  colors: ThemeColors;
  surfaces: ThemeSurfaces;
  console: ConsoleColors;
  elevation: ElevationTokens;
  /**
   * Type styles at their designed size. React Native already applies the
   * system font scale to text, so these are deliberately not pre-scaled —
   * doing both would compound the growth.
   */
  type: Record<string, TypeStyle>;
  /**
   * Scales a layout dimension that the platform does not scale — the minimum
   * height of a control that has to hold larger text, for instance. Use it
   * for spacing and size, never for `fontSize` or `lineHeight`.
   */
  scale: (size: number) => number;
}

/**
 * React Native already applies the system font scale to `fontSize` and
 * `lineHeight` (both are resolved through sp), so the type scale must stay at
 * its designed size. Pre-scaling here would compound the growth — a 1.3×
 * setting would render at 1.69×.
 */
export const createTheme = (scheme: ColorScheme, fontScale = 1): Theme => {
  const light = scheme === 'light';
  const system = light ? lightSystemColors : darkSystemColors;
  const chrome = light ? lightMaterials : darkMaterials;
  const lift = light ? lightElevation : darkElevation;

  return {
    scheme,
    fontScale,
    system,
    colors: {
      bg: system.systemBackground,
      appBg: system.systemGroupedBackground,
      panel: system.secondarySystemGroupedBackground,
      panelRaised: system.tertiarySystemGroupedBackground,
      panelHover: system.systemFill,
      border: system.separator,
      borderSoft: light ? 'rgba(60, 60, 67, 0.24)' : 'rgba(84, 84, 88, 0.36)',
      text: system.label,
      textMuted: system.secondaryLabel,
      textDim: system.tertiaryLabel,
      accent: system.systemBlue,
      accentSoft: light ? 'rgba(0, 122, 255, 0.14)' : 'rgba(10, 132, 255, 0.16)',
      green: system.systemGreen,
      yellow: system.systemOrange,
      red: system.systemRed,
      cyan: system.systemCyan,
      toolbar: system.secondarySystemBackground,
      selection: light ? 'rgba(0, 122, 255, 0.16)' : 'rgba(10, 132, 255, 0.18)',
      accentTint: light ? 'rgba(0, 122, 255, 0.12)' : 'rgba(10, 132, 255, 0.16)',
      successTint: light ? 'rgba(52, 199, 89, 0.14)' : 'rgba(48, 209, 88, 0.14)',
      warningTint: light ? 'rgba(255, 149, 0, 0.12)' : 'rgba(255, 159, 10, 0.12)',
      dangerTint: light ? 'rgba(255, 69, 58, 0.10)' : 'rgba(255, 69, 58, 0.12)',
    },
    surfaces: {
      terminal: '#000000',
      outline: light ? 'rgba(60, 60, 67, 0.34)' : 'rgba(84, 84, 88, 0.48)',
      dock: chrome.chrome,
      sheet: system.secondarySystemGroupedBackground,
      sheetRaised: system.tertiarySystemGroupedBackground,
      scrim: system.scrim,
    },
    console: {
      background: '#000000',
      surface: '#0C0C0E',
      text: '#FFFFFF',
      dim: 'rgba(235, 235, 245, 0.30)',
      prompt: system.systemGreen,
      info: system.systemCyan,
      warning: system.systemOrange,
      error: system.systemRed,
    },
    elevation: lift,
    type: typeScale,
    // Layout dimensions have to grow with the text they hold; the platform
    // scales type on its own, so this only covers the boxes around it.
    scale: (size: number) => Math.round(size * fontScale * 10) / 10,
  };
};

export const darkTheme = createTheme('dark');
export const lightTheme = createTheme('light');

/**
 * Dark defaults kept as static exports so modules that are not theme-aware
 * yet still render correctly.
 */
export const colors = darkTheme.colors;
export const surfaces = darkTheme.surfaces;

export const spacing = {
  xs: grid.half,
  sm: grid.unit,
  md: grid.tight,
  lg: grid.base,
  xl: grid.loose,
  xxl: grid.section,
};

export const radius = {
  xs: 6,
  sm: grid.unit,
  md: corner.card,
  lg: corner.grouped,
  xl: corner.sheet,
  pill: corner.pill,
};

/** Minimum tappable area (Apple HIG). */
export const touchTarget = 44;

/** Legacy compatibility scale; prefer `hig.typeScale` for new UI. */
export const typography = {
  caption: typeScale.caption1.fontSize,
  body: typeScale.subheadline.fontSize - 1,
  callout: typeScale.callout.fontSize - 1,
  title: typeScale.title3.fontSize - 2,
  hero: typeScale.title1.fontSize - 2,
};
