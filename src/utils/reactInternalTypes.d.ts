import React, {
  ComponentType,
  Consumer,
  ConsumerProps,
  Context,
  ExoticComponent,
  ForwardedRef,
  ForwardRefRenderFunction,
  LazyExoticComponent,
  MemoExoticComponent,
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
  __CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE: {
    H: ReactDispatcher | null;
  };
};

export interface ContextWithInternals<T> extends Context<T> {
  _currentValue: T;
}

export interface ConsumerWithInternals<T> extends Consumer<T> {
  _context: ContextWithInternals<T>;
}

export type ProviderElement = ReactElement<
  ProviderProps<unknown>,
  ContextWithInternals<unknown>
>;

export type ConsumerElement = ReactElement<
  ConsumerProps<unknown>,
  ConsumerWithInternals<unknown>
>;

// I couldn't find any exported types in react that matched.
//  ForwardRefExoticComponent seems completely wrong.
export type ForwardRefElement<P = unknown> = ReactElement<
  P & { ref: ForwardedRef<unknown> },
  ExoticComponent<P> & {
    render: ForwardRefRenderFunction<unknown, P>;
  }
>;

export type MemoElement<P = unknown> = ReactElement<
  P,
  MemoExoticComponent<ComponentType<P>>
>;

type LazyPayload<P> = {
  _status: number;
  _result: { default: ComponentType<P> };
};

export type LazyElement<P = unknown> = ReactElement<
  P,
  LazyExoticComponent<ComponentType<P>> & {
    _payload: LazyPayload<P>;
    _init: (payload: LazyPayload<P>) => unknown;
  }
>;
