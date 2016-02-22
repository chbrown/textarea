import assert from 'assert';
import {describe, it} from 'mocha';

import {measureLeadingWhitespace, dedent} from '..';

describe('string indentation manipulation', () => {

  const text = [
    '  for (var i = 0; i < list.length; i++) {',
    '    let item = list[i];',
    '',
    '  }',
  ].join('\n');

  it('should find the 2 spaces of leading whitespace', () => {
    const spaces = measureLeadingWhitespace(text);
    assert.equal(spaces, 2);
  });

  it('should remove the leading space', () => {
    const expected = [
      'for (var i = 0; i < list.length; i++) {',
      '  let item = list[i];',
      '',
      '}',
    ].join('\n');
    const actual = dedent(text);
    assert.equal(actual, expected);
  });

});
