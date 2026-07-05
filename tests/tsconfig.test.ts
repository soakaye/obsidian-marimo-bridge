import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import test from "node:test";

interface TsConfig {
	compilerOptions?: {
		types?: string[];
	};
}

test("explicitly includes Node types for type-aware linting", () => {
	const tsconfig = JSON.parse(
		readFileSync(path.join(process.cwd(), "tsconfig.json"), "utf8")
	) as TsConfig;

	assert.ok(
		tsconfig.compilerOptions?.types?.includes("node"),
		"tsconfig compilerOptions.types must include node"
	);
});
