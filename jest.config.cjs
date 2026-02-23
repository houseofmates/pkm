module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest'
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  // Transform ESM packages in node_modules (like react-leaflet)
  transformIgnorePatterns: [
    '/node_modules/(?!(react-leaflet|@react-leaflet|leaflet)/)'
  ]
};