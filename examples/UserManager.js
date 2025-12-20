/**
 * UserManager Example
 *
 * This example demonstrates:
 * - Using useActions hook for state management
 * - Async operations with loading states
 * - Race condition handling with takeLatest
 * - Three-tier state (persisted, session, volatile)
 * - Component lifecycle hooks (mount/unmount)
 * - Error handling
 */

import React, { useState, useEffect } from 'react';
import { useActions } from '../src';

// Mock API functions (replace with real API calls)
const mockAPI = {
  fetchUser: (userId) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: userId,
          name: `User ${userId}`,
          email: `user${userId}@example.com`,
          avatar: `https://i.pravatar.cc/150?img=${userId}`,
        });
      }, 1000);
    }),

  updateUser: (userId, updates) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ id: userId, ...updates });
      }, 800);
    }),

  deleteUser: (userId) =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({ success: true, id: userId });
      }, 500);
    }),
};

// Define actions for the UserManager
export const userActions = {
  /**
   * Fetch user data from API
   * Demonstrates: async operation, takeLatest, error handling, loading state
   */
  fetchUser: async ({ persisted, volatile, thread, helpers }, userId) => {
    // Set loading state
    volatile.save({
      path: ['loading'],
      value: true,
    });

    try {
      // Use takeLatest to prevent race conditions
      // If fetchUser is called again before this completes, this promise will be declined
      const user = await helpers.takeLatest(
        mockAPI.fetchUser(userId)
      );

      // Save user to persisted state (will survive page refresh)
      persisted.save({
        path: ['user'],
        value: user,
      });

      // Save to session state (only for current session)
      volatile.save({
        path: ['lastFetchTime'],
        value: Date.now(),
      });

      // Clear loading state
      volatile.save({
        path: ['loading'],
        value: false,
      });

      // Mark thread as successful
      thread.success(user);
    } catch (error) {
      // Check if the promise was declined (cancelled by newer request)
      if (helpers.isDeclined(error)) {
        return;
      }

      // Save error state
      volatile.save({
        path: ['error'],
        value: error.message,
      });

      volatile.save({
        path: ['loading'],
        value: false,
      });

      // Mark thread as failed
      thread.fail(error);
    }
  },

  /**
   * Update user data
   * Demonstrates: optimistic updates, error rollback
   */
  updateUser: async ({ persisted, volatile, thread }, userId, updates) => {
    // Save the current user for potential rollback
    const currentUser = persisted && persisted.user;

    // Optimistically update the UI
    persisted.save({
      path: ['user'],
      value: { ...currentUser, ...updates },
    });

    volatile.save({
      path: ['saving'],
      value: true,
    });

    try {
      const updatedUser = await mockAPI.updateUser(userId, updates);

      persisted.save({
        path: ['user'],
        value: updatedUser,
      });

      volatile.save({
        path: ['saving'],
        value: false,
      });

      thread.success(updatedUser);
    } catch (error) {
      // Rollback on error
      persisted.save({
        path: ['user'],
        value: currentUser,
      });

      volatile.save({
        path: ['saving'],
        value: false,
      });

      volatile.save({
        path: ['error'],
        value: error.message,
      });

      thread.fail(error);
    }
  },

  /**
   * Delete user
   * Demonstrates: clearing state
   */
  deleteUser: async ({ persisted, volatile, thread }, userId) => {
    volatile.save({
      path: ['deleting'],
      value: true,
    });

    try {
      await mockAPI.deleteUser(userId);

      // Clear user data
      persisted.save({
        path: ['user'],
        value: null,
      });

      volatile.save({
        path: ['deleting'],
        value: false,
      });

      thread.success();
    } catch (error) {
      volatile.save({
        path: ['deleting'],
        value: false,
      });

      volatile.save({
        path: ['error'],
        value: error.message,
      });

      thread.fail(error);
    }
  },

  /**
   * Clear error message
   * Demonstrates: simple state update
   */
  clearError: ({ volatile }) => {
    volatile.save({
      path: ['error'],
      value: null,
    });
  },

  /**
   * Increment view count
   * Demonstrates: session state usage
   */
  incrementViewCount: ({ session }) => {
    const currentCount = (session && session.viewCount) || 0;
    session.save({
      path: ['viewCount'],
      value: currentCount + 1,
    });
  },

  /**
   * Mount lifecycle hook
   * Called when component mounts
   */
  mount: ({ volatile, session }) => {
    volatile.save({
      path: ['mounted'],
      value: true,
    });

    volatile.save({
      path: ['mountedAt'],
      value: Date.now(),
    });

    // Initialize session state
    session.save({
      path: ['viewCount'],
      value: 0,
    });
  },

  /**
   * Unmount lifecycle hook
   * Called when component unmounts
   */
  unmount: ({ volatile }) => {
    // Cleanup logic here
    console.log('UserManager component unmounted');
  },
};

/**
 * UserManager Component
 * A complete example showing how to use NODH for user management
 */
export function UserManager({ initialUserId = 1 }) {
  const [userId, setUserId] = useState(initialUserId);

  // Use the useActions hook to connect to NODH
  const [state, actions] = useActions({
    namespace: 'user-manager',
    selector: ({ persisted, session, volatile }) => ({
      // Persisted state (survives page refresh)
      user: persisted && persisted.user,

      // Session state (cleared on page refresh)
      viewCount: (session && session.viewCount) || 0,

      // Volatile state (cleared on unmount)
      loading: (volatile && volatile.loading) || false,
      saving: (volatile && volatile.saving) || false,
      deleting: (volatile && volatile.deleting) || false,
      error: volatile && volatile.error,
      mounted: (volatile && volatile.mounted) || false,
      lastFetchTime: volatile && volatile.lastFetchTime,
    }),
    actions: userActions,
  });

  // Fetch user on mount or when userId changes
  useEffect(() => {
    actions.fetchUser(userId);
    actions.incrementViewCount();
  }, [userId]);

  // Handlers
  const handleRefresh = () => {
    actions.fetchUser(userId);
    actions.incrementViewCount();
  };

  const handleUpdateName = () => {
    const newName = prompt('Enter new name:', state.user && state.user.name);
    if (newName) {
      actions.updateUser(userId, { name: newName });
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      actions.deleteUser(userId);
    }
  };

  const handleNextUser = () => {
    setUserId(prev => prev + 1);
  };

  const handlePrevUser = () => {
    setUserId(prev => Math.max(1, prev - 1));
  };

  return (
    <div style={styles.container}>
      <h1>NODH User Manager Example</h1>

      {/* Error Message */}
      {state.error && (
        <div style={styles.error}>
          <strong>Error:</strong> {state.error}
          <button onClick={actions.clearError} style={styles.closeButton}>
            ✕
          </button>
        </div>
      )}

      {/* User Navigation */}
      <div style={styles.navigation}>
        <button onClick={handlePrevUser} disabled={userId <= 1}>
          ← Previous
        </button>
        <span style={styles.userId}>User ID: {userId}</span>
        <button onClick={handleNextUser}>Next →</button>
      </div>

      {/* Loading State */}
      {state.loading && (
        <div style={styles.loading}>Loading user data...</div>
      )}

      {/* User Card */}
      {!state.loading && state.user && (
        <div style={styles.card}>
          <img src={state.user.avatar} alt={state.user.name} style={styles.avatar} />
          <h2>{state.user.name}</h2>
          <p>{state.user.email}</p>

          <div style={styles.actions}>
            <button onClick={handleRefresh} disabled={state.loading}>
              Refresh
            </button>
            <button onClick={handleUpdateName} disabled={state.saving}>
              {state.saving ? 'Saving...' : 'Edit Name'}
            </button>
            <button
              onClick={handleDelete}
              disabled={state.deleting}
              style={styles.deleteButton}
            >
              {state.deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      )}

      {/* No User State */}
      {!state.loading && !state.user && (
        <div style={styles.empty}>
          <p>No user data available</p>
          <button onClick={handleRefresh}>Load User</button>
        </div>
      )}

      {/* Debug Info */}
      <div style={styles.debug}>
        <h3>Debug Info</h3>
        <ul>
          <li>View Count (Session): {state.viewCount}</li>
          <li>Component Mounted: {state.mounted ? 'Yes' : 'No'}</li>
          <li>Last Fetch: {state.lastFetchTime ? new Date(state.lastFetchTime).toLocaleTimeString() : 'Never'}</li>
          <li>Loading: {state.loading ? 'Yes' : 'No'}</li>
          <li>Saving: {state.saving ? 'Yes' : 'No'}</li>
        </ul>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  error: {
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '4px',
    padding: '12px',
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '0 8px',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    gap: '10px',
  },
  userId: {
    fontSize: '16px',
    fontWeight: 'bold',
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: '#666',
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  avatar: {
    width: '150px',
    height: '150px',
    borderRadius: '50%',
    marginBottom: '16px',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    marginTop: '20px',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: '#999',
  },
  debug: {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '14px',
  },
};

export default UserManager;
