import { Context } from 'react';
import { PrepareContext } from '../types';
import { ContextWithInternals } from './reactInternalTypes';

const getContextValue = <T>(
  prepareContext: PrepareContext,
  context: Context<T>,
): T => {
  const parentProvider = prepareContext._providers?.get(context.Provider);

  return parentProvider
    ? parentProvider.value
    : (context as ContextWithInternals<T>)._currentValue;
};

export default getContextValue;
