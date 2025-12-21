/**
 * Counter Example - Simple NODH demonstration
 *
 * This example demonstrates:
 * - Basic state management with useActions
 * - Three-tier state (persisted, session, volatile)
 * - Component lifecycle hooks (mount/unmount)
 * - Simple action definitions
 */

import React from 'react';
import { useActions } from '../src';

// Define actions for the Counter
export const counterActions = {
  /**
   * Increment counter in persisted state
   * Demonstrates: persisted state update (survives page refresh)
   */
  increment: () => ({ persisted }) => {
    persisted.save(state => {
      const currentCount = (state && state.count) || 0;
      return {
        ...state,
        count: currentCount + 1,
      };
    });
  },

  /**
   * Decrement counter in persisted state
   */
  decrement: () => ({ persisted }) => {
    persisted.save(state => {
      const currentCount = (state && state.count) || 0;
      return {
        ...state,
        count: currentCount - 1,
      };
    });
  },

  /**
   * Reset counter
   */
  reset: () => ({ persisted }) => {
    persisted.save(state => ({
      ...state,
      count: 0,
    }));
  },

  /**
   * Increment session counter
   * Demonstrates: session state (cleared on page refresh)
   */
  incrementSession: () => ({ session }) => {
    session.save(state => {
      const currentCount = (state && state.sessionCount) || 0;
      return {
        ...state,
        sessionCount: currentCount + 1,
      };
    });
  },

  /**
   * Set loading state
   * Demonstrates: volatile state (cleared on unmount)
   */
  setLoading: (isLoading) => ({ volatile }) => {
    volatile.save(state => ({
      ...state,
      loading: isLoading,
    }));
  },

  /**
   * Set error message
   */
  setError: (message) => ({ volatile }) => {
    volatile.save(state => ({
      ...state,
      error: message,
    }));
  },

  /**
   * Clear error message
   */
  clearError: () => ({ volatile }) => {
    volatile.save(state => ({
      ...state,
      error: null,
    }));
  },

  /**
   * Mount lifecycle hook
   * Called when component mounts
   */
  mount: () => ({ volatile, session }) => {
    volatile.save(state => ({
      ...state,
      mounted: true,
      mountedAt: Date.now(),
    }));

    // Initialize session state
    session.save(state => ({
      ...state,
      sessionCount: 0,
    }));
  },

  /**
   * Unmount lifecycle hook
   * Called when component unmounts
   */
  unmount: () => () => {
    console.log('Counter component unmounted');
  },
};

/**
 * Counter Component
 * A simple example showing NODH state management
 */
export function Counter() {
  // Use the useActions hook to connect to NODH
  const [state, actions] = useActions({
    namespace: 'counter',
    selector: ({ persisted, session, volatile }) => ({
      // Persisted state (survives page refresh)
      count: (persisted && persisted.count) || 0,

      // Session state (cleared on page refresh)
      sessionCount: (session && session.sessionCount) || 0,

      // Volatile state (cleared on unmount)
      loading: (volatile && volatile.loading) || false,
      error: volatile && volatile.error,
      mounted: (volatile && volatile.mounted) || false,
      mountedAt: volatile && volatile.mountedAt,
    }),
    actions: counterActions,
  });

  return (
    <div style={styles.container}>
      <h1>NODH Counter Example</h1>

      {/* Error Message */}
      {state.error && (
        <div style={styles.error}>
          <strong>Error:</strong> {state.error}
          <button onClick={actions.clearError} style={styles.closeButton}>
            ✕
          </button>
        </div>
      )}

      {/* Persisted Counter */}
      <div style={styles.card}>
        <h2>Persisted Counter</h2>
        <p style={styles.description}>
          This counter is saved to localStorage and will persist across page refreshes.
        </p>
        <div style={styles.display}>{state.count}</div>
        <div style={styles.actions}>
          <button onClick={actions.decrement} style={styles.button}>
            -
          </button>
          <button onClick={actions.reset} style={styles.button}>
            Reset
          </button>
          <button onClick={actions.increment} style={styles.button}>
            +
          </button>
        </div>
      </div>

      {/* Session Counter */}
      <div style={styles.card}>
        <h2>Session Counter</h2>
        <p style={styles.description}>
          This counter is stored in memory and will reset on page refresh.
        </p>
        <div style={styles.display}>{state.sessionCount}</div>
        <div style={styles.actions}>
          <button onClick={actions.incrementSession} style={styles.button}>
            Increment Session
          </button>
        </div>
      </div>

      {/* Debug Info */}
      <div style={styles.debug}>
        <h3>Debug Info (Volatile State)</h3>
        <p style={styles.description}>
          This information is cleared when the component unmounts.
        </p>
        <ul>
          <li>Component Mounted: {state.mounted ? 'Yes' : 'No'}</li>
          <li>
            Mounted At:{' '}
            {state.mountedAt
              ? new Date(state.mountedAt).toLocaleTimeString()
              : 'Unknown'}
          </li>
          <li>Loading: {state.loading ? 'Yes' : 'No'}</li>
          <li>Error: {state.error || 'None'}</li>
        </ul>
        <div style={styles.actions}>
          <button
            onClick={() => actions.setLoading(true)}
            style={styles.button}
          >
            Set Loading
          </button>
          <button
            onClick={() => actions.setLoading(false)}
            style={styles.button}
          >
            Clear Loading
          </button>
          <button
            onClick={() => actions.setError('Test error message')}
            style={styles.button}
          >
            Set Error
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div style={styles.instructions}>
        <h3>Try This:</h3>
        <ol>
          <li>Click the + button to increment the persisted counter</li>
          <li>Refresh the page - the persisted counter will remain</li>
          <li>Increment the session counter and refresh - it will reset to 0</li>
          <li>Open Redux DevTools to see the state changes</li>
        </ol>
      </div>
    </div>
  );
}

// Styles
const styles = {
  container: {
    maxWidth: '800px',
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
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '20px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  description: {
    color: '#666',
    fontSize: '14px',
    marginBottom: '16px',
  },
  display: {
    fontSize: '48px',
    fontWeight: 'bold',
    textAlign: 'center',
    margin: '20px 0',
    color: '#007bff',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  button: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '16px',
  },
  debug: {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '4px',
    fontSize: '14px',
  },
  instructions: {
    marginTop: '40px',
    padding: '20px',
    backgroundColor: '#e7f3ff',
    borderRadius: '4px',
    fontSize: '14px',
  },
};

export default Counter;
