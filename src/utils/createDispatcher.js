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
  useCallback: (callbackFunction) => () => callbackFunction(),
  useRef: (initial) => ({ current: initial }),
  useDebugValue: () => {},
  useImperativeHandle: () => {},
  useLayoutEffect: () => {},
  useInsertionEffect: () => {},
  useId: () => {},
  useTransition: () => {},
  useDeferredValue: () => {},
  useSyncExternalStore: () => {},
});

export default createDispatcher;
