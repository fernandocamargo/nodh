# NODH 🧠

A sophisticated React state management library built on top of Redux that simplifies handling asynchronous actions, automatic state lifecycle management, and action tracking with built-in logging.

## About the Name

<div align="center">
  <img src="https://f4.bcbits.com/img/a0037309517_10.jpg" alt="No One Deserves Happiness album cover" width="300" />
  <p><em>Album art from "No One Deserves Happiness" by The Body (2016)</em></p>
</div>

**NODH** stands for **"No One Deserves Happiness"**, named after [The Body's 2016 album](https://thebody.bandcamp.com/album/no-one-deserves-happiness). The album, released on March 18, 2016, is described as "the grossest pop album of all time" - a brutal blend of drone metal and 80s dance tracks that explores themes of despair and isolation.

The name reflects the philosophical perspective that managing state in complex applications can be a challenging, sometimes brutal experience - but one that can be made more bearable with the right abstractions.

> [!NOTE]
> **Historical Context**: NODH was created and first published on **May 27, 2019**, nearly 5 months before [Redux Toolkit 1.0 was released](https://blog.isquaredsoftware.com/2019/10/redux-toolkit-1.0/) on **October 23, 2019**.
>
> At the time NODH was conceived, developers were struggling with Redux boilerplate without the official solution that would later become Redux Toolkit. NODH represents an independent approach to solving these pain points, predating the official Redux team's solution.
>
> **Timeline:**
> - March 18, 2016: ["No One Deserves Happiness" album released](https://thebody.bandcamp.com/album/no-one-deserves-happiness)
> - May 27, 2019: NODH v1.0.1 first published
> - June 25, 2019: NODH v1.0.36 (last major update)
> - October 23, 2019: [Redux Toolkit 1.0 released](https://blog.isquaredsoftware.com/2019/10/redux-toolkit-1.0/)
>
> For more context on Redux's evolution, see the [official History of Redux](https://redux.js.org/understanding/history-and-design/history-of-redux).

> [!WARNING]
> **Technical Note: React-Redux Alpha Dependency**
>
> NODH specifically uses [`react-redux@7.1.0-alpha.5`](https://github.com/reduxjs/react-redux/releases/tag/v7.1.0-alpha.5) rather than the final 7.1.0 release. This alpha version was crucial for NODH's architecture because:
>
> **Key Features in v7.1.0-alpha.5:**
> - **Hooks API Support**: First stable implementation of `useSelector`, `useDispatch`, and `useStore` hooks
> - **Custom Context Support**: Ability to create custom hooks with [`createStoreHook`, `createDispatchHook`, and `createSelectorHook`](https://react-redux.js.org/api/hooks#custom-context) for multiple stores
> - **Strict Equality Check**: Changed default equality comparison from shallow equality to strict `===` check, improving performance
> - **Optional Comparison Function**: Added ability to pass custom equality functions as second argument to `useSelector`
>
> **Why the Alpha Version?**
>
> NODH's architecture relies on the ability to use **multiple Redux stores** with hooks, which requires custom context support. The alpha version provided the necessary hook creator functions that allowed NODH to create isolated store instances for different parts of the application - a pattern that was experimental at the time but essential for NODH's three-tier state design.
>
> The final v7.1.0 release (June 11, 2019) maintained these features, but NODH was developed against the alpha to be at the cutting edge of React-Redux hooks development during its creation in May 2019.
>
> **Modern Alternative**: Today, if building a similar system, you would use the stable `react-redux@^7.1.0` or later with the same custom context patterns, which have been [production-ready since v7.1.0](https://github.com/reduxjs/react-redux/releases/tag/v7.1.0).

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

> [!TIP]
> **Note on Dependencies**: NODH uses `react-redux@7.1.0-alpha.5` for its multiple stores support via custom context hooks. This alpha version provided the experimental hook creator functions (`createStoreHook`, `createDispatchHook`, `createSelectorHook`) that were crucial for NODH's architecture. See the [Technical Note](#about-the-name) section for details on why this specific version is used.

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
  fetchUser: (userId) => async ({ persisted, session, volatile, thread, helpers }) => {
    try {
      // Use takeLatest to prevent race conditions
      const response = await helpers.takeLatest(
        fetch(`/api/users/${userId}`)
      );
      const user = await response.json();

      // Save to persisted state (localStorage)
      // The mutation function receives current state and returns new state
      persisted.save(state => ({ ...state, user }));

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
  mount: () => ({ volatile }) => {
    // Initialize volatile state when component mounts
    volatile.save(state => ({ ...state, initialized: true }));
  },

  unmount: () => () => {
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
  addTodo: (text) => ({ persisted }) => {
    persisted.save(state => {
      const todos = state?.todos || [];
      const newTodo = {
        id: Date.now(),
        text,
        completed: false,
      };
      return {
        ...state,
        todos: [...todos, newTodo],
      };
    });
  },

  toggleTodo: (id) => ({ persisted }) => {
    persisted.save(state => {
      const todos = state?.todos || [];
      const updated = todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      );
      return {
        ...state,
        todos: updated,
      };
    });
  },

  removeTodo: (id) => ({ persisted }) => {
    persisted.save(state => {
      const todos = state?.todos || [];
      return {
        ...state,
        todos: todos.filter(todo => todo.id !== id),
      };
    });
  },

  fetchTodosFromAPI: (userId) => async ({ persisted, thread, helpers }) => {
    try {
      const response = await helpers.takeLatest(
        fetch(`/api/todos?userId=${userId}`)
      );
      const todos = await response.json();

      persisted.save(state => ({
        ...state,
        todos,
      }));

      thread.success(todos);
    } catch (error) {
      if (!helpers.isDeclined(error)) {
        thread.fail(error);
      }
    }
  },

  mount: () => ({ volatile }) => {
    volatile.save(state => ({
      ...state,
      mountedAt: Date.now(),
    }));
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

Actions are curried functions that receive user parameters first, then return a function that receives resources:

```javascript
// Action signature
actionName: (userParam1, userParam2, ...) => (resources) => {
  // Action implementation
}

// Resources object structure
{
  persisted: {
    save: (mutationFn) => void // Save to persisted state
    // mutationFn: (currentState) => newState
  },
  session: {
    save: (mutationFn) => void // Save to session state
    // mutationFn: (currentState) => newState
  },
  volatile: {
    save: (mutationFn) => void // Save to volatile state
    // mutationFn: (currentState) => newState
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

// Example: Update persisted state
persisted.save(state => ({ ...state, user: newUser }));

// Example: Update nested property
persisted.save(state => ({
  ...state,
  todos: [...state.todos, newTodo]
}));
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
const fetchData = (id) => async ({ helpers, persisted }) => {
  // If this is called again before the promise resolves,
  // the previous promise will be declined
  const data = await helpers.takeLatest(
    fetch(`/api/data/${id}`).then(r => r.json())
  );

  // Save the fetched data
  persisted.save(state => ({ ...state, data }));
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

See [TESTING.md](./TESTING.md) for comprehensive testing documentation including integration tests and examples.

## NODH vs Redux Toolkit

> [!IMPORTANT]
> **A Historical Perspective**
>
> NODH was created to solve real problems that developers faced with Redux in early 2019, before Redux Toolkit existed as an official solution.

### Different Philosophies, Similar Goals

While both NODH and Redux Toolkit aim to reduce Redux boilerplate, they take different approaches:

#### NODH's Approach (May 2019)
- **Hook-centric API**: Built around React hooks from the ground up (`useActions`, `useLog`)
- **Three-tier state**: Explicit separation of persisted, session, and volatile state
- **Built-in lifecycle**: Automatic `mount`/`unmount` action handling
- **Action-level logging**: Every action execution is tracked with fingerprints and thread IDs
- **Resource injection**: Actions receive pre-configured resources for state management
- **Namespace isolation**: Components maintain isolated volatile state

#### Redux Toolkit's Approach (October 2019)
- **Slice-based**: Organizes code into "slices" with `createSlice()`
- **Immer integration**: Built-in immutability via Immer (NODH also uses Immer)
- **RTK Query**: Powerful data fetching layer (added later)
- **Standard Redux**: Closer to traditional Redux patterns
- **Broader ecosystem**: Official Redux solution with wider adoption

### When to Choose What?

**Choose NODH if:**
- You want a hook-first approach to Redux
- You need explicit state tier separation (persisted/session/volatile)
- You want built-in action logging and debugging
- You prefer automatic resource management and cleanup
- You're working on a project where NODH's patterns already exist

**Choose Redux Toolkit if:**
- You want the official, widely-adopted solution
- You need RTK Query for data fetching
- You prefer slice-based organization
- You want better TypeScript support out of the box
- You're starting a new project and want community support

> [!NOTE]
> **NODH Today**: While Redux Toolkit has become the standard, NODH remains a working example of how developers independently solved Redux's pain points before an official solution existed. It showcases alternative patterns that may still be valuable in specific contexts.

### Historical Significance

NODH is part of the [history of Redux solutions](https://redux.js.org/understanding/history-and-design/history-of-redux) that emerged from the community:

1. **2015-2018**: Redux + community libraries (redux-thunk, redux-saga, etc.)
2. **Early 2019**: Independent solutions like NODH emerge
3. **October 2019**: Redux Toolkit 1.0 becomes the official answer
4. **2020+**: RTK Query adds data fetching, Redux Toolkit becomes standard

NODH represents the creative solutions developers built when faced with Redux's complexity, before the official Redux team consolidated these patterns into Redux Toolkit.

## License

Apache 2.0

## Author

Fernando Camargo <camargodelbuono@gmail.com>

## Repository

https://github.com/fernandocamargo/nodh.git
