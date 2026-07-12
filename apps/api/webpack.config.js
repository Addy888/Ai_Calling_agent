module.exports = (options, webpack) => {
  return {
    ...options,
    externals: {
      bcrypt: 'commonjs2 bcrypt',
      '@mapbox/node-pre-gyp': 'commonjs2 @mapbox/node-pre-gyp',
      'mock-aws-s3': 'commonjs2 mock-aws-s3',
      'aws-sdk': 'commonjs2 aws-sdk',
      'nock': 'commonjs2 nock',
    },
  };
};
