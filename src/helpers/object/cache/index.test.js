import Cache from './index';

test(`
  Should keep the reference until a change based on shallow comparison happens.
`, () => {
  const value = { foo: { bar: 'zaz' } };
  const cache = new Cache(value);
  const copy = { foo: { bar: 'zaz' } };

  expect(cache.update(copy)).toBe(value);
});

test(`
  Should change the reference when change based on shallow comparison happens.
`, () => {
  const current = { foo: { bar: 'zaz' } };
  const cache = new Cache(current);
  const next = { zaz: { bar: 'foo' } };

  expect(cache.update(next)).toBe(next);
});
