/**
 * Slack slash command parser. Slack POSTs as
 * application/x-www-form-urlencoded with fields:
 *   token, team_id, team_domain, channel_id, channel_name, user_id,
 *   user_name, command, text, response_url, trigger_id, api_app_id
 *
 * We support these subcommands (text after the slash command):
 *   /atelier task "Title here" --project ACME-WEB --assign @marcus
 *   /atelier log 1h45m on TASK-CODE -- "what I did"
 *   /atelier status TASK-CODE
 *   /atelier help
 */

export interface ParsedCommand {
  verb: "task" | "log" | "status" | "help" | "unknown";
  rest: string;
  flags: Record<string, string>;
  positional: string[];
}

export function parseSlashCommand(text: string): ParsedCommand {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return { verb: "help", rest: "", flags: {}, positional: [] };

  const [head, ...tail] = trimmed.split(/\s+/);
  const verb = (
    ["task", "log", "status", "help"].includes(head ?? "") ? head : "unknown"
  ) as ParsedCommand["verb"];

  const flags: Record<string, string> = {};
  const positional: string[] = [];
  const remainder = tail.join(" ");

  // Tokenize respecting double quotes
  const tokens: string[] = [];
  let buf = "";
  let inQuote = false;
  for (let i = 0; i < remainder.length; i++) {
    const ch = remainder[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (ch === " " && !inQuote) {
      if (buf) tokens.push(buf);
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf) tokens.push(buf);

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.startsWith("--")) {
      const k = t.slice(2);
      const next = tokens[i + 1];
      if (next && !next.startsWith("--")) {
        flags[k] = next;
        i++;
      } else {
        flags[k] = "true";
      }
    } else {
      positional.push(t);
    }
  }

  return { verb, rest: remainder, flags, positional };
}

export interface CommandResponse {
  response_type: "in_channel" | "ephemeral";
  text: string;
  blocks?: unknown[];
}

export function helpResponse(): CommandResponse {
  return {
    response_type: "ephemeral",
    text:
      "Atelier slash commands:\n" +
      "• `/atelier task \"Title\" --project ACME-WEB --assign @marcus` — create task\n" +
      "• `/atelier log 1h30m on TASK-CODE -- \"description\"` — log time\n" +
      "• `/atelier status TASK-CODE` — show task status\n" +
      "• `/atelier help` — this message",
  };
}
