-- ============================================================================
-- Storage bucket for project files
-- Idempotent: safe to re-run.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values (
  'project-files',
  'project-files',
  false,
  52428800  -- 50 MB
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

-- ============================================================================
-- RLS on storage.objects (Pass 2 chunk 5 will tighten further)
-- For now: any authenticated user can read/write to the project-files bucket.
-- The `files` table RLS gates which rows the user can see at the metadata
-- layer; signed URLs gate downloads.
-- ============================================================================

-- Drop existing policies first (rerun-safe)
drop policy if exists "Authenticated read project-files" on storage.objects;
drop policy if exists "Authenticated upload project-files" on storage.objects;
drop policy if exists "Owner delete project-files" on storage.objects;

create policy "Authenticated read project-files" on storage.objects
  for select using (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

create policy "Authenticated upload project-files" on storage.objects
  for insert with check (
    bucket_id = 'project-files'
    and auth.role() = 'authenticated'
  );

create policy "Owner delete project-files" on storage.objects
  for delete using (
    bucket_id = 'project-files'
    and auth.uid() = owner
  );
