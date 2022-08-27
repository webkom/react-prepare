import { describe, it } from 'vitest';
import assert from 'assert/strict';
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { renderToString } from 'react-dom/server';
import sinon from 'sinon';

describe('React lifecycle methods', () => {
  class CompositeComponent extends Component {
    static propTypes = {
      spyForComponentWillMount: PropTypes.func,
      spyForComponentWillUnmount: PropTypes.func,
    };

    // eslint-disable-next-line react/no-deprecated
    componentWillMount() {
      const { spyForComponentWillMount } = this.props;
      spyForComponentWillMount();
    }

    componentWillUnmount() {
      const { spyForComponentWillUnmount } = this.props;
      spyForComponentWillUnmount();
    }

    render() {
      return <div>CompositeComponent</div>;
    }
  }

  it('renderToString calls #componentWillMount()', () => {
    const spyForComponentWillMount = sinon.spy();
    const spyForComponentWillUnmount = () => void 0;
    renderToString(
      <CompositeComponent
        spyForComponentWillMount={spyForComponentWillMount}
        spyForComponentWillUnmount={spyForComponentWillUnmount}
      />,
    );
    assert(
      spyForComponentWillMount.calledOnce,
      '#componentWillMount() has been called once',
    );
  });

  it("renderToString doesn't call #componentWillUnmount()", () => {
    const spyForComponentWillMount = () => void 0;
    const spyForComponentWillUnmount = sinon.spy();
    renderToString(
      <CompositeComponent
        spyForComponentWillMount={spyForComponentWillMount}
        spyForComponentWillUnmount={spyForComponentWillUnmount}
      />,
    );
    assert(
      spyForComponentWillUnmount.notCalled,
      '#componentWillUnmount() has not been called',
    );
  });
});
