import { describe, it, beforeEach } from 'vitest';
import sinon from 'sinon';
import assert from 'assert/strict';
import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { renderToStaticMarkup } from 'react-dom/server';

import { prepare, withPreparedEffect } from '../index';
import { render } from '@testing-library/react';

describe('withPreparedEffect', () => {
  class OriginalCompositeComponent extends Component {
    static propTypes = {
      text: PropTypes.string,
    };
    render() {
      return <div>{this.props.text}</div>;
    }
  }

  class OriginalCompositePureComponent extends PureComponent {
    static propTypes = {
      text: PropTypes.string,
    };
    render() {
      return <div>{this.props.text}</div>;
    }
  }

  const OriginalArrowComponent = ({ text }) => <div>{text}</div>;
  OriginalArrowComponent.propTypes = {
    text: PropTypes.string,
  };

  let doAsyncSideEffect;
  let prepareUsingProps;

  beforeEach(() => {
    doAsyncSideEffect = sinon.spy(async () => {});
    prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
  });

  const testComponent = async (OriginalComponent, PreparedComponent) => {
    await prepare(<OriginalComponent text="foo" />);
    assert(
      prepareUsingProps.notCalled,
      'prepareUsingProps has not been called yet',
    );

    await prepare(<PreparedComponent text="foo" />);
    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps has been called exactly once',
    );
    assert.deepEqual(
      prepareUsingProps.getCall(0).args,
      [{ text: 'foo' }],
      'prepareUsingProps has been called with correct arguments',
    );
    assert(
      doAsyncSideEffect.calledOnce,
      'doAsyncSideEffect has been called exactly once',
    );
    assert.deepEqual(
      doAsyncSideEffect.getCall(0).args,
      ['foo'],
      'doAsyncSideEffect has been called with correct arguments',
    );
    const html = renderToStaticMarkup(<PreparedComponent text="foo" />);
    assert.equal(html, '<div>foo</div>', 'renders with correct html');
  };

  it('works with Composite Component', async () => {
    const PreparedCompositeComponent = withPreparedEffect(
      'effect',
      prepareUsingProps,
      (props) => [props.text],
    )(OriginalCompositeComponent);

    await testComponent(OriginalCompositeComponent, PreparedCompositeComponent);
  });

  it('works with Composite Pure Component', async () => {
    const PreparedCompositeComponent = withPreparedEffect(
      'effect',
      prepareUsingProps,
      (props) => [props.text],
    )(OriginalCompositePureComponent);

    await testComponent(
      OriginalCompositePureComponent,
      PreparedCompositeComponent,
    );
  });

  it('works with Arrow Component', async () => {
    const PreparedCompositeComponent = withPreparedEffect(
      'effect',
      prepareUsingProps,
      (props) => [props.text],
    )(OriginalArrowComponent);

    await testComponent(OriginalArrowComponent, PreparedCompositeComponent);
  });

  it('reruns effect when dependency changes', async () => {
    const PreparedComponent = withPreparedEffect(
      'effect',
      prepareUsingProps,
      (props) => [props.text],
    )(OriginalArrowComponent);

    await prepare(<PreparedComponent text="foo" />);

    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps was called exactly once when preparing',
    );

    const element = await render(<PreparedComponent text="foo" />);

    assert(
      prepareUsingProps.calledTwice,
      'prepareUsingProps was called once more when rendering',
    );

    element.rerender(<PreparedComponent text="foo" />);

    assert(
      prepareUsingProps.calledTwice,
      'prepareUsingProps was NOT called again when rerendering with same props',
    );

    element.rerender(<PreparedComponent text="bar" />);

    assert(
      prepareUsingProps.calledThrice,
      'prepareUsingProps was called once more when rerendering with different props',
    );
  });

  it('does not rerun effect if changed prop is not in deps', async () => {
    const PreparedComponent = withPreparedEffect(
      'effect',
      prepareUsingProps,
      () => [],
    )(OriginalArrowComponent);

    await prepare(<PreparedComponent text="foo" />);

    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps was called exactly once when preparing',
    );

    const element = await render(<PreparedComponent text="foo" />);

    assert(
      prepareUsingProps.calledTwice,
      'prepareUsingProps was called once more when rendering',
    );

    element.rerender(<PreparedComponent text="bar" />);

    assert(
      prepareUsingProps.calledTwice,
      'prepareUsingProps was NOT called again when rerendering with changed props',
    );
  });
});
