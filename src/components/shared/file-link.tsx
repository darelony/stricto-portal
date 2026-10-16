import { Download, Eye } from "lucide-react"
import { fileUrl, IMAGE_MIME_TYPES } from "@/lib/upload-rules"
import { cn } from "@/lib/utils"

type FileRef = { id: string; filename: string; mimeType?: string } | null | undefined

/** Download link (and preview link for PDFs/images) for a stored file. */
export function FileLink({ file, className, label, showPreview = true }: { file: FileRef; className?: string; label?: string; showPreview?: boolean }) {
  if (!file) return <span className="text-sm text-muted-foreground">—</span>
  const previewable = file.mimeType === "application/pdf" || (file.mimeType ? IMAGE_MIME_TYPES.includes(file.mimeType) : false)
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <a
        href={fileUrl(file.id)}
        className="inline-flex max-w-56 items-center gap-1 rounded text-sm font-medium text-primary underline-offset-4 hover:underline"
        title={file.filename}
      >
        <Download className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate">{label ?? file.filename}</span>
      </a>
      {showPreview && previewable ? (
        <a
          href={fileUrl(file.id, true)}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`Pregled: ${file.filename}`}
          title="Pregled"
        >
          <Eye className="size-4" />
        </a>
      ) : null}
    </span>
  )
}
