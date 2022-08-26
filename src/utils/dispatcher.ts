import getContextValue from './getContextValue';
import { __REACT_PREPARE__ } from '../constants';
import React, {
  Context,
  DispatchWithoutAction,
  Reducer,
  ReducerState,
} from 'react';
import { ReactDispatcher, ReactWithInternals } from './reactInternalTypes';
import { PrepareContext } from '../types';

type Dispatcher = ReactDispatcher & {
  [__REACT_PREPARE__]: {
    context: PrepareContext;
  };
};

const ReactInternals = (React as ReactWithInternals)
  .__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

const noOp = (): void => {
  // do nothing
};

function readContext<T>(this: Dispatcher, context: Context<T>): T {
  return getContextValue(this[__REACT_PREPARE__].context, context);
}

const dispatcher: Dispatcher = {
  readContext: readContext,
  useContext: readContext,
  useEffect: noOp,
  useState: <S>(initialValue?: S | (() => S)): [unknown, typeof noOp] => [
    initialValue instanceof Function ? initialValue() : initialValue,
    noOp,
  ],
  useReducer: <R extends Reducer<unknown, unknown>, I>(
    reducer: R,
    initArg: I | ReducerState<R>,
    initializer?: (initArg: I) => ReducerState<R>,
  ): [ReducerState<R>, DispatchWithoutAction] => [
    !initializer ? (initArg as ReducerState<R>) : initializer(initArg as I),
    noOp,
  ],
  useMemo: (computeFunction) => computeFunction(),
  useCallback: (callbackFunction) => callbackFunction,
  useRef: (initialValue?) => ({ current: initialValue }),
  useImperativeHandle: noOp,
  useLayoutEffect: noOp,
  useInsertionEffect: noOp,
  useDebugValue: noOp,
  useDeferredValue: (value) => value,
  useTransition: () => [false, noOp],
  // In most cases the useId hook should just be used for generating dom element ids, which should be irrelevant to react-prepare.
  useId: () => '',
  useSyncExternalStore: (registerCallback, getSnapshot, getServerSnapshot) =>
    getServerSnapshot ? getServerSnapshot() : getSnapshot(),

  [__REACT_PREPARE__]: {
    context: {},
  },
};

export const setDispatcherContext = (context: PrepareContext): void => {
  dispatcher[__REACT_PREPARE__].context = context;
};

export const registerDispatcher = (): void => {
  ReactInternals.ReactCurrentDispatcher.current = dispatcher;
};

export const dispatcherIsRegistered = (): boolean =>
  ReactInternals.ReactCurrentDispatcher.current === dispatcher;
