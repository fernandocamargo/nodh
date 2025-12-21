const path = require('path');

module.exports = function(api) {
  const isTest = api.env('test');
  api.cache(true);

  return {
    presets: [
      [
        '@babel/preset-env',
        isTest
          ? {
              targets: {
                node: 'current',
              },
            }
          : {},
      ],
      '@babel/preset-react',
    ],
    plugins: [
      [
        'module-resolver',
        {
          root: [path.resolve('./src')],
        },
      ],
    ],
  };
};
