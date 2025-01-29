import React, {
  ComponentType,
  Consumer,
  ConsumerProps,
  Context,
  ExoticComponent,
  ForwardedRef,
  ForwardRefRenderFunction,
  MemoExoticComponent,
  Provider,
  ProviderProps,
  ReactElement,
  useCallback,
  useContext,
  useDebugValue,
  useDeferredValue,
  useEffect,
  useId,
  useImperativeHandle,
  useInsertionEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';

export interface ReactDispatcher {
  readContext: typeof useContext;
  useContext: typeof useContext;
  useEffect: typeof useEffect;
  useState: typeof useState;
  useReducer: typeof useReducer;
  useMemo: typeof useMemo;
  useCallback: typeof useCallback;
  useRef: typeof useRef;
  useImperativeHandle: typeof useImperativeHandle;
  useLayoutEffect: typeof useLayoutEffect;
  useInsertionEffect: typeof useInsertionEffect;
  useDebugValue: typeof useDebugValue;
  useDeferredValue: typeof useDeferredValue;
  useTransition: typeof useTransition;
  useId: typeof useId;
  useSyncExternalStore: typeof useSyncExternalStore;
}

export type ReactWithInternals = typeof React & {
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    ReactCurrentDispatcher: {
      current: ReactDispatcher;
    };
  };
};

export interface ContextWithInternals<T> extends Context<T> {
  _currentValue: T;
}

interface ProviderWithInternals<T = unknown> extends Provider<T> {
  _context: Context<T>;
}

export type ProviderElement = ReactElement<
  ProviderProps<unknown>,
  ProviderWithInternals
>;

export type ConsumerElement = ReactElement<
  ConsumerProps<unknown>,
  Context<unknown> & Consumer<unknown>
>;

// I couldn't find any exported types in react that matched.
//  ForwardRefExoticComponent seems completely wrong.
export type ForwardRefElement<P = unknown> = ReactElement<
  P,
  ExoticComponent<P> & {
    render: ForwardRefRenderFunction<unknown, P>;
  }
> & {
  ref: ForwardedRef<unknown>;
};

export type MemoElement<P = unknown> = ReactElement<
  P,
  MemoExoticComponent<ComponentType<P>>
>;
