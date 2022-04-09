const { describe, it } = global;
import assert from 'assert/strict';
import sinon from 'sinon';
import React, {
  memo,
  MutableRefObject,
  PropsWithChildren,
  useContext,
  useEffect,
  useState,
} from 'react';
import PropTypes from 'prop-types';
import { renderToStaticMarkup } from 'react-dom/server';
import prepared from '../prepared';
import prepare from '../prepare';

describe('prepare', () => {
  it('sets instance properties', async () => {
    class MessageBox extends React.Component<{ message: string }> {
      updater = undefined;

      constructor(props: { message: string }) {
        super(props);
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
        super({});
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
      constructor() {
        super({});
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
    const doAsyncSideEffect = sinon.spy(async (text: string) => {
      throw new Error('Err ' + text);
    });
    const prepareUsingProps = async ({ text }: { text: string }) => {
      await doAsyncSideEffect(text);
    };
    const App = prepared(prepareUsingProps)(({ text }) => <div>{text}</div>);
    await assert.rejects(
      async () => {
        await prepare(
          <App text="foo">
            <App text="foo" />
            <App text="foo" />
            <App text="foo" />
            <App text="foo" />
          </App>,
        );
      },
      { message: 'Err foo' },
    );
    assert(doAsyncSideEffect.calledOnce, 'Should be called once times');
  });

  it("Should be possible to don't throw exception", async () => {
    const doAsyncSideEffect = sinon.spy(async (text: string) => {
      throw new Error('Errooor ' + text);
    });

    const prepareUsingProps = async ({ text }: { text: string }) => {
      await doAsyncSideEffect(text);
    };

    const App = prepared(prepareUsingProps)(({ text, children }) => (
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

  it("Should be possible to don't throw exception", async () => {
    const doAsyncSideEffect = sinon.spy(async (text: string) => {
      throw new Error('Errooor ' + text);
    });

    const prepareUsingProps = async ({ text }: { text: string }) => {
      await doAsyncSideEffect(text);
    };

    const App = prepared(prepareUsingProps)(({ text, children }) => (
      <div>
        {text} <div>{children ? children : null}</div>
      </div>
    ));

    const Testing = ({ children }: PropsWithChildren<unknown>) => (
      <div>Test {children} </div>
    );

    await prepare(
      <App text="foo">
        <App text="foo" />
        <Testing>
          <App text="foo" />
        </Testing>
      </App>,
      { errorHandler: (e) => e },
    );
    assert(doAsyncSideEffect.calledThrice, 'Should be called 3 times');
  });

  it('Should handle data deps properly in correct order', async () => {
    const execOrder: string[] = [];

    const innerFunc = () => execOrder.push('inner');
    const outerFunc = () => execOrder.push('outer');

    const outerPrepare = async () =>
      new Promise<void>((resolve) =>
        setTimeout(() => outerFunc() && resolve(), 0),
      );

    const innerPrepare = async () =>
      new Promise<void>((resolve) => innerFunc() && resolve());

    interface IProps {
      text: string;
    }

    const Outer = prepared<IProps>(outerPrepare, { awaitOnSsr: false })(
      ({ text, children }) => (
        <div>
          {text} <div>{children ? children : null}</div>
        </div>
      ),
    );
    const Inner = prepared<IProps>(innerPrepare)(({ text, children }) => (
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

  it('Should support <React.Forwardref />', async () => {
    // eslint-disable-next-line react/display-name
    const RefSetter = React.forwardRef<string, PropsWithChildren<unknown>>(
      (props, ref) => {
        (ref as MutableRefObject<string>).current = 'hi';
        return (
          <p id="test">
            {props.children} - {(ref as MutableRefObject<string>).current}
          </p>
        );
      },
    );
    const RefUserTester = sinon.spy((props, ref) => (
      <p id="test2">
        {props.children} - {ref.current}
      </p>
    ));
    const RefUser = React.forwardRef(RefUserTester);
    const refToSet = React.createRef<string>();
    const refToRead = React.createRef();
    (refToRead as MutableRefObject<string>).current = 'data is correct';

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
    const doAsyncSideEffect = sinon.spy(async (text) => text);
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const App = prepared(prepareUsingProps)(({ text }) => <div>{text}</div>);
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

  it('Should support React Contexts', async () => {
    const MyContext = React.createContext('initial');
    const Func = sinon.spy(() => null);
    const AnotherContext = React.createContext<string>('');
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

  it('Should support useContext()', async () => {
    const MyContext = React.createContext('initial');
    const AnotherContext = React.createContext<string>('');

    const MyContextConsumer = (
      props: PropsWithChildren<{ expectedData: string }>,
    ) => {
      const data = useContext(MyContext);
      assert.equal(data, props.expectedData);
      return (
        <p>
          My:{data}
          {props.children}
        </p>
      );
    };
    const AnotherContextConsumer = (props: { expectedData: string }) => {
      const data = useContext(AnotherContext);
      assert.equal(data, props.expectedData);
      return <p>Another:{data}</p>;
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

  it('Should support React.memo()', async () => {
    // eslint-disable-next-line react/display-name
    const Memoized = memo(({ text }: { text: string }) => <div>{text}</div>);
    console.log(<Memoized text="test" />);

    const App = () => <Memoized text="test" />;
    await prepare(<App />);

    const html = renderToStaticMarkup(<App />);
    assert.equal(html, '<div>test</div>', 'renders with correct html');
  });

  it('Shallow hierarchy (no children)', async () => {
    const doAsyncSideEffect = sinon.spy(async (text) => text);
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const App = prepared(prepareUsingProps)(({ text }) => <div>{text}</div>);
    await prepare(<App text="foo" />);
    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps has been called exactly once',
    );
    assert.deepEqual(
      prepareUsingProps.getCall(0).args,
      [{ text: 'foo' }, {}],
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
    const doAsyncSideEffectForFirstChild = sinon.spy(async (text) => {
      classNameOfFirstChild = 'prepared(FirstChild)';
      return text;
    });
    const prepareUsingPropsForFirstChild = sinon.spy(async ({ text }) => {
      await doAsyncSideEffectForFirstChild(text);
    });
    const doAsyncSideEffectForSecondChild = sinon.spy(async (text) => {
      classNameOfSecondChild = 'prepared(SecondChild)';
      return text;
    });
    const prepareUsingPropsForSecondChild = sinon.spy(async ({ text }) => {
      await doAsyncSideEffectForSecondChild(text);
    });

    const FirstChild = prepared(prepareUsingPropsForFirstChild)(({ text }) => (
      <span className={classNameOfFirstChild}>{text}</span>
    ));
    const SecondChild = prepared(prepareUsingPropsForSecondChild)(
      ({ text }) => <span className={classNameOfSecondChild}>{text}</span>,
    );

    const App = ({ texts }: { texts: string[] }) => (
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
      [{ text: 'first' }, {}],
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
      [{ text: 'second' }, {}],
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
      '<ul><li><span class="prepared(FirstChild)">first</span></li><li><span class="prepared(SecondChild)">second</span></li></ul>',
    );
  });

  it('Should render components that contain hooks (ignoring useEffects)', async () => {
    const doAsyncSideEffect = sinon.spy(async (text) => text);
    const prepareUsingProps = sinon.spy(async ({ text }) => {
      await doAsyncSideEffect(text);
    });
    const App = prepared(prepareUsingProps)(({ text }) => {
      const [state, setState] = useState('initial');

      useEffect(() => {
        setState('updated');
      }, []);

      return (
        <div>
          {text} {state}
        </div>
      );
    });

    await prepare(<App text="foo" />);

    assert(
      prepareUsingProps.calledOnce,
      'prepareUsingProps has been called once',
    );
    assert(
      doAsyncSideEffect.calledOnce,
      'doAsyncSideEffect has been called once',
    );
    const html = renderToStaticMarkup(<App text="foo" />);
    assert.equal(html, '<div>foo initial</div>', 'renders with correct html');
  });
});
