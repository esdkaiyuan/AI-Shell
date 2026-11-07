import { createContext, useContext, useMemo, type FC, type ReactNode } from 'react';
import { PixelRatio, useColorScheme } from 'react-native';
import { createTheme, darkTheme, type Theme } from './theme';
import type { AppearancePreference } from './services/config';

const ThemeContext = createContext<Theme>(darkTheme);

/**
 * Supplies the active appearance and the user's Dynamic Type setting. HIG
 * expects both appearances to be first-class, and the type scale to follow
 * the system text size rather than staying frozen at the design size.
 */
export const ThemeProvider: FC<{
  children?: ReactNode;
  /** Overrides the system appearance when the user picked one. */
  appearance?: AppearancePreference;
}> = ({ children, appearance = 'system' }) => {
  const systemScheme = useColorScheme();
  const scheme =
    appearance === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : appearance;
  const fontScale = PixelRatio.getFontScale();
  const theme = useMemo(() => createTheme(scheme, fontScale), [scheme, fontScale]);
  return <ThemeContext.Provider value={theme}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): Theme => useContext(ThemeContext);

/**
 * Rebuilds a style sheet whenever the appearance or the type scale changes.
 * Style sheets are authored as `makeStyles(theme)` factories so every colour
 * and type size can follow the active theme.
 */
export const useThemedStyles = <T,>(factory: (theme: Theme) => T): T => {
  const theme = useTheme();
  // The factory is a module-level constant, so it never changes between
  // renders and does not belong in the dependency list.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => factory(theme), [theme]);
};
