const { describe, it } = global;
import assert from 'assert/strict';

import isThenable from '../utils/isThenable';

describe('isThenable(p)', () => {
  it('recognizes a native Promise as thenable', () => {
    assert(isThenable(Promise.resolve()));
  });

  it('recognizes null as non-thenable', () => {
    assert(!isThenable(null));
  });

  it('recognizes void 0 as non-thenable', () => {
    assert(!isThenable(void 0));
  });

  it('recognizes function as non-thenable', () => {
    function nonThenable() {
      // intentionally empty
    }
    assert(!isThenable(nonThenable));
  });

  it('recognizes arrow as non-thenable', () => {
    assert(!isThenable(() => {}));
  });

  it('recognizes custom thenable as thenable', () => {
    const thenable = {
      then: () => Promise.resolve(),
    };
    assert(isThenable(thenable));
  });
});
