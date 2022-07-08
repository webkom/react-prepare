# Changelog

## Version 1.0.0

### BREAKING CHANGES
* `opts.awaitOnSsr` is now `false` by default
* `opts.componentDidMount` is no longer supported (replaced by `opts.runOnClient`)
* `opts.componentWillReceiveProps` is no longer supported (replaced by `opts.runOnClient` and `opts.deps`)
* on the client-side, `prepared` and `dispatched` now run side effects in a `useEffect` hook, instead of `componentDidMount`/`componentWillReceiveProps`.
