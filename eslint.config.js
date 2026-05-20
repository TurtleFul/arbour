import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import sveltePlugin from "eslint-plugin-svelte";
import svelteParser from "svelte-eslint-parser";
import globals from "globals";

export default [
    eslint.configs.recommended,
    ...tseslint.configs.recommended,
    ...sveltePlugin.configs["flat/recommended"],
    {
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
    },
    {
        files: ["**/*.svelte"],
        languageOptions: {
            parser: svelteParser,
            parserOptions: {
                parser: tseslint.parser,
            },
        },
    },
    {
        rules: {
            "yoda": "error",
            "linebreak-style": ["error", "unix"],
            "camelcase": ["warn", {
                "properties": "never",
                "ignoreImports": true,
            }],
            "no-unused-vars": ["warn", {
                "args": "none",
                "caughtErrors": "none"
            }],
            indent: [
                "error",
                4,
                {
                    ignoredNodes: ["TemplateLiteral"],
                    SwitchCase: 1,
                },
            ],
            quotes: ["error", "double"],
            semi: "error",
            "no-multi-spaces": ["error", {
                ignoreEOLComments: true,
            }],
            "array-bracket-spacing": ["warn", "always", {
                "singleValue": true,
                "objectsInArrays": false,
                "arraysInArrays": false
            }],
            "space-before-function-paren": ["error", {
                "anonymous": "always",
                "named": "never",
                "asyncArrow": "always"
            }],
            "curly": "error",
            "object-curly-spacing": ["error", "always"],
            "object-curly-newline": "off",
            "object-property-newline": "error",
            "comma-spacing": "error",
            "brace-style": "error",
            "no-var": "error",
            "key-spacing": "warn",
            "keyword-spacing": "warn",
            "space-infix-ops": "error",
            "arrow-spacing": "warn",
            "no-trailing-spaces": "error",
            "no-constant-condition": ["error", {
                "checkLoops": false,
            }],
            "space-before-blocks": "warn",
            "no-extra-boolean-cast": "off",
            "no-multiple-empty-lines": ["warn", {
                "max": 1,
                "maxBOF": 0,
            }],
            "lines-between-class-members": ["warn", "always", {
                exceptAfterSingleLine: true,
            }],
            "no-unneeded-ternary": "error",
            "array-bracket-newline": ["error", "consistent"],
            "eol-last": ["error", "always"],
            "comma-dangle": ["warn", "only-multiline"],
            "no-empty": ["error", {
                "allowEmptyCatch": true
            }],
            "no-control-regex": "off",
            "one-var": ["error", "never"],
            "max-statements-per-line": ["error", { "max": 1 }],
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-unused-vars": ["warn", {
                "args": "none",
                "caughtErrors": "none"
            }],
            "prefer-const": "off",
        },
    },
    {
        files: ["**/*.ts", "**/*.svelte"],
        rules: {
            "no-unused-vars": "off",
        },
    },
    {
        ignores: [
            "node_modules/",
            "frontend-dist/",
            "data/",
            "stacks/",
            ".dagger/",
            ".svelte-kit/",
        ],
    },
];
