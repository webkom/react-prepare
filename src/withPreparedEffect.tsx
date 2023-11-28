import React, { ComponentType, DependencyList, ReactNode } from 'react';
import { usePreparedEffect } from './index';
import { PreparedEffectOptions } from './usePreparedEffect';

const withPreparedEffect =
  <P extends object>(
    identifier: string,
    effect: (props: P) => Promise<unknown>,
    depsFn?: (props: P) => DependencyList,
    opts?: PreparedEffectOptions,
  ) =>
  <CP extends P>(Component: ComponentType<CP>) => {
    const WrappedComponent = (props: CP): ReactNode => {
      usePreparedEffect(
        identifier,
        () => effect(props),
        depsFn ? depsFn(props) : [],
        opts,
      );
      return <Component {...props} />;
    };
    WrappedComponent.displayName = `withPreparedEffect(${
      Component.displayName || Component.name
    })`;
    return WrappedComponent;
  };

export default withPreparedEffect;
