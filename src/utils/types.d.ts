import {
  CElement,
  Component,
  ComponentClass,
  ComponentState,
  Context,
  DOMElement,
  ForwardedRef,
  ForwardRefRenderFunction,
  FunctionComponentElement,
  Provider,
  ReactChild,
  ReactElement,
  ReactFragment,
  ReactText,
} from 'react';
import { __REACT_PREPARE__ } from '../constants';

export interface PrepareContext {
  store?: { dispatch: unknown };
  _providers?: Map<Provider<unknown>, { value: unknown }>;
}

export type PreparedComponentType<P> = ComponentClass<P> & {
  [__REACT_PREPARE__]: {
    prepare: PrepareFn<P>;
    awaitOnSsr: boolean;
  };
};

export type PrepareFn<P> = (
  props: P,
  context?: PrepareContext,
) => Promise<void>;

export type ActualContext = Context<unknown> & {
  $$typeof: symbol;
  _currentValue: unknown;
  _currentValue2: unknown;
  _currentRenderer: unknown;
  _currentRenderer2: unknown;
};

/*
 We are ts-ignoring all uses of this interface line because we need to force
 typescript to accept ExoticComponentElementType as type of element.type for
 exotic components such as context or forward ref.
 */
export interface ExoticComponentElementType {
  $$typeof: symbol;
  _context: ActualContext;
}

type ForwardRefType = ExoticComponentElementType & {
  render: ForwardRefRenderFunction<unknown>;
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type ForwardRefElement<P> = ReactElement<P, ForwardRefType> & {
  ref: ForwardedRef<unknown>;
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
export type ContextElement<P> = ReactElement<P, ExoticComponentElementType>;
export type ContextProviderElement<P> = ContextElement<P>;
export type ContextConsumerElement<P, T> = ContextElement<P> & {
  props: { children: (data: T) => ReactChild | ReactChild[] | null };
};

export type ExoticElement<P> = ForwardRefElement<P> | ContextElement<P>;

export type ElementType<P> =
  | FunctionComponentElement<P>
  | CElement<P, Component<P, ComponentState>>
  | DOMElement<P, Element>
  | ExoticElement<P>;

// should be equal to React.ReactNode except that it takes a P for prop type
export type ReactNodeType<P> =
  | ElementType<P>
  | false
  | null
  | undefined
  | ReactText
  | ReactFragment;

export interface Updater {
  enqueueSetState: <P, S extends Map<unknown, unknown> = Map<unknown, unknown>>(
    publicInstance: PrepareComponent<P, S>,
    partialState: ((state: S, props: P) => S) | S,
    callback: () => void,
  ) => void;
}

export type PrepareComponent<P, S> = {
  -readonly [K in keyof Component<P, S>]: Component<P, S>[K];
} & {
  getChildContext?: () => PrepareContext;
  updater: Updater;
};
