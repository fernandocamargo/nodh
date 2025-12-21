/**
 * Integration tests for useActions hook
 * Tests the complete functionality of the main NODH hook
 */

import React from 'react';
import { renderHook, act } from 'react-hooks-testing-library';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import useActions from './index';
import getReducer from '../../reducers';

// Helper to create a test wrapper with Redux Provider
const createWrapper = () => {
  const reducer = getReducer({ format: state => state });
  const store = createStore(reducer);

  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useActions Integration Tests', () => {
  describe('Basic Hook Usage', () => {
    test('should return state and actions tuple', () => {
      const wrapper = createWrapper();
      const actions = {
        increment: () => ({ persisted }) => {
          persisted.save(state => ({ ...state, count: 1 }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ count: persisted.count || 0 }),
            actions,
          }),
        { wrapper }
      );

      expect(result.current).toHaveLength(2);
      expect(result.current[0]).toBeDefined(); // state
      expect(result.current[1]).toBeDefined(); // actions
    });

    test('should provide bound actions', () => {
      const wrapper = createWrapper();
      const actions = {
        myAction: () => jest.fn(),
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = result.current;

      expect(boundActions).toHaveProperty('myAction');
      expect(typeof boundActions.myAction).toBe('function');
    });
  });

  describe('State Management', () => {
    test('should initialize with empty state', () => {
      const wrapper = createWrapper();

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ value: persisted.value }),
            actions: {},
          }),
        { wrapper }
      );

      const [state] = result.current;

      expect(state).toEqual({ value: undefined });
    });

    test('should update persisted state', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setValue: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, value }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ value: persisted.value }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.setValue(42);
      });

      // Wait a tick for state to update
      setTimeout(() => {
        const [state] = result.current;
        expect(state.value).toBe(42);
        done();
      }, 10);
    });

    test('should handle nested state paths', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setNested: (value) => ({ persisted }) => {
          persisted.save(state => ({
            ...state,
            foo: {
              ...(state.foo || {}),
              bar: {
                ...((state.foo && state.foo.bar) || {}),
                baz: value
              }
            }
          }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({
              nested: persisted && persisted.foo && persisted.foo.bar && persisted.foo.bar.baz,
            }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.setNested('deep');
      });

      setTimeout(() => {
        const [state] = result.current;
        expect(state.nested).toBe('deep');
        done();
      }, 10);
    });
  });

  describe('Three-Tier State', () => {
    test('should handle persisted state', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setPersisted: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, data: value }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ data: persisted.data }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.setPersisted('persisted-value');
      });

      setTimeout(() => {
        const [state] = result.current;
        expect(state.data).toBe('persisted-value');
        done();
      }, 10);
    });

    test('should handle session state', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setSession: (value) => ({ session }) => {
          session.save(state => ({ ...state, data: value }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ session }) => ({ data: session && session.data }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.setSession('session-value');
      });

      setTimeout(() => {
        const [state] = result.current;
        expect(state.data).toBe('session-value');
        done();
      }, 10);
    });

    test('should handle volatile state', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setVolatile: (value) => ({ volatile }) => {
          volatile.save(state => ({ ...state, data: value }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ volatile }) => ({ data: volatile && volatile.data }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.setVolatile('volatile-value');
      });

      setTimeout(() => {
        const [state] = result.current;
        expect(state.data).toBe('volatile-value');
        done();
      }, 10);
    });

    test('should isolate volatile state by namespace', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setData: (value) => ({ volatile }) => {
          volatile.save(state => ({ ...state, data: value }));
        },
      };

      const { result: result1 } = renderHook(
        () =>
          useActions({
            namespace: 'namespace1',
            selector: ({ volatile }) => ({ data: volatile && volatile.data }),
            actions,
          }),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () =>
          useActions({
            namespace: 'namespace2',
            selector: ({ volatile }) => ({ data: volatile && volatile.data }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions1] = result1.current;
        boundActions1.setData('namespace1-data');
      });

      setTimeout(() => {
        const [state1] = result1.current;
        const [state2] = result2.current;

        // namespace1 should have data, namespace2 should not
        expect(state1.data).toBe('namespace1-data');
        expect(state2.data).toBeUndefined();
        done();
      }, 10);
    });
  });

  describe('Lifecycle Hooks', () => {
    test('should mount without errors', () => {
      const wrapper = createWrapper();
      const actions = {};

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      expect(result.current).toBeDefined();
      expect(result.current[0]).toBeDefined(); // state
      expect(result.current[1]).toBeDefined(); // actions
    });

    test('should unmount without errors', () => {
      const wrapper = createWrapper();
      const actions = {};

      const { unmount } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      expect(() => unmount()).not.toThrow();
    });
  });

  describe('Action Execution', () => {
    test('should execute synchronous actions', (done) => {
      const wrapper = createWrapper();
      const actions = {
        syncAction: () => ({ persisted }) => {
          persisted.save(state => ({ ...state, result: 'sync' }));
          return 'sync-return';
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ result: persisted.result }),
            actions,
          }),
        { wrapper }
      );

      let returnValue;
      act(() => {
        const [, boundActions] = result.current;
        returnValue = boundActions.syncAction();
      });

      // Should return a promise even for sync actions
      expect(returnValue).toBeInstanceOf(Promise);

      setTimeout(() => {
        const [state] = result.current;
        expect(state.result).toBe('sync');
        done();
      }, 10);
    });

    test('should execute asynchronous actions', (done) => {
      const wrapper = createWrapper();
      const actions = {
        asyncAction: () => ({ persisted }) => {
          return new Promise(resolve => {
            setTimeout(() => {
              persisted.save(state => ({ ...state, result: 'async' }));
              resolve('async-return');
            }, 10);
          });
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted }) => ({ result: persisted.result }),
            actions,
          }),
        { wrapper }
      );

      let promise;
      act(() => {
        const [, boundActions] = result.current;
        promise = boundActions.asyncAction();
      });

      promise.then(returnValue => {
        expect(returnValue).toBe('async-return');

        setTimeout(() => {
          const [state] = result.current;
          expect(state.result).toBe('async');
          done();
        }, 20);
      });
    });

    test('should pass parameters to actions', (done) => {
      const wrapper = createWrapper();
      const actionSpy = jest.fn();
      const actions = {
        withParams: (a, b, c) => (resources) => {
          actionSpy(a, b, c);
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.withParams(1, 'two', true);
      });

      setTimeout(() => {
        expect(actionSpy).toHaveBeenCalledWith(1, 'two', true);
        done();
      }, 10);
    });
  });

  describe('Action Resources', () => {
    test('should provide all resource methods', (done) => {
      const wrapper = createWrapper();
      let capturedResources;
      const actions = {
        testResources: () => resources => {
          capturedResources = resources;
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.testResources();
      });

      setTimeout(() => {
        expect(capturedResources).toHaveProperty('persisted.save');
        expect(capturedResources).toHaveProperty('session.save');
        expect(capturedResources).toHaveProperty('volatile.save');
        expect(capturedResources).toHaveProperty('thread.success');
        expect(capturedResources).toHaveProperty('thread.fail');
        expect(capturedResources).toHaveProperty('helpers.takeLatest');
        expect(capturedResources).toHaveProperty('helpers.isDeclined');
        done();
      }, 10);
    });

    test('should provide working save methods', (done) => {
      const wrapper = createWrapper();
      const actions = {
        testSave: () => ({ persisted, session, volatile }) => {
          persisted.save(state => ({ ...state, p: 'persisted' }));
          session.save(state => ({ ...state, s: 'session' }));
          volatile.save(state => ({ ...state, v: 'volatile' }));
        },
      };

      const { result } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: ({ persisted, session, volatile }) => ({
              p: persisted && persisted.p,
              s: session && session.s,
              v: volatile && volatile.v,
            }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, boundActions] = result.current;
        boundActions.testSave();
      });

      setTimeout(() => {
        const [state] = result.current;
        expect(state.p).toBe('persisted');
        expect(state.s).toBe('session');
        expect(state.v).toBe('volatile');
        done();
      }, 10);
    });
  });

  describe('Multiple Namespaces', () => {
    test('should handle multiple hooks with different namespaces', (done) => {
      const wrapper = createWrapper();
      const actions = {
        setValue: (value) => ({ volatile }) => {
          volatile.save(state => ({ ...state, value }));
        },
      };

      const { result: result1 } = renderHook(
        () =>
          useActions({
            namespace: 'namespace1',
            selector: ({ volatile }) => ({ value: volatile && volatile.value }),
            actions,
          }),
        { wrapper }
      );

      const { result: result2 } = renderHook(
        () =>
          useActions({
            namespace: 'namespace2',
            selector: ({ volatile }) => ({ value: volatile && volatile.value }),
            actions,
          }),
        { wrapper }
      );

      act(() => {
        const [, actions1] = result1.current;
        const [, actions2] = result2.current;

        actions1.setValue('value1');
        actions2.setValue('value2');
      });

      setTimeout(() => {
        const [state1] = result1.current;
        const [state2] = result2.current;

        expect(state1.value).toBe('value1');
        expect(state2.value).toBe('value2');
        done();
      }, 10);
    });
  });
});
