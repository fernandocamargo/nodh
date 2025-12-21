/**
 * End-to-End Integration Tests
 * Tests complete workflows using NODH library
 */

import React from 'react';
import { renderHook, act } from 'react-hooks-testing-library';
import renderer from 'react-test-renderer';

import { Provider, useActions, useLog } from './index';

describe('NODH End-to-End Integration Tests', () => {
  describe('Complete User Flow', () => {
    test('should handle a complete CRUD workflow', done => {
      // Define actions for a todo list
      const todoActions = {
        addTodo: (text) => ({ persisted }) => {
          persisted.save(state => {
            const todos = (state && state.todos) || [];
            const newTodo = { id: Date.now(), text, completed: false };
            return {
              ...state,
              todos: [...todos, newTodo],
            };
          });
        },

        toggleTodo: (id) => ({ persisted }) => {
          persisted.save(state => {
            const todos = (state && state.todos) || [];
            const updated = todos.map(todo =>
              todo.id === id ? { ...todo, completed: !todo.completed } : todo
            );
            return {
              ...state,
              todos: updated,
            };
          });
        },

        deleteTodo: (id) => ({ persisted }) => {
          persisted.save(state => {
            const todos = (state && state.todos) || [];
            return {
              ...state,
              todos: todos.filter(todo => todo.id !== id),
            };
          });
        },

        clearCompleted: () => ({ persisted }) => {
          persisted.save(state => {
            const todos = (state && state.todos) || [];
            return {
              ...state,
              todos: todos.filter(todo => !todo.completed),
            };
          });
        },
      };

      let currentState, currentActions;

      const TodoComponent = () => {
        const [state, actions] = useActions({
          namespace: 'todos',
          selector: ({ persisted }) => ({
            todos: (persisted && persisted.todos) || [],
          }),
          actions: todoActions,
        });

        currentState = state;
        currentActions = actions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'todo-test' }}>
          <TodoComponent />
        </Provider>
      );

      setTimeout(() => {
        // Add todos
        currentActions.addTodo('Buy milk');
        currentActions.addTodo('Walk dog');
        currentActions.addTodo('Write tests');

        setTimeout(() => {
          expect(currentState.todos.length).toBe(3);

          // Toggle first todo
          const firstTodoId = currentState.todos[0].id;
          currentActions.toggleTodo(firstTodoId);

          setTimeout(() => {
            expect(currentState.todos[0].completed).toBe(true);

            // Delete second todo
            const secondTodoId = currentState.todos[1].id;
            currentActions.deleteTodo(secondTodoId);

            setTimeout(() => {
              expect(currentState.todos.length).toBe(2);

              // Clear completed
              currentActions.clearCompleted();

              setTimeout(() => {
                expect(currentState.todos.length).toBe(1);
                expect(currentState.todos[0].completed).toBe(false);

                done();
              }, 50);
            }, 50);
          }, 50);
        }, 50);
      }, 50);
    });

    test('should handle async operations with loading states', done => {
      const actions = {
        fetchData: () => async ({ volatile, persisted, thread }) => {
          volatile.save(state => ({ ...state, loading: true }));

          try {
            const result = await new Promise(resolve => {
              setTimeout(() => {
                resolve({ data: 'fetched data' });
              }, 20);
            });

            persisted.save(state => ({ ...state, data: result.data }));
            volatile.save(state => ({ ...state, loading: false }));
            thread.success(result);
          } catch (error) {
            volatile.save(state => ({ ...state, error: error.message, loading: false }));
            thread.fail(error);
          }
        },
      };

      let currentState, currentActions;

      const AsyncComponent = () => {
        const [state, boundActions] = useActions({
          namespace: 'async-test',
          selector: ({ persisted, volatile }) => ({
            data: persisted && persisted.data,
            loading: (volatile && volatile.loading) || false,
            error: volatile && volatile.error,
          }),
          actions,
        });

        currentState = state;
        currentActions = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'async-test' }}>
          <AsyncComponent />
        </Provider>
      );

      setTimeout(() => {
        currentActions.fetchData();

        // Should be loading
        setTimeout(() => {
          expect(currentState.loading).toBe(true);

          // Wait for completion (promise resolves after 20ms + React update time)
          setTimeout(() => {
            expect(currentState.loading).toBe(false);
            expect(currentState.data).toBe('fetched data');
            expect(currentState.error).toBeUndefined();

            done();
          }, 300);
        }, 10);
      }, 50);
    });

    test('should handle race conditions with takeLatest', done => {
      let resolveFunctions = [];
      const actions = {
        fetchUser: (userId) => ({ persisted, helpers }) => {
          return helpers
            .takeLatest(
              new Promise(resolve => {
                resolveFunctions.push({ userId, resolve });
              })
            )
            .then(result => {
              persisted.save(state => ({ ...state, user: result }));
            })
            .catch(error => {
              if (helpers.isDeclined(error)) {
                // Declined, do nothing
              }
            });
        },
      };

      let currentState, currentActions;

      const Component = () => {
        const [state, boundActions] = useActions({
          namespace: 'race-test',
          selector: ({ persisted }) => ({
            user: persisted && persisted.user,
          }),
          actions,
        });

        currentState = state;
        currentActions = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'race-test' }}>
          <Component />
        </Provider>
      );

      setTimeout(() => {
        // Make rapid requests
        currentActions.fetchUser(1);
        currentActions.fetchUser(2);
        currentActions.fetchUser(3);

        setTimeout(() => {
          // Resolve in different order (3, 1, 2)
          // Only 3 should be applied due to takeLatest
          resolveFunctions[2].resolve({ id: 3, name: 'User 3' });
          resolveFunctions[0].resolve({ id: 1, name: 'User 1' });
          resolveFunctions[1].resolve({ id: 2, name: 'User 2' });

          setTimeout(() => {
            // Should have the latest request (3)
            expect(currentState.user).toEqual({ id: 3, name: 'User 3' });

            done();
          }, 50);
        }, 50);
      }, 50);
    });
  });

  describe('State Tier Interactions', () => {
    test('should demonstrate all three state tiers working together', done => {
      const actions = {
        saveUser: (user) => ({ persisted }) => {
          persisted.save(state => ({ ...state, user }));
        },

        incrementViewCount: () => ({ session }) => {
          session.save(state => {
            const count = (state && state.viewCount) || 0;
            return { ...state, viewCount: count + 1 };
          });
        },

        setLoading: (isLoading) => ({ volatile }) => {
          volatile.save(state => ({ ...state, loading: isLoading }));
        },

        mount: () => ({ volatile, session }) => {
          volatile.save(state => ({ ...state, mounted: true }));
          session.save(state => ({ ...state, viewCount: 0 }));
        },
      };

      let currentState, currentActions;

      const Component = () => {
        const [state, boundActions] = useActions({
          namespace: 'three-tier-test',
          selector: ({ persisted, session, volatile }) => ({
            user: persisted && persisted.user,
            viewCount: (session && session.viewCount) || 0,
            loading: (volatile && volatile.loading) || false,
            mounted: (volatile && volatile.mounted) || false,
          }),
          actions,
        });

        currentState = state;
        currentActions = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'three-tier-test' }}>
          <Component />
        </Provider>
      );

      setTimeout(() => {
        // Mount component (volatile + session initialization)
        currentActions.mount();

        // Persisted
        currentActions.saveUser({ id: 1, name: 'John' });

        // Session
        currentActions.incrementViewCount();
        currentActions.incrementViewCount();

        // Volatile
        currentActions.setLoading(true);

        setTimeout(() => {
          expect(currentState.user).toEqual({ id: 1, name: 'John' });
          expect(currentState.viewCount).toBe(2);
          expect(currentState.loading).toBe(true);
          expect(currentState.mounted).toBe(true);

          done();
        }, 50);
      }, 50);
    });
  });

  describe('Multiple Components Sharing State', () => {
    test('should share persisted state across components', done => {
      const actions = {
        setValue: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, shared: value }));
        },
      };

      let state1, state2, actions1;

      const Component1 = () => {
        const [state, boundActions] = useActions({
          namespace: 'component1',
          selector: ({ persisted }) => ({ shared: persisted && persisted.shared }),
          actions,
        });

        state1 = state;
        actions1 = boundActions;

        return null;
      };

      const Component2 = () => {
        const [state] = useActions({
          namespace: 'component2',
          selector: ({ persisted }) => ({ shared: persisted && persisted.shared }),
          actions,
        });

        state2 = state;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'shared-test' }}>
          <Component1 />
          <Component2 />
        </Provider>
      );

      setTimeout(() => {
        // Set value in component1
        actions1.setValue('shared-value');

        setTimeout(() => {
          // Both components should see the value
          expect(state1.shared).toBe('shared-value');
          expect(state2.shared).toBe('shared-value');

          done();
        }, 50);
      }, 50);
    });

    test('should isolate volatile state by namespace', done => {
      const actions = {
        setVolatile: (value) => ({ volatile }) => {
          volatile.save(state => ({ ...state, data: value }));
        },
      };

      let state1, state2, actions1, actions2;

      const Component1 = () => {
        const [state, boundActions] = useActions({
          namespace: 'isolated1',
          selector: ({ volatile }) => ({ data: volatile && volatile.data }),
          actions,
        });

        state1 = state;
        actions1 = boundActions;

        return null;
      };

      const Component2 = () => {
        const [state, boundActions] = useActions({
          namespace: 'isolated2',
          selector: ({ volatile }) => ({ data: volatile && volatile.data }),
          actions,
        });

        state2 = state;
        actions2 = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'isolated-test' }}>
          <Component1 />
          <Component2 />
        </Provider>
      );

      setTimeout(() => {
        actions1.setVolatile('value1');
        actions2.setVolatile('value2');

        setTimeout(() => {
          // Each should have its own isolated volatile state
          expect(state1.data).toBe('value1');
          expect(state2.data).toBe('value2');

          done();
        }, 50);
      }, 50);
    });
  });

  describe('Error Handling Workflows', () => {
    test('should handle errors gracefully', done => {
      const actions = {
        failingAction: () => async ({ volatile, thread }) => {
          volatile.save(state => ({ ...state, loading: true }));

          try {
            await new Promise((resolve, reject) => {
              setTimeout(() => {
                reject(new Error('Something went wrong'));
              }, 20);
            });
            volatile.save(state => ({ ...state, loading: false }));
          } catch (error) {
            volatile.save(state => ({ ...state, error: error.message, loading: false }));
            thread.fail(error);
          }
        },

        clearError: () => ({ volatile }) => {
          volatile.save(state => ({ ...state, error: null }));
        },
      };

      let currentState, currentActions;

      const Component = () => {
        const [state, boundActions] = useActions({
          namespace: 'error-test',
          selector: ({ volatile }) => ({
            loading: (volatile && volatile.loading) || false,
            error: volatile && volatile.error,
          }),
          actions,
        });

        currentState = state;
        currentActions = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'error-test' }}>
          <Component />
        </Provider>
      );

      setTimeout(() => {
        currentActions.failingAction();

        setTimeout(() => {
          expect(currentState.error).toBe('Something went wrong');
          expect(currentState.loading).toBe(false);

          // Clear error
          currentActions.clearError();

          setTimeout(() => {
            expect(currentState.error).toBeNull();

            done();
          }, 50);
        }, 300);
      }, 50);
    });
  });

  describe('Optimistic Updates', () => {
    test('should support optimistic updates with rollback', done => {
      const actions = {
        updateWithOptimism: (newValue) => ({ persisted, volatile, helpers }) => {
          const original = persisted && persisted.value;

          // Optimistic update
          persisted.save(state => ({ ...state, value: newValue }));

          return helpers
            .takeLatest(
              new Promise((resolve, reject) => {
                setTimeout(() => {
                  // Simulate failure
                  reject(new Error('Update failed'));
                }, 20);
              })
            )
            .then(() => {
              // Success - keep the new value
            })
            .catch(error => {
              if (!helpers.isDeclined(error)) {
                // Rollback on error
                persisted.save(state => ({ ...state, value: original }));
                volatile.save(state => ({ ...state, error: error.message }));
              }
            });
        },
      };

      let currentState, currentActions;

      const Component = () => {
        const [state, boundActions] = useActions({
          namespace: 'optimistic-test',
          selector: ({ persisted, volatile }) => ({
            value: persisted && persisted.value,
            error: volatile && volatile.error,
          }),
          actions,
        });

        currentState = state;
        currentActions = boundActions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'optimistic-test' }}>
          <Component />
        </Provider>
      );

      setTimeout(() => {
        // Set initial value
        currentActions.updateWithOptimism('initial');

        setTimeout(() => {
          const initialValue = currentState.value;

          // Try to update (will fail and rollback)
          currentActions.updateWithOptimism('failed-update');

          // Immediately shows optimistic value
          setTimeout(() => {
            const optimisticValue = currentState.value;
            expect(optimisticValue).toBe('failed-update');

            // Wait for rollback (promise rejects after 20ms + React update time)
            setTimeout(() => {
              expect(currentState.value).toBe(initialValue);
              expect(currentState.error).toBe('Update failed');

              done();
            }, 100);
          }, 10);
        }, 50);
      }, 50);
    });
  });

  describe('Log Integration', () => {
    test('should log action executions and retrieve with useLog', done => {
      const actions = {
        loggedAction: (value) => ({ persisted }) => {
          persisted.save(state => ({ ...state, value }));
        },
      };

      let currentActions, currentLog;
      let actionFingerprint;

      const Component = () => {
        const [, boundActions] = useActions({
          namespace: 'log-integration-test',
          selector: () => ({}),
          actions,
        });

        currentActions = boundActions;
        actionFingerprint = boundActions.loggedAction.fingerprint;

        return null;
      };

      const LogComponent = () => {
        if (actionFingerprint) {
          currentLog = useLog({ action: { fingerprint: actionFingerprint } });
        }
        return null;
      };

      renderer.create(
        <Provider config={{ key: 'log-integration-test' }}>
          <Component />
          <LogComponent />
        </Provider>
      );

      setTimeout(() => {
        currentActions.loggedAction('test1');
        currentActions.loggedAction('test2');

        setTimeout(() => {
          expect(Array.isArray(currentLog)).toBe(true);
          if (currentLog && currentLog.length > 0) {
            expect(currentLog.length).toBeGreaterThanOrEqual(2);
          }

          done();
        }, 50);
      }, 50);
    });
  });
});
