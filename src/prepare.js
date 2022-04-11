import React from 'react';

import isThenable from './utils/isThenable';
import { isPrepared, getPrepare, shouldAwaitOnSsr } from './prepared';
import getElementType, { ELEMENT_TYPE } from './utils/getElementType';

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
  return instance;
}

function renderCompositeElementInstance(instance, context = {}) {
  const childContext = Object.assign(
    {},
    context,
    instance.getChildContext ? instance.getChildContext() : {},
  );
  return [instance.render(), childContext];
}

async function prepareCompositeElement({ type, props }, errorHandler, context) {
  let preparedPromise;

  if (isPrepared(type)) {
    const p = getPrepare(type)(props, context);
    if (isThenable(p)) {
      preparedPromise = p.catch(errorHandler);
      if (shouldAwaitOnSsr(type)) {
        await preparedPromise;
      }
    }
  }
  const instance = createCompositeElementInstance({ type, props }, context);
  return [
    ...renderCompositeElementInstance(instance, context),
    preparedPromise,
  ];
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
      const parentProvider =
        context._providers &&
        context._providers.get(element.type._context.Provider);
      const value = parentProvider
        ? parentProvider.value
        : element.type._context.currentValue;

      const consumerFunc = element.props.children;
      return [consumerFunc(value), context];
    }
    case ELEMENT_TYPE.FORWARD_REF: {
      return [element.type.render(element.props, element.ref), context];
    }
    case ELEMENT_TYPE.MEMO: {
      throw new Error('Memo elements are not supported yet');
    }
    case ELEMENT_TYPE.FUNCTION_COMPONENT: {
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

function prepare(element, options = {}, context = {}) {
  const {
    errorHandler = (error) => {
      throw error;
    },
  } = options;
  return prepareElement(element, errorHandler, context).then(
    ([children, childContext, p]) =>
      Promise.all(
        React.Children.toArray(children)
          .map((child) => prepare(child, options, childContext))
          .concat(p)
          .filter(Boolean),
      ),
  );
}

export default prepare;
