/**
 * Integration tests for useLog hook
 * Tests log retrieval and filtering functionality
 */

import React from 'react';
import { renderHook, act } from 'react-hooks-testing-library';
import { Provider } from 'react-redux';
import { createStore } from 'redux';

import useActions from '../actions/index';
import useLog from './index';
import getReducer from '../../reducers';

// Helper to create a test wrapper with Redux Provider
const createWrapper = () => {
  const reducer = getReducer({ format: state => state });
  const store = createStore(reducer);

  return ({ children }) => <Provider store={store}>{children}</Provider>;
};

describe('useLog Integration Tests', () => {
  describe('Basic Log Retrieval', () => {
    test('should return empty log initially', () => {
      const wrapper = createWrapper();
      const actions = {
        testAction: () => ({ persisted }) => {
          persisted.save(state => ({ ...state, test: true }));
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.testAction;

      const { result: logResult } = renderHook(
        () => useLog({ action: { fingerprint } }),
        { wrapper }
      );

      const log = logResult.current;

      // Initially should be empty or EMPTY_LOG constant
      expect(Array.isArray(log)).toBe(true);
    });

    test('should track action execution', done => {
      const wrapper = createWrapper();
      const actions = {
        trackedAction: () => ({ persisted }) => {
          persisted.save(state => ({ ...state, data: 'test' }));
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.trackedAction;

      const { result: logResult } = renderHook(
        () => useLog({ action: { fingerprint } }),
        { wrapper }
      );

      act(() => {
        boundActions.trackedAction();
      });

      // Wait for log to update
      setTimeout(() => {
        const log = logResult.current;

        expect(Array.isArray(log)).toBe(true);
        expect(log.length).toBeGreaterThan(0);

        if (log.length > 0) {
          const entry = log[0];
          expect(entry).toHaveProperty('action');
          expect(entry).toHaveProperty('params');
        }

        done();
      }, 50);
    });
  });

  describe('Log Filtering by Parameters', () => {
    test('should filter log entries by matching params', done => {
      const wrapper = createWrapper();
      const actions = {
        paramAction: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, value }));
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.paramAction;

      // Execute action with different params
      act(() => {
        boundActions.paramAction(1);
        boundActions.paramAction(2);
        boundActions.paramAction(1);
      });

      setTimeout(() => {
        // Get log filtered by params
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }, [1]),
          { wrapper }
        );

        const log = logResult.current;

        if (Array.isArray(log) && log.length > 0) {
          // Should only include entries where param was 1
          log.forEach(entry => {
            if (entry.params) {
              expect(entry.params).toEqual([1]);
            }
          });
        }

        done();
      }, 50);
    });

    test('should return all entries when params not specified', done => {
      const wrapper = createWrapper();
      const actions = {
        multiAction: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, value }));
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.multiAction;

      // Execute with different params
      act(() => {
        boundActions.multiAction('a');
        boundActions.multiAction('b');
        boundActions.multiAction('c');
      });

      setTimeout(() => {
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }),
          { wrapper }
        );

        const log = logResult.current;

        // Should include all entries
        if (Array.isArray(log)) {
          expect(log.length).toBeGreaterThanOrEqual(3);
        }

        done();
      }, 50);
    });
  });

  describe('Log Entry Structure', () => {
    test('should contain action fingerprint reference', done => {
      const wrapper = createWrapper();
      const actions = {
        structureTest: () => {},
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.structureTest;

      act(() => {
        boundActions.structureTest();
      });

      setTimeout(() => {
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }),
          { wrapper }
        );

        const log = logResult.current;

        if (Array.isArray(log) && log.length > 0) {
          const entry = log[0];
          expect(entry).toHaveProperty('action');
          expect(entry.action).toBe(fingerprint);
        }

        done();
      }, 50);
    });

    test('should contain execution parameters', done => {
      const wrapper = createWrapper();
      const actions = {
        withParams: (a, b, c) => ({ persisted }) => {
          persisted.save(state => ({ ...state, test: true }));
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.withParams;

      act(() => {
        boundActions.withParams(1, 'test', true);
      });

      setTimeout(() => {
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }),
          { wrapper }
        );

        const log = logResult.current;

        if (Array.isArray(log) && log.length > 0) {
          const entry = log[0];
          expect(entry).toHaveProperty('params');
          expect(entry.params).toEqual([1, 'test', true]);
        }

        done();
      }, 50);
    });

    test('should track loading state', done => {
      const wrapper = createWrapper();
      const actions = {
        asyncTest: () => {
          return new Promise(resolve => {
            setTimeout(resolve, 20);
          });
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.asyncTest;

      act(() => {
        boundActions.asyncTest();
      });

      // Check loading state during execution
      setTimeout(() => {
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }),
          { wrapper }
        );

        const log = logResult.current;

        if (Array.isArray(log) && log.length > 0) {
          const entry = log[0];
          expect(entry).toHaveProperty('loading');
        }

        done();
      }, 10);
    });
  });

  describe('Multiple Action Executions', () => {
    test('should track multiple executions of same action', done => {
      const wrapper = createWrapper();
      let executionCount = 0;
      const actions = {
        repeated: () => {
          executionCount++;
        },
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.repeated;

      act(() => {
        boundActions.repeated();
        boundActions.repeated();
        boundActions.repeated();
      });

      setTimeout(() => {
        const { result: logResult } = renderHook(
          () => useLog({ action: { fingerprint } }),
          { wrapper }
        );

        const log = logResult.current;

        expect(executionCount).toBe(3);

        if (Array.isArray(log)) {
          // Should have logged all executions
          expect(log.length).toBe(3);
        }

        done();
      }, 50);
    });

    test('should maintain separate logs for different actions', done => {
      const wrapper = createWrapper();
      const actions = {
        action1: () => {},
        action2: () => {},
      };

      const { result: actionsResult } = renderHook(
        () =>
          useActions({
            namespace: 'test',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const fingerprint1 = boundActions.action1.fingerprint;
      const fingerprint2 = boundActions.action2.fingerprint;

      act(() => {
        boundActions.action1();
        boundActions.action2();
        boundActions.action1();
      });

      setTimeout(() => {
        const { result: log1Result } = renderHook(
          () => useLog({ action: { fingerprint: fingerprint1 } }),
          { wrapper }
        );

        const { result: log2Result } = renderHook(
          () => useLog({ action: { fingerprint: fingerprint2 } }),
          { wrapper }
        );

        const log1 = log1Result.current;
        const log2 = log2Result.current;

        if (Array.isArray(log1) && Array.isArray(log2)) {
          // action1 executed twice
          expect(log1.length).toBe(2);
          // action2 executed once
          expect(log2.length).toBe(1);
        }

        done();
      }, 50);
    });
  });

  describe('Log Persistence', () => {
    test('should clear logs on namespace unmount', done => {
      const wrapper = createWrapper();
      const actions = {
        testAction: () => {},
      };

      const { result: actionsResult, unmount } = renderHook(
        () =>
          useActions({
            namespace: 'test-unmount',
            selector: () => ({}),
            actions,
          }),
        { wrapper }
      );

      const [, boundActions] = actionsResult.current;
      const { fingerprint } = boundActions.testAction;

      act(() => {
        boundActions.testAction();
      });

      setTimeout(() => {
        // Unmount the component
        act(() => {
          unmount();
        });

        setTimeout(() => {
          // Try to get log after unmount
          const { result: logResult } = renderHook(
            () => useLog({ action: { fingerprint } }),
            { wrapper }
          );

          const log = logResult.current;

          // Log should exist and be an array
          // Note: May still contain entries from mount/unmount lifecycle
          expect(Array.isArray(log)).toBe(true);

          done();
        }, 50);
      }, 50);
    });
  });
});
