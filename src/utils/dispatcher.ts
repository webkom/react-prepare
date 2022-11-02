import getContextValue from './getContextValue';
import { __REACT_PREPARE__ } from '../constants';
import React, {
  Context,
  DispatchWithoutAction,
  EffectCallback,
  Reducer,
  ReducerState,
} from 'react';
import { ReactDispatcher, ReactWithInternals } from './reactInternalTypes';
import { PrepareContext, PrepareHookEffect } from '../types';
import isThenable from './isThenable';

export type Dispatcher = ReactDispatcher & {
  [__REACT_PREPARE__]: {
    errorHandler: (error: unknown) => void;
    context: PrepareContext;
    hookPromises: Promise<unknown>[];
    syncHookPromises: Promise<unknown>[];
    preparedHookIdentifiers: string[];
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

const isPrepareHookEffect = (
  effect: EffectCallback | PrepareHookEffect,
): effect is PrepareHookEffect => {
  return !!(effect as Partial<PrepareHookEffect>)[__REACT_PREPARE__];
};

function useEffect(this: Dispatcher, effect: EffectCallback): void {
  if (isPrepareHookEffect(effect)) {
    const { hookPromises, preparedHookIdentifiers, syncHookPromises } =
      this[__REACT_PREPARE__];
    const { prepare, runSync } = effect[__REACT_PREPARE__];
    const prepareResult = prepare();

    preparedHookIdentifiers.push(effect[__REACT_PREPARE__].identifier);

    if (!isThenable(prepareResult)) {
      return;
    }

    const preparePromise = prepareResult.catch(
      this[__REACT_PREPARE__].errorHandler,
    );

    if (runSync) {
      syncHookPromises.push(preparePromise);
    } else {
      hookPromises.push(preparePromise);
    }
  }
}

export const createDispatcher = (
  errorHandler: (error: unknown) => void,
): Dispatcher => ({
  readContext: readContext,
  useContext: readContext,
  useEffect: useEffect,
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
    errorHandler,
    context: {},
    hookPromises: [],
    syncHookPromises: [],
    preparedHookIdentifiers: [],
  },
});

export const setDispatcherContext = (
  dispatcher: Dispatcher,
  context: PrepareContext,
): void => {
  dispatcher[__REACT_PREPARE__].context = context;
};

export const registerDispatcher = (dispatcher: Dispatcher): void => {
  ReactInternals.ReactCurrentDispatcher.current = dispatcher;
};

export const popHookPromises = (dispatcher: Dispatcher): Promise<unknown>[] => {
  const promises = dispatcher[__REACT_PREPARE__].hookPromises;
  dispatcher[__REACT_PREPARE__].hookPromises = [];
  return promises;
};

export const popSyncHookPromises = (
  dispatcher: Dispatcher,
): Promise<unknown>[] => {
  const promises = dispatcher[__REACT_PREPARE__].syncHookPromises;
  dispatcher[__REACT_PREPARE__].syncHookPromises = [];
  return promises;
};

export const popPreparedHookIdentifiers = (
  dispatcher: Dispatcher,
): string[] => {
  const identifiers = dispatcher[__REACT_PREPARE__].preparedHookIdentifiers;
  dispatcher[__REACT_PREPARE__].preparedHookIdentifiers = [];
  return identifiers;
};
