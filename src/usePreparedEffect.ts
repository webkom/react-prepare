import { PrepareHookEffect, PrepareHookFunction } from './types';
import { DependencyList, useEffect } from 'react';
import { __REACT_PREPARE__ } from './constants';

interface Options {
  runOnClient?: boolean;
}

const usePreparedEffect = (
  prepareFunction: PrepareHookFunction,
  deps: DependencyList = [],
  opts: Options = {},
) => {
  const { runOnClient = true } = opts;

  const effect = (): void => {
    if (runOnClient) {
      prepareFunction();
    }
  };

  (effect as PrepareHookEffect)[__REACT_PREPARE__] = {
    prepare: prepareFunction,
  };

  useEffect(effect, deps);
};

export default usePreparedEffect;
