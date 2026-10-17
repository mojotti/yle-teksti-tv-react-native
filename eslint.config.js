const { fixupConfigRules } = require("@eslint/compat");
const { FlatCompat } = require("@eslint/eslintrc");

const compat = new FlatCompat({ baseDirectory: __dirname });

module.exports = [
  {
    ignores: ["android/", "ios/", "vendor/", "node_modules/"],
  },
  ...fixupConfigRules(compat.extends("@react-native")),
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "@typescript-eslint/no-shadow": ["error"],
      "no-shadow": "off",
      "no-undef": "off",
      quotes: ["error", "double", { avoidEscape: true }],
    },
  },
];
