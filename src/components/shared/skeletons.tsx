import { Skeleton } from "@/components/ui/skeleton"

export function TableSkeleton({ rows = 6, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-xl border" role="status" aria-label="Učitavanje">
      <div className="flex gap-4 border-b p-3">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 border-b p-3 last:border-0">
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton key={c} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function CardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Učitavanje">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border p-5">
          <Skeleton className="mb-3 h-4 w-1/2" />
          <Skeleton className="h-8 w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Učitavanje">
      <Skeleton className="h-8 w-64" />
      <CardsSkeleton />
      <TableSkeleton />
    </div>
  )
}
