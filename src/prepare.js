import React from 'react';

import isThenable from './utils/isThenable';
import { isPrepared, getPrepare, shouldAwaitOnSsr } from './prepared';
import getElementType, { ELEMENT_TYPE } from './utils/getElementType';
import getContextValue from './utils/getContextValue';
import {
  dispatcherIsRegistered,
  registerDispatcher,
  setDispatcherContext,
} from './utils/dispatcher';

const updater = {
  enqueueSetState(publicInstance, partialState, callback) {
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

function createCompositeElementInstance(
  { type: CompositeComponent, props },
  context,
) {
  const instance = new CompositeComponent(props, context);
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

function renderCompositeElementInstance(instance, context = {}) {
  const childContext = {
    ...context,
    ...(instance.getChildContext ? instance.getChildContext() : {}),
  };
  return [instance.render(), childContext];
}

async function prepareCompositeElement({ type, props }, errorHandler, context) {
  let preparePromise;

  if (isPrepared(type)) {
    const prepareResult = getPrepare(type)(props, context);
    if (isThenable(prepareResult)) {
      preparePromise = prepareResult.catch(errorHandler);
      if (shouldAwaitOnSsr(type)) {
        await preparePromise;
      }
    }
  }
  const instance = createCompositeElementInstance({ type, props }, context);
  return [...renderCompositeElementInstance(instance, context), preparePromise];
}

async function prepareElement(element, errorHandler, context) {
  switch (getElementType(element)) {
    case ELEMENT_TYPE.NOTHING:
    case ELEMENT_TYPE.TEXT_NODE: {
      return [null, context];
    }
    case ELEMENT_TYPE.DOM_ELEMENT:
    case ELEMENT_TYPE.FRAGMENT: {
      return [element.props.children, context];
    }
    case ELEMENT_TYPE.CONTEXT_PROVIDER: {
      const _providers = new Map(context._providers);
      _providers.set(element.type._context.Provider, element.props);
      return [element.props.children, { ...context, _providers }];
    }
    case ELEMENT_TYPE.CONTEXT_CONSUMER: {
      const value = getContextValue(context, element.type._context);

      const consumerFunc = element.props.children;
      return [consumerFunc(value), context];
    }
    case ELEMENT_TYPE.FORWARD_REF: {
      return [element.type.render(element.props, element.ref), context];
    }
    case ELEMENT_TYPE.MEMO: {
      return prepareElement({ ...element, type: element.type.type });
    }
    case ELEMENT_TYPE.FUNCTION_COMPONENT: {
      setDispatcherContext(context);
      return [element.type(element.props), context];
    }
    case ELEMENT_TYPE.CLASS_COMPONENT: {
      return prepareCompositeElement(element, errorHandler, context);
    }
    default: {
      throw new Error(`Unsupported element type: ${element}`);
    }
  }
}

async function prepare(element, options = {}, context = {}) {
  const {
    errorHandler = (error) => {
      throw error;
    },
  } = options;

  if (!dispatcherIsRegistered()) {
    registerDispatcher();
  }

  const [children, childContext, preparePromise] = await prepareElement(
    element,
    errorHandler,
    context,
  );

  // Recursively run prepare on children, and return a promise that resolves once all children are prepared.
  return Promise.all(
    React.Children.toArray(children)
      .map((child) => prepare(child, options, childContext))
      .concat(preparePromise || []),
  );
}

export default prepare;
