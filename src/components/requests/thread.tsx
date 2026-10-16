import type { Role } from "@prisma/client"
import { Lock, Paperclip } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { FileLink } from "@/components/shared/file-link"
import { formatDateTime, initials } from "@/lib/format"
import { cn } from "@/lib/utils"

type FileRef = { id: string; filename: string; mimeType: string }

export type ThreadMessage = {
  id: string
  body: string
  isInternal: boolean
  createdAt: Date
  author: { name: string | null; email: string; role: Role } | null
  files: FileRef[]
}

export type ThreadOpening = {
  body: string
  createdAt: Date
  author: { name: string | null; email: string; role: Role } | null
  files: FileRef[]
}

function isStaffRole(role: Role | undefined) {
  return role === "ADMIN" || role === "CONSULTANT"
}

/**
 * Request conversation. Callers decide which messages are passed in: clients must
 * never receive internal notes (filter in the query, not here).
 */
export function RequestThread({ opening, messages }: { opening: ThreadOpening; messages: ThreadMessage[] }) {
  return (
    <ol className="space-y-4" aria-label="Tok komunikacije">
      <ThreadItem
        message={{ id: "opening", body: opening.body, isInternal: false, createdAt: opening.createdAt, author: opening.author, files: opening.files }}
        label="Opis zahteva"
      />
      {messages.map((m) => (
        <ThreadItem key={m.id} message={m} />
      ))}
    </ol>
  )
}

function ThreadItem({ message, label }: { message: ThreadMessage; label?: string }) {
  const name = message.author?.name ?? message.author?.email ?? "Obrisan korisnik"
  const staff = isStaffRole(message.author?.role)
  return (
    <li
      className={cn(
        "rounded-xl border p-4",
        message.isInternal ? "border-dashed border-warning/60 bg-warning-soft/50" : staff ? "bg-accent/40" : "bg-card",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <Avatar className="size-7">
          <AvatarFallback className={cn("text-xs", staff ? "bg-primary text-primary-foreground" : "bg-muted")}>
            {initials(name)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{name}</span>
        <span className="text-xs text-muted-foreground">{staff ? "Konsultant" : "Klijent"}</span>
        <time className="ml-auto text-xs text-muted-foreground" dateTime={message.createdAt.toISOString()}>
          {formatDateTime(message.createdAt)}
        </time>
      </div>
      {message.isInternal ? (
        <p className="mb-2 inline-flex items-center gap-1 text-xs font-semibold text-warning-foreground">
          <Lock className="size-3.5" aria-hidden /> Interna beleška – nije vidljiva klijentu
        </p>
      ) : null}
      {label ? <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p> : null}
      <p className="text-sm whitespace-pre-line">{message.body}</p>
      {message.files.length ? (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t pt-2" aria-label="Prilozi">
          {message.files.map((f) => (
            <li key={f.id} className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5 text-muted-foreground" aria-hidden />
              <FileLink file={f} />
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  )
}
