declare module 'react-shallow-renderer' {
  import { Context } from 'react';
  export default class ShallowRenderer {
    render(element: React.ReactElement, context?: Context<unknown>): void;
    getRenderOutput(): React.ReactElement | null;
    _reset: () => void;
    _validateCurrentlyRenderingComponent: () => void;
    _dispatcher: {
      readContext: unknown;
      useCallback: unknown;
      useContext: unknown;
      useDebugValue: () => void;
      useEffect: () => void;
      useImperativeHandle: () => void;
      useLayoutEffect: () => void;
      useInsertionEffect: () => void;
      useMemo: unknown;
      useReducer: unknown;
      useRef: unknown;
      useState: unknown;
      useResponder: unknown;
      useId: unknown;
      useTransition: unknown;
      useDeferredValue: unknown;
      useSyncExternalStore: unknown;
    };
  }
}
