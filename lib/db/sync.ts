"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/lib/db/store";
import { useRuntimeConfig } from "@/lib/config/runtime";

const CHANNEL_NAME = "atelier-sync";

// Slices that should broadcast across tabs. We send the whole array per slice
// after every change. With our demo dataset (~20 tasks, ~5 clients) this is
// cheap and dead simple. For production this would become per-entity events.
const SYNC_SLICES = [
  "tasks",
  "projects",
  "clients",
  "phases",
  "comments",
  "timeEntries",
  "files",
  "invoices",
  "automations",
  "quotes",
  "timesheetSubmissions",
  "userSkills",
] as const;

type SliceName = (typeof SYNC_SLICES)[number];

interface SliceMessage {
  kind: "slice";
  source: string;
  slice: SliceName;
  data: unknown;
  ts: number;
}

interface PresenceMessage {
  kind: "presence";
  source: string;
  ts: number;
}

interface PresenceQueryMessage {
  kind: "ping";
  source: string;
  ts: number;
}

type Message = SliceMessage | PresenceMessage | PresenceQueryMessage;

const TAB_ID =
  typeof window === "undefined"
    ? "ssr"
    : `tab_${Math.random().toString(36).slice(2, 9)}`;

let channel: BroadcastChannel | null = null;
let lastApplied = new Map<SliceName, number>();
// Peers we've seen recently
const peers = new Map<string, number>();

function ensureChannel() {
  if (typeof window === "undefined") return null;
  if (channel) return channel;
  if (!("BroadcastChannel" in window)) return null;
  channel = new BroadcastChannel(CHANNEL_NAME);
  return channel;
}

let initialized = false;

export function initSync(onPresenceChange: () => void) {
  if (typeof window === "undefined") return;
  if (initialized) return;
  initialized = true;

  const ch = ensureChannel();
  if (!ch) return;

  // Connected mode bypasses BroadcastChannel entirely and relies on
  // Supabase Realtime for cross-tab/cross-browser sync.
  const isConnected = () => useRuntimeConfig.getState().useSupabase;

  // Subscribe to store changes and broadcast each slice when it changes.
  let prev = useStore.getState();
  useStore.subscribe((state) => {
    if (isConnected()) return; // Supabase Realtime handles it
    for (const slice of SYNC_SLICES) {
      if (state[slice] !== prev[slice]) {
        const msg: SliceMessage = {
          kind: "slice",
          source: TAB_ID,
          slice,
          data: state[slice],
          ts: Date.now(),
        };
        try {
          ch.postMessage(msg);
        } catch {
          // ignore
        }
      }
    }
    prev = state;
  });

  // Listen for incoming messages
  ch.onmessage = (event: MessageEvent<Message>) => {
    const msg = event.data;
    if (!msg || msg.source === TAB_ID) return;

    if (msg.kind === "slice") {
      const last = lastApplied.get(msg.slice) ?? 0;
      if (msg.ts <= last) return;
      lastApplied.set(msg.slice, msg.ts);
      // Apply without retriggering broadcast: setState with a partial works
      // because our subscribe diff check uses `!==` on the slice itself.
      // We update `prev` so the subscribe handler won't re-broadcast.
      useStore.setState({ [msg.slice]: msg.data } as never);
      prev = useStore.getState();
    } else if (msg.kind === "presence") {
      peers.set(msg.source, msg.ts);
      onPresenceChange();
    } else if (msg.kind === "ping") {
      // Reply with our presence
      const reply: PresenceMessage = {
        kind: "presence",
        source: TAB_ID,
        ts: Date.now(),
      };
      ch.postMessage(reply);
    }
  };

  // Announce ourselves
  const announce = () => {
    ch.postMessage({
      kind: "presence",
      source: TAB_ID,
      ts: Date.now(),
    } as PresenceMessage);
  };
  announce();
  ch.postMessage({
    kind: "ping",
    source: TAB_ID,
    ts: Date.now(),
  } as PresenceQueryMessage);

  // Keepalive — drop peers that haven't pinged in 8s
  setInterval(() => {
    announce();
    const now = Date.now();
    let changed = false;
    for (const [id, ts] of peers) {
      if (now - ts > 8000) {
        peers.delete(id);
        changed = true;
      }
    }
    if (changed) onPresenceChange();
  }, 3000);

  // Goodbye on unload
  window.addEventListener("beforeunload", () => {
    try {
      ch.postMessage({
        kind: "presence",
        source: TAB_ID,
        ts: 0, // ts=0 means "I'm leaving"
      } as PresenceMessage);
    } catch {
      // ignore
    }
  });
}

export function usePeerCount() {
  const [count, setCount] = useState(1);
  useEffect(() => {
    const update = () => {
      // count = self + active peers (where ts != 0)
      let n = 1;
      const now = Date.now();
      for (const ts of peers.values()) {
        if (ts !== 0 && now - ts < 8000) n++;
      }
      setCount(n);
    };
    initSync(update);
    update();
    const interval = setInterval(update, 1500);
    return () => clearInterval(interval);
  }, []);
  return count;
}
