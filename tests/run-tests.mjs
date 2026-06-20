import { spawnSync } from "node:child_process";
import {
	mkdtempSync,
	readdirSync,
	rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import esbuild from "esbuild";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testsDir = path.join(root, "tests");
const outputDir = mkdtempSync(path.join(tmpdir(), "marimo-bridge-tests-"));
const entryPoints = readdirSync(testsDir)
	.filter((name) => name.endsWith(".test.ts"))
	.map((name) => path.join(testsDir, name));

if (entryPoints.length === 0) {
	console.error("No test files found.");
	process.exitCode = 1;
} else {
	try {
		await esbuild.build({
			entryPoints,
			outdir: outputDir,
			bundle: true,
			platform: "node",
			format: "esm",
			target: "node20",
			sourcemap: "inline",
			plugins: [
				{
					name: "obsidian-test-stub",
					setup(build) {
						build.onResolve({ filter: /^obsidian$/ }, () => ({
							path: path.join(testsDir, "stubs", "obsidian.ts"),
						}));
					},
				},
			],
		});

		const compiledTests = readdirSync(outputDir)
			.filter((name) => name.endsWith(".test.js"))
			.map((name) => path.join(outputDir, name));
		const result = spawnSync(
			process.execPath,
			["--test", ...compiledTests],
			{ cwd: root, stdio: "inherit" }
		);
		process.exitCode = result.status ?? 1;
	} finally {
		rmSync(outputDir, { recursive: true, force: true });
	}
}
