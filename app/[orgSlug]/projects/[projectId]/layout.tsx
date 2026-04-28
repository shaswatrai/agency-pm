import { ProjectHeader } from "@/components/project/ProjectHeader";

export default async function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return (
    <div className="flex h-full flex-col">
      <ProjectHeader projectId={projectId} />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
