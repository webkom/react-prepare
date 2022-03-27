import React, { PureComponent, Component, ComponentType } from 'react';

import { __REACT_PREPARE__ } from './constants';
import {
  PrepareContext,
  PreparedComponentType,
  PrepareFn,
} from './utils/types';

interface PreparedOptions<P, C> {
  pure?: boolean;
  componentDidMount?: boolean;
  componentWillReceiveProps?:
    | boolean
    | ((props: P, nextProps: P, context: C, nextContext: C) => boolean);
  awaitOnSsr?: boolean;
  contextTypes?: object;
}

const prepared = <P, C = PrepareContext>(
  prepare: PrepareFn<P>,
  options: PreparedOptions<P, C> = {},
): ((OriginalComponent: ComponentType<P>) => PreparedComponentType<P>) => {
  const {
    pure = true,
    componentDidMount = true,
    componentWillReceiveProps = true,
    awaitOnSsr = true,
    contextTypes = {},
  } = options;
  return (OriginalComponent) => {
    const { displayName } = OriginalComponent;

    const ReactComponent = pure ? PureComponent : Component;

    class PreparedComponent extends ReactComponent<P> {
      static displayName = `PreparedComponent${
        displayName ? `(${displayName})` : ''
      }`;

      // Placeholder to allow referencing this.context in lifecycle methods
      static contextTypes = contextTypes;

      componentDidMount() {
        if (componentDidMount) {
          prepare(this.props, this.context);
        }
      }

      componentWillReceiveProps(nextProps: Readonly<P>, nextContext: C) {
        if (
          typeof componentWillReceiveProps === 'function'
            ? componentWillReceiveProps(
                this.props,
                nextProps,
                this.context,
                nextContext,
              )
            : componentWillReceiveProps
        ) {
          prepare(nextProps, nextContext);
        }
      }

      render() {
        return <OriginalComponent {...this.props} />;
      }
    }

    (PreparedComponent as PreparedComponentType<P>)[__REACT_PREPARE__] = {
      prepare: prepare.bind(null),
      awaitOnSsr,
    };

    return PreparedComponent as PreparedComponentType<P>;
  };
};

function getPrepare<P>(
  CustomComponent: PreparedComponentType<P>,
): PrepareFn<P> {
  if (!isPrepared(CustomComponent)) {
    throw new TypeError(
      'getPrepare() was called with a non-prepared component',
    );
  }
  return CustomComponent[__REACT_PREPARE__].prepare;
}

function isPrepared<P>(
  CustomComponent: PreparedComponentType<P> | ComponentType<P>,
): CustomComponent is PreparedComponentType<P> {
  return __REACT_PREPARE__ in CustomComponent;
}

function shouldAwaitOnSsr<P>(
  CustomComponent: PreparedComponentType<P> | ComponentType<P>,
) {
  return (
    isPrepared(CustomComponent) && CustomComponent[__REACT_PREPARE__].awaitOnSsr
  );
}

export { isPrepared, getPrepare, shouldAwaitOnSsr };
export default prepared;
