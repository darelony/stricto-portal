import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

/** Small server-rendered table for history sections. */
export function SimpleTable({
  headers,
  rows,
  empty = "Nema podataka.",
  caption,
}: {
  headers: string[]
  rows: React.ReactNode[][]
  empty?: string
  caption?: string
}) {
  if (!rows.length) return <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">{empty}</p>
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            {headers.map((h) => (
              <TableHead key={h} className="whitespace-nowrap">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((cells, i) => (
            <TableRow key={i}>
              {cells.map((c, j) => (
                <TableCell key={j}>{c}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
