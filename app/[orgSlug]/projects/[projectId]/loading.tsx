import { Skeleton } from "@/components/ui/skeleton";

export default function ProjectLoading() {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-card/40 px-4 pt-6 md:px-8">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="mt-2 h-7 w-96" />
        <div className="mt-4 flex gap-2">
          <Skeleton className="h-5 w-20 rounded-pill" />
          <Skeleton className="h-5 w-16 rounded-pill" />
          <Skeleton className="h-5 w-32 rounded-pill" />
        </div>
        <div className="mt-5 grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
        <div className="mt-5 flex gap-2 pb-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-7 w-20" />
          ))}
        </div>
      </div>
      <div className="flex-1 p-4 md:p-8">
        <div className="grid h-full grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, col) => (
            <div key={col} className="space-y-2">
              <Skeleton className="h-5 w-24" />
              {Array.from({ length: 3 + (col % 3) }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-md" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
