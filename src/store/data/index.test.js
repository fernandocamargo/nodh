import getStore from './index';

test('', () => {
  const [store] = getStore({ signature: 'test' });

  expect(store.getState()).toStrictEqual({
    _persist: { version: -1, rehydrated: false },
    persisted: {},
    session: {},
    volatile: {},
  });
});
