import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import test from "node:test";
import type * as TypeScript from "typescript";

const requireFromProject = createRequire(path.join(process.cwd(), "package.json"));
const ts = requireFromProject("typescript") as typeof TypeScript;

function isTypeOrModuleLiteral(node: TypeScript.Node): boolean {
	for (let current = node; !ts.isSourceFile(current); current = current.parent) {
		if (
			ts.isImportDeclaration(current) ||
			ts.isExportDeclaration(current) ||
			ts.isTypeNode(current) ||
			ts.isInterfaceDeclaration(current)
		) {
			return true;
		}
	}
	return false;
}

function isPropertyName(node: TypeScript.Node): boolean {
	if (ts.isSourceFile(node)) return false;
	const parent = node.parent;
	return (
		(ts.isPropertyAssignment(parent) ||
			ts.isPropertyDeclaration(parent) ||
			ts.isMethodDeclaration(parent) ||
			ts.isPropertySignature(parent) ||
			ts.isMethodSignature(parent)) &&
		parent.name === node
	);
}

function collectViolations(file: string, sourceText: string): string[] {
	const source = ts.createSourceFile(
		file,
		sourceText,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TS
	);
	const violations: string[] = [];
	const record = (node: TypeScript.Node, kind: string, value: string) => {
		const location = source.getLineAndCharacterOfPosition(node.getStart(source));
		violations.push(
			`${file}:${(location.line + 1).toString()}:${(location.character + 1).toString()} ${kind} ${JSON.stringify(value)}`
		);
	};
	const visit = (node: TypeScript.Node): void => {
		if (!isTypeOrModuleLiteral(node) && !isPropertyName(node)) {
			if (
				(ts.isStringLiteral(node) ||
					ts.isNoSubstitutionTemplateLiteral(node) ||
					ts.isTemplateHead(node) ||
					ts.isTemplateMiddle(node) ||
					ts.isTemplateTail(node)) &&
				node.text.length > 0
			) {
				record(node, "string", node.text);
			} else if (
				ts.isNumericLiteral(node) &&
				Number(node.text) !== 0
			) {
				record(node, "number", node.text);
			}
		}
		ts.forEachChild(node, visit);
	};
	visit(source);
	return violations;
}

test("reports runtime template fragments and non-zero numbers with locations", () => {
	const violations = collectViolations(
		"fixture.ts",
		[
			'import type { Value } from "types";',
			'type Mode = "edit" | "run";',
			"const named = { property: 0 };",
			"const message = `hello ${named.property} world`;",
			"const retries = 3;",
		].join("\n")
	);

	assert.deepEqual(violations, [
		'fixture.ts:4:17 string "hello "',
		'fixture.ts:4:40 string " world"',
		'fixture.ts:5:17 number "3"',
	]);
});

test("keeps runtime string and numeric literals in constants.ts", () => {
	const srcDir = path.join(process.cwd(), "src");
	const files = readdirSync(srcDir).filter(
		(name) => name.endsWith(".ts") && name !== "constants.ts"
	);
	const violations = files.flatMap((file) => {
		const sourceText = readFileSync(path.join(srcDir, file), "utf8");
		return collectViolations(file, sourceText);
	});

	assert.deepEqual(violations, []);
});
