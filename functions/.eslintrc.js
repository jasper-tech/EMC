/* eslint-disable object-curly-spacing */
/* eslint-disable quote-props */
module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  extends: ["eslint:recommended", "google"],
  rules: {
    // Indentation
    indent: ["error", 2],

    // Quotes
    quotes: ["error", "double", { allowTemplateLiterals: true }],

    // Semicolons
    semi: ["error", "always"],

    // Console statements (allow for Firebase Functions)
    "no-console": "off",

    // Line length (more flexible for Firebase Functions)
    "max-len": [
      "error",
      {
        code: 100,
        ignoreComments: true,
        ignoreUrls: true,
        ignoreTemplateLiterals: true,
        ignoreStrings: true,
      },
    ],

    // Arrow functions
    "prefer-arrow-callback": "error",
    "arrow-spacing": "error",

    // Object formatting
    "object-curly-spacing": ["error", "never"],

    // Restricted globals
    "no-restricted-globals": ["error", "name", "length"],

    // Unused variables (warning instead of error)
    "no-unused-vars": [
      "warn",
      {
        args: "none",
        caughtErrors: "none",
      },
    ],

    // Google style specific rules
    "require-jsdoc": "off",
    "valid-jsdoc": "off",

    // Async/await
    "require-await": "warn",
  },
  overrides: [
    {
      files: ["**/*.spec.*", "**/*.test.*"],
      env: {
        mocha: true,
        jest: true,
      },
      rules: {
        "no-unused-vars": "off",
        "max-len": "off",
      },
    },
  ],
};
