module.exports = {
  env: {
    es2020: true, // Use a more modern ECMAScript version
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2020, // Match the env
  },
  extends: [
    "eslint:recommended",
    "google",
  ],
  rules: {
    "no-restricted-globals": ["error", "name", "length"],
    "prefer-arrow-callback": "error",
    "quotes": ["error", "double", { "allowTemplateLiterals": true }],
    "indent": ["error", 2], // Enforce 2-space indentation
    "max-len": ["error", { "code": 120 }], // Increase max line length
    "object-curly-spacing": ["error", "always"], // Enforce spacing in object literals
    "require-jsdoc": "off", // Disable JSDoc requirement
    "valid-jsdoc": "off", // Disable JSDoc validation
    "no-unused-vars": ["warn"], // Warn about unused variables instead of erroring
  },
  overrides: [
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
  },
};
