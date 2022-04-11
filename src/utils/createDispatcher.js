import getContextValue from './getContextValue';

const createDispatcher = (context) => ({
  readContext: (suppliedContext) => {
    return getContextValue(context, suppliedContext);
  },
  useContext: (suppliedContext) => {
    return getContextValue(context, suppliedContext);
  },
  useEffect: () => {},
  useState: (initial) => [typeof initial === 'function' ? initial() : initial],
  useReducer: (reducer, initArg, initializer) => [
    !initializer ? initArg : initializer(initArg),
  ],
  useMemo: (computeFunction) => computeFunction(),
  useCallback: () => {},
  useDebugValue: () => {},
  useImperativeHandle: () => {},
  useLayoutEffect: () => {},
  useInsertionEffect: () => {},
  useRef: () => {},
  useId: () => {},
  useTransition: () => {},
  useDeferredValue: () => {},
  useSyncExternalStore: () => {},
});

export default createDispatcher;
