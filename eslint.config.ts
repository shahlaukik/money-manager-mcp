import globals from "globals";
import tseslint from "typescript-eslint";
import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
});

export default tseslint.config(
    {
        files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
        extends: [
            // Use recommended rules from the @eslint/js plugin (same as "eslint:recommended")
            ...compat.extends("eslint:recommended"),
            // Use recommended rules from the @typescript-eslint/eslint-plugin
            ...tseslint.configs.recommended,
        ],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                ecmaVersion: "latest",
                sourceType: "module",
                project: true,
                tsconfigRootDir: __dirname,
            },
            globals: globals.browser,
        },
    },
    {
        files: ["**/*.json"],
        extends: [...compat.extends("plugin:json/recommended")],
        rules: {
            "json/no-empty-keys": "off", // Allow empty keys in package-lock.json (npm standard)
        },
    },
    {
        files: ["**/*.md"],
        extends: [...compat.extends("plugin:markdown/recommended")],
    }
);
