"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { mintToken, type ApiToken, type ApiTokenScope } from "./auth";

interface ApiTokensState {
  tokens: ApiToken[];
  /**
   * Plaintext tokens shown to the user only on creation. Removed on
   * subsequent reads — store transient values in component state, not
   * here, after the user has seen them once.
   */
  ephemeralPlaintext: Record<string, string>;

  createToken: (input: {
    organizationId: string;
    name: string;
    scopes: ApiTokenScope[];
    expiresAt?: string;
    rateLimitPerMinute?: number;
    createdBy?: string;
  }) => Promise<ApiToken>;
  revokeToken: (id: string) => void;
  clearEphemeral: (id: string) => void;
  recordUsage: (tokenId: string) => void;
}

export const useApiTokensStore = create<ApiTokensState>()(
  persist(
    (set) => ({
      tokens: [],
      ephemeralPlaintext: {},

      createToken: async (input) => {
        const { plaintext, prefix, hash } = await mintToken();
        const token: ApiToken = {
          id: `tok_${crypto.randomUUID()}`,
          organizationId: input.organizationId,
          name: input.name,
          prefix,
          hash,
          scopes: input.scopes,
          expiresAt: input.expiresAt,
          isActive: true,
          rateLimitPerMinute: input.rateLimitPerMinute ?? 600,
          createdBy: input.createdBy,
          createdAt: new Date().toISOString(),
        };
        set((s) => ({
          tokens: [...s.tokens, token],
          ephemeralPlaintext: { ...s.ephemeralPlaintext, [token.id]: plaintext },
        }));
        return token;
      },

      revokeToken: (id) => {
        set((s) => ({
          tokens: s.tokens.map((t) =>
            t.id === id ? { ...t, isActive: false } : t,
          ),
        }));
      },

      clearEphemeral: (id) => {
        set((s) => {
          const next = { ...s.ephemeralPlaintext };
          delete next[id];
          return { ephemeralPlaintext: next };
        });
      },

      recordUsage: (tokenId) => {
        set((s) => ({
          tokens: s.tokens.map((t) =>
            t.id === tokenId ? { ...t, lastUsedAt: new Date().toISOString() } : t,
          ),
        }));
      },
    }),
    {
      name: "atelier:api-tokens",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tokens: s.tokens,
        // Don't persist ephemeral plaintext — it lives only for the
        // immediate creation modal lifecycle
      }),
    },
  ),
);
