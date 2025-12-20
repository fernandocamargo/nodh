/**
 * Counter Tests
 *
 * These tests demonstrate how to test NODH actions
 */

import { counterActions } from './Counter';

// Mock helpers
const createMockHelpers = () => ({
  takeLatest: jest.fn((promise) => promise),
  isDeclined: jest.fn(() => false),
});

// Mock resources - creates a properly linked state and resources object
const createMockResources = () => {
  const state = {
    persisted: {},
    session: {},
    volatile: {},
  };

  // Helper to set nested path value
  const setPath = (obj, path, value) => {
    let current = obj;
    for (let i = 0; i < path.length - 1; i++) {
      if (!current[path[i]]) current[path[i]] = {};
      current = current[path[i]];
    }
    current[path[path.length - 1]] = value;
  };

  const resources = {
    persisted: Object.assign(state.persisted, {
      save: jest.fn(({ path, value }) => {
        setPath(state.persisted, path, value);
      }),
    }),
    session: Object.assign(state.session, {
      save: jest.fn(({ path, value }) => {
        setPath(state.session, path, value);
      }),
    }),
    volatile: Object.assign(state.volatile, {
      save: jest.fn(({ path, value }) => {
        setPath(state.volatile, path, value);
      }),
    }),
    thread: {
      success: jest.fn(),
      fail: jest.fn(),
    },
    helpers: createMockHelpers(),
    state,
  };

  return resources;
};

describe('Counter Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mount', () => {
    test('should initialize volatile and session state on mount', () => {
      const resources = createMockResources();

      counterActions.mount(resources);

      // Check that mounted flag was set
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['mounted'],
        value: true,
      });

      // Check that mountedAt timestamp was set
      expect(resources.volatile.save).toHaveBeenCalledWith(
        expect.objectContaining({
          path: ['mountedAt'],
          value: expect.any(Number),
        })
      );

      // Check that sessionCount was initialized
      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['sessionCount'],
        value: 0,
      });
    });
  });

  describe('increment', () => {
    test('should increment count from 0', () => {
      const resources = createMockResources();

      counterActions.increment(resources);

      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['count'],
        value: 1,
      });
    });

    test('should increment existing count', () => {
      const resources = createMockResources();
      resources.state.persisted.count = 5;

      counterActions.increment(resources);

      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['count'],
        value: 6,
      });
    });
  });

  describe('decrement', () => {
    test('should decrement count from 0', () => {
      const resources = createMockResources();

      counterActions.decrement(resources);

      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['count'],
        value: -1,
      });
    });

    test('should decrement existing count', () => {
      const resources = createMockResources();
      resources.state.persisted.count = 10;

      counterActions.decrement(resources);

      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['count'],
        value: 9,
      });
    });
  });

  describe('reset', () => {
    test('should reset count to 0', () => {
      const resources = createMockResources();
      resources.state.persisted.count = 42;

      counterActions.reset(resources);

      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['count'],
        value: 0,
      });
    });
  });

  describe('incrementSession', () => {
    test('should increment session count from 0', () => {
      const resources = createMockResources();

      counterActions.incrementSession(resources);

      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['sessionCount'],
        value: 1,
      });
    });

    test('should increment existing session count', () => {
      const resources = createMockResources();
      resources.state.session.sessionCount = 3;

      counterActions.incrementSession(resources);

      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['sessionCount'],
        value: 4,
      });
    });
  });

  describe('setLoading', () => {
    test('should set loading to true', () => {
      const resources = createMockResources();

      counterActions.setLoading(resources, true);

      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['loading'],
        value: true,
      });
    });

    test('should set loading to false', () => {
      const resources = createMockResources();

      counterActions.setLoading(resources, false);

      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['loading'],
        value: false,
      });
    });
  });

  describe('setError', () => {
    test('should set error message', () => {
      const resources = createMockResources();
      const errorMessage = 'Something went wrong';

      counterActions.setError(resources, errorMessage);

      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['error'],
        value: errorMessage,
      });
    });
  });

  describe('clearError', () => {
    test('should clear error message', () => {
      const resources = createMockResources();

      counterActions.clearError(resources);

      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['error'],
        value: null,
      });
    });
  });

  describe('unmount', () => {
    test('should log on unmount', () => {
      const resources = createMockResources();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      counterActions.unmount(resources);

      expect(consoleSpy).toHaveBeenCalledWith('Counter component unmounted');

      consoleSpy.mockRestore();
    });
  });
});

describe('Counter Integration Tests', () => {
  test('should handle complete counter flow', () => {
    const resources = createMockResources();

    // Mount component
    counterActions.mount(resources);

    // Increment persisted counter
    counterActions.increment(resources);
    counterActions.increment(resources);
    counterActions.increment(resources);

    // Increment session counter
    counterActions.incrementSession(resources);
    counterActions.incrementSession(resources);

    // Set loading and error
    counterActions.setLoading(resources, true);
    counterActions.setError(resources, 'Test error');

    // Verify final state
    expect(resources.state.persisted.count).toBe(3);
    expect(resources.state.session.sessionCount).toBe(2);
    expect(resources.state.volatile.mounted).toBe(true);
    expect(resources.state.volatile.loading).toBe(true);
    expect(resources.state.volatile.error).toBe('Test error');
  });

  test('should handle reset after increments', () => {
    const resources = createMockResources();

    // Increment several times
    counterActions.increment(resources);
    counterActions.increment(resources);
    counterActions.increment(resources);

    expect(resources.state.persisted.count).toBe(3);

    // Reset
    counterActions.reset(resources);

    expect(resources.state.persisted.count).toBe(0);
  });

  test('should handle decrement below zero', () => {
    const resources = createMockResources();

    // Decrement from 0
    counterActions.decrement(resources);

    expect(resources.state.persisted.count).toBe(-1);

    // Decrement again
    counterActions.decrement(resources);

    expect(resources.state.persisted.count).toBe(-2);
  });

  test('should maintain separate state tiers', () => {
    const resources = createMockResources();

    // Set values in each tier
    counterActions.increment(resources); // persisted
    counterActions.incrementSession(resources); // session
    counterActions.setLoading(resources, true); // volatile

    // Each tier should have independent values
    expect(resources.state.persisted.count).toBe(1);
    expect(resources.state.session.sessionCount).toBe(1);
    expect(resources.state.volatile.loading).toBe(true);
  });
});
