import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_SETTINGS } from "../src/settings";

test("does not expose a configurable server host", () => {
	assert.equal(
		Object.prototype.hasOwnProperty.call(DEFAULT_SETTINGS, "host"),
		false
	);
});
