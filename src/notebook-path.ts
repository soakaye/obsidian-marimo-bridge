import * as fs from "fs";
import * as path from "path";

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
	if (!requestedPath || path.isAbsolute(requestedPath)) return null;

	try {
		const realVault = fs.realpathSync(vaultPath);
		const candidate = path.resolve(realVault, requestedPath);
		const realCandidate = fs.realpathSync(candidate);
		const relative = path.relative(realVault, realCandidate);
		const escapesVault =
			relative === ".." ||
			relative.startsWith(`..${path.sep}`) ||
			path.isAbsolute(relative);
		if (escapesVault) return null;

		const stat = fs.statSync(realCandidate);
		if (!stat.isFile() || path.extname(realCandidate).toLowerCase() !== ".py") {
			return null;
		}

		return {
			key: relative.split(path.sep).join("/"),
			absolutePath: realCandidate,
		};
	} catch {
		return null;
	}
}
