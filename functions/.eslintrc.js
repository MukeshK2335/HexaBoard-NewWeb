

module.exports = {
  env: {
    es2020: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "indent": ["error", 2],
    "max-len": ["error", { "code": 120 }],
    "object-curly-spacing": ["error", "always"],
    "require-jsdoc": "off",
    "valid-jsdoc": "off",
    "no-unused-vars": ["warn"],
  },
  overrides: [
  {
    files: ["functions/**/*.js"],
    env: {
      node: true,
    },
    globals: {
      module: "readonly",
      exports: "readonly",
      require: "readonly",
    },
  },
  {
    files: ["**/*.spec.*"],
    env: {
      mocha: true,
    },
    rules: {},
  },
],

  globals: {
    module: true,
    exports: true,
    require: true,
  },
};