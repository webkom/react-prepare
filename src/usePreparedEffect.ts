import { PrepareHookEffect, PrepareHookFunction } from './types';
import { DependencyList, EffectCallback, useEffect, useRef } from 'react';
import { __REACT_PREPARE__ } from './constants';

export interface PreparedEffectOptions {
  runSync?: boolean;
  serverOnly?: boolean;
}

const usePreparedEffect = (
  prepareFunction: PrepareHookFunction,
  deps: DependencyList = [],
  identifier: string,
  { runSync = false, serverOnly = false }: PreparedEffectOptions = {},
): void => {
  // keep track of whether it is the initial effect-run or not, as only the first run is affected by server-preparing
  const isInitialRunOnClient = useRef(true);

  const effect: EffectCallback = serverOnly
    ? () => {
        /* noop */
      }
    : () => {
        const preparedEffects = window[__REACT_PREPARE__]?.preparedEffects;

        const didRunOnServer = preparedEffects?.includes(identifier);

        // If this is a re-run of the effect on the client, the dependency array must have changed, and we want to run the prepare function again.
        // We also want to run the prepare function on the client if it was not prepared on the server.
        const shouldRunEffect =
          !isInitialRunOnClient.current || !didRunOnServer;

        if (shouldRunEffect) {
          prepareFunction();
        }

        isInitialRunOnClient.current = false;

        // remove the effect from the list of prepared effects on cleanup, such that it will be re-run if the component re-mounts.
        return () => {
          if (
            window[__REACT_PREPARE__] &&
            window[__REACT_PREPARE__].preparedEffects.includes(identifier)
          ) {
            window[__REACT_PREPARE__].preparedEffects.splice(
              window[__REACT_PREPARE__].preparedEffects.indexOf(identifier),
              1,
            );
          }
        };
      };

  // Set react-prepare specific properties on the effect function, so that we can identify it as a prepare-hook effect and run the prepare function in the dispatcher.
  (effect as PrepareHookEffect)[__REACT_PREPARE__] = {
    identifier,
    prepare: prepareFunction,
    runSync,
  };

  useEffect(effect, deps);
};

export default usePreparedEffect;
