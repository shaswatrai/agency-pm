import type { IncomingWebhookEvent } from "@/types/domain";

/**
 * Figma sends webhook v2 payloads with this shape:
 *   { event_type, passcode, file_key, file_name, ... }
 *
 * Event types we care about:
 *   - FILE_COMMENT       — a comment was added; mirror to task activity
 *   - FILE_UPDATE        — file mutated; flag linked tasks as "design updated"
 *   - FILE_VERSION_UPDATE — a named version was published; capture snapshot
 *
 * Verification: Figma webhooks v2 deliver the configured `passcode` in
 * the body. We compare in constant time before processing.
 */

export type FigmaEventType =
  | "FILE_COMMENT"
  | "FILE_UPDATE"
  | "FILE_VERSION_UPDATE"
  | "FILE_DELETE"
  | "PING";

export interface FigmaWebhookEnvelope {
  event_type: FigmaEventType;
  passcode: string;
  timestamp: string;
  webhook_id: string;
  file_key?: string;
  file_name?: string;
  // FILE_COMMENT
  comment_id?: string;
  comment?: { text: string }[];
  triggered_by?: { id: string; handle: string };
  // FILE_VERSION_UPDATE
  version_id?: string;
  label?: string;
  description?: string;
}

export interface FigmaProcessResult {
  ok: boolean;
  action: string;
  message: string;
}

/**
 * Process a verified inbound Figma webhook event. Returns a summary
 * the caller can persist to incoming_webhook_events.process_error
 * (on failure) or .processed_at (on success).
 *
 * The processing itself is intentionally minimal in chunk 2 — it
 * surfaces an event into the in-app activity stream, which the
 * automation engine and outbound webhook bus can both consume.
 */
export async function processFigmaEvent(
  envelope: FigmaWebhookEnvelope,
  audit: Pick<IncomingWebhookEvent, "endpointId" | "organizationId">,
): Promise<FigmaProcessResult> {
  switch (envelope.event_type) {
    case "PING":
      return { ok: true, action: "ping", message: "Figma webhook ping ack" };

    case "FILE_COMMENT": {
      const text = envelope.comment?.map((c) => c.text).join(" ") ?? "(no text)";
      return {
        ok: true,
        action: "comment_received",
        message: `Comment from ${envelope.triggered_by?.handle ?? "unknown"}: ${text.slice(0, 200)}`,
      };
    }

    case "FILE_UPDATE":
      return {
        ok: true,
        action: "file_updated",
        message: `${envelope.file_name ?? envelope.file_key} updated`,
      };

    case "FILE_VERSION_UPDATE":
      return {
        ok: true,
        action: "version_published",
        message: `${envelope.label ?? envelope.version_id ?? "version"} published`,
      };

    case "FILE_DELETE":
      return {
        ok: true,
        action: "file_deleted",
        message: `${envelope.file_name ?? envelope.file_key} deleted — links should be archived`,
      };

    default: {
      const exhaustive: string = envelope.event_type;
      return {
        ok: false,
        action: "unknown",
        message: `Unhandled Figma event_type: ${exhaustive}`,
      };
    }
  }
}
