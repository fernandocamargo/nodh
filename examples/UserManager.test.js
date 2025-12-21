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

// Mock resources - creates a properly linked state and resources object
const createMockResources = () => {
  const state = {
    persisted: {},
    session: {},
    volatile: {},
  };

  const resources = {
    persisted: Object.assign(state.persisted, {
      save: jest.fn((mutationFn) => {
        // Apply the mutation function to update state
        const newState = mutationFn(state.persisted);
        Object.assign(state.persisted, newState);
      }),
    }),
    session: Object.assign(state.session, {
      save: jest.fn((mutationFn) => {
        // Apply the mutation function to update state
        const newState = mutationFn(state.session);
        Object.assign(state.session, newState);
      }),
    }),
    volatile: Object.assign(state.volatile, {
      save: jest.fn((mutationFn) => {
        // Apply the mutation function to update state
        const newState = mutationFn(state.volatile);
        Object.assign(state.volatile, newState);
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

describe('UserManager Actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear global.mockAPI to avoid test contamination
    global.mockAPI = undefined;
  });

  describe('mount', () => {
    test('should initialize volatile and session state on mount', () => {
      const resources = createMockResources();

      userActions.mount()(resources);

      // Check that state was updated correctly
      expect(resources.volatile.save).toHaveBeenCalled();
      expect(resources.session.save).toHaveBeenCalled();
      expect(resources.state.volatile.mounted).toBe(true);
      expect(resources.state.volatile.mountedAt).toEqual(expect.any(Number));
      expect(resources.state.session.viewCount).toBe(0);
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

      await userActions.fetchUser(userId)(resources);

      // Check loading was set to true and then false
      expect(resources.volatile.save).toHaveBeenCalled();
      expect(resources.state.volatile.loading).toBe(false);

      // Check user was saved to persisted state
      expect(resources.persisted.save).toHaveBeenCalled();
      expect(resources.state.persisted.user).toEqual(mockUser);

      // Check lastFetchTime was saved
      expect(resources.state.volatile.lastFetchTime).toEqual(expect.any(Number));

      // Check thread was marked as successful
      expect(resources.thread.success).toHaveBeenCalledWith(mockUser);
    });

    test('should handle errors when fetching user', async () => {
      const resources = createMockResources();
      const userId = 1;
      const error = new Error('Network error');

      // Override takeLatest to reject with error
      resources.helpers.takeLatest.mockRejectedValue(error);

      await userActions.fetchUser(userId)(resources);

      // Check error was saved
      expect(resources.state.volatile.error).toBe(error.message);

      // Check loading was set to false
      expect(resources.state.volatile.loading).toBe(false);

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

      await userActions.fetchUser(userId)(resources);

      // Thread should not be marked as failed for declined promises
      expect(resources.thread.fail).not.toHaveBeenCalled();
    });

    test('should save lastFetchTime to volatile state', async () => {
      const resources = createMockResources();
      const userId = 1;
      const mockUser = { id: userId, name: 'Test' };

      resources.helpers.takeLatest.mockResolvedValue(mockUser);

      await userActions.fetchUser(userId)(resources);

      // Check that lastFetchTime was saved
      expect(resources.state.volatile.lastFetchTime).toEqual(expect.any(Number));
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
      const actionPromise = userActions.updateUser(userId, updates)(resources);

      // Check optimistic update happened immediately
      expect(resources.persisted.save).toHaveBeenCalled();
      expect(resources.state.persisted.user.name).toBe(updates.name);

      // Check saving flag was set
      expect(resources.state.volatile.saving).toBe(true);

      // Resolve the API call
      resolveUpdate(updatedUser);
      await actionPromise;

      // Check final update was saved
      expect(resources.state.persisted.user).toEqual(updatedUser);

      // Check saving flag was cleared
      expect(resources.state.volatile.saving).toBe(false);

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

      await userActions.updateUser(userId, updates)(resources);

      // Check that user was rolled back to original
      expect(resources.state.persisted.user).toEqual(currentUser);

      // Check error was saved
      expect(resources.state.volatile.error).toBe(error.message);

      // Check saving flag was cleared
      expect(resources.state.volatile.saving).toBe(false);

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

      await userActions.deleteUser(userId)(resources);

      // Check deleting flag was set and then cleared
      expect(resources.volatile.save).toHaveBeenCalled();
      expect(resources.state.volatile.deleting).toBe(false);

      // Check user was cleared
      expect(resources.persisted.save).toHaveBeenCalled();
      expect(resources.state.persisted.user).toBe(null);

      // Check thread was marked as successful
      expect(resources.thread.success).toHaveBeenCalled();
    });
  });

  describe('clearError', () => {
    test('should clear error from volatile state', () => {
      const resources = createMockResources();

      userActions.clearError()(resources);

      expect(resources.volatile.save).toHaveBeenCalled();
      expect(resources.state.volatile.error).toBe(null);
    });
  });

  describe('incrementViewCount', () => {
    test('should increment view count starting from 0', () => {
      const resources = createMockResources();

      userActions.incrementViewCount()(resources);

      expect(resources.session.save).toHaveBeenCalled();
      expect(resources.state.session.viewCount).toBe(1);
    });

    test('should increment existing view count', () => {
      const resources = createMockResources();
      resources.state.session.viewCount = 5;

      userActions.incrementViewCount()(resources);

      expect(resources.session.save).toHaveBeenCalled();
      expect(resources.state.session.viewCount).toBe(6);
    });
  });

  describe('unmount', () => {
    test('should log on unmount', () => {
      const resources = createMockResources();
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      userActions.unmount()(resources);

      expect(consoleSpy).toHaveBeenCalledWith('UserManager component unmounted');

      consoleSpy.mockRestore();
    });
  });
});

describe('Action Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear global.mockAPI to avoid test contamination
    global.mockAPI = undefined;
  });

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
    userActions.mount()(resources);

    // Fetch user
    await userActions.fetchUser(userId)(resources);

    // Increment view count
    userActions.incrementViewCount()(resources);

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
    const promise1 = userActions.fetchUser(1)(resources);
    const promise2 = userActions.fetchUser(2)(resources);
    const promise3 = userActions.fetchUser(3)(resources);

    await Promise.all([promise1, promise2, promise3]);

    // Only the last call should have failed (none should have)
    // The first two should have been handled as declined
    expect(resources.thread.fail).not.toHaveBeenCalled();
  });
});
