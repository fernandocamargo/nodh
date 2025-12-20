/**
 * UserManager Tests
 *
 * These tests demonstrate how to test NODH actions and components
 */

import { userActions } from './UserManager';

// Mock helpers
const createMockHelpers = () => ({
  takeLatest: jest.fn((promise) => promise),
  isDeclined: jest.fn(() => false),
});

// Mock resources
const createMockResources = () => {
  const state = {
    persisted: {},
    session: {},
    volatile: {},
  };

  return {
    persisted: {
      save: jest.fn(({ path, value }) => {
        let current = state.persisted;
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      }),
    },
    session: {
      save: jest.fn(({ path, value }) => {
        let current = state.session;
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      }),
    },
    volatile: {
      save: jest.fn(({ path, value }) => {
        let current = state.volatile;
        for (let i = 0; i < path.length - 1; i++) {
          if (!current[path[i]]) current[path[i]] = {};
          current = current[path[i]];
        }
        current[path[path.length - 1]] = value;
      }),
    },
    thread: {
      success: jest.fn(),
      fail: jest.fn(),
    },
    helpers: createMockHelpers(),
    state,
  };
};

describe('UserManager Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('mount', () => {
    test('should initialize volatile and session state on mount', () => {
      const resources = createMockResources();

      userActions.mount(resources);

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

      // Check that viewCount was initialized
      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['viewCount'],
        value: 0,
      });
    });
  });

  describe('fetchUser', () => {
    test('should fetch user and save to persisted state', async () => {
      const resources = createMockResources();
      const userId = 1;

      // Mock the API call
      const mockUser = {
        id: userId,
        name: 'Test User',
        email: 'test@example.com',
      };

      // Override takeLatest to return mock data
      resources.helpers.takeLatest.mockResolvedValue(mockUser);

      await userActions.fetchUser(resources, userId);

      // Check loading was set to true
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['loading'],
        value: true,
      });

      // Check user was saved to persisted state
      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['user'],
        value: mockUser,
      });

      // Check loading was set to false
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['loading'],
        value: false,
      });

      // Check thread was marked as successful
      expect(resources.thread.success).toHaveBeenCalledWith(mockUser);
    });

    test('should handle errors when fetching user', async () => {
      const resources = createMockResources();
      const userId = 1;
      const error = new Error('Network error');

      // Override takeLatest to reject with error
      resources.helpers.takeLatest.mockRejectedValue(error);

      await userActions.fetchUser(resources, userId);

      // Check error was saved
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['error'],
        value: error.message,
      });

      // Check loading was set to false
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['loading'],
        value: false,
      });

      // Check thread was marked as failed
      expect(resources.thread.fail).toHaveBeenCalledWith(error);
    });

    test('should handle declined promises (race conditions)', async () => {
      const resources = createMockResources();
      const userId = 1;
      const error = new Error('Declined');

      // Mock declined promise
      resources.helpers.takeLatest.mockRejectedValue(error);
      resources.helpers.isDeclined.mockReturnValue(true);

      await userActions.fetchUser(resources, userId);

      // Thread should not be marked as failed for declined promises
      expect(resources.thread.fail).not.toHaveBeenCalled();
    });

    test('should save lastFetchTime to volatile state', async () => {
      const resources = createMockResources();
      const userId = 1;
      const mockUser = { id: userId, name: 'Test' };

      resources.helpers.takeLatest.mockResolvedValue(mockUser);

      await userActions.fetchUser(resources, userId);

      // Check that lastFetchTime was saved
      expect(resources.volatile.save).toHaveBeenCalledWith(
        expect.objectContaining({
          path: ['lastFetchTime'],
          value: expect.any(Number),
        })
      );
    });
  });

  describe('updateUser', () => {
    test('should optimistically update user and persist changes', async () => {
      const resources = createMockResources();
      const userId = 1;
      const currentUser = { id: userId, name: 'Old Name', email: 'old@example.com' };
      const updates = { name: 'New Name' };
      const updatedUser = { ...currentUser, ...updates };

      // Set initial user in persisted state
      resources.state.persisted.user = currentUser;

      // Create a promise that we can control
      let resolveUpdate;
      const updatePromise = new Promise((resolve) => {
        resolveUpdate = resolve;
      });

      // Mock the update API
      const originalUpdateUser = global.mockAPI && global.mockAPI.updateUser;
      global.mockAPI = {
        updateUser: jest.fn(() => updatePromise),
      };

      // Start the update (don't await yet)
      const actionPromise = userActions.updateUser(resources, userId, updates);

      // Check optimistic update happened immediately
      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['user'],
        value: expect.objectContaining(updates),
      });

      // Check saving flag was set
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['saving'],
        value: true,
      });

      // Resolve the API call
      resolveUpdate(updatedUser);
      await actionPromise;

      // Check final update was saved
      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['user'],
        value: updatedUser,
      });

      // Check saving flag was cleared
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['saving'],
        value: false,
      });

      // Check thread was marked as successful
      expect(resources.thread.success).toHaveBeenCalledWith(updatedUser);

      // Cleanup
      if (originalUpdateUser) {
        global.mockAPI.updateUser = originalUpdateUser;
      }
    });

    test('should rollback optimistic update on error', async () => {
      const resources = createMockResources();
      const userId = 1;
      const currentUser = { id: userId, name: 'Original Name' };
      const updates = { name: 'New Name' };
      const error = new Error('Update failed');

      // Set initial user in persisted state
      resources.state.persisted.user = currentUser;

      // Mock the update API to fail
      global.mockAPI = {
        updateUser: jest.fn(() => Promise.reject(error)),
      };

      await userActions.updateUser(resources, userId, updates);

      // Check that user was rolled back to original
      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['user'],
        value: currentUser,
      });

      // Check error was saved
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['error'],
        value: error.message,
      });

      // Check thread was marked as failed
      expect(resources.thread.fail).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteUser', () => {
    test('should delete user and clear persisted state', async () => {
      const resources = createMockResources();
      const userId = 1;

      // Mock the delete API
      global.mockAPI = {
        deleteUser: jest.fn(() => Promise.resolve({ success: true, id: userId })),
      };

      await userActions.deleteUser(resources, userId);

      // Check deleting flag was set
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['deleting'],
        value: true,
      });

      // Check user was cleared
      expect(resources.persisted.save).toHaveBeenCalledWith({
        path: ['user'],
        value: null,
      });

      // Check deleting flag was cleared
      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['deleting'],
        value: false,
      });

      // Check thread was marked as successful
      expect(resources.thread.success).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    test('should clear error from volatile state', () => {
      const resources = createMockResources();

      userActions.clearError(resources);

      expect(resources.volatile.save).toHaveBeenCalledWith({
        path: ['error'],
        value: null,
      });
    });
  });

  describe('incrementViewCount', () => {
    test('should increment view count starting from 0', () => {
      const resources = createMockResources();

      userActions.incrementViewCount(resources);

      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['viewCount'],
        value: 1,
      });
    });

    test('should increment existing view count', () => {
      const resources = createMockResources();
      resources.state.session.viewCount = 5;

      userActions.incrementViewCount(resources);

      expect(resources.session.save).toHaveBeenCalledWith({
        path: ['viewCount'],
        value: 6,
      });
    });
  });

  describe('unmount', () => {
    test('should log on unmount', () => {
      const resources = createMockResources();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      userActions.unmount(resources);

      expect(consoleSpy).toHaveBeenCalledWith('UserManager component unmounted');

      consoleSpy.mockRestore();
    });
  });
});

describe('Action Integration Tests', () => {
  test('should handle complete user fetch flow', async () => {
    const resources = createMockResources();
    const userId = 1;
    const mockUser = {
      id: userId,
      name: 'Test User',
      email: 'test@example.com',
    };

    resources.helpers.takeLatest.mockResolvedValue(mockUser);

    // Mount component
    userActions.mount(resources);

    // Fetch user
    await userActions.fetchUser(resources, userId);

    // Increment view count
    userActions.incrementViewCount(resources);

    // Verify final state
    expect(resources.state.persisted.user).toEqual(mockUser);
    expect(resources.state.session.viewCount).toBe(1);
    expect(resources.state.volatile.mounted).toBe(true);
    expect(resources.state.volatile.loading).toBe(false);
  });

  test('should handle multiple rapid fetchUser calls (race conditions)', async () => {
    const resources = createMockResources();

    const mockUser1 = { id: 1, name: 'User 1' };
    const mockUser2 = { id: 2, name: 'User 2' };
    const mockUser3 = { id: 3, name: 'User 3' };

    // Simulate takeLatest behavior
    let callCount = 0;
    resources.helpers.takeLatest.mockImplementation((promise) => {
      callCount++;
      if (callCount < 3) {
        // First two calls get declined
        return Promise.reject(new Error('Declined'));
      }
      return promise;
    });

    resources.helpers.isDeclined.mockImplementation((error) => {
      return error.message === 'Declined';
    });

    // Make multiple rapid calls
    const promise1 = userActions.fetchUser(resources, 1);
    const promise2 = userActions.fetchUser(resources, 2);
    const promise3 = userActions.fetchUser(resources, 3);

    await Promise.all([promise1, promise2, promise3]);

    // Only the last call should have failed (none should have)
    // The first two should have been handled as declined
    expect(resources.thread.fail).not.toHaveBeenCalled();
  });
});
