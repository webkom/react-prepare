function isThenable(p: unknown): boolean {
  return (
    !!p &&
    typeof p === 'object' &&
    'then' in p &&
    typeof (p as { then: unknown }).then === 'function'
  );
}

export default isThenable;
