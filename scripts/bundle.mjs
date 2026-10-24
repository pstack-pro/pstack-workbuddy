#!/usr/bin/env node
// Builds the SkillHub / WorkBuddy upload zip.
// One skill per zip, SKILL.md at the zip root, the 58 skills nested at skills/<name>/SKILL.md.
// Usage: node scripts/bundle.mjs [--check]
// --check fails when bundle/SKILL.md drifted from the generated index or version, and still builds the zip.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const check = process.argv.includes("--check");
const SLUG = "pstack";
const HOMEPAGE = "https://github.com/pstack-pro/pstack-workbuddy";
const SLUG_RE = /^[a-z0-9-]{2,128}$/;
const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;
const MAX_FILES = 200;
const MAX_BYTES = 10 * 1024 * 1024;
const COPY_DIRS = ["skills", "docs", "agents"];
const COPY_FILES = ["LICENSE", "NOTICE", "README.md", "PORTING.md"];
const TAGS = ["pstack", "poteto", "workbuddy", "workflow", "agent-skills", "code-review", "verification"];

function fail(message) {
	console.error(`bundle: ${message}`);
	process.exit(1);
}

function walk(dir, fn) {
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) walk(full, fn);
		else if (entry.isFile()) fn(full);
	}
}

function sha256(file) {
	return createHash("sha256").update(fs.readFileSync(file)).digest("hex");
}

function frontmatterLines(text) {
	const lines = text.split("\n");
	if ((lines[0] || "").trim() !== "---") fail("skill is missing frontmatter");
	const end = lines.findIndex((line, index) => index > 0 && line.trim() === "---");
	if (end < 0) fail("skill frontmatter does not close");
	return lines.slice(1, end);
}

function getField(lines, key) {
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (!line.startsWith(`${key}:`)) continue;
		let value = line.slice(key.length + 1).trim();
		if (value === ">-" || value === ">" || value === "|" || value === "|-") {
			const parts = [];
			for (const next of lines.slice(i + 1)) {
				if (next.startsWith(" ") || next.trim() === "") parts.push(next.trim());
				else break;
			}
			return parts.filter(Boolean).join(" ");
		}
		if (value.startsWith('"') && value.endsWith('"')) {
			value = value.slice(1, -1).replaceAll('\\"', '"').replaceAll("\\\\", "\\");
		} else if (value.startsWith("'") && value.endsWith("'")) {
			value = value.slice(1, -1).replaceAll("''", "'");
		}
		return value;
	}
	return "";
}

function purpose(description) {
	const desc = description.replaceAll("/pstack:", "/");
	const sentences = desc
		.split(/(?<=[.!?])\s+(?=[A-Z`/])/)
		.map((item) => item.trim())
		.filter(Boolean);
	if (sentences.length === 0) return "";
	const first = sentences[0];
	let pick = first;
	if (first.startsWith("Apply") && sentences.length > 1) pick = sentences[1];
	else if (/^Use (for|when|only)/.test(first)) {
		pick = sentences.slice(1).find((item) => !/^(Use|Skip|Type) /.test(item)) || first;
	}
	pick = pick.replaceAll('"', "'");
	if (pick.length <= 170) return pick;
	return `${pick.slice(0, 167).replace(/[ ,;]+$/u, "")}...`;
}

function skillsIndex(rows) {
	const groups = [
		["Start here", (name) => ["setup-pstack", "poteto-mode", "poteto-help"].includes(name)],
		[
			"Principles (one-rule skills poteto-mode cites; you rarely invoke them directly)",
			(name) => name.startsWith("principle-"),
		],
		["Workflow skills", () => true],
	];
	const seen = new Set();
	const lines = [];
	for (const [title, pred] of groups) {
		let group = rows.filter(([name]) => !seen.has(name) && pred(name));
		if (title === "Start here") {
			const order = ["setup-pstack", "poteto-mode", "poteto-help"];
			group.sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
		}
		for (const [name] of group) seen.add(name);
		lines.push(`### ${title}`, "");
		for (const [name, line] of group) lines.push(`- \`/${name}\`: ${line}`);
		lines.push("");
	}
	if (seen.size !== rows.length) fail("skills index dropped a skill");
	return lines.join("\n").replace(/\n+$/u, "");
}

function loadSkills() {
	const dir = path.join(root, "skills");
	const names = fs
		.readdirSync(dir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name)
		.sort();
	const rows = [];
	for (const name of names) {
		const file = path.join(dir, name, "SKILL.md");
		if (!fs.existsSync(file)) fail(`skills/${name} has no SKILL.md`);
		const lines = frontmatterLines(fs.readFileSync(file, "utf8"));
		const skillName = getField(lines, "name");
		if (skillName !== name) fail(`skills/${name}/SKILL.md name is ${skillName || "empty"}`);
		const description = getField(lines, "description");
		if (!description) fail(`skills/${name} has no description`);
		rows.push([name, purpose(description)]);
	}
	return rows;
}

function render(text, version, count, index) {
	let next = text.replace(/^version:.*$/m, `version: ${version}`);
	next = next.replace(/^slug:.*$/m, `slug: ${SLUG}`);
	next = next.replace(/^name:.*$/m, "name: pstack");
	const swaps = [
		[/ported to WorkBuddy: \d+ skills/u, `ported to WorkBuddy: ${count} skills`],
		[/the \d+ bundled pstack skills/u, `the ${count} bundled pstack skills`],
		[/port of pstack \d+\.\d+\.\d+/u, `port of pstack ${version}`],
		[/All \d+ pstack skills/u, `All ${count} pstack skills`],
	];
	for (const [pattern, replacement] of swaps) {
		if (!pattern.test(next)) fail(`bundle/SKILL.md is missing ${pattern}`);
		next = next.replace(pattern, replacement);
	}
	const start = next.indexOf("\n## Skills\n");
	const end = next.indexOf("\n## Missing compared with the full plugin\n");
	if (start < 0 || end < 0 || end <= start) fail("bundle/SKILL.md is missing the Skills section");
	next = `${next.slice(0, start)}\n## Skills\n\n${index}\n${next.slice(end)}`;
	if (!next.endsWith("\n")) next += "\n";
	return next;
}

function assertFrontmatter(text, version) {
	const lines = frontmatterLines(text);
	const fields = {
		name: getField(lines, "name"),
		slug: getField(lines, "slug"),
		version: getField(lines, "version"),
		displayName: getField(lines, "displayName"),
		summary: getField(lines, "summary"),
		description: getField(lines, "description"),
		license: getField(lines, "license"),
		homepage: getField(lines, "homepage"),
	};
	if (fields.name !== "pstack") fail(`root skill name is ${fields.name}`);
	if (fields.slug !== SLUG) fail(`root skill slug is ${fields.slug}`);
	if (!SLUG_RE.test(fields.slug)) fail(`slug does not match ${SLUG_RE}`);
	if (fields.version !== version) fail(`root skill version ${fields.version} != ${version}`);
	if (!SEMVER.test(fields.version)) fail(`version ${fields.version} is not SemVer`);
	if (fields.displayName !== "pstack (WorkBuddy)") fail("displayName changed");
	if (fields.license !== "MIT") fail("license must stay MIT");
	if (fields.homepage !== HOMEPAGE) fail("homepage changed");
	if (!fields.summary || !fields.description) fail("summary and description are required");
	const tagLine = lines.find((line) => line.startsWith("tags:"));
	const tags = (tagLine || "")
		.replace(/^tags:\s*/u, "")
		.replace(/^\[|\]$/gu, "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	if (tags.join(",") !== TAGS.join(",")) fail(`tags must stay ${TAGS.join(", ")}`);
}

function linkTarget(raw) {
	const target = raw.split("#")[0];
	if (!target || /^[a-z][a-z0-9+.-]*:/iu.test(target) || target.includes("<")) return null;
	try {
		return decodeURI(target);
	} catch {
		return null;
	}
}

function resolves(fromDir, target) {
	const resolved = path.resolve(fromDir, target);
	return fs.existsSync(resolved);
}

// Fail when the bundle drops a file a markdown link could already open in the repo.
// Placeholder targets and upstream paths this port does not ship stay as written.
function checkLinks(dir) {
	const broken = [];
	walk(dir, (file) => {
		if (!file.endsWith(".md")) return;
		const rel = path.relative(dir, file);
		const text = fs.readFileSync(file, "utf8");
		const bundleHere = path.dirname(file);
		const repoFile = rel === "SKILL.md" ? skillFile : path.join(root, rel);
		const repoHere = path.dirname(repoFile);
		for (const match of text.matchAll(/\]\(([^)\s]+)\)/g)) {
			const target = linkTarget(match[1]);
			if (!target) continue;
			const inBundle = resolves(bundleHere, target);
			if (rel === "SKILL.md") {
				if (!inBundle) broken.push(`${rel} -> ${match[1]}`);
				continue;
			}
			if (resolves(repoHere, target) && !inBundle) broken.push(`${rel} -> ${match[1]}`);
		}
	});
	return broken;
}

const upstream = JSON.parse(fs.readFileSync(path.join(root, "UPSTREAM.json"), "utf8"));
const version = String(upstream.pstack || "");
if (!SEMVER.test(version)) fail(`UPSTREAM.json pstack version ${version || "missing"} is not SemVer`);
if (!SLUG_RE.test(SLUG)) fail(`slug ${SLUG} does not match ${SLUG_RE}`);

const skillFile = path.join(root, "bundle", "SKILL.md");
if (!fs.existsSync(skillFile)) fail("bundle/SKILL.md is missing");
const skills = loadSkills();
const rendered = render(fs.readFileSync(skillFile, "utf8"), version, skills.length, skillsIndex(skills));
assertFrontmatter(rendered, version);

if (rendered !== fs.readFileSync(skillFile, "utf8")) {
	if (check) {
		const expected = path.join(os.tmpdir(), "pstack-bundle-SKILL.md");
		fs.writeFileSync(expected, rendered);
		const diff = spawnSync("diff", ["-u", skillFile, expected], { encoding: "utf8" });
		console.error(diff.stdout || diff.stderr);
		fail("bundle/SKILL.md is stale. Run node scripts/bundle.mjs");
	}
	fs.writeFileSync(skillFile, rendered);
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "pstack-bundle-"));
try {
	for (const dir of COPY_DIRS) {
		const from = path.join(root, dir);
		if (!fs.existsSync(from)) fail(`missing ${dir}/`);
		fs.cpSync(from, path.join(stage, dir), { recursive: true, dereference: true });
	}
	for (const file of COPY_FILES) {
		const from = path.join(root, file);
		if (!fs.existsSync(from)) fail(`missing ${file}`);
		fs.copyFileSync(from, path.join(stage, file));
	}
	fs.writeFileSync(path.join(stage, "SKILL.md"), rendered);

	const copied = [];
	walk(stage, (file) => copied.push(file));
	for (const file of copied) {
		const rel = path.relative(stage, file);
		if (rel === "SKILL.md") continue;
		const source = path.join(root, rel);
		if (!fs.existsSync(source)) fail(`staged ${rel} is not in the repo`);
		if (sha256(file) !== sha256(source)) fail(`staged ${rel} does not match the repo byte for byte`);
	}
	if (copied.some((file) => path.relative(stage, file).startsWith(`hooks${path.sep}`) || path.relative(stage, file) === "hooks")) {
		fail("hooks must not be in the bundle");
	}

	const nested = copied
		.map((file) => path.relative(stage, file).split(path.sep).join("/"))
		.filter((rel) => /^skills\/[^/]+\/SKILL\.md$/u.test(rel));
	if (nested.length !== skills.length) fail(`zip has ${nested.length} nested skills, index has ${skills.length}`);

	const broken = checkLinks(stage);
	if (broken.length) {
		for (const item of broken) console.error(`broken link: ${item}`);
		fail(`${broken.length} markdown link(s) do not resolve inside the bundle`);
	}

	const uncompressed = copied.reduce((sum, file) => sum + fs.statSync(file).size, 0);
	if (copied.length > MAX_FILES) fail(`${copied.length} files exceeds the SkillHub limit of ${MAX_FILES}`);
	if (uncompressed > MAX_BYTES) fail(`uncompressed ${uncompressed} bytes exceeds ${MAX_BYTES}`);

	const when = new Date(upstream.committedAt || 0);
	if (Number.isNaN(when.getTime())) fail("UPSTREAM.json committedAt is not a date");
	for (const file of copied) fs.utimesSync(file, when, when);

	const dist = path.join(root, "dist");
	fs.mkdirSync(dist, { recursive: true });
	for (const entry of fs.readdirSync(dist)) {
		if (/^pstack-.*\.zip$/u.test(entry)) fs.unlinkSync(path.join(dist, entry));
	}
	const zipPath = path.join(dist, `pstack-${version}.zip`);
	const names = copied.map((file) => path.relative(stage, file).split(path.sep).join("/")).sort();
	execFileSync("zip", ["-X", "-q", zipPath, "-@"], {
		cwd: stage,
		input: `${names.join("\n")}\n`,
		env: { ...process.env, TZ: "UTC" },
	});

	const listed = execFileSync("zipinfo", ["-1", zipPath], { encoding: "utf8" })
		.split("\n")
		.map((line) => line.trim())
		.filter(Boolean);
	const zipFiles = listed.filter((name) => !name.endsWith("/"));
	if (!listed.includes("SKILL.md")) fail("zip is missing root SKILL.md");
	if (listed.some((name) => name.startsWith("/") || name.split("/").includes(".."))) fail("zip path escapes the root");
	if (listed.some((name) => name === "hooks" || name.startsWith("hooks/"))) fail("zip contains hooks");
	if (zipFiles.length !== copied.length) fail(`zip lists ${zipFiles.length} files, staged ${copied.length}`);
	const zipNested = zipFiles.filter((name) => /^skills\/[^/]+\/SKILL\.md$/u.test(name));
	if (zipNested.length !== skills.length) fail(`zip nested skills ${zipNested.length} != ${skills.length}`);

	const zipBytes = fs.statSync(zipPath).size;
	if (zipBytes > MAX_BYTES) fail(`zip ${zipBytes} bytes exceeds ${MAX_BYTES}`);

	console.log(`bundle ${path.relative(root, zipPath)}`);
	console.log(`files ${zipFiles.length}`);
	console.log(`zip_bytes ${zipBytes}`);
	console.log(`uncompressed_bytes ${uncompressed}`);
	console.log(`slug ${SLUG}`);
	console.log(`version ${version}`);
} finally {
	fs.rmSync(stage, { recursive: true, force: true });
}
