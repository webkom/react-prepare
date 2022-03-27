import React, {
  CElement,
  Component,
  ComponentClass,
  ComponentState,
  PropsWithChildren,
  ReactNode,
} from 'react';

import isReactCompositeComponent from './utils/isReactCompositeComponent';
import isThenable from './utils/isThenable';
import { isPrepared, getPrepare, shouldAwaitOnSsr } from './prepared';
import {
  PrepareComponent,
  PrepareContext,
  ReactNodeType,
  Updater,
} from './utils/types';
import {
  isContextConsumer,
  isContextProvider,
  isDOMElementOrFragment,
  isElement,
  isForwardRef,
  isFunctionComponent,
} from './utils/isComponentType';

const updater: Updater = {
  enqueueSetState<P, S extends Map<unknown, unknown> = Map<unknown, unknown>>(
    publicInstance: PrepareComponent<P, S>,
    partialState: ((state: S, props: P) => S) | S,
    callback: () => void,
  ): void {
    const newState =
      typeof partialState === 'function'
        ? partialState(publicInstance.state, publicInstance.props)
        : partialState;

    publicInstance.state = Object.assign({}, publicInstance.state, newState);
    if (typeof callback === 'function') {
      callback();
      return;
    }
  },
};

function createCompositeElementInstance<P>(
  { type: CompositeComponent, props }: { type: ComponentClass<P>; props: P },
  context: PrepareContext<P>,
) {
  const instance = new CompositeComponent(props, context) as PrepareComponent<
    P,
    unknown
  >;
  const state = instance.state || null;

  instance.props = props;
  instance.state = state;
  instance.context = context;
  instance.updater = updater;
  instance.refs = {};

  if (instance.componentWillMount) {
    instance.componentWillMount();
  }
  if (instance.UNSAFE_componentWillMount) {
    instance.UNSAFE_componentWillMount();
  }
  return instance;
}

function renderCompositeElementInstance<P>(
  instance: PrepareComponent<P, unknown>,
  context: PrepareContext<P> = {},
): [ReactNode, PrepareContext<P>] {
  const childContext = {
    ...context,
    ...(instance.getChildContext ? instance.getChildContext() : {}),
  };
  return [instance.render(), childContext];
}

async function prepareCompositeElement<
  P,
  T extends Component<P, ComponentState>,
>(
  { type, props }: CElement<P, T>,
  errorHandler: ErrorHandler,
  context: PrepareContext<P>,
): Promise<
  [
    children: null | ReactNode | ReactNode[],
    context: PrepareContext<P>,
    preparePromise?: Promise<void>,
  ]
> {
  let preparePromise: Promise<void> | undefined;

  if (isPrepared(type)) {
    const uncaughtPreparePromise = getPrepare(type)(props, context);
    if (isThenable(uncaughtPreparePromise)) {
      preparePromise = uncaughtPreparePromise.catch(errorHandler);
      if (shouldAwaitOnSsr(type)) {
        await preparePromise;
      }
    }
  }
  const instance = createCompositeElementInstance({ type, props }, context);
  return [...renderCompositeElementInstance(instance, context), preparePromise];
}

async function prepareElement<
  P extends PropsWithChildren<unknown & { value?: PropsWithChildren<unknown> }>,
>(
  element: ReactNodeType<P>,
  errorHandler: ErrorHandler,
  context: PrepareContext<P>,
): Promise<
  [
    children: null | ReactNode | ReactNode[],
    context: PrepareContext<P>,
    preparePromise?: Promise<void>,
  ]
> {
  if (!isElement(element)) {
    return [null, context];
  }

  if (isDOMElementOrFragment(element)) {
    return [element.props.children, context];
  }

  if (isContextProvider(element)) {
    const _providers = new Map(context._providers);
    _providers.set(element.type._context.Provider, element.props);
    return [element.props.children, { ...context, _providers }];
  }

  if (isContextConsumer(element)) {
    const parentProvider = context._providers?.get(
      element.type._context.Provider,
    );

    const value = parentProvider
      ? parentProvider.value
      : element.type._context._currentValue;

    const consumerFunc = element.props.children;
    return [consumerFunc(value), context];
  }

  if (isForwardRef(element)) {
    return [element.type.render(element.props, element.ref), context];
  }

  if (isFunctionComponent(element)) {
    return [element.type(element.props), context];
  }

  if (isReactCompositeComponent(element.type)) {
    return prepareCompositeElement(element, errorHandler, context);
  }

  throw Error('Unrecognized element type: \n' + element.toString());
}

type ErrorHandler = (error: unknown) => void;

interface PrepareOptions {
  errorHandler?: ErrorHandler;
}

async function prepare<P = unknown>(
  element: ReactNodeType<P>,
  options: PrepareOptions = {},
  context: PrepareContext<P> = {},
): Promise<void> {
  const {
    errorHandler = (error) => {
      throw error;
    },
  } = options;

  const [children, childContext, preparePromise] = await prepareElement(
    element,
    errorHandler,
    context,
  );

  const childList = React.Children.toArray(children);
  const promiseList = childList.map((child) =>
    prepare(child, options, childContext),
  );
  if (preparePromise) {
    promiseList.push(preparePromise);
  }
  await Promise.all(promiseList);
}

export default prepare;
