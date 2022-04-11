const createDispatcher = () => ({
  useEffect: () => {},
  useState: (initial) => [typeof initial === 'function' ? initial() : initial],
  useCallback: () => {},
  useDebugValue: () => {},
  useImperativeHandle: () => {},
  useLayoutEffect: () => {},
  useInsertionEffect: () => {},
  useMemo: () => {},
  useReducer: () => {},
  useRef: () => {},
  useId: () => {},
  useTransition: () => {},
  useDeferredValue: () => {},
  useSyncExternalStore: () => {},
});

export default createDispatcher;
