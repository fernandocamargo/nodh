import md5 from 'md5';

import { mount, unmount } from 'mutations';

import actions from './index';

const getMock = () => {
  const save = jest.fn().mockImplementation(md5);
  const mock = { volatile: { save } };

  return { save, mock };
};

test(`
  Expect mount action to save into volatile layer using mount mutation.
`, () => {
  const { save, mock } = getMock();
  const action = actions.mount();
  const output = action(mock);
  const expected = md5(mount());

  expect(save).toHaveBeenCalled();
  expect(output).toBe(expected);
});

test(`
  Expect unmount action to save into volatile layer using unmount mutation.
`, () => {
  const { save, mock } = getMock();
  const action = actions.unmount();
  const output = action(mock);
  const expected = md5(unmount());

  expect(save).toHaveBeenCalled();
  expect(output).toBe(expected);
});
