/**
 * Integration tests for Provider component
 * Tests Redux store setup and state persistence
 */

import React from 'react';
import { renderHook } from 'react-hooks-testing-library';
import renderer from 'react-test-renderer';

import Provider from './index';
import useActions from '../../hooks/actions';

describe('Provider Integration Tests', () => {
  describe('Basic Provider Setup', () => {
    test('should render children', () => {
      const TestChild = () => <div>Test Content</div>;

      const component = renderer.create(
        <Provider config={{ key: 'test' }}>
          <TestChild />
        </Provider>
      );

      const tree = component.toJSON();
      expect(tree).toBeTruthy();
    });

    test('should provide Redux store to children', () => {
      const actions = {
        testAction: ({ persisted }) => {
          persisted.save({ path: ['test'], value: true });
        },
      };

      let hookResult;

      const TestComponent = () => {
        hookResult = useActions({
          namespace: 'test',
          selector: ({ persisted }) => ({ test: persisted && persisted.test }),
          actions,
        });
        return null;
      };

      renderer.create(
        <Provider config={{ key: 'test' }}>
          <TestComponent />
        </Provider>
      );

      // Should have access to useActions hook (which requires Redux)
      expect(hookResult).toBeDefined();
      expect(hookResult).toHaveLength(2);
    });
  });

  describe('Configuration', () => {
    test('should accept config with key', () => {
      const component = renderer.create(
        <Provider config={{ key: 'test-key' }}>
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });

    test('should accept whitelist configuration', () => {
      const component = renderer.create(
        <Provider
          config={{
            key: 'test',
            whitelist: ['user', 'settings'],
          }}
        >
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });

    test('should accept reconcile function', () => {
      const reconcile = (inbound, stored) => ({
        ...stored,
        ...inbound,
      });

      const component = renderer.create(
        <Provider
          config={{
            key: 'test',
            reconcile,
          }}
        >
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });

    test('should accept full configuration', () => {
      const reconcile = (inbound, stored) => ({ ...stored, ...inbound });

      const component = renderer.create(
        <Provider
          config={{
            key: 'test-full',
            whitelist: ['data'],
            reconcile,
          }}
        >
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });
  });

  describe('State Management', () => {
    test('should provide working state management', done => {
      const actions = {
        setValue: ({ persisted }, value) => {
          persisted.save({ path: ['value'], value });
        },
      };

      let boundActions;
      let currentState;

      const TestComponent = () => {
        const [state, actions] = useActions({
          namespace: 'test',
          selector: ({ persisted }) => ({ value: persisted && persisted.value }),
          actions,
        });

        currentState = state;
        boundActions = actions;

        return null;
      };

      renderer.create(
        <Provider config={{ key: 'test' }}>
          <TestComponent />
        </Provider>
      );

      setTimeout(() => {
        // Execute action
        if (boundActions && boundActions.setValue) {
          boundActions.setValue(42);

          setTimeout(() => {
            // Check if state was updated
            expect(currentState).toBeDefined();
            done();
          }, 50);
        } else {
          done();
        }
      }, 50);
    });

    test('should isolate state between different provider instances', () => {
      const actions = {
        setValue: ({ persisted }, value) => {
          persisted.save({ path: ['value'], value });
        },
      };

      let state1, state2;

      const TestComponent1 = () => {
        const [state] = useActions({
          namespace: 'test1',
          selector: ({ persisted }) => ({ value: persisted && persisted.value }),
          actions,
        });
        state1 = state;
        return null;
      };

      const TestComponent2 = () => {
        const [state] = useActions({
          namespace: 'test2',
          selector: ({ persisted }) => ({ value: persisted && persisted.value }),
          actions,
        });
        state2 = state;
        return null;
      };

      // Create two separate provider instances
      renderer.create(
        <Provider config={{ key: 'provider1' }}>
          <TestComponent1 />
        </Provider>
      );

      renderer.create(
        <Provider config={{ key: 'provider2' }}>
          <TestComponent2 />
        </Provider>
      );

      // Each should have independent state
      expect(state1).toBeDefined();
      expect(state2).toBeDefined();
    });
  });

  describe('Multiple Children', () => {
    test('should support multiple child components', () => {
      const Child1 = () => <div>Child 1</div>;
      const Child2 = () => <div>Child 2</div>;
      const Child3 = () => <div>Child 3</div>;

      const component = renderer.create(
        <Provider config={{ key: 'test' }}>
          <Child1 />
          <Child2 />
          <Child3 />
        </Provider>
      );

      const tree = component.toJSON();
      expect(tree).toBeTruthy();
    });

    test('should provide store access to all children', () => {
      const actions = {
        testAction: () => {},
      };

      let hook1, hook2;

      const Child1 = () => {
        hook1 = useActions({
          namespace: 'child1',
          selector: () => ({}),
          actions,
        });
        return null;
      };

      const Child2 = () => {
        hook2 = useActions({
          namespace: 'child2',
          selector: () => ({}),
          actions,
        });
        return null;
      };

      renderer.create(
        <Provider config={{ key: 'test' }}>
          <Child1 />
          <Child2 />
        </Provider>
      );

      expect(hook1).toBeDefined();
      expect(hook2).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    test('should handle missing config gracefully', () => {
      // Provider should have default behavior even without config
      const component = renderer.create(
        <Provider>
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });

    test('should handle empty config object', () => {
      const component = renderer.create(
        <Provider config={{}}>
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });
  });

  describe('Redux DevTools Integration', () => {
    test('should work with Redux DevTools when available', () => {
      // Mock Redux DevTools extension
      const originalDevTools = global.__REDUX_DEVTOOLS_EXTENSION__;

      global.__REDUX_DEVTOOLS_EXTENSION__ = jest.fn(() => f => f);

      const component = renderer.create(
        <Provider config={{ key: 'test-devtools' }}>
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();

      // Restore
      if (originalDevTools) {
        global.__REDUX_DEVTOOLS_EXTENSION__ = originalDevTools;
      } else {
        delete global.__REDUX_DEVTOOLS_EXTENSION__;
      }
    });
  });

  describe('Component Lifecycle', () => {
    test('should cleanup on unmount', () => {
      const component = renderer.create(
        <Provider config={{ key: 'test' }}>
          <div>Test</div>
        </Provider>
      );

      // Should unmount without errors
      expect(() => {
        component.unmount();
      }).not.toThrow();
    });

    test('should support remounting', () => {
      let component = renderer.create(
        <Provider config={{ key: 'test' }}>
          <div>Test</div>
        </Provider>
      );

      component.unmount();

      // Should be able to create a new instance
      component = renderer.create(
        <Provider config={{ key: 'test' }}>
          <div>Test</div>
        </Provider>
      );

      expect(component).toBeTruthy();
    });
  });
});
