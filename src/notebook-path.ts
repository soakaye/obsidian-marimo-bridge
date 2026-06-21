import * as fs from "fs";
import * as path from "path";
import { EXT_PY, RUNTIME_CONSTANTS } from "./constants";

export interface ResolvedVaultNotebook {
	/** Stable, normalized Vault-relative key used for run-server deduplication. */
	key: string;
	/** Real absolute path passed to `marimo run`. */
	absolutePath: string;
}

/**
 * Resolve a requested run notebook while enforcing the Vault boundary.
 *
 * Symbolic links are resolved before containment is checked, so a link inside
 * the Vault cannot be used to launch a notebook outside it.
 */
export function resolveVaultNotebook(
	vaultPath: string,
	requestedPath: string
): ResolvedVaultNotebook | null {
	if (!requestedPath) return null;
	const normalizedRequest = requestedPath.replaceAll(
		RUNTIME_CONSTANTS.BACKSLASH,
		path.sep
	);
	if (path.isAbsolute(normalizedRequest)) return null;

	try {
		const realVault = fs.realpathSync(vaultPath);
		const candidate = path.resolve(realVault, normalizedRequest);
		const realCandidate = fs.realpathSync(candidate);
		const relative = path.relative(realVault, realCandidate);
		const escapesVault =
			relative === RUNTIME_CONSTANTS.PARENT_PATH ||
			relative.startsWith(`${RUNTIME_CONSTANTS.PARENT_PATH}${path.sep}`) ||
			path.isAbsolute(relative);
		if (escapesVault) return null;

		const stat = fs.statSync(realCandidate);
		if (!stat.isFile() || path.extname(realCandidate).toLowerCase() !== EXT_PY) {
			return null;
		}

		return {
			key: relative.split(path.sep).join(RUNTIME_CONSTANTS.SLASH),
			absolutePath: realCandidate,
		};
	} catch {
		return null;
	}
}
