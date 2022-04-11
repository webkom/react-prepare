import { Provider } from 'react-redux';

const { describe, it } = global;
import React, { createContext, memo } from 'react';
import assert from 'assert/strict';
import getElementType, { ELEMENT_TYPE } from '../utils/getElementType';
import { createStore } from 'redux';

describe('isComponentType', () => {
  it('correctly identified non-nodes', () => {
    assert.equal(getElementType(null), ELEMENT_TYPE.NOTHING);
    assert.equal(getElementType(undefined), ELEMENT_TYPE.NOTHING);
    assert.equal(getElementType(false), ELEMENT_TYPE.NOTHING);
  });

  it('should identify text nodes', () => {
    assert.equal(getElementType('text'), ELEMENT_TYPE.TEXT_NODE);
    assert.equal(getElementType(''), ELEMENT_TYPE.TEXT_NODE);
    assert.equal(
      getElementType((<p>text</p>).props.children),
      ELEMENT_TYPE.TEXT_NODE,
    );
    assert.equal(getElementType(0), ELEMENT_TYPE.TEXT_NODE);
    assert.equal(getElementType(43), ELEMENT_TYPE.TEXT_NODE);
    assert.equal(
      getElementType((<p>43</p>).props.children),
      ELEMENT_TYPE.TEXT_NODE,
    );
  });

  it('should identify dom elements', () => {
    assert.equal(getElementType(<div />), ELEMENT_TYPE.DOM_ELEMENT);
    assert.equal(getElementType(<p>test</p>), ELEMENT_TYPE.DOM_ELEMENT);
    assert.equal(
      getElementType(
        <p>
          <div />
        </p>,
      ),
      ELEMENT_TYPE.DOM_ELEMENT,
    );
    assert.equal(
      getElementType(<a href="https://www.abakus.no">Abakus</a>),
      ELEMENT_TYPE.DOM_ELEMENT,
    );
  });

  it('should identify fragments', () => {
    assert.equal(getElementType(<React.Fragment />), ELEMENT_TYPE.FRAGMENT);
    assert.equal(
      getElementType(<React.Fragment>test</React.Fragment>),
      ELEMENT_TYPE.FRAGMENT,
    );
    assert.equal(
      getElementType(
        <>
          <div />
        </>,
      ),
      ELEMENT_TYPE.FRAGMENT,
    );
  });

  it('should identify forward ref', () => {
    // eslint-disable-next-line react/prop-types,react/display-name
    const ForwardRef = React.forwardRef(({ text }, ref) => (
      <div>{text + ref}</div>
    ));

    assert.equal(
      getElementType(<ForwardRef text="test" />),
      ELEMENT_TYPE.FORWARD_REF,
    );
    assert.equal(
      getElementType(
        <ForwardRef text="test">
          <div />
        </ForwardRef>,
      ),
      ELEMENT_TYPE.FORWARD_REF,
    );
  });

  it('should identify memoized component', () => {
    // eslint-disable-next-line react/prop-types
    const Component = ({ text }) => <div>{text}</div>;

    const Memo = memo(Component);

    assert.equal(getElementType(<Memo text="test" />), ELEMENT_TYPE.MEMO);
    assert.equal(
      getElementType(
        <Memo text="test">
          <p>test</p>
        </Memo>,
      ),
      ELEMENT_TYPE.MEMO,
    );
  });

  it('should identify function components', () => {
    function FunctionComponent() {
      return <div>function</div>;
    }

    const ArrowComponent = () => <div>arrow</div>;

    assert.equal(
      getElementType(<FunctionComponent />),
      ELEMENT_TYPE.FUNCTION_COMPONENT,
    );
    assert.equal(
      getElementType(<ArrowComponent />),
      ELEMENT_TYPE.FUNCTION_COMPONENT,
    );
    assert.equal(
      getElementType(
        <FunctionComponent>
          <p>test</p>
        </FunctionComponent>,
      ),
      ELEMENT_TYPE.FUNCTION_COMPONENT,
    );
    assert.equal(
      getElementType(
        <ArrowComponent>
          <p>test</p>
        </ArrowComponent>,
      ),
      ELEMENT_TYPE.FUNCTION_COMPONENT,
    );
  });

  it('should identify context provider', () => {
    const Context = createContext('initial');

    assert.equal(
      getElementType(<Context.Provider value="value" />),
      ELEMENT_TYPE.CONTEXT_PROVIDER,
    );
    assert.equal(
      getElementType(
        <Context.Provider value="value">
          <div />
        </Context.Provider>,
      ),
      ELEMENT_TYPE.CONTEXT_PROVIDER,
    );
  });

  it('should identify context consumer', () => {
    const Context = createContext('initial');

    assert.equal(
      getElementType(<Context.Consumer>{() => {}}</Context.Consumer>),
      ELEMENT_TYPE.CONTEXT_CONSUMER,
    );
  });

  it('should identify class components', () => {
    class ClassComponent extends React.Component {
      render() {
        return <div>class</div>;
      }
    }
    assert.equal(
      getElementType(<ClassComponent />),
      ELEMENT_TYPE.CLASS_COMPONENT,
    );
    assert.equal(
      getElementType(
        <ClassComponent>
          <p>test</p>
        </ClassComponent>,
      ),
      ELEMENT_TYPE.CLASS_COMPONENT,
    );

    class PureComponent extends React.PureComponent {
      render() {
        return <div>class</div>;
      }
    }
    assert.equal(
      getElementType(<PureComponent />),
      ELEMENT_TYPE.CLASS_COMPONENT,
    );
    assert.equal(
      getElementType(
        <PureComponent>
          <p>test</p>
        </PureComponent>,
      ),
      ELEMENT_TYPE.CLASS_COMPONENT,
    );
  });

  it('should match redux Provider as class component', () => {
    assert.equal(
      getElementType(
        <Provider store={createStore(() => {})}>
          <></>
        </Provider>,
      ),
      ELEMENT_TYPE.CLASS_COMPONENT,
    );
  });
});
