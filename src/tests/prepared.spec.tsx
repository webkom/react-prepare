const { describe, it, beforeEach } = global;
import sinon, { SinonSpy } from 'sinon';
import assert from 'assert/strict';
import React, { Component, ComponentType, PureComponent } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import prepared, {
  isPrepared,
  getPrepare,
  PreparedComponentType,
} from '../prepared';

describe('prepared', () => {
  interface IProps {
    text: string;
  }

  class OriginalCompositeComponent extends Component<IProps> {
    render() {
      return <div>{this.props.text}</div>;
    }
  }

  class OriginalCompositePureComponent extends PureComponent<IProps> {
    render() {
      return <div>{this.props.text}</div>;
    }
  }

  const OriginalArrowComponent = ({ text }: IProps) => <div>{text}</div>;

  let doAsyncSideEffect: SinonSpy<[string], Promise<string>>;
  let prepareUsingProps: SinonSpy<[IProps], Promise<void>>;

  beforeEach(() => {
    doAsyncSideEffect = sinon.spy(async (text: string) => text);
    prepareUsingProps = sinon.spy(async ({ text }: IProps) => {
      await doAsyncSideEffect(text);
    });
  });

  const testComponent = async (
    OriginalComponent: ComponentType<IProps>,
    PreparedComponent: PreparedComponentType<IProps>,
  ) => {
    assert(!isPrepared(OriginalComponent), 'OriginalComponent is not prepared');
    assert(isPrepared(PreparedComponent), 'PreparedComponent is prepared');
    const prepare = getPrepare(PreparedComponent);
    assert.equal(
      typeof prepare,
      'function',
      'getPrepare(PreparedComponent) is a function',
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

  const testGetPrepareError = <P,>(UnpreparedComponent: ComponentType<P>) => {
    assert(
      !isPrepared(UnpreparedComponent),
      'Original component is not prepared',
    );
    assert.throws(
      () => {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        getPrepare(UnpreparedComponent);
      },
      {
        name: 'TypeError',
        message: 'getPrepare() was called with a non-prepared component',
      },
      'getPrepare throws error when run with a non-prepared composite component',
    );
  };

  it('throws if getPrepare is called with a non-prepared component', async () => {
    testGetPrepareError(OriginalCompositeComponent);
    testGetPrepareError(OriginalCompositePureComponent);
    testGetPrepareError(OriginalArrowComponent);
  });
});
