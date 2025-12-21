# NODH Examples

This directory contains practical examples demonstrating how to use NODH in real-world scenarios.

## Examples

### 1. Counter (`Counter.js`) ⭐ **Start Here**

A simple, fully-tested example perfect for learning NODH basics.

**Features demonstrated:**
- ✅ Three-tier state management (persisted, session, volatile)
- ✅ Simple synchronous actions
- ✅ Component lifecycle hooks (mount/unmount)
- ✅ State persistence to localStorage
- ✅ Error handling
- ✅ **Complete test suite with 17 passing tests**

**Best for:** Understanding core NODH concepts without async complexity.

**Test coverage:** 72.73% with all 17 tests passing

### 2. UserManager (`UserManager.js`)

A comprehensive example showing a user management component with full CRUD operations.

**Features demonstrated:**
- ✅ Async data fetching with loading states
- ✅ Race condition handling with `takeLatest`
- ✅ Three-tier state management (persisted, session, volatile)
- ✅ Optimistic updates with rollback on error
- ✅ Component lifecycle hooks (mount/unmount)
- ✅ Error handling and display
- ✅ Multiple action types (fetch, update, delete, clear)

**Key concepts:**
- **Persisted State**: User data is saved to localStorage and survives page refresh
- **Session State**: View count is tracked per session and resets on refresh
- **Volatile State**: Loading/error states are cleared when component unmounts
- **Race Conditions**: Multiple rapid API calls are handled gracefully with `takeLatest`

**Note:** This example uses async/await which may require additional Babel configuration.

### 3. Complete Apps

#### `App.Counter.js`
Simple app setup with the Counter component - **ready to run!**

#### `App.example.js`
Full application setup with the UserManager component (requires async/await Babel config).

**Features demonstrated:**
- ✅ Provider configuration
- ✅ Redux-persist setup
- ✅ State reconciliation
- ✅ Multiple components with NODH

## Running the Examples

### Option 1: Run the tests (Recommended)

The **Counter example** includes a complete test suite that demonstrates all NODH features:

```bash
# Run the Counter tests (all tests pass!)
yarn test examples/Counter.test.js --no-watch

# Run all tests including examples
yarn test

# Run tests in watch mode
yarn test examples/Counter.test.js
```

**Why start with tests?**
- See exactly how NODH actions work
- Understand the three-tier state system
- Learn testing patterns for your own code
- All 17 tests pass - verified working examples!

### Option 2: Integration in your project

1. **Copy the example files** to your project:
```bash
cp examples/UserManager.js src/components/
cp examples/App.example.js src/App.js
```

2. **Install dependencies**:
```bash
npm install nodh react react-dom prop-types
```

3. **Create an HTML file** (`public/index.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NODH Example</title>
</head>
<body>
  <div id="root"></div>
  <script src="../dist/bundle.js"></script>
</body>
</html>
```

4. **Run your app** using your preferred bundler (webpack, parcel, etc.)

## Testing the Examples

The examples include comprehensive test coverage demonstrating:

- **Unit tests** for individual actions
- **Integration tests** for complete workflows
- **Race condition tests** for concurrent operations
- **Error handling tests** for failure scenarios

Run the tests:
```bash
yarn test examples/
```

## Understanding the Code

### Action Structure

Every NODH action receives a resources object with:

```javascript
{
  persisted: { save: Function },  // Save to localStorage
  session: { save: Function },    // Save to session memory
  volatile: { save: Function },   // Save to component memory
  thread: {
    success: Function,            // Mark action as successful
    fail: Function                // Mark action as failed
  },
  helpers: {
    takeLatest: Function,         // Prevent race conditions
    isDeclined: Function          // Check if promise was cancelled
  }
}
```

### Selector Pattern

The selector extracts data from the three-tier state:

```javascript
selector: ({ persisted, session, volatile }) => ({
  // Select what your component needs
  user: persisted?.user,
  viewCount: session?.viewCount || 0,
  loading: volatile?.loading || false,
})
```

### Lifecycle Hooks

Optional `mount` and `unmount` actions for component lifecycle:

```javascript
{
  mount: () => ({ volatile }) => {
    // Initialize state when component mounts
    volatile.save(state => ({ ...state, initialized: true }));
  },

  unmount: () => () => {
    // Cleanup when component unmounts
  },

  // ... other actions
}
```

## Common Patterns

### 1. Async Action with Loading State

```javascript
fetchData: (id) => async ({ persisted, volatile, thread, helpers }) => {
  volatile.save(state => ({ ...state, loading: true }));

  try {
    const data = await helpers.takeLatest(api.fetch(id));
    persisted.save(state => ({ ...state, data }));
    thread.success(data);
  } catch (error) {
    if (!helpers.isDeclined(error)) {
      volatile.save(state => ({ ...state, error: error.message }));
      thread.fail(error);
    }
  } finally {
    volatile.save(state => ({ ...state, loading: false }));
  }
}
```

### 2. Optimistic Update with Rollback

```javascript
update: (id, changes) => async ({ persisted, volatile }) => {
  const original = persisted?.data;

  // Optimistically update
  persisted.save(state => ({ ...state, data: { ...original, ...changes } }));

  try {
    const result = await api.update(id, changes);
    persisted.save(state => ({ ...state, data: result }));
  } catch (error) {
    // Rollback on failure
    persisted.save(state => ({ ...state, data: original }));
    volatile.save(state => ({ ...state, error: error.message }));
  }
}
```

### 3. Simple State Update

```javascript
clearError: () => ({ volatile }) => {
  volatile.save(state => ({ ...state, error: null }));
}
```

## Best Practices

1. **Use `takeLatest` for all async operations** to prevent race conditions
2. **Check `isDeclined` errors** - don't treat cancelled promises as failures
3. **Use appropriate state tiers**:
   - Persisted: Data that should survive refresh (user info, settings)
   - Session: Data valid for current session (filters, temporary preferences)
   - Volatile: Component-specific UI state (loading, errors)
4. **Initialize state in `mount`** lifecycle hook
5. **Clean up in `unmount`** lifecycle hook
6. **Handle errors gracefully** and provide user feedback
7. **Use optimistic updates** for better UX, but always rollback on failure

## Troubleshooting

### State not persisting
- Check that the state key is in the `whitelist` array in Provider config
- Verify localStorage is available in your browser
- Check browser console for redux-persist errors

### Race conditions still occurring
- Ensure you're using `helpers.takeLatest()` wrapper
- Check that you're not mixing takeLatest with Promise.all/race

### Component not updating
- Verify your selector is returning the correct data
- Check that you're using the correct state tier (persisted/session/volatile)
- Ensure actions are calling `save()` correctly

## Next Steps

- Read the main [README.md](../README.md) for API documentation
- Explore the [source code](../src) to understand internals
- Check out the [test files](../src/**/*.test.js) for more examples
- Build your own examples and share them!

## Contributing

Found a bug in the examples? Have a better example to share? Contributions are welcome!

1. Fork the repository
2. Create your feature branch
3. Add your example with tests
4. Submit a pull request
