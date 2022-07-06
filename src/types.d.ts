import { Provider } from 'react';

interface ContextProviderMap
  extends Map<Provider<unknown>, { value: unknown }> {
  get<T>(key: Provider<T>): { value: T } | undefined;
  set<T>(key: Provider<T>, value: { value: T }): this;
}

export interface PrepareContext {
  store?: { dispatch: unknown };
  _providers?: ContextProviderMap;
}
