export const env = {
  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  RESEND_API_KEY: process.env.RESEND_API_KEY ?? "",
  EMAIL_FROM: process.env.EMAIL_FROM ?? "Atelier <noreply@example.com>",
};

export const SUPABASE_CONFIGURED = Boolean(
  env.SUPABASE_URL && env.SUPABASE_ANON_KEY,
);
