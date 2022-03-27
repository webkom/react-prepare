function isThenable<T>(p: unknown): p is Promise<T> {
  return (
    !!p &&
    typeof p === 'object' &&
    'then' in p &&
    typeof (p as { then: unknown }).then === 'function'
  );
}

export default isThenable;
