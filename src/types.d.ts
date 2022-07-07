import { Component, ComponentType, EffectCallback, Provider } from 'react';
import { __REACT_PREPARE__ } from './constants';
import { Dispatch } from 'redux';
import PropTypes from 'prop-types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ContextProviderMap extends Map<Provider<any>, { value: any }> {
  get<T>(key: Provider<T>): { value: T } | undefined;
  set<T>(key: Provider<T>, value: { value: T }): this;
}

export interface PrepareContext {
  store?: { dispatch: unknown };
  _providers?: ContextProviderMap;
}

export interface ContextTypes {
  [key: string]: PropTypes.Validator<unknown>;
}

export type PrepareFunction<P, C = unknown> = (
  props: Readonly<P>,
  context: C,
) => void | Promise<void>;

export type PrepareUsingDispatchFunction<P> = (
  props: Readonly<P>,
  dispatch: Dispatch,
) => void | Promise<void>;

interface PreparedComponentAttributes<P> {
  [__REACT_PREPARE__]: {
    prepare: PrepareFunction<P>;
    awaitOnSsr: boolean;
  };
}

export type PreparedComponent<P> = ComponentType<P> &
  PreparedComponentAttributes<P>;

export type PossiblyPreparedComponent<P> = ComponentType<P> &
  Partial<PreparedComponentAttributes<P>>;

export type ClassComponentInstance<P, S = unknown> = Omit<
  Component<P, S>,
  'props'
> & {
  props: P;
  updater?: {
    enqueueSetState: (
      publicInstance: Component<P, S>,
      partialState: Partial<S> | ((state: S, props: P) => Partial<S>),
      callback?: () => void,
    ) => void;
  };
  getChildContext?: () => PrepareContext;
};

export type PrepareHookFunction = () => Promise<void>;

export type PrepareHookEffect = EffectCallback & {
  [__REACT_PREPARE__]: {
    identifier: string;
    prepare: PrepareHookFunction;
  };
};

// declare the [__REACT_PREPARE__] property on the global Window interface
// for correct type checking on global context set on ssr
declare global {
  interface Window {
    [__REACT_PREPARE__]?: {
      preparedEffects: string[];
    };
  }
}
