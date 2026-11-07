/**
 * App-wide theme tokens.
 *
 * Values are aligned with the Apple HIG dark system palette in `hig.ts` so
 * existing components and the new trailing-sheet surfaces stay consistent.
 * `colors` / `spacing` / `radius` / `typography` keep their historical keys to
 * avoid churn across the existing workspaces; new UI should prefer `hig.ts`.
 */
import { corner, grid, materials, systemColors, typeScale } from './hig';

export const colors = {
  bg: systemColors.systemBackground,
  appBg: systemColors.systemGroupedBackground,
  panel: systemColors.secondarySystemGroupedBackground,
  panelRaised: systemColors.tertiarySystemGroupedBackground,
  panelHover: systemColors.systemFill,
  border: systemColors.separator,
  borderSoft: 'rgba(84, 84, 88, 0.36)',
  text: systemColors.label,
  textMuted: systemColors.secondaryLabel,
  textDim: systemColors.tertiaryLabel,
  accent: systemColors.systemBlue,
  accentSoft: 'rgba(10, 132, 255, 0.16)',
  green: systemColors.systemGreen,
  yellow: systemColors.systemOrange,
  red: systemColors.systemRed,
  cyan: systemColors.systemCyan,
  toolbar: systemColors.secondarySystemBackground,
  selection: 'rgba(10, 132, 255, 0.18)',
};

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

/** Surfaces that separate scrollable content from the window background. */
export const surfaces = {
  /** Console surface: the terminal is a window into the session, not a card. */
  terminal: systemColors.systemBackground,
  outline: 'rgba(84, 84, 88, 0.48)',
  /** Bottom command dock chrome that floats over the console. */
  dock: materials.chrome,
  /** Elevated sheet: one step above the grouped page background. */
  sheet: systemColors.secondarySystemGroupedBackground,
  /** Cards inside a sheet, one step above the sheet itself. */
  sheetRaised: systemColors.tertiarySystemGroupedBackground,
  scrim: systemColors.scrim,
};
