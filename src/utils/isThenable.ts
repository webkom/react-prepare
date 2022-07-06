// The typing here is not 100% accurate, as there are no guarantees that the
// "then" and "catch" methods have the same signature as a native promise.
// However, it is good enough for any usage in this package.
const isThenable = (p: unknown): p is Promise<unknown> =>
  !!p &&
  typeof p === 'object' &&
  typeof (p as Partial<Promise<unknown>>).then === 'function' &&
  typeof (p as Partial<Promise<unknown>>).catch === 'function';

export default isThenable;
