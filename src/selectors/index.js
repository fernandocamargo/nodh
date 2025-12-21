import { createSelector } from 'reselect';

import useSelector from 'helpers/react-redux/selector';

export default ({ namespace, selector }) => () =>
  useSelector(
    createSelector(
      ({ persisted }) => persisted,
      ({ session }) => session,
      ({ volatile: { [namespace]: volatile = {} } = {} }) => volatile,
      (persisted, session, volatile) =>
        selector({ persisted, session, volatile })
    )
  );
