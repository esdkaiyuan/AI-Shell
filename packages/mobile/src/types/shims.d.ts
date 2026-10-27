declare module 'react' {
  export type FC<P = Record<string, never>> = (props: P) => JSX.Element | null;
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
  export const DeviceEventEmitter: {
    addListener: (event: string, listener: (...args: any[]) => void) => { remove: () => void };
  };
  export const NativeModules: Record<string, any>;
  export const StyleSheet: {
    create<T extends Record<string, unknown>>(styles: T): T;
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
