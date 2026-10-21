// Packs the plugin the way `pnpm publish` would and checks the tarball against
// the release checklist in docs/emdash-plugin-custom-404/packaging.md. CI runs
// it on every PR; run it locally with `pnpm check:package` from this package.
//
//   node scripts/check-package.ts [--pack-destination <dir>]
//
// The .tgz is written to <dir> (a fresh temp dir by default) and left there.
// Node runs this file directly by stripping its types; `pnpm typecheck` checks
// them (scripts/tsconfig.json).
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseArgs } from "node:util";

import semver from "semver";
import { z } from "zod";

/** What `pnpm pack --json` prints. */
const PackResult = z.object({
	filename: z.string(),
	files: z.array(z.object({ path: z.string() })),
});

const Dependencies = z.record(z.string(), z.string()).default({});

/** The fields of the packed package.json this script reads. */
const Manifest = z.object({
	name: z.string(),
	version: z.string(),
	dependencies: Dependencies,
	devDependencies: Dependencies,
	peerDependencies: Dependencies,
});

type DependencyField = "dependencies" | "devDependencies" | "peerDependencies";
const dependencyFields: DependencyField[] = ["dependencies", "devDependencies", "peerDependencies"];

/** Files the "files" allowlist must ship. */
const requiredFiles = ["package.json", "README.md", "CHANGELOG.md", "LICENCE"];

/** Test-only and editor-only files the allowlist's negated globs must exclude. */
function isNonRuntimeFile(path: string): boolean {
	return (
		path.endsWith(".test.ts") ||
		path.endsWith("test-support.ts") ||
		path === "src/astro/tsconfig.json"
	);
}

const packageDir = new URL("..", import.meta.url);

const { values } = parseArgs({ options: { "pack-destination": { type: "string" } } });
const destination = values["pack-destination"] ?? mkdtempSync(join(tmpdir(), "custom-404-pack-"));

const failures: string[] = [];

const pack = PackResult.parse(
	JSON.parse(
		execFileSync("pnpm", ["pack", "--pack-destination", destination, "--json"], {
			cwd: packageDir,
			encoding: "utf8",
		}),
	),
);
const files = pack.files.map((file) => file.path);

for (const required of requiredFiles) {
	if (!files.includes(required)) failures.push(`tarball is missing ${required}`);
}
for (const file of files.filter(isNonRuntimeFile)) {
	failures.push(`tarball contains non-runtime file ${file}`);
}

const manifest = Manifest.parse(
	JSON.parse(
		execFileSync("tar", ["-xOzf", pack.filename, "package/package.json"], { encoding: "utf8" }),
	),
);

// Packing must have resolved every workspace protocol to a real range.
for (const field of dependencyFields) {
	for (const [name, range] of Object.entries(manifest[field])) {
		if (/^(catalog|workspace):/.test(range)) {
			failures.push(`packed ${field}.${name} is still "${range}"`);
		}
	}
}

// The catalog versions we build and test against (packed into devDependencies)
// must fall inside the peer ranges users are told are supported.
for (const [name, peerRange] of Object.entries(manifest.peerDependencies)) {
	const testedRange = manifest.devDependencies[name];
	if (testedRange === undefined) {
		failures.push(`peer ${name} has no devDependency to test against`);
	} else if (!semver.subset(testedRange, peerRange)) {
		failures.push(`tested ${name}@${testedRange} is outside peer range "${peerRange}"`);
	}
}

const changelog = readFileSync(new URL("CHANGELOG.md", packageDir), "utf8");
const version = semver.parse(manifest.version)?.version ?? "";
const escaped = version.replaceAll(".", "\\.");
if (!new RegExp(`^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}$`, "m").test(changelog)) {
	failures.push(`CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section`);
}
if (!new RegExp(`^\\[${escaped}\\]: \\S+$`, "m").test(changelog)) {
	failures.push(`CHANGELOG.md has no [${version}] link reference`);
}

console.log(`Packed ${manifest.name}@${manifest.version} (${files.length} files)`);
console.log(pack.filename);
if (failures.length > 0) {
	for (const failure of failures) console.error(`✗ ${failure}`);
	process.exit(1);
}
console.log("✓ tarball, manifest, peer ranges and changelog all check out");
