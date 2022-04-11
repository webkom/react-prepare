const { describe, it, beforeEach } = global;
import sinon from 'sinon';
import assert from 'assert/strict';
import React, { Component, PureComponent } from 'react';
import PropTypes from 'prop-types';
import { renderToStaticMarkup } from 'react-dom/server';

import prepared, { isPrepared, getPrepare } from '../prepared';

describe('prepared', () => {
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
    assert(!isPrepared(OriginalComponent), 'OriginalComponent is not prepared');
    assert(isPrepared(PreparedComponent), 'PreparedComponent is prepared');
    const prepare = getPrepare(PreparedComponent);
    assert.equal(
      typeof prepare,
      'function',
      'getPrepare(PreparedCompositeComponent) is a function',
    );
    await prepare({ text: 'foo' });
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

  it('prepared Composite Component', async () => {
    const PreparedCompositeComponent = prepared(prepareUsingProps, {
      pure: false,
    })(OriginalCompositeComponent);

    await testComponent(OriginalCompositeComponent, PreparedCompositeComponent);
  });

  it('prepared Composite Pure Component', async () => {
    const PreparedCompositeComponent = prepared(prepareUsingProps)(
      OriginalCompositePureComponent,
    );

    await testComponent(
      OriginalCompositePureComponent,
      PreparedCompositeComponent,
    );
  });

  it('prepared Arrow Component', async () => {
    const PreparedCompositeComponent = prepared(prepareUsingProps)(
      OriginalArrowComponent,
    );

    await testComponent(OriginalArrowComponent, PreparedCompositeComponent);
  });
});
