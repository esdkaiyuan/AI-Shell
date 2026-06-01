declare module 'react' {
  export type FC<P = Record<string, never>> = (props: P) => JSX.Element | null;
  export function useMemo<T>(factory: () => T, deps: unknown[]): T;
  export function useReducer<R, I>(reducer: R, initializerArg: I, initializer: (arg: I) => unknown): unknown;
  export function useState<T>(initial: T): [T, (value: T | ((previous: T) => T)) => void];
  const React: {
    useMemo: typeof useMemo;
    useReducer: typeof useReducer;
    useState: typeof useState;
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
  export const Pressable: Component;
  export const SafeAreaView: Component;
  export const ScrollView: Component;
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
