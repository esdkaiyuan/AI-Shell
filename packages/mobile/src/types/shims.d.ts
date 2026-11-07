declare module 'react' {
  export type FC<P = Record<string, never>> = (props: P) => JSX.Element | null;
  export type ReactNode =
    | JSX.Element
    | string
    | number
    | boolean
    | null
    | undefined
    | ReactNode[];
  export interface Context<T> {
    Provider: (props: { value: T; children?: ReactNode }) => JSX.Element | null;
  }
  export function createContext<T>(defaultValue: T): Context<T>;
  export function useContext<T>(context: Context<T>): T;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useReducer<R, I>(reducer: R, initializerArg: I, initializer: (arg: I) => unknown): unknown;
  export function useState<T>(initial: T): [T, (value: T | ((previous: T) => T)) => void];
  export function useCallback<T>(callback: T, deps: unknown[]): T;
  export function useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  export function useRef<T>(initial: T): { current: T };
  const React: {
    useMemo: typeof useMemo;
    useReducer: typeof useReducer;
    useState: typeof useState;
    useCallback: typeof useCallback;
    useEffect: typeof useEffect;
    useRef: typeof useRef;
  };
  export default React;
}

declare module 'react/jsx-runtime' {
  export const jsx: unknown;
  export const jsxs: unknown;
  export const Fragment: unknown;
}

declare module 'react-native' {
  type Component = (props: Record<string, unknown>) => JSX.Element | null;
  export interface ScrollView {
    scrollToEnd(options?: { animated?: boolean }): void;
  }
  export const Pressable: Component;
  export const SafeAreaView: Component;
  export const ScrollView: Component;
  export const ActivityIndicator: Component;
  export const KeyboardAvoidingView: Component;
  export const Modal: Component;
  export const Alert: {
    alert: (
      title: string,
      message?: string,
      buttons?: Array<{ text?: string; style?: string; onPress?: () => void }>
    ) => void;
  };
  export const Platform: { OS: string };
  export interface AnimatedValue {
    setValue(value: number): void;
    interpolate(config: Record<string, unknown>): unknown;
  }
  export interface AnimatedAnimation {
    start(done?: () => void): void;
    stop(): void;
  }
  export const Animated: {
    Value: new (initial: number) => AnimatedValue;
    View: Component;
    timing(value: AnimatedValue, config: Record<string, unknown>): AnimatedAnimation;
    spring(value: AnimatedValue, config: Record<string, unknown>): AnimatedAnimation;
  };
  export const AccessibilityInfo: {
    isReduceMotionEnabled(): Promise<boolean>;
    addEventListener(
      event: string,
      listener: (...args: unknown[]) => void
    ): { remove: () => void };
  };
  export const Keyboard: {
    addListener: (
      event: string,
      listener: (...args: unknown[]) => void
    ) => { remove: () => void };
  };
  export const BackHandler: {
    addEventListener(
      event: 'hardwareBackPress',
      handler: () => boolean
    ): { remove: () => void };
  };
  export function useWindowDimensions(): {
    width: number;
    height: number;
    scale: number;
    fontScale: number;
  };
  export function useColorScheme(): 'light' | 'dark' | null;
  export const PixelRatio: {
    get(): number;
    getFontScale(): number;
  };
  export const DeviceEventEmitter: {
    addListener: (event: string, listener: (...args: any[]) => void) => { remove: () => void };
  };
  export const NativeModules: Record<string, any>;
  export const StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T;
    hairlineWidth: number;
  };
  export const Text: Component;
  export const TextInput: Component;
  export const View: Component;
}

declare module 'expo-status-bar' {
  export const StatusBar: (props: Record<string, unknown>) => JSX.Element | null;
}

declare module '@expo/vector-icons' {
  export const Ionicons: ((props: Record<string, unknown>) => JSX.Element | null) & {
    glyphMap: Record<string, number>;
  };
}

declare namespace JSX {
  interface Element {}
  interface IntrinsicAttributes {
    key?: string | number;
  }
  interface IntrinsicElements {
    [elementName: string]: Record<string, unknown>;
  }
}
