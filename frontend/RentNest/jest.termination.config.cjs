// Run: ./node_modules/.bin/jest --config jest.termination.config.cjs --runInBand
module.exports = {
  rootDir: __dirname,
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/termination/**/*.test.jsx'],
  setupFilesAfterEnv: ['<rootDir>/tests/termination/setup.cjs'],
  moduleNameMapper: {
    '\\.(png|jpe?g)$': '<rootDir>/tests/termination/assetMock.cjs',
  },
  transform: {
    '^.+\\.jsx?$': ['babel-jest', {
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
    }],
  },
};
