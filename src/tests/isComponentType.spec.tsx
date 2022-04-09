import assert from 'assert/strict';
import {
  isCompositeComponent,
  isContextConsumer,
  isContextProvider,
  isDOMElementOrFragment,
  isElement,
  isForwardRef,
  isFunctionComponent,
  isMemo,
  isTextNode,
} from '../utils/isComponentType';
import React, {
  Component,
  createContext,
  memo,
  PropsWithChildren,
  PureComponent,
  ReactText,
} from 'react';
import { ElementType } from '../utils/types';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

describe('isComponentType functions', () => {
  type IProps = PropsWithChildren<{
    text: string;
  }>;

  it('Identifies text-nodes correctly', () => {
    const element: ReactText = (<p>text!</p>).props.children;

    assert(!isElement(element));
    assert(isTextNode(element));

    assert(!isElement('test'));
    assert(isTextNode('test'));
  });

  it('Identifies number text-nodes correctly', () => {
    const element: ReactText = (<p>5</p>).props.children;

    assert(!isElement(element));
    assert(isTextNode(element));

    assert(!isElement(42));
    assert(isTextNode(42));
  });

  it('Identifies boolean node correctly', () => {
    assert(!isElement(false));
    assert(!isTextNode(false));
  });

  it('Identifies null correctly', () => {
    assert(!isElement(null));
    assert(!isTextNode(null));
  });

  it('Identifies undefined correctly', () => {
    assert(!isElement(undefined));
    assert(!isTextNode(undefined));
  });

  it('Identifies React.Fragment correctly', () => {
    const element = <React.Fragment>test</React.Fragment>;
    assert(isElement(element));
    assert(!isTextNode(element));
    assert(isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  });

  it('Identifies DOM element correctly', () => {
    const element = <p>test</p>;

    assert(isElement(element));
    assert(!isTextNode(element));
    assert(isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  });

  const assertCompositeComponent = (element: ElementType<unknown>) => {
    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  };

  it('Identifies composite component element correctly', () => {
    class CompositeComponent extends Component<IProps> {
      render() {
        return <div>{this.props.text}</div>;
      }
    }
    const element = <CompositeComponent text={'test'} />;

    assertCompositeComponent(element);
  });

  it('Identifies composite pure component element correctly', () => {
    class CompositePureComponent extends PureComponent<IProps> {
      render() {
        return <div>{this.props.text}</div>;
      }
    }
    const element = <CompositePureComponent text={'test'} />;

    assertCompositeComponent(element);
  });

  const assertFunctionComponent = (element: ElementType<unknown>) => {
    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  };

  it('Identifies function component element correctly', () => {
    function FunctionComponent({ text }: IProps) {
      return <div>{text}</div>;
    }

    const element = <FunctionComponent text={'test'} />;

    assertFunctionComponent(element);
  });

  it('Identifies arrow component element correctly', () => {
    const ArrowComponent = ({ text }: IProps) => {
      return <div>{text}</div>;
    };

    const element = <ArrowComponent text={'test'} />;

    assertFunctionComponent(element);
  });

  it('Identifies forward ref element correctly', () => {
    const ForwardRef = React.forwardRef(({ text }: IProps, ref) => (
      <div>{text + ref}</div>
    ));

    ForwardRef.displayName = 'ForwardRef';

    const element = <ForwardRef text={'test'} />;

    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  });

  it('Identifies context provider correctly', () => {
    const Context = createContext('initial');

    const element = <Context.Provider value={'value'} />;

    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(isContextProvider(element));
    assert(!isContextConsumer(element));
  });

  it('Identifies context consumer correctly', () => {
    const Context = createContext('initial');

    const element = <Context.Consumer>{(value) => value}</Context.Consumer>;

    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(!isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(isContextConsumer(element));
  });

  it('Identifies memoized component correctly', () => {
    // eslint-disable-next-line react/display-name
    const Component = memo(({ text }: IProps) => {
      return <div>{text}</div>;
    });

    const element = <Component text="test" />;

    assert(isElement(element));
    assert(!isTextNode(element));
    assert(!isDOMElementOrFragment(element));
    assert(!isForwardRef(element));
    assert(isMemo(element));
    assert(!isFunctionComponent(element));
    assert(!isContextProvider(element));
    assert(!isContextConsumer(element));
  });

  describe('isReactCompositeComponent', () => {
    it('should match Component', () => {
      class C extends React.Component {
        render() {
          return <div />;
        }
      }
      assert(isCompositeComponent(<C />), 'match Component');
    });

    it('should match PureComponent', () => {
      class C extends React.PureComponent {
        render() {
          return <div />;
        }
      }
      assert(isCompositeComponent(<C />), 'match PureComponent');
    });

    it('should not match functional component', () => {
      const C = () => <div />;
      assert(!isCompositeComponent(<C />), 'not match functional component');
    });

    it('should match redux Provider', () => {
      assert(
        isCompositeComponent(
          <Provider store={createStore(() => {})}>
            <></>
          </Provider>,
        ),
        'match redux Provider',
      );
    });
  });
});
