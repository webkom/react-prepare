import { Context } from 'react';
import { PrepareContext } from '../types';
import { ContextWithInternals } from './reactInternalTypes';

const getContextValue = <T>(
  prepareContext: PrepareContext,
  elementContext: Context<T>,
): T => {
  const parentProvider = prepareContext._providers?.get(
    elementContext.Provider,
  );

  return parentProvider
    ? parentProvider.value
    : (elementContext as ContextWithInternals<T>)._currentValue;
};

export default getContextValue;
