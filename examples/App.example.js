/**
 * Complete App Example with NODH Provider
 *
 * This demonstrates how to set up a complete React application with NODH
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from '../src';
import UserManager from './UserManager';

/**
 * App Component
 * Sets up the NODH Provider and renders the UserManager example
 */
function App() {
  return (
    <Provider
      config={{
        // Storage key for redux-persist
        key: 'nodh-example-app',

        // Whitelist: state keys to persist to localStorage
        // In this example, we persist the 'user' data so it survives page refresh
        whitelist: ['user'],

        // Reconcile function: merge stored state with incoming state
        // This is called when the app loads and finds existing persisted state
        reconcile: (inbound, stored) => ({
          // Prefer stored state but allow inbound to override
          ...stored,
          ...inbound,
        }),
      }}
    >
      <div style={styles.app}>
        <header style={styles.header}>
          <h1>NODH Example Application</h1>
          <p>A practical demonstration of NODH state management</p>
        </header>

        <main style={styles.main}>
          <UserManager initialUserId={1} />
        </main>

        <footer style={styles.footer}>
          <p>
            This example demonstrates NODH features including:
            persisted state, session state, volatile state, async actions,
            race condition handling, and lifecycle hooks.
          </p>
          <p>
            Try refreshing the page - the user data will persist!
            The view count will reset (session state), but the user data
            will remain (persisted state).
          </p>
        </footer>
      </div>
    </Provider>
  );
}

const styles = {
  app: {
    minHeight: '100vh',
    backgroundColor: '#f0f2f5',
  },
  header: {
    backgroundColor: '#282c34',
    color: 'white',
    padding: '30px 20px',
    textAlign: 'center',
  },
  main: {
    padding: '40px 20px',
  },
  footer: {
    backgroundColor: '#282c34',
    color: '#888',
    padding: '30px 20px',
    textAlign: 'center',
    marginTop: '40px',
  },
};

// Mount the app
if (typeof document !== 'undefined') {
  const rootElement = document.getElementById('root');
  if (rootElement) {
    ReactDOM.render(<App />, rootElement);
  }
}

export default App;
