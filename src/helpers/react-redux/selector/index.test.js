import React from 'react';
import { renderHook } from 'react-hooks-testing-library';

import { NODH } from 'constants/index';
import { getInitialState } from 'reducers';
import Provider from 'components/provider';

import useSelector from './index';

const Mock = props => <Provider name={NODH} {...props} />;

test(`
  Should extract data from the Redux store state, using a selector function.
`, () => {
  const selector = ({ persisted, session, volatile }) => ({
    persisted,
    session,
    volatile,
  });
  const {
    result: { current },
  } = renderHook(() => useSelector(selector), { wrapper: Mock });
  const expected = getInitialState();

  expect(current).toStrictEqual(expected);
});
