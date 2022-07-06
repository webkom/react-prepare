import prepared, { PreparedOptions } from './prepared';
import { PrepareFunction, PrepareUsingDispatchFunction } from './types';
import PropTypes from 'prop-types';
import { ComponentType } from 'react';
import { Dispatch } from 'redux';

interface StoreShape {
  dispatch: Dispatch;
}

const storeShape = PropTypes.shape({
  dispatch: PropTypes.func.isRequired,
});

const dispatched =
  <P, C extends { store: StoreShape } = { store: StoreShape }>(
    prepareUsingDispatch: PrepareUsingDispatchFunction<P>,
    opts: PreparedOptions<P, C> = {},
  ) =>
  (OriginalComponent: ComponentType<P>) => {
    const prepare: PrepareFunction<P, C> = (props, { store: { dispatch } }) =>
      prepareUsingDispatch(props, dispatch);

    const contextTypes = {
      ...opts.contextTypes,
      store: storeShape,
    };
    const preparedOpts = { ...opts, contextTypes };
    return prepared(prepare, preparedOpts)(OriginalComponent);
  };

export default dispatched;
