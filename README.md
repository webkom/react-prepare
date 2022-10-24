# react-prepare

`react-prepare` is a package that allows you to easily await asynchronous data requirements defined in your React components before server-side rendering.

The typical use-case is when a deeply-nested component needs to have a resource fetched from a remote HTTP server, such as GraphQL or REST API. Since `renderToString` is synchronous, when you call it on your app, this component won't render correctly.

One solution is to have a central router at the root of your application that knows exactly what data needs to be fetched before rendering. But this solution doesn't fit the component-based architecture of a typical React app. You want to declare data dependencies at the component level.

This is exactly what `react-prepare` does: it allows you to declare asynchronous dependencies at the component level, and make them work fine with server-side rendering as well as client-side rendering.

## Example with `react-redux`

Let's assume you have defined an async action creator `fetchTodoItems(userName)` which performs HTTP request to your server to retrieve the todo items for a given user and stores the result in your redux state.

Your `TodoList` component definition would look like this:

```js
import { usePreparedEffect } from 'react-prepare';
import { useDispatch, useSelector } from 'react-redux';
import { compose } from 'redux';

import { fetchTodoItems } from './actions';

const TodoList = ({ userName }) => {
  const dispatch = useDispatch();
  const items = useSelector(({ todoItems }) => todoItems);

  usePreparedEffect(
    'fetchTodoItems',
    () => {
      dispatch(fetchTodoItems(userName));
    },
    [userName],
  );

  return (
    <ul>
      {items.map((item, key) => (
        <li key={key}>{item}</li>
      ))}
    </ul>
  );
};

export default TodoList;
```

And your server-side rendering code would look like this:

```js
import { renderToString } from 'react-dom/server';
import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { Provider } from 'react-redux';
import prepare from 'react-prepare';

import reducer from './reducer';

async function serverSideRender(userName) {
  const store = createStore(reducer, applyMiddleware(thunkMiddleware));
  const app = (
    <Provider store={store}>
      <TodoList userName={userName} />
    </Provider>
  );
  await prepare(app);
  return {
    html: renderToString(app),
    state: store.getState(),
  };
}
```

Your client should re-use the data fetched during server-side rendering directly, eg. assuming your injected it in `window.__APP_STATE__`:

```js
const store = createStore(reducer, JSON.parse(window.__APP_STATE__));
render(
  <Provider store={store}>
    <TodoList userName={userName} />
  </Provider>,
  document.getElementById('app'),
);
```

## API

### `usePreparedEffect(identifier: string, sideEffect: async () => Promise<void>, deps, opts)`

Works like `useEffect` except that effects will be run on the server instead of the client the first time, when server-side rendering in enabled.

#### identifier

A string that uniquely identifies the effect. It is used to keep track of what effects have been run on the server.

#### sideEffect

An async function that performs the side effect. It should return a promise that will be awaited before server-side rendering.

#### deps

An array of dependencies. If any of the dependencies change, the effect will be run again. Just like `useEffect` it uses shallow, strict equality (===).

Like a normal `useEffect`, the effect will rerun on every render if nothing is passed to `deps`.

#### opts

An optional configuration object that can contain the following properties:

- `opts.runSync` (default: `false`):
  - `true`: When running `prepare`, the `sideEffect`-promise will be awaited before traversing further down the tree. (because of limitations in the current implementation, effects in the same component will be run in parallel)
  - `false`: When running `prepare` the promise will be awaited in parallell with all other prepared effects after the tree has been traversed.
- `opts.serverOnly` (default `false`):
  - When `true` the effect will only ever be run on the server. Any provided deps-array will be ignored, and the effect will not be run if the application is not server-side rendered.

### `withPreparedEffect(identifier: string, sideEffect: async (props) => Promise<void>, depsFn: (props) => [], opts)(Component)`

Higher order component wrapper for `usePreparedEffect`, provided for compatibility with class components. Wraps `Component` with a component that contains a `usePreparedEffect` hook that calls `sideEffect` with the component's props.

#### identifier

A string that uniquely identifies the effect. It is used to keep track of what effects have been run on the server.

#### sideEffect

An async function that performs the side effect. It should return a promise that will be awaited before server-side rendering.

#### depsFn

A function that takes the component's props and returns an array of dependencies. If any of the dependencies change, the effect will be run again. Just like `useEffect` it uses shallow, strict equality (===).

If no `depsFn` is provided, an empty dependency-array will be used, and the sideEffect will never re-run (as opposed to `usePreparedEffect`, which would run sideEffect on every render).

#### opts

Available `opts` are the same as in `usePreparedEffect`.

### `prepared(sideEffect: async(props, context), opts)(Component)`

Decorates `Component` so that when `prepare` is called, `sideEffect` is called (and awaited) before continuing the rendering traversal.

Available `opts` is an optional configuration object:

- `opts.pure` (default: `true`): the decorated component extends `PureComponent` instead of `Component`.
- `opts.componentDidMount` (default: `true`): on the client, `sideEffect` is called when the component is mounted.
- `opts.componentWillReceiveProps` (default: `true`): on the client, `sideEffect` is called again whenever the component receive props.
- `opts.awaitOnSsr` (default: `true`): on the server, should `prepare` await `sideEffect` before traversing further down the tree. When `false` the promise will be awaited before `prepare` returns.

### `async prepare(Element, ?opts) => string`

Recursively traverses the element rendering tree, collecting all promises from `usePreparedEffect`, `withPreparedEffect`, `prepared` and awaits them as defined (either after traversing the tree, or before traversing further with `awaitOnSsr` or `runSync`).
It should be used (and `await`-ed) _before_ calling `renderToString` on the server. If any of the side effects throws, and an `errorHandler` has not been provided, `prepare` will also throw.

The return value is a string containing js-code to set a key on the `window` object, that will be used in the client-side rendering to avoid re-running any side effects.

Available `opts` is an optional configuration object:

- `opts.errorHandler` (default: `e => {throw e}`): Custom error handler used by each `sideEffect`. If a `sideEffect` throws, this is used as an error handler. If
  the error handler then throws, the `prepare`.

### Notes

`react-prepare` tries hard to avoid object keys conflicts, but since React isn't very friendly with `Symbol`, it uses a special key for its internal use.
The single polluted key in the components key namespace is `@__REACT_PREPARE__@`, which shouldn't be an issue.
This key is also used in the `window` object to store what side-effects are prepared.
