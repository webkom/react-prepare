import PropTypes from 'prop-types';

import prepared from './prepared';
import { PrepareFn } from './utils/types';
import { ComponentClass } from 'react';

const storeShape = PropTypes.shape({
  dispatch: PropTypes.func.isRequired,
});

interface DispatchedOptions {
  contextTypes?: object;
}

const dispatched =
  <P>(
    prepareUsingDispatch: (props: P, dispatch: unknown) => Promise<void>,
    opts: DispatchedOptions = {},
  ) =>
  (OriginalComponent: ComponentClass<P>) => {
    const prepare: PrepareFn<P> = (props, context) =>
      prepareUsingDispatch(props, context?.store?.dispatch);

    const contextTypes = {
      ...opts.contextTypes,
      store: storeShape,
    };

    const preparedOpts = { ...opts, contextTypes };
    return prepared(prepare, preparedOpts)(OriginalComponent);
  };

export default dispatched;
