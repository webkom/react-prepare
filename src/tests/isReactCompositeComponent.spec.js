const { describe, it } = global;
import assert from 'assert/strict';
import React from 'react';
import { Provider } from 'react-redux';

import isReactCompositeComponent from '../utils/isReactCompositeComponent';

describe('isReactCompositeComponent', () => {
  it('should match Component', () => {
    class C extends React.Component {
      render() {
        return <div />;
      }
    }
    assert(isReactCompositeComponent(C), 'match Component');
  });

  it('should match PureComponent', () => {
    class C extends React.PureComponent {
      render() {
        return <div />;
      }
    }
    assert(isReactCompositeComponent(C), 'match PureComponent');
  });

  it('should not match functional component', () => {
    const C = () => <div />;
    assert(
      isReactCompositeComponent(C) === false,
      'not match functional component',
    );
  });

  it('should match redux Provider', () => {
    assert(isReactCompositeComponent(Provider), 'match redux Provider');
  });
});
