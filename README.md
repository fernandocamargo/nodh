# NODH 🧠

A sophisticated React state management library built on top of Redux that simplifies handling asynchronous actions, automatic state lifecycle management, and action tracking with built-in logging.

## What is NODH?

NODH is a Redux wrapper that abstracts away complex async action patterns, providing developers with a clean API for managing state in React applications. It handles the complexity of:

- **Asynchronous action lifecycle** - Automatic tracking of action execution from start to finish
- **State persistence** - Three-tier state structure (persisted, session, volatile) with automatic localStorage integration
- **Race condition prevention** - Built-in "takeLatest" pattern to handle concurrent async operations
- **Action logging and debugging** - Detailed tracking of all action executions with unique fingerprints and thread IDs
- **Resource management** - Automatic cleanup on component unmount

## Installation

```bash
npm install nodh
# or
yarn add nodh
```

### Peer Dependencies

NODH requires the following peer dependencies:

```bash
npm install react react-dom prop-types
```

## Key Features

- **Three-Tier State Management**: Separate state for persisted (localStorage), session (memory), and volatile (component lifecycle) data
- **Action Lifecycle Tracking**: Every action execution is tracked with unique fingerprints (MD5) and thread IDs (UUID)
- **Automatic Resource Management**: Resources are automatically cleaned up when components unmount
- **Built-in Race Condition Handling**: `takeLatest` helper prevents issues with concurrent async operations
- **Redux DevTools Integration**: Full support for Redux DevTools for debugging
- **Immutable State Updates**: Uses immutability-helper and immer for safe state mutations
- **TypeScript-Ready**: Built with a clear API surface that works well with TypeScript

## Basic Usage

### 1. Setup the Provider

Wrap your application with the NODH Provider:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'nodh';
import App from './App';

const config = {
  key: 'my-app',
  whitelist: ['user', 'settings'], // Keys to persist to localStorage
  reconcile: (inbound, stored) => ({
    ...stored,
    ...inbound,
  }),
};

ReactDOM.render(
  <Provider config={config}>
    <App />
  </Provider>,
  document.getElementById('root')
);
```

### 2. Create Actions with useActions Hook

```javascript
import React from 'react';
import { useActions } from 'nodh';

const actions = {
  // Async action with automatic state management
  fetchUser: async ({ persisted, session, volatile, thread, helpers }, userId) => {
    try {
      // Use takeLatest to prevent race conditions
      const response = await helpers.takeLatest(
        fetch(`/api/users/${userId}`)
      );
      const user = await response.json();

      // Save to persisted state (localStorage)
      persisted.save({
        path: ['user'],
        value: user,
      });

      // Mark action as successful
      thread.success(user);
    } catch (error) {
      // Check if promise was declined (cancelled by newer request)
      if (helpers.isDeclined(error)) {
        return;
      }

      thread.fail(error);
    }
  },

  // Lifecycle hooks
  mount: ({ volatile }) => {
    volatile.save({
      path: ['initialized'],
      value: true,
    });
  },

  unmount: () => {
    // Cleanup logic here
  },
};

function UserProfile({ userId }) {
  const [state, actions] = useActions({
    namespace: 'user-profile',
    selector: ({ persisted, session, volatile }) => ({
      user: persisted?.user,
      loading: volatile?.loading,
      initialized: volatile?.initialized,
    }),
    actions,
  });

  React.useEffect(() => {
    if (userId) {
      actions.fetchUser(userId);
    }
  }, [userId]);

  if (state.loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>{state.user?.name}</h1>
      <p>{state.user?.email}</p>
    </div>
  );
}

export default UserProfile;
```

## Working Example: Todo App

Here's a complete example showing how to build a simple todo application with NODH:

```javascript
import React, { useState } from 'react';
import { Provider, useActions } from 'nodh';

// Define actions
const todoActions = {
  addTodo: async ({ persisted }, text) => {
    const todos = persisted?.todos || [];
    const newTodo = {
      id: Date.now(),
      text,
      completed: false,
    };

    persisted.save({
      path: ['todos'],
      value: [...todos, newTodo],
    });
  },

  toggleTodo: async ({ persisted }, id) => {
    const todos = persisted?.todos || [];
    const updated = todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );

    persisted.save({
      path: ['todos'],
      value: updated,
    });
  },

  removeTodo: async ({ persisted }, id) => {
    const todos = persisted?.todos || [];
    persisted.save({
      path: ['todos'],
      value: todos.filter(todo => todo.id !== id),
    });
  },

  fetchTodosFromAPI: async ({ persisted, thread, helpers }, userId) => {
    try {
      const response = await helpers.takeLatest(
        fetch(`/api/todos?userId=${userId}`)
      );
      const todos = await response.json();

      persisted.save({
        path: ['todos'],
        value: todos,
      });

      thread.success(todos);
    } catch (error) {
      if (!helpers.isDeclined(error)) {
        thread.fail(error);
      }
    }
  },

  mount: ({ volatile }) => {
    volatile.save({
      path: ['mountedAt'],
      value: Date.now(),
    });
  },
};

// Todo List Component
function TodoList() {
  const [inputText, setInputText] = useState('');

  const [state, actions] = useActions({
    namespace: 'todo-list',
    selector: ({ persisted, volatile }) => ({
      todos: persisted?.todos || [],
      mountedAt: volatile?.mountedAt,
    }),
    actions: todoActions,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      actions.addTodo(inputText);
      setInputText('');
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>My Todo List</h1>

      <form onSubmit={handleSubmit} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Add a new todo..."
          style={{ padding: '10px', width: '70%', marginRight: '10px' }}
        />
        <button type="submit" style={{ padding: '10px 20px' }}>
          Add
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {state.todos.map(todo => (
          <li
            key={todo.id}
            style={{
              padding: '10px',
              borderBottom: '1px solid #ccc',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => actions.toggleTodo(todo.id)}
                style={{ marginRight: '10px' }}
              />
              <span
                style={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  color: todo.completed ? '#888' : '#000',
                }}
              >
                {todo.text}
              </span>
            </div>
            <button
              onClick={() => actions.removeTodo(todo.id)}
              style={{ padding: '5px 10px', cursor: 'pointer' }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>

      {state.todos.length === 0 && (
        <p style={{ textAlign: 'center', color: '#888' }}>
          No todos yet. Add one above!
        </p>
      )}
    </div>
  );
}

// App with Provider
function App() {
  return (
    <Provider
      config={{
        key: 'todo-app',
        whitelist: ['todos'], // Persist todos to localStorage
      }}
    >
      <TodoList />
    </Provider>
  );
}

export default App;
```

## API Reference

### `<Provider />`

Wraps your application and provides the Redux store.

**Props:**
- `config` (Object):
  - `key` (String): Storage key for redux-persist
  - `whitelist` (Array): State keys to persist to localStorage
  - `reconcile` (Function): Custom state reconciliation function `(inbound, stored) => mergedState`

### `useActions(options)`

Main hook for connecting components to NODH state and actions.

**Parameters:**
- `options.namespace` (String): Unique identifier for this component's state
- `options.selector` (Function): Selects data from state `({ persisted, session, volatile }) => selectedData`
- `options.actions` (Object): Action definitions with optional `mount` and `unmount` lifecycle hooks

**Returns:**
`[state, boundActions]`
- `state`: Selected data from the selector
- `boundActions`: Object containing bound action functions

### Action Resources

Actions receive a resources object as the first parameter:

```javascript
{
  persisted: {
    save: ({ path, value }) => void // Save to persisted state
  },
  session: {
    save: ({ path, value }) => void // Save to session state
  },
  volatile: {
    save: ({ path, value }) => void // Save to volatile state
  },
  thread: {
    success: (data) => void,        // Mark action as successful
    fail: (error) => void            // Mark action as failed
  },
  helpers: {
    takeLatest: (promise) => Promise,  // Handle race conditions
    isDeclined: (error) => Boolean     // Check if promise was declined
  }
}
```

### `useLog(namespace, action)`

Retrieves log entries for a specific action.

**Parameters:**
- `namespace` (String): Component namespace
- `action` (String): Action name

**Returns:**
Array of log entries with execution details (thread ID, start time, end time, params, etc.)

## State Management

NODH uses a three-tier state structure:

1. **Persisted State**: Saved to localStorage, survives browser refresh
2. **Session State**: In-memory only, cleared on page refresh
3. **Volatile State**: Component-specific, cleared on unmount

## Race Condition Handling

Use `helpers.takeLatest(promise)` to automatically cancel previous pending requests when a new one is made:

```javascript
const fetchData = async ({ helpers }, id) => {
  // If this is called again before the promise resolves,
  // the previous promise will be declined
  const data = await helpers.takeLatest(
    fetch(`/api/data/${id}`).then(r => r.json())
  );
  // Use data...
};
```

## Development

```bash
# Install dependencies
yarn install

# Run tests
yarn test

# Build for production
yarn prepublishOnly
```

## Testing

NODH uses Jest for testing. Run the test suite:

```bash
yarn test
```

## License

Apache 2.0

## Author

Fernando Camargo <camargodelbuono@gmail.com>

## Repository

https://github.com/fernandocamargo/nodh.git
