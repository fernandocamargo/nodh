/**
 * Counter App Example with NODH Provider
 *
 * This demonstrates how to set up a simple React application with NODH
 * using the Counter component.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from '../src';
import Counter from './Counter';

/**
 * App Component
 * Sets up the NODH Provider and renders the Counter example
 */
function App() {
  return (
    <Provider
      config={{
        // Storage key for redux-persist
        key: 'nodh-counter-example',

        // Whitelist: state keys to persist to localStorage
        // The counter value will survive page refresh
        whitelist: ['count'],

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
          <h1>NODH Counter Example</h1>
          <p>A simple demonstration of NODH state management</p>
        </header>

        <main style={styles.main}>
          <Counter />
        </main>

        <footer style={styles.footer}>
          <h3>About This Example</h3>
          <p>
            This example demonstrates the three-tier state management in NODH:
          </p>
          <ul style={styles.list}>
            <li>
              <strong>Persisted State:</strong> The main counter value is saved
              to localStorage. Try incrementing the counter and refreshing the
              page - the value will persist!
            </li>
            <li>
              <strong>Session State:</strong> The session counter is stored in
              memory only. It will reset to 0 when you refresh the page.
            </li>
            <li>
              <strong>Volatile State:</strong> Loading states and errors are
              component-specific and will be cleared when the component unmounts.
            </li>
          </ul>
          <p>
            Open Redux DevTools (if installed) to see state changes in real-time!
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
    marginTop: '40px',
  },
  list: {
    textAlign: 'left',
    maxWidth: '800px',
    margin: '20px auto',
    lineHeight: '1.6',
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
