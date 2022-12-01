import React, {
  ClassicElement,
  Component,
  FunctionComponentElement,
  ReactElement,
  ReactNode,
} from 'react';

import getElementType, { ELEMENT_TYPE } from './utils/getElementType';
import getContextValue from './utils/getContextValue';
import {
  createDispatcher,
  Dispatcher,
  popSyncHookPromises,
  popHookPromises,
  popPreparedHookIdentifiers,
  registerDispatcher,
  setDispatcherContext,
} from './utils/dispatcher';
import {
  ClassComponentInstance,
  ContextProviderMap,
  PrepareContext,
} from './types';
import {
  ConsumerElement,
  ForwardRefElement,
  MemoElement,
  ProviderElement,
} from './utils/reactInternalTypes';
import { __REACT_PREPARE__ } from './constants';

const updater = {
  enqueueSetState<P, S>(
    publicInstance: Component<P, S>,
    partialState: Partial<S> | ((state: S, props: P) => Partial<S>),
    callback?: () => void,
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
  { type: CompositeComponent, props }: ClassicElement<P>,
  context: PrepareContext,
): ClassComponentInstance<P> {
  const instance: ClassComponentInstance<P> = new CompositeComponent(
    props,
    context,
  );
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
  instance: ClassComponentInstance<P>,
  context: PrepareContext = {},
): [ReactNode, PrepareContext] {
  const childContext = {
    ...context,
    ...(instance.getChildContext ? instance.getChildContext() : {}),
  };
  return [instance.render(), childContext];
}

async function prepareElement(
  element: ReactNode,
  errorHandler: (error: unknown) => void,
  context: PrepareContext,
  dispatcher: Dispatcher,
): Promise<[ReactNode, PrepareContext]> {
  switch (getElementType(element)) {
    case ELEMENT_TYPE.NOTHING:
    case ELEMENT_TYPE.TEXT_NODE: {
      return [null, context];
    }
    case ELEMENT_TYPE.DOM_ELEMENT:
    case ELEMENT_TYPE.FRAGMENT: {
      return [(element as ReactElement).props.children, context];
    }
    case ELEMENT_TYPE.CONTEXT_PROVIDER: {
      const providerElement = element as ProviderElement;
      const _providers: ContextProviderMap = new Map(context._providers);
      _providers.set(
        providerElement.type._context.Provider,
        providerElement.props,
      );
      return [providerElement.props.children, { _providers }];
    }
    case ELEMENT_TYPE.CONTEXT_CONSUMER: {
      const consumerElement = element as ConsumerElement;
      const value = getContextValue(context, consumerElement.type._context);

      const consumerFunc = consumerElement.props.children;
      return [consumerFunc(value), context];
    }
    case ELEMENT_TYPE.FORWARD_REF: {
      const forwardRefElement = element as ForwardRefElement;
      return [
        forwardRefElement.type.render(
          forwardRefElement.props,
          forwardRefElement.ref,
        ),
        context,
      ];
    }
    case ELEMENT_TYPE.MEMO: {
      const memoElement = element as MemoElement;
      return prepareElement(
        { ...memoElement, type: memoElement.type.type },
        errorHandler,
        context,
        dispatcher,
      );
    }
    case ELEMENT_TYPE.FUNCTION_COMPONENT: {
      const functionElement = element as FunctionComponentElement<unknown>;
      setDispatcherContext(dispatcher, context);
      registerDispatcher(dispatcher);
      const children: ReactNode = functionElement.type(functionElement.props);
      await Promise.all(popSyncHookPromises(dispatcher));
      return [children, context];
    }
    case ELEMENT_TYPE.CLASS_COMPONENT: {
      const classElement = element as ClassicElement<unknown>;
      const instance = createCompositeElementInstance(classElement, context);
      return [...renderCompositeElementInstance(instance, context)];
    }
    default: {
      throw new Error(`Unsupported element type: ${element}`);
    }
  }
}

export interface PrepareOptions {
  errorHandler: (error: unknown) => void;
}

async function internalPrepare(
  element: ReactNode,
  options: PrepareOptions,
  context: PrepareContext = {},
  dispatcher: Dispatcher,
): Promise<unknown> {
  const [children, childContext] = await prepareElement(
    element,
    options.errorHandler,
    context,
    dispatcher,
  );

  // Recursively run prepare on children, awaiting any runSync=true promises and collecting any preparedEffect-promises in the dispatcher
  await Promise.all(
    React.Children.toArray(children).map((child) =>
      internalPrepare(child, options, childContext, dispatcher),
    ),
  );

  // Return a promise that resolves once all collected runSync=false promises are prepared
  return Promise.all(popHookPromises(dispatcher));
}

async function prepare(
  element: ReactNode,
  options: Partial<PrepareOptions> = {},
): Promise<string> {
  const fullOptions: PrepareOptions = {
    errorHandler: (error) => {
      throw error;
    },
    ...options,
  };

  const dispatcher = createDispatcher(fullOptions.errorHandler);

  await internalPrepare(element, fullOptions, undefined, dispatcher);

  return `window["${__REACT_PREPARE__}"] = { preparedEffects: ${JSON.stringify(
    popPreparedHookIdentifiers(dispatcher),
  )} };`;
}

export default prepare;
