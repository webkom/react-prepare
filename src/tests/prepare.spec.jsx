/* eslint-disable react/prop-types */

import { describe, it, beforeAll, beforeEach, expect } from 'vitest';
import assert from 'assert/strict';
import sinon from 'sinon';
import React, {
  forwardRef,
  lazy,
  memo,
  Suspense,
  useCallback,
  useContext,
  useDeferredValue,
  useEffect,
  useId,
  useInsertionEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
} from 'react';
import PropTypes from 'prop-types';
import { renderToStaticMarkup } from 'react-dom/server';
import prepare from '../prepare';
import { usePreparedEffect, withPreparedEffect } from '../index';

describe('prepare', () => {
  let originalDispatcher;
  beforeAll(() => {
    originalDispatcher =
      React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
        .ReactCurrentDispatcher.current;
  });
  beforeEach(() => {
    React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current =
      originalDispatcher;
  });

  it('sets instance properties', async () => {
    class MessageBox extends React.Component {
      static propTypes = {
        message: PropTypes.string,
      };

      constructor() {
        super();
      }

      render() {
        assert.deepEqual(
          this.props,
          { message: 'Hello' },
          'sets props on instance',
        );
        assert.equal(this.state, null, 'sets state on instance');
        assert.notEqual(this.updater, undefined, 'sets updater on instance');
        assert.deepEqual(this.refs, {}, 'sets refs on instance'); // eslint-disable-line react/no-string-refs
        assert.deepEqual(this.context, {}, 'sets context on instance');
        return null;
      }
    }

    renderToStaticMarkup(<MessageBox message="Hello" />);

    await prepare(<MessageBox message="Hello" />);
  });

  it('supports state updates inside componentWillMount', async () => {
    class MessageBox extends React.Component {
      constructor() {
        super();
        this.state = {
          message: 'Hello',
        };
      }

      // eslint-disable-next-line react/no-deprecated
      componentWillMount() {
        this.setState({ message: 'Updated message' });
      }

      render() {
        assert.deepEqual(
          this.state,
          { message: 'Updated message' },
          'updates state on instance',
        );
        return null;
      }
    }

    renderToStaticMarkup(<MessageBox />);

    await prepare(<MessageBox />);
  });

  it('supports state updates inside UNSAFE_componentWillMount', async () => {
    class MessageBox extends React.Component {
      constructor(props) {
        super(props);
        this.state = {
          message: 'Hello',
        };
      }

      UNSAFE_componentWillMount() {
        this.setState({ message: 'Updated message' });
      }

      render() {
        assert.deepEqual(
          this.state,
          { message: 'Updated message' },
          'updates state on instance',
        );
        return null;
      }
    }

    renderToStaticMarkup(<MessageBox />);

    await prepare(<MessageBox />);
  });

  it('Should throw exception', async () => {
    const doAsyncSideEffect = sinon.spy(async () => {
      throw new Error('Err');
    });
    const prepareUsingProps = async ({ text }) => {
      await doAsyncSideEffect(text);
    };
    const App = withPreparedEffect(
      'appEffect',
      prepareUsingProps,
    )(({ text }) => <div>{text}</div>);
    try {
      await prepare(
        <App text="foo">
          <App text="foo" />
          <App text="foo" />
          <App text="foo" />
          <App text="foo" />
        </App>,
      );
    } catch (err) {
      assert.equal(err.message, 'Err', 'Should throw the correct error');
      assert(doAsyncSideEffect.calledOnce, 'Should be called one time');
      return;
    }
    assert.fail('It should throw');
  });

  it("Should be possible to don't throw exception", async () => {
    const doAsyncSideEffect = sinon.spy(async () => {
      throw new Error('Errooor');
    });

    const prepareUsingProps = async ({ text }) => {
      await doAsyncSideEffect(text);
    };

    const App = withPreparedEffect(
      'appEffect',
      prepareUsingProps,
    )(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));
    await prepare(
      <App text="foo">
        <App text="foo" />
        <App text="foo" />
      </App>,
      { errorHandler: (e) => e },
    );
    assert(doAsyncSideEffect.calledThrice, 'Should be called 3 times');
  });

  it('Should throw exception using withPreparedEffect', async () => {
    const doAsyncSideEffect = sinon.spy(async () => {
      throw new Error('Err');
    });
    const prepareUsingProps = async ({ text }) => {
      await doAsyncSideEffect(text);
    };
    const App = withPreparedEffect(
      'effect',
      prepareUsingProps,
    )(({ text }) => <div>{text}</div>);
    try {
      await prepare(
        <App text="foo">
          <App text="foo" />
          <App text="foo" />
          <App text="foo" />
          <App text="foo" />
        </App>,
      );
    } catch (err) {
      assert.equal(err.message, 'Err', 'Should throw the correct error');
      assert(doAsyncSideEffect.calledOnce, 'Should be called one time');
      return;
    }
    assert.fail('It should throw');
  });

  it("Should be possible to don't throw exception using withPreparedEffect", async () => {
    const doAsyncSideEffect = sinon.spy(async () => {
      throw new Error('Errooor');
    });

    const prepareUsingProps = async ({ text }) => {
      await doAsyncSideEffect(text);
    };

    const App = withPreparedEffect(
      'effect',
      prepareUsingProps,
    )(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));
    await prepare(
      <App text="foo">
        <App text="foo" />
        <App text="foo" />
      </App>,
      { errorHandler: (e) => e },
    );
    assert(doAsyncSideEffect.calledThrice, 'Should be called 3 times');
  });

  it('Should handle data deps properly in correct order', async () => {
    const execOrder = [];

    const innerFunc = () => execOrder.push('inner');
    const outerFunc = () => execOrder.push('outer');

    const outerPrepare = async () =>
      new Promise((resolve) => setTimeout(() => outerFunc() && resolve(), 0));
    const innerPrepare = async () =>
      new Promise((resolve) => innerFunc() && resolve());

    const Outer = withPreparedEffect('outerEffect', outerPrepare, () => [], {
      runSync: false,
    })(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));
    const Inner = withPreparedEffect(
      'innerEffect',
      innerPrepare,
    )(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));
    await prepare(
      <Outer text="foo">
        <Inner text="foo">
          <Inner text="foo" />
          <Inner text="foo" />
        </Inner>
      </Outer>,
    );
    assert.deepEqual(
      execOrder,
      ['inner', 'inner', 'inner', 'outer'],
      'outer should be resolved last',
    );
  });

  it("Should be possible to don't throw exception", async () => {
    const doAsyncSideEffect = sinon.spy(async () => {
      throw new Error('Errooor');
    });

    const prepareUsingProps = async ({ text }) => {
      await doAsyncSideEffect(text);
    };
    const options = { errorHandler: (e) => e };

    const App = withPreparedEffect(
      'appEffect',
      prepareUsingProps,
    )(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));

    const Testing = ({ children }) => <div>Test {children} </div>;
    Testing.propTypes = { children: PropTypes.node };

    await prepare(
      <App text="foo">
        <App text="foo" />
        <Testing>
          <App text="foo" />
        </Testing>
      </App>,
      options,
    );
    assert(doAsyncSideEffect.calledThrice, 'Should be called 3 times');
  });

  it('Should support <React.Forwardref />', async () => {
    const RefSetter = React.forwardRef((props, ref) => {
      ref.current = 'hi';
      return (
        <p id="test">
          {props.children} - {ref.current}
        </p>
      );
    });
    const RefUserTester = sinon.spy((props, ref) => (
      <p id="test2">
        {props.children} - {ref.current}
      </p>
    ));
    const RefUser = React.forwardRef(RefUserTester);
    const refToSet = React.createRef();
    const refToRead = React.createRef();
    refToRead.current = 'data is correct';

    const App = () => (
      <React.Fragment>
        <RefSetter ref={refToSet}>This is a ref setter test</RefSetter>
        <RefUser ref={refToRead}>This is a ref user test</RefUser>
      </React.Fragment>
    );
    await prepare(<App />);

    assert.equal(
      refToRead.current,
      'data is correct',
      'ref value should presist',
    );
    assert.equal(refToSet.current, 'hi', 'ref value should be set');
    assert(
      RefUserTester.calledOnce,
      'Should only be called once during prepare',
    );
    assert(
      RefUserTester.calledOnce,
      'Should only be called once during prepare',
    );
    assert.deepEqual(
      RefUserTester.getCall(0).args,
      [{ children: 'This is a ref user test' }, { current: 'data is correct' }],
      'Props and ref should be correct',
    );
    const html = renderToStaticMarkup(<App />);
    assert.equal(
      html,
      '<p id="test">This is a ref setter test - hi</p><p id="test2">This is a ref user test - data is correct</p>',
      'App should render with correct html',
    );
  });

  it('Should support <React.Fragment />', async () => {
    const doAsyncSideEffect = sinon.spy(async () => {});
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const App = withPreparedEffect(
      'appEffect',
      prepareUsingProps,
    )(({ text }) => <div>{text}</div>);
    await prepare(
      <React.Fragment>
        <App text="foo" />
        <App text="foo" />
        inline
      </React.Fragment>,
    );

    assert(
      prepareUsingProps.calledTwice,
      'prepareUsingProps has been called twice',
    );
    assert(
      doAsyncSideEffect.calledTwice,
      'doAsyncSideEffect has been called twice',
    );
    const html = renderToStaticMarkup(<App text="foo" />);
    assert.equal(html, '<div>foo</div>', 'renders with correct html');
  });

  const testPrepareComponent = async (componentCreator, expectedText) => {
    const doAsyncSideEffect = sinon.spy(async () => {});
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const ComponentTester = withPreparedEffect(
      'componentEffect',
      prepareUsingProps,
    )(({ text }) => <div>{text}</div>);
    const Component = componentCreator(ComponentTester);
    await prepare(<Component />);

    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps has been called once',
    );
    assert(
      prepareUsingProps.calledWith({ text: expectedText }),
      'prepareUsingProps has been called with correct props',
    );
    assert(
      doAsyncSideEffect.calledOnce,
      'doAsyncSideEffect has been called once',
    );

    // if it doesn't render to correct html, the test is likely set up wrong
    const html = renderToStaticMarkup(<Component />);
    assert.equal(
      html,
      `<div>${expectedText}</div>`,
      'renders with correct html',
    );
  };

  it('Should support useState() hook', async () => {
    await testPrepareComponent(
      (Test) => () => {
        const [state] = useState('initial');
        return <Test text={state} />;
      },
      'initial',
    );
  });

  it('Should support useReducer() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const [state] = useReducer(
          () => {},
          'initial',
          (initArg) => initArg + 'ized',
        );
        return <Tester text={state} />;
      },
      'initialized',
    );
  });

  it('Should support useMemo() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        let a = 'initial';
        let b = 'ized';
        const value = useMemo(() => a + b, [a, b]);
        return <Tester text={value} />;
      },
      'initialized',
    );
  });

  it('Should support useCallback() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        let a = 'initial';
        let b = 'ized';
        const callback = useCallback(() => a + b, [a, b]);
        return <Tester text={callback()} />;
      },
      'initialized',
    );
  });

  it('Should support useRef() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const ref = useRef('initial');
        return <Tester text={ref.current} />;
      },
      'initial',
    );
  });

  it('Should support useDeferredValue() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const deferredValue = useDeferredValue('deferredValue');
        return <Tester text={deferredValue} />;
      },
      'deferredValue',
    );
  });

  it('Should support useTransition() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const [isPending] = useTransition();
        return <Tester text={isPending.toString()} />;
      },
      'false',
    );
  });

  it('useId() hook should fail gracefully, returning empty string', async () => {
    const Test = () => {
      const id = useId();
      assert.equal(id, '', 'returns empty string');
      return <div id={id} />;
    };

    await prepare(<Test />);
  });

  it('Should support useSyncExternalStore() hook', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const serverState = useSyncExternalStore(
          () => {},
          () => 'initial',
          () => 'server-initial',
        );
        return <Tester text={serverState} />;
      },
      'server-initial',
    );
  });

  it('Should ignore useEffect() hooks', async () => {
    const HookComponent = () => {
      useEffect(() => {
        throw Error('Should not call the useEffect hook');
      });
      return <div>test</div>;
    };
    await prepare(<HookComponent />);
  });

  it('Should ignore useInsertionEffect() hooks', async () => {
    const HookComponent = () => {
      useInsertionEffect(() => {
        throw Error('Should not call the useInsertionEffect hook');
      });
      return <div>test</div>;
    };
    await prepare(<HookComponent />);
  });

  it('Should support useContext() hook', async () => {
    const MyContext = React.createContext('initial');
    const AnotherContext = React.createContext('');

    const MyContextConsumer = (props) => {
      const data = useContext(MyContext);
      assert.equal(data, props.expectedData);
      return (
        <p>
          My:{data}
          {props.children}
        </p>
      );
    };
    MyContextConsumer.propTypes = {
      expectedData: PropTypes.string,
      children: PropTypes.node,
    };
    const AnotherContextConsumer = (props) => {
      const data = useContext(AnotherContext);
      assert.equal(data, props.expectedData);
      return <p>Another:{data}</p>;
    };
    AnotherContextConsumer.propTypes = {
      expectedData: PropTypes.string,
    };

    const App = () => (
      <>
        <MyContextConsumer expectedData="initial" />
        <MyContext.Provider value="testing">
          <MyContextConsumer expectedData="testing">
            <MyContextConsumer expectedData="testing" />
          </MyContextConsumer>
          <AnotherContextConsumer expectedData="" />
        </MyContext.Provider>
        <AnotherContext.Provider value="another">
          <MyContext.Provider value="myOther">
            <MyContextConsumer expectedData="myOther" />
            <AnotherContextConsumer expectedData="another" />
          </MyContext.Provider>
        </AnotherContext.Provider>
      </>
    );
    await prepare(<App />);

    const html = renderToStaticMarkup(<App />);
    assert.equal(
      html,
      '<p>My:initial</p><p>My:testing<p>My:testing</p></p><p>Another:</p><p>My:myOther</p><p>Another:another</p>',
      'renders with correct html',
    );
  });

  it('Should support forwardRef() component with hooks', async () => {
    // eslint-disable-next-line react/display-name
    const ForwardRefComponent = forwardRef((props, ref) => {
      const [state] = useState('initial');
      return (
        <div ref={ref}>
          {props.text} {state}
        </div>
      );
    });
    await prepare(<ForwardRefComponent text="foo" />);
  });

  it('Should support forwardRef() component with useContext hook', async () => {
    let readContext;
    const MyContext = React.createContext('initial');
    // eslint-disable-next-line react/display-name
    const ForwardRefComponent = forwardRef((props, ref) => {
      readContext = useContext(MyContext);
      return <div ref={ref} />;
    });
    await prepare(
      <MyContext.Provider value="context">
        <ForwardRefComponent text="foo" />
      </MyContext.Provider>,
    );
    expect(readContext).toBe('context');
  });

  it('Should support React.memo()', async () => {
    await testPrepareComponent(
      (Test) => () => {
        const Memoized = memo(Test);
        return <Memoized text="foo" />;
      },
      'foo',
    );
  });

  it('Should support React.memo() with a memoized function component', async () => {
    await testPrepareComponent(
      (Tester) => () => {
        const Memoized = memo(({ text }) => <Tester text={text} />);
        return <Memoized text="foo" />;
      },
      'foo',
    );
  });

  it('Should support React Contexts', async () => {
    const MyContext = React.createContext('initial');
    const Func = sinon.spy(() => null);
    const AnotherContext = React.createContext();
    const App = () => (
      <MyContext.Consumer>
        {(data) => (
          <React.Fragment>
            {data}{' '}
            <MyContext.Provider value="testing">
              <MyContext.Consumer>{Func}</MyContext.Consumer>
              <MyContext.Consumer>
                {(internal) => <React.Fragment>{internal} </React.Fragment>}
              </MyContext.Consumer>
            </MyContext.Provider>
            <MyContext.Consumer>
              {(internal) => <React.Fragment>{internal} </React.Fragment>}
            </MyContext.Consumer>
            <AnotherContext.Consumer>
              {(internal) => <React.Fragment>{internal}</React.Fragment>}
            </AnotherContext.Consumer>
            <AnotherContext.Provider value="another">
              <AnotherContext.Consumer>
                {(internal) => <React.Fragment>{internal}</React.Fragment>}
              </AnotherContext.Consumer>
            </AnotherContext.Provider>
          </React.Fragment>
        )}
      </MyContext.Consumer>
    );
    await prepare(<App />);
    assert(Func.calledOnce, 'Func has been called exactly once');
    assert.deepEqual(
      Func.getCall(0).args,
      ['testing'],
      'Func should be called with testing as arg',
    );

    const html = renderToStaticMarkup(<App />);
    assert.equal(
      html,
      'initial testing initial another',
      'renders with correct html',
    );
  });

  it('Should support lazy and Suspense', async () => {
    const LazyComponent = lazy(() =>
      Promise.resolve({ default: () => <div>Lazy</div> }),
    );
    const SuspenseComponent = () => (
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent />
      </Suspense>
    );
    await prepare(<SuspenseComponent />);
  });

  it('Should execute prepared effects inside lazy loaded components with Suspense', async () => {
    const doAsyncSideEffect = sinon.spy(async () => {});
    const EffectComponent = withPreparedEffect(
      'effect',
      doAsyncSideEffect,
    )(() => <div>Effect</div>);

    const LazyComponent = lazy(() =>
      Promise.resolve({ default: EffectComponent }),
    );
    const SuspenseComponent = () => (
      <Suspense fallback={<div>Loading...</div>}>
        <LazyComponent prop="test" />
      </Suspense>
    );
    await prepare(<SuspenseComponent />);
    assert(doAsyncSideEffect.calledOnce, 'Should execute prepared effect');
    assert(
      doAsyncSideEffect.calledWith({ prop: 'test' }),
      'Should execute with provided props',
    );
  });

  it('Shallow hierarchy (no children)', async () => {
    const doAsyncSideEffect = sinon.spy(async () => {});
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const App = withPreparedEffect(
      'appEffect',
      prepareUsingProps,
    )(({ text }) => <div>{text}</div>);
    await prepare(<App text="foo" />);
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
    const html = renderToStaticMarkup(<App text="foo" />);
    assert.equal(html, '<div>foo</div>', 'renders with correct html');
  });

  it('Deep hierarchy', async () => {
    let classNameOfFirstChild = 'FirstChild';
    let classNameOfSecondChild = 'SecondChild';
    const doAsyncSideEffectForFirstChild = sinon.spy(async () => {
      classNameOfFirstChild = 'withPreparedEffect(FirstChild)';
    });
    const prepareUsingPropsForFirstChild = sinon.spy(async ({ text }) => {
      await doAsyncSideEffectForFirstChild(text);
    });
    const doAsyncSideEffectForSecondChild = sinon.spy(async () => {
      classNameOfSecondChild = 'withPreparedEffect(SecondChild)';
    });
    const prepareUsingPropsForSecondChild = sinon.spy(async ({ text }) => {
      await doAsyncSideEffectForSecondChild(text);
    });

    const FirstChild = withPreparedEffect(
      'firstEffect',
      prepareUsingPropsForFirstChild,
    )(({ text }) => <span className={classNameOfFirstChild}>{text}</span>);
    const SecondChild = withPreparedEffect(
      'secondEffect',
      prepareUsingPropsForSecondChild,
    )(({ text }) => <span className={classNameOfSecondChild}>{text}</span>);

    const App = ({ texts }) => (
      <ul>
        <li key={0}>
          <FirstChild text={texts[0]} />
        </li>
        <li key={1}>
          <SecondChild text={texts[1]} />
        </li>
      </ul>
    );
    App.propTypes = {
      texts: PropTypes.array,
    };

    await prepare(<App texts={['first', 'second']} />);

    assert(
      prepareUsingPropsForFirstChild.calledOnce,
      'prepareUsingPropsForFirstChild has been called exactly once',
    );
    assert.deepEqual(
      prepareUsingPropsForFirstChild.getCall(0).args,
      [{ text: 'first' }],
      'prepareUsingPropsForFirstChild has been called with correct arguments',
    );
    assert(
      doAsyncSideEffectForFirstChild.calledOnce,
      'doAsyncSideEffectForFirstChild has been called exactly once',
    );
    assert.deepEqual(
      doAsyncSideEffectForFirstChild.getCall(0).args,
      ['first'],
      'doAsyncSideEffectForFirstChild has been called with correct arguments',
    );

    assert(
      prepareUsingPropsForSecondChild.calledOnce,
      'prepareUsingPropsForSecondChild has been called exactly once',
    );
    assert.deepEqual(
      prepareUsingPropsForSecondChild.getCall(0).args,
      [{ text: 'second' }],
      'prepareUsingPropsForSecondChild has been called with correct arguments',
    );
    assert(
      doAsyncSideEffectForSecondChild.calledOnce,
      'doAsyncSideEffectForSecondChild has been called exactly once',
    );
    assert.deepEqual(
      doAsyncSideEffectForSecondChild.getCall(0).args,
      ['second'],
      'doAsyncSideEffectForSecondChild has been called with correct arguments',
    );

    const html = renderToStaticMarkup(<App texts={['first', 'second']} />);
    assert.equal(
      html,
      '<ul><li><span class="withPreparedEffect(FirstChild)">first</span></li><li><span class="withPreparedEffect(SecondChild)">second</span></li></ul>',
    );
  });

  it('Awaits correct promises when preparing multiple components', async () => {
    let numAwaited = 0;

    const effect = (timeout) => async () => {
      await new Promise((resolve) => setTimeout(resolve, timeout));
      numAwaited++;
    };

    const SlowComponent = () => {
      usePreparedEffect('slowEffect', effect(1000), []);
      return <div />;
    };

    const FastComponent = () => {
      usePreparedEffect('fastEffect', effect(0), []);
      return <div />;
    };

    prepare(<SlowComponent />);
    await prepare(<FastComponent />);

    assert.equal(numAwaited, 1, 'Only fast effect has been awaited');
  });
});
