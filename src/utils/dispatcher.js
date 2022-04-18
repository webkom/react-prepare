import getContextValue from './getContextValue';
import { __REACT_PREPARE__ } from '../constants';
import React from 'react';

const noOp = () => {};

function readContext(suppliedContext) {
  return getContextValue(this[__REACT_PREPARE__].context, suppliedContext);
}

const dispatcher = {
  readContext: readContext,
  useContext: readContext,
  useEffect: noOp,
  useState: (initial) => [
    typeof initial === 'function' ? initial() : initial,
    noOp,
  ],
  useReducer: (reducer, initArg, initializer) => [
    !initializer ? initArg : initializer(initArg),
    noOp,
  ],
  useMemo: (computeFunction) => computeFunction(),
  useCallback: (callbackFunction) => () => callbackFunction(),
  useRef: (initial) => ({ current: initial }),
  useImperativeHandle: noOp,
  useLayoutEffect: noOp,
  useInsertionEffect: noOp,
  useDebugValue: noOp,
  useDeferredValue: (value) => value,
  useTransition: () => [false, noOp],
  // In most cases the useId hook should just be used for generating dom element ids, which should be irrelevant to react-prepare.
  useId: () => undefined,
  useSyncExternalStore: (registerCallback, getSnapshot, getServerSnapshot) =>
    getServerSnapshot(),

  [__REACT_PREPARE__]: {
    context: {},
  },
};

const setDispatcherContext = (context) =>
  (dispatcher[__REACT_PREPARE__].context = context);

const registerDispatcher = () =>
  (React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current =
    dispatcher);

const dispatcherIsRegistered = () =>
  React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
    .ReactCurrentDispatcher.current === dispatcher;

export { setDispatcherContext, registerDispatcher, dispatcherIsRegistered };
