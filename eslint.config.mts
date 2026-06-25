/* eslint-disable @typescript-eslint/no-deprecated */
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import { globalIgnores } from "eslint/config";

export default tseslint.config(
	globalIgnores([
		"node_modules",
		"dist",
		"build",
		"coverage",
		".claude",
		".env*",
		"esbuild.config.mjs",
		"version-bump.mjs",
		"tests/run-tests.mjs",
		"tests/fixtures",
		"versions.json",
		"main.js",
		"*.min.js",
		"package.json",
		"package-lock.json",
		"tsconfig.json",
	]),
	js.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ["eslint.config.mts", "manifest.json"],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		files: ["tests/**/*.ts"],
		rules: {
			"@typescript-eslint/no-empty-function": "off",
			"@typescript-eslint/no-extraneous-class": "off",
			"@typescript-eslint/no-floating-promises": "off",
			"@typescript-eslint/no-deprecated": "off",
			"@typescript-eslint/no-useless-constructor": "off",
			"obsidianmd/no-global-this": "off",
		},
	}
);
