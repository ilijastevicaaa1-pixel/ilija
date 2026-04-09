export default {
  testEnvironment: 'node',
  moduleNameMapper: {},
  preset: undefined,
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: ['@babel/preset-env'] }]
  }
};
