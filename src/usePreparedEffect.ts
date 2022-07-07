import { PrepareHookEffect, PrepareHookFunction } from './types';
import { DependencyList, useEffect } from 'react';
import { __REACT_PREPARE__ } from './constants';

const usePreparedEffect = (
  prepareFunction: PrepareHookFunction,
  deps: DependencyList = [],
) => {
  const effect = (): void => {
    prepareFunction();
  };
  (effect as PrepareHookEffect)[__REACT_PREPARE__] = {
    prepare: prepareFunction,
  };

  useEffect(effect, deps);
};

export default usePreparedEffect;
