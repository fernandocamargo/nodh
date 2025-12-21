import md5 from 'md5';
import { v4 } from 'uuid';

import { mount, unmount, set, start, finish, clear } from './index';

test('Mount.', () => {
  const current = undefined;
  const mutation = mount();
  const next = {};

  expect(mutation(current)).toStrictEqual(next);
});

test('Unmount.', () => {
  const current = { foo: 'bar' };
  const mutation = unmount();
  const next = undefined;

  expect(mutation(current)).toBe(next);
});

test('Set.', () => {
  const current = { foo: 'bar', zaz: { hueBR: { lol: 'ROFL' } } };
  const mutation = set({ path: ['zaz', 'hueBR', 'lol'], value: 'wut' });
  const next = { foo: 'bar', zaz: { hueBR: { lol: 'wut' } } };

  expect(mutation(current)).toStrictEqual(next);
});

test('Start.', () => {
  const namespace = 'testing';
  const fingerprint = v4();
  const path = ['fake'];
  const thread = md5(fingerprint);
  const params = [1, 'a', false];
  const loading = true;
  const begin = performance.now();
  const current = {
    namespaces: new Map(),
    actions: new Map(),
    threads: new Map(),
  };
  const mutation = start({
    fingerprint,
    namespace,
    path,
    thread,
    params,
    loading,
    begin,
  });
  const next = {
    namespaces: new Map().set(namespace, new Set().add(fingerprint)),
    actions: new Map().set(fingerprint, { namespace, path, threads: [thread] }),
    threads: new Map().set(thread, {
      action: fingerprint,
      params,
      loading,
      begin,
    }),
  };

  expect(mutation(current)).toStrictEqual(next);
});

test('End.', () => {
  const namespace = 'testing';
  const fingerprint = v4();
  const path = ['fake'];
  const thread = md5(fingerprint);
  const params = [1, 'a', false];
  const loading = true;
  const begin = performance.now();
  const end = performance.now();
  const current = {
    namespaces: new Map().set(namespace, new Set().add(fingerprint)),
    actions: new Map().set(fingerprint, { namespace, path, threads: [thread] }),
    threads: new Map().set(thread, {
      action: fingerprint,
      params,
      loading,
      begin,
    }),
  };
  const mutation = finish({ thread, end });
  const next = {
    namespaces: new Map().set(namespace, new Set().add(fingerprint)),
    actions: new Map().set(fingerprint, { namespace, path, threads: [thread] }),
    threads: new Map().set(thread, {
      action: fingerprint,
      loading: false,
      params,
      begin,
      end,
    }),
  };

  expect(mutation(current)).toStrictEqual(next);
});

test('Clear.', () => {
  const namespace = 'testing';
  const fingerprints = [v4(), v4(), v4()];
  const paths = ['fake', 'nonexistent', 'unreal'];
  const threads = fingerprints.map(fingerprint => md5(fingerprint));
  const params = [1, 'a', false];
  const begin = performance.now();
  const end = performance.now();
  const current = {
    namespaces: new Map().set(namespace, new Set(fingerprints)),
    actions: fingerprints.reduce(
      (stack, fingerprint, index) =>
        stack.set(fingerprint, {
          path: [paths[index]],
          threads: [threads[index]],
          namespace,
        }),
      new Map()
    ),
    threads: threads.reduce(
      (stack, thread, index) =>
        stack.set(thread, {
          action: fingerprints[index],
          loading: false,
          params,
          begin,
          end,
        }),
      new Map()
    ),
  };
  const mutation = clear({ namespace });
  const next = {
    namespaces: new Map(),
    actions: new Map(),
    threads: new Map(),
  };

  expect(mutation(current)).toStrictEqual(next);
});
