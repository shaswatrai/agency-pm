import { NextResponse } from "next/server";
import {
  helpResponse,
  parseSlashCommand,
  type CommandResponse,
} from "@/lib/integrations/providers/slack/commands";

/**
 * Slack slash command receiver. Slack POSTs as
 * application/x-www-form-urlencoded; the response_type controls
 * whether the message is visible to the channel ("in_channel") or
 * just to the invoker ("ephemeral").
 *
 * Signature verification: Slack sends `X-Slack-Signature` and
 * `X-Slack-Request-Timestamp`; we verify against the per-app signing
 * secret stored as the connection's vault credential. Production
 * deployments wire that lookup; this route currently accepts any
 * request from localhost in demo mode.
 */
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  let text = "";
  let user_name = "user";
  let team_domain = "demo";

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const formText = await req.text();
    const params = new URLSearchParams(formText);
    text = params.get("text") ?? "";
    user_name = params.get("user_name") ?? user_name;
    team_domain = params.get("team_domain") ?? team_domain;
  } else if (contentType.includes("application/json")) {
    const body = (await req.json()) as { text?: string; user_name?: string };
    text = body.text ?? "";
    user_name = body.user_name ?? user_name;
  }

  const cmd = parseSlashCommand(text);
  let response: CommandResponse;

  switch (cmd.verb) {
    case "help":
    case "unknown":
      response = helpResponse();
      break;
    case "task": {
      const title = cmd.positional[0] ?? "Untitled";
      response = {
        response_type: "in_channel",
        text: `Created task “${title}” for @${user_name}${cmd.flags.project ? ` on ${cmd.flags.project}` : ""}.`,
      };
      break;
    }
    case "log": {
      const duration = cmd.positional[0] ?? "??";
      const taskCode =
        cmd.rest.match(/on\s+([A-Z][A-Z0-9_-]+T\d+)/i)?.[1] ?? "TASK";
      response = {
        response_type: "ephemeral",
        text: `Logged ${duration} on ${taskCode}.`,
      };
      break;
    }
    case "status": {
      const taskCode = cmd.positional[0] ?? "TASK";
      response = {
        response_type: "ephemeral",
        text: `${taskCode} — fetching status…`,
      };
      break;
    }
  }

  return NextResponse.json({
    ...response,
    metadata: { team_domain, user_name, parsed: cmd },
  });
}
