/* eslint-disable react/prop-types */
import { describe, it, beforeEach } from 'vitest';
import React from 'react';
import assert from 'assert/strict';
import sinon from 'sinon';
import prepare, { prepared, usePreparedEffect } from '../index';
import { render } from '@testing-library/react';

describe('usePreparedEffect', () => {
  let doAsyncSideEffect;
  let prepareFunction;

  beforeEach(() => {
    doAsyncSideEffect = sinon.spy(async () => {});
    prepareFunction = sinon.spy(async () => {
      await doAsyncSideEffect();
    });
  });

  it('should run prepare function when prepared', async () => {
    const Component = () => {
      usePreparedEffect(prepareFunction);

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
      usePreparedEffect(prepareFunction);

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

  it('should still run effect server-side with runOnClient=false', async () => {
    const Component = () => {
      usePreparedEffect(prepareFunction, [], { runOnClient: false });
      return <div />;
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

  it('should run effect after rendering on client-side', () => {
    const Component = () => {
      usePreparedEffect(prepareFunction);
      return <div />;
    };

    render(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has been called exactly once',
    );
  });

  it('should not re-run effect when re-rendering without dependency array', () => {
    const Component = () => {
      usePreparedEffect(prepareFunction);
      return <div />;
    };

    const { rerender } = render(<Component />);

    rerender(<Component />);

    assert(
      prepareFunction.calledOnce,
      'prepareFunction has only been called once',
    );
  });

  it('should re-run effect when a dependency has changed', () => {
    const Component = ({ dep }) => {
      usePreparedEffect(prepareFunction, [dep]);
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
      usePreparedEffect(prepareFunction, [dep]);
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

  it('should not run effect client-side when runOnClient=false', () => {
    const Component = () => {
      usePreparedEffect(prepareFunction, [], { runOnClient: false });
      return <div />;
    };

    render(<Component />);

    assert(
      prepareFunction.notCalled,
      'prepareFunction has not been called on client-side',
    );
  });
});
