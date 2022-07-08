# react-prepare

`react-prepare` allows you to have you deeply nested components with asynchronous dependencies, and have everything just work with server-side rendering.

The typical use-case is when a deeply-nested component needs to have a resource fetched from a remote HTTP server, such as GraphQL or REST API. Since `renderToString` is synchronous, when you call it on your app, none of your data will be loaded.

One solution is to have a central router at the root of your application that knows exactly what data needs to be fetched before rendering. But this solution doesn't fit the component-based architecture of a typical React app. You want to declare data dependencies at the component level, much like your declare your props.

This is exactly what `react-prepare` does: it allows you to declare asynchronous dependencies at the component level, and make them work fine with server-side rendering as well as client-side rendering.

`react-prepare` is agnostic and can be used vanilla, but it comes with a tiny helper that makes it extremely easy to use along `redux` and `react-redux` (see examples below).

### Example with `react-redux`

Let's assume you have defined an async action creator `fetchTodoItems(userName)` which performs HTTP request to your server to retrieve the todo items for a given user and stores the result in your redux state.

Your `TodoList` component definition would look like this:

```jsx
import { usePrepareDispatch } from 'react-prepare';
import { useSelector } from 'react-redux';

import { fetchTodoItems } from './actions';

const TodoList = ({ userName }) => {
  usePrepareDispatch(fetchTodoItems(userName), [userName]);
  const items = useSelector(({ todoItems }) => todoItems);
  
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

Your client could re-use the data fetched during server-side rendering directly, eg. assuming your injected it in `window.__APP_STATE__`:

```js
const store = createStore(reducer, JSON.parse(window.__APP_STATE__));
render(
  <Provider store={store}>
    <TodoList userName={userName} />
  </Provider>,
  document.getElementById('app'),
);
```

**For a complete example of a fully-functional app using `react-prepare` in conjunction with `redux`, see the [react-prepare-todo](https://github.com/elierotenberg/react-prepare-todo) repository.**

## API

### Hooks

#### `usePrepareDispatch(action: Action, deps: DependencyList, opts): void`

Helper to use `usePrepare` more simply if your side effect consists of dispatching a redux action.

Instead of manually getting `dispatch` with `useDispatch`, `usePrepareDispatch` will do it for you. This way you can easily dispatch actions like fetching data from the API, on both client and SSR with one simple hook. The action will be re-dispatched on the client if any of the dependencies change.

```js
const TodoItems = ({ userName }) => {
  usePrepareDispatch(fetchTodoItems(userName), [userName]);
  { ... }
}
```

The component will have the following behavior:

- when server-side rendered using `prepare`, `action` will be dispatched and awaited before components are rendered; If an error is thrown, the `errorHandler` provided to `prepare` will handle it.
- when client-side rendered, `action` will be dispatched after the initial render in a `useEffect` hook. `deps` is passed directly on to the `useEffect` and thus `action` will be re-dispatched whenever a dependency changes.

`opts` is an optional configuration object passed directly to the underlying `usePrepare` hook (see below).

#### `usePrepare(effect: () => Promise<void>, deps: DependencyList, opts): void`

Registers a side effect such that when `prepare` is called, `sideEffect` is awaited as part of the resulting `Promise`. The `sideEffect` will be re-executed client-side whenever any of the dependencies change.

Available `opts` is an optional configuration object:

- `opts.runOnClient` (default: `true`): on the client, `sideEffect` is called in a `useEffect` that is supplied with the given dependency array.
- `opts.awaitOnSsr` (default: `false`): on the server, should `prepare` await `sideEffect` before traversing further down the tree. When `false` the promise will be awaited before `prepare` returns. This is useful if the side effect loads state that is needed in a different side effect further down the component tree.

### SSR

#### `prepare(Element, opts): Promise`

Recursively traverses the element rendering tree and awaits any side effects registered with `usePrepare` (or `usePrepareDispatch`).
It should be used (and `await`-ed) _before_ calling `renderToString` on the server. If any of the side effects throws, `prepare` will throw unless `opts.errorHandler` is supplied.

`opts` is an optional configuration object.

Available `opts` is an optional configuration object:

- `opts.errorHandler` (default: `e => {throw e}`): Custom error handler used by each `sideEffect`. If a `sideEffect` throws, this is used as an error handler. If
  the error handler then throws, `prepare` throws.

### Higher order components
`react-prepare` provides two higher order components, `prepared` and `dispatched` that will wrap your component such that your side effect is registered with a `usePrepare` hook.
This will help with the transition from version 0.x to 1.x, as the API is very similar (some `opts` are no longer supported).

#### `dispatched(sideEffect: async(props, dispatch), opts)(Component)`

Helper to use `prepared` more simply if your side effects consists mostly of dispatching redux actions.

In the body of the `sideEffect` function, you can use the `dispatch` function to dispatch redux actions, typically
requesting data from an asynchronous source (API server, etc.).
For example, let's assume you have defined an async action creator `fetchTodoItems(userName)` that fetches the todo-items from a REST API,
and that you are defining a component with a `userName` prop. To decorate your component, your code would look like:

```js
class TodoItems extends React.PureComponent { ... }

const DispatchedTodoItems = dispatched(
  ({ userName }, dispatch) => dispatch(fetchTodoItems(userName))
)(TodoItems);
```

The decorated component will behave exactly like a component using `usePrepareDispatch`

NB: The behaviour is changed slightly compared with version 0.x

`opts` is passed to the underlying `usePrepareDispatch`. Note that `awaitOnSsr` is enabled by default for backwards-compatibility reasons.

#### `prepared(sideEffect: async(props, context), opts)(Component)`

Wraps `Component` so that `sideEffect` is registered using the `usePrepare` hook. Note that `opts.awaitOnSsr` is enabled by default for backwards-compatibility reasons.

Available `opts` is an optional configuration object:

- `opts.runOnClient` (default: `true`): on the client, `sideEffect` is called in a `useEffect` that is supplied with the given dependency array.
- `opts.awaitOnSsr` (default: `true`): on the server, should `prepare` await `sideEffect` before traversing further down the tree. When `false` the promise will be awaited before `prepare` returns.

### Notes

`react-prepare` tries hard to avoid object keys conflicts, but since React isn't very friendly with `Symbol`, it uses a special key for its internal use.
The single polluted key in the components key namespace is `@__REACT_PREPARE__@`, which shouldn't be an issue.
