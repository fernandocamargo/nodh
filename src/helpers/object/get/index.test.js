import get from './index';

const create = () =>
  new Map().set(
    'a',
    new Map().set(
      'b',
      new Map().set(
        'c',
        new Map().set(
          'd',
          new Map().set('e', { f: new Map().set('g', { h: 'ijl' }) })
        )
      )
    )
  );

test('Should return the value at path of object.', () => {
  const object = create();
  const path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const output = get(object, path);
  const expected = 'ijl';

  expect(output).toBe(expected);
});

test('Should return the value at path of object.', () => {
  const object = create();
  const path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 1];
  const output = get(object, path);
  const expected = 'j';

  expect(output).toBe(expected);
});

test(`
  Should return the value at path of object. If the resolved
  value is undefined, the defaultValue is returned in its place.
`, () => {
  const object = create();
  const path = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'l'];
  const defaultValue = 123;
  const output = get(object, path, defaultValue);

  expect(output).toBe(defaultValue);
});

test("Should return the object when path isn't an array.", () => {
  const object = create();
  const output = get(object);

  expect(output).toStrictEqual(object);
});
