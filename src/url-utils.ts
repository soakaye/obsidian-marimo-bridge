import { QUERY_FILE_KEY } from "./constants";

/**
 * Read a notebook path from a URL.
 *
 * `URLSearchParams.get()` already percent-decodes the value, so callers must
 * use the returned string directly.
 */
export function getFilePathFromUrl(
	targetUrl: string,
	baseUrl?: string
): string | null {
	try {
		return new URL(targetUrl, baseUrl).searchParams.get(QUERY_FILE_KEY);
	} catch {
		return null;
	}
}
