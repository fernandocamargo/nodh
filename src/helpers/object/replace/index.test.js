import replace from './index';

const create = () => ({
  a: () => 'a',
  b: () => 'b',
  c: () => 'c',
  d: () => 'd',
  e: {
    f: () => 'f',
    g: () => 'g',
    h: () => 'h',
    i: {
      j: () => 'j',
      l: () => 'l',
      m: {
        n: () => 'n',
        o: {
          p: {
            q: () => 'q',
            r: [
              () => 's',
              {
                t: {
                  u: () => 'u',
                },
              },
              () => 'v',
              {
                x: {
                  z: () => 'z',
                },
              },
            ],
          },
        },
      },
    },
  },
});

const replacement = (path, handler) => jest.fn(handler);

test(`
  Should recursively override the properties/positions of objects/arrays
  by the output of the function provided as replacement.
`, () => {
  const tree = create();
  const output = replace(tree).with(replacement);
  const expected = [
    output.a,
    output.b,
    output.c,
    output.d,
    output.e.f,
    output.e.g,
    output.e.h,
    output.e.i.j,
    output.e.i.l,
    output.e.i.m.n,
    output.e.i.m.o.p.q,
    output.e.i.m.o.p.r[0],
    output.e.i.m.o.p.r[1].t.u,
    output.e.i.m.o.p.r[2],
    output.e.i.m.o.p.r[3].x.z,
  ];

  expect(expected.length).toBe(expected.filter(jest.isMockFunction).length);
});

test(`
  Should recursively override the properties/positions of objects/arrays
  by the output of the function provided as replacement.
`, () => {
  const tree = [() => 1, () => 2, () => 3, () => 4, () => 5];
  const output = replace(tree).with(replacement);
  const expected = [output[0], output[1], output[2], output[3], output[4]];

  expect(expected.length).toBe(expected.filter(jest.isMockFunction).length);
});

test(`
  Should recursively override the properties/positions of objects/arrays
  by the output of the function provided as replacement.
`, () => {
  const tree = [1, 2, 3];
  const output = replace(tree).with(replacement);
  const expected = [output[0], output[1], output[2]];

  expect(expected.length).toBe(expected.filter(jest.isMockFunction).length);
});

test("Should return the object when isn't iterable.", () => {
  const tree = new Date();
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = '123';
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = 123;
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = {};
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = undefined;
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = null;
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = undefined;
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = [];
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = false;
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object when isn't iterable.", () => {
  const tree = new Map();
  const output = replace(tree).with(replacement);

  expect(output).toBe(tree);
});

test("Should return the object/array when replacement isn't an function.", () => {
  const tree = create();
  const output = replace(tree).with();

  expect(output).toStrictEqual(tree);
});
