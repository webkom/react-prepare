import React, { PureComponent, Component, ComponentType } from 'react';

import { __REACT_PREPARE__ } from './constants';
import {
  ContextTypes,
  PossiblyPreparedComponent,
  PreparedComponent,
  PrepareFunction,
} from './types';

export interface PreparedOptions<P, C> {
  pure?: boolean;
  componentDidMount?: boolean;
  componentWillReceiveProps?:
    | boolean
    | ((props: P, nextProps: P, context: C, nextContext: C) => boolean);
  awaitOnSsr?: boolean;
  contextTypes?: ContextTypes;
}

const prepared =
  <P, C = unknown>(
    prepare: PrepareFunction<P, C>,
    {
      pure = true,
      componentDidMount = true,
      componentWillReceiveProps = true,
      awaitOnSsr = true,
      contextTypes = {},
    }: PreparedOptions<P, C> = {},
  ): ((OriginalComponent: ComponentType<P>) => ComponentType<P>) =>
  (OriginalComponent) => {
    const { displayName } = OriginalComponent;
    class PreparedComponent extends (pure ? PureComponent : Component)<P> {
      static displayName = `PreparedComponent${
        displayName ? `(${displayName})` : ''
      }`;

      // Placeholder to allow referencing this.context in lifecycle methods
      static contextTypes = contextTypes;

      componentDidMount() {
        if (componentDidMount) {
          prepare(this.props, this.context as C);
        }
      }

      componentWillReceiveProps(nextProps: Readonly<P>, nextContext: C) {
        if (
          typeof componentWillReceiveProps === 'function'
            ? componentWillReceiveProps(
                this.props,
                nextProps,
                this.context as C,
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

      static [__REACT_PREPARE__] = {
        prepare: prepare.bind(null),
        awaitOnSsr,
      };
    }
    return PreparedComponent;
  };

function getPrepare<P>(
  CustomComponent: PreparedComponent<P>,
): PrepareFunction<P> {
  return CustomComponent[__REACT_PREPARE__].prepare;
}

function isPrepared<P>(
  CustomComponent: PossiblyPreparedComponent<P>,
): CustomComponent is PreparedComponent<P> {
  return CustomComponent[__REACT_PREPARE__] !== undefined;
}

function shouldAwaitOnSsr<P>(
  CustomComponent: PossiblyPreparedComponent<P>,
): boolean {
  return (
    !!CustomComponent[__REACT_PREPARE__] &&
    CustomComponent[__REACT_PREPARE__].awaitOnSsr
  );
}

export { isPrepared, getPrepare, shouldAwaitOnSsr };
export default prepared;
