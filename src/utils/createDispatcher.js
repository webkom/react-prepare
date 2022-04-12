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
  useImperativeHandle: () => {},
  useLayoutEffect: () => {},
  useInsertionEffect: () => {},
  useDebugValue: () => {},
  useDeferredValue: (value) => value,
  useTransition: () => [false, () => {}],
  // In most cases the useId hook should just be used for generating dom element ids, which should be irrelevant to react-prepare.
  useId: () => undefined,
  useSyncExternalStore: (registerCallback, getSnapshot, getServerSnapshot) =>
    getServerSnapshot(),
});

export default createDispatcher;
