import stringify from './index';

test('Should cast an array of params into string.', () => {
  const params = [
    1,
    'lol',
    null,
    undefined,
    new Date('1995-12-17T03:24:00'),
    { foo: { bar: { zaz: 'lol' } } },
    true,
    false,
    Symbol.for('lolWUT'),
    Symbol,
    () => {
      const a = 1;
      const b = a * 2;
      const c = b / 10;

      return c;
    },
    function LOL() {},
    class ROFL {},
    Number.MAX_SAFE_INTEGER,
    new Map().set('foo', new Map().set('bar', new Map().set('hueBR', 'lol'))),
    new WeakMap(),
    new Set([1, 2, 3]),
    new WeakSet(),
    new ArrayBuffer(2),
    new Buffer(2),
    document.body,
    new Error('LOL'),
    Error,
    Infinity,
    -Infinity,
    NaN,
    /abc/,
    new Uint8Array(),
  ];
  const output = stringify(params);

  // Check for important parts without timezone-specific strings
  expect(output).toContain('1, "lol", null, undefined, Date(Sun Dec 17 1995 03:24:00');
  expect(output).toContain('{ "foo": { "bar": { "zaz": "lol" } } }');
  expect(output).toContain('Symbol(lolWUT)');
  expect(output).toContain('Function(LOL)');
  expect(output).toContain('9007199254740991');
  expect(output).toContain('Error: LOL');
  expect(output).toContain('Infinity, -Infinity, NaN');
  expect(output).toContain('RegExp(/abc/)');
});

test('Should return an empty string when the params is an empty array.', () => {
  const params = [];
  const output = stringify(params);

  expect(output).toBe('');
});

test("Should return an empty string when the params isn't an array.", () => {
  const output = stringify();

  expect(output).toBe('');
});
