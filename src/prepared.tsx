import React, {
  PureComponent,
  Component,
  ComponentType,
  Context,
  ComponentClass,
} from 'react';

import { __REACT_PREPARE__ } from './constants';

interface PreparedOptions<P, C> {
  pure?: boolean;
  componentDidMount?: boolean;
  componentWillReceiveProps?:
    | boolean
    | ((props: P, nextProps: P, context: C, nextContext: C) => boolean);
  awaitOnSsr?: boolean;
  contextTypes?: object;
}

export type PreparedComponentType<
  P,
  C extends Context<unknown> = Context<unknown>,
> = ComponentClass<P> & {
  [__REACT_PREPARE__]: {
    prepare: PrepareFn<P, C>;
    awaitOnSsr: boolean;
  };
};

export type PrepareFn<P, C extends Context<unknown>> = (
  props: P,
  context?: C,
) => void;

const prepared =
  <P, C extends Context<unknown> = Context<unknown>>(
    prepare: PrepareFn<P, C>,
    {
      pure = true,
      componentDidMount = true,
      componentWillReceiveProps = true,
      awaitOnSsr = true,
      contextTypes = {},
    }: PreparedOptions<P, C> = {},
  ): ((OriginalComponent: ComponentType<P>) => PreparedComponentType<P, C>) =>
  (OriginalComponent) => {
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

    (PreparedComponent as PreparedComponentType<P, C>)[__REACT_PREPARE__] = {
      prepare: prepare.bind(null),
      awaitOnSsr,
    };

    return PreparedComponent as PreparedComponentType<P, C>;
  };

function getPrepare<P, C extends Context<unknown>>(
  CustomComponent: PreparedComponentType<P, C>,
): PrepareFn<P, C> {
  if (!(__REACT_PREPARE__ in CustomComponent)) {
    throw new TypeError(
      'getPrepare() was called with a non-prepared component',
    );
  }
  return CustomComponent[__REACT_PREPARE__].prepare;
}

function isPrepared<P>(
  CustomComponent: PreparedComponentType<P> | ComponentType<P>,
): boolean {
  return __REACT_PREPARE__ in CustomComponent;
}

function shouldAwaitOnSsr<P>(
  CustomComponent: PreparedComponentType<P> | ComponentType<P>,
) {
  return (
    __REACT_PREPARE__ in CustomComponent &&
    CustomComponent[__REACT_PREPARE__].awaitOnSsr
  );
}

export { isPrepared, getPrepare, shouldAwaitOnSsr };
export default prepared;
