import unfold from './index';

test(`
  Should convert the provided path into an object representing
  immutability-helper syntactic sugar to set the value on the
  most nested property.
`, () => {
  const path = ['a', 'b', 'c', 'd', 'e'];
  const value = 123;
  const output = unfold(path, value);
  const expected = {
    a: { b: { c: { d: { e: { $set: value } } } } },
  };

  expect(output).toStrictEqual(expected);
});

test("Should return false when path isn't an array.", () => {
  const path = 'a.b.c.d.e';
  const value = 123;
  const output = unfold(path, value);

  expect(output).toBe(false);
});
