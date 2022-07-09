/* eslint-disable react/prop-types */
import { describe, it, beforeEach } from 'vitest';
import React from 'react';
import assert from 'assert/strict';
import sinon from 'sinon';
import prepare, { prepared, usePreparedEffect } from '../index';
import { render } from '@testing-library/react';
import { __REACT_PREPARE__ } from '../constants';

describe('usePreparedEffect', () => {
  let doAsyncSideEffect;
  let prepareFunction;

  beforeEach(() => {
    window[__REACT_PREPARE__] = undefined;
    doAsyncSideEffect = sinon.spy(async () => {
      return;
    });
    prepareFunction = sinon.spy(async () => {
      await doAsyncSideEffect();
    });
  });

  it('should run prepare function when prepared', async () => {
    const Component = () => {
      usePreparedEffect('effect', prepareFunction);

      return <div></div>;
    };

    await prepare(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );
    assert(
      doAsyncSideEffect.calledOnce,
      'async side effect has been called exactly once',
    );
  });

  it('should run prepare function on nested components when prepared', async () => {
    const Component = ({ children }) => {
      return <div>{children}</div>;
    };

    const PreparedComponent = prepared(prepareFunction)(Component);

    const PreparedEffectComponent = () => {
      usePreparedEffect('effect', prepareFunction);

      return <div></div>;
    };

    await prepare(
      <Component>
        <PreparedComponent>
          <PreparedEffectComponent />
        </PreparedComponent>
      </Component>,
    );

    assert(
      prepareFunction.calledTwice,
      'prepareFunction has been called from both PreparedComponent and PreparedEffectComponent',
    );
    assert(
      doAsyncSideEffect.calledTwice,
      'async side effect has been called from PreparedComponent and PreparedEffectComponent',
    );
  });

  it('should await effect before traversing children when runSync=true', async () => {
    let parentEffectAwaited = false;
    const parentEffect = async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      parentEffectAwaited = true;
    };

    const childEffect = sinon.spy(() => {});

    const Component = ({ children }) => {
      usePreparedEffect('effect', parentEffect, [], { runSync: true });
      return <div>{children}</div>;
    };

    const ChildComponent = () => {
      usePreparedEffect('childEffect', () => childEffect(parentEffectAwaited));
      return <div />;
    };

    await prepare(
      <Component>
        <ChildComponent />
      </Component>,
    );

    assert(parentEffectAwaited);
    assert(childEffect.calledOnce);
    assert(childEffect.calledWith(true));
  });

  it('should await multiple side-effects with runSync=true', async () => {
    let parentEffectsAwaited = 0;
    const parentEffect = (timeout) => async () => {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      parentEffectsAwaited++;
    };

    const childEffect = sinon.spy(() => {});

    const Component = ({ children }) => {
      usePreparedEffect('effect1', parentEffect(0), [], {
        runSync: true,
      });
      usePreparedEffect('effect2', parentEffect(10), [], {
        runSync: true,
      });
      usePreparedEffect('effect3', parentEffect(0), [], {
        runSync: true,
      });
      return <div>{children}</div>;
    };

    const ChildComponent = () => {
      usePreparedEffect('childImmediate', parentEffect(0), [], {
        runSync: true,
      });
      usePreparedEffect('childEffect', () => childEffect(parentEffectsAwaited));
      return <div />;
    };

    await prepare(
      <Component>
        <Component>
          <ChildComponent />
        </Component>
      </Component>,
    );

    assert(childEffect.calledOnce);
    // Should have prepared 2x Component with 3 prepared effects each + 1 in ChildComponent
    assert(childEffect.calledWith(6));
  });

  it('should run effect after rendering on client-side when NOT prepared', () => {
    const Component = () => {
      usePreparedEffect('effect', prepareFunction);
      return <div />;
    };

    render(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );
  });

  it('should NOT re-run effect on client after being prepared', async () => {
    const Component = () => {
      usePreparedEffect('effect', prepareFunction);
      return <div />;
    };

    const prepareClientCode = await prepare(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );

    eval(prepareClientCode);

    render(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );
  });

  it('should re-run effect on client after being prepared and dep changed', async () => {
    const Component = ({ prop }) => {
      usePreparedEffect('effect', prepareFunction, [prop]);
      return <div />;
    };

    const prepareClientCode = await prepare(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );

    eval(prepareClientCode);

    const { rerender } = render(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has not been called again',
    );

    rerender(<Component prop={'b'} />);

    assert(
      prepareFunction.calledTwice,
      'prepareFunction has been called once more after prop changed',
    );
  });

  it('should NOT re-run effect on client after being prepared if no dep changed', async () => {
    const Component = ({ prop }) => {
      usePreparedEffect('effect', prepareFunction, [prop]);
      return <div />;
    };

    const prepareClientCode = await prepare(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );

    eval(prepareClientCode);

    const { rerender } = render(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has not been called again',
    );

    rerender(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has still not been called again',
    );
  });

  it('should re-run effect after being prepared if component is unmounted and re-mounted', async () => {
    const Component = ({ prop }) => {
      usePreparedEffect('effect', prepareFunction, [prop]);
      return <div />;
    };

    const prepareClientCode = await prepare(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );

    eval(prepareClientCode);

    const { rerender } = render(<Component prop={'a'} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has not been called again',
    );

    // unmount component
    rerender(<></>);

    // re-mount component
    rerender(<Component prop={'a'} />);

    assert(
      prepareFunction.calledTwice,
      'prepareFunction has been called on re-mount',
    );
  });

  it('should run effect on client after other effect is prepared', async () => {
    const Component = () => {
      usePreparedEffect('effect', prepareFunction);
      return <div />;
    };

    const otherEffectFunction = sinon.spy(async () => {
      return;
    });

    const OtherComponent = () => {
      usePreparedEffect('otherEffect', otherEffectFunction);
      return <div />;
    };

    const prepareClientCode = await prepare(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );
    assert(
      otherEffectFunction.notCalled,
      'otherEffectFunction has not been called',
    );

    eval(prepareClientCode);
    render(<OtherComponent />);

    assert(
      otherEffectFunction.calledOnce,
      'otherEffectFunction has now been called',
    );
  });

  it('should re-run effect when re-rendering with dependency-array undefined', () => {
    const Component = () => {
      usePreparedEffect('effect', prepareFunction);
      return <div />;
    };

    const { rerender } = render(<Component />);

    rerender(<Component />);

    assert(
      prepareFunction.calledTwice,
      'prepareFunction has been called on both renders',
    );
  });

  it('should re-run effect when a dependency has changed', () => {
    const Component = ({ dep }) => {
      usePreparedEffect('effect', prepareFunction, [dep]);
      return <div />;
    };

    const { rerender } = render(<Component dep={1} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called on initial render',
    );

    rerender(<Component dep={2} />);

    assert(
      prepareFunction.calledTwice,
      'prepareFunction has also been called on re-rerender with changed dependency',
    );
  });

  it('should not re-run effect when a dependency stays the same', () => {
    const Component = ({ dep }) => {
      usePreparedEffect('effect', prepareFunction, [dep]);
      return <div />;
    };

    const { rerender } = render(<Component dep={1} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called on initial render',
    );

    rerender(<Component dep={1} />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has not been called again on re-rerender with same dependency',
    );
  });
});
