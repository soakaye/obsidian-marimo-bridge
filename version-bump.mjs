import { readFileSync, writeFileSync } from "fs";

// Run automatically by `npm version`. Syncs manifest.json and versions.json to
// the new package version (keeping the existing minAppVersion).
const targetVersion = process.env.npm_package_version;

// Bump manifest.json to the target version and read minAppVersion from it.
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const { minAppVersion } = manifest;
manifest.version = targetVersion;
writeFileSync("manifest.json", JSON.stringify(manifest, null, "\t") + "\n");

// Record target version -> minAppVersion in versions.json (used by BRAT and
// Obsidian to pick the right release for an app version).
const versions = JSON.parse(readFileSync("versions.json", "utf8"));
versions[targetVersion] = minAppVersion;
writeFileSync("versions.json", JSON.stringify(versions, null, "\t") + "\n");
