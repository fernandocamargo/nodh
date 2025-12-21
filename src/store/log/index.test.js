import { Store } from 'pullstate';

import store from './index';

test('Should be a instance of pullstate store', () => {
  expect(store instanceof Store).toBe(true);
});

test(`
  Should have "namespaces", "actions" and "threads" maps into its initial state
`, () => {
  expect(store.initialState).toStrictEqual({
    namespaces: new Map(),
    actions: new Map(),
    threads: new Map(),
  });
});
