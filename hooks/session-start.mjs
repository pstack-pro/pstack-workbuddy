// Inject the CodeBuddy mapping and the user's model rule at session start.
// Mirrors Cursor's always-applied rule, which CodeBuddy loads from ~/.codebuddy/rules/
// only after the file exists. The hook also names the file so the first session can see it.
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { emit, isOn, readStdin } from "./state.mjs";

const root =
	process.env.CODEBUDDY_PLUGIN_ROOT ||
	process.env.CLAUDE_PLUGIN_ROOT ||
	path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function read(file) {
	try {
		return fs.readFileSync(file, "utf8").trim();
	} catch {
		return "";
	}
}

try {
	const input = readStdin();
	const home = process.env.HOME || os.homedir();
	const modelsPath = path.join(home, ".codebuddy", "rules", "pstack-models.md");
	const models = read(modelsPath);
	const harness = read(path.join(root, "docs", "harness", "codebuddy.md"));
	const parts = [
		harness ||
			"pstack on CodeBuddy. Read docs/harness/codebuddy.md from the plugin root. Cursor model ids are not CodeBuddy model ids.",
		models
			? `<pstack_models file="${modelsPath}">\n${models}\n</pstack_models>`
			: `No ${modelsPath}. Role lines are missing, so omit Agent \`model\` (inherit the parent) and say so, or run /pstack:setup-pstack.`,
	];
	if (input.transcript_path) parts.push(`Current transcript: ${input.transcript_path}`);
	if (isOn(input.session_id)) {
		parts.push(
			"poteto-mode is sticky for this session. Follow skills/poteto-mode/SKILL.md. CodeBuddy has no Custom Mode. Turn it off with /pstack:poteto-mode off.",
		);
	}
	emit(input.hook_event_name || "SessionStart", parts.join("\n\n"));
} catch (error) {
	process.stderr.write(`pstack session-start: ${error?.message || error}\n`);
	emit("SessionStart", "pstack session-start hook failed. Read docs/harness/codebuddy.md from the plugin root.");
}
