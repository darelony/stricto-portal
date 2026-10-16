"use client"

import * as React from "react"
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type DefaultValues,
  type FieldValues,
  type Path,
  type UseFormReturn,
} from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import type { z } from "zod"
import { toast } from "sonner"
import { FileText, Loader2, Paperclip, Upload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { uploadFile } from "@/lib/upload-client"
import { ACCEPT_ATTRIBUTE } from "@/lib/upload-rules"
import { formatFileSize } from "@/lib/format"
import type { UploadedFileInput } from "@/lib/validations/common"

// Form kit: react-hook-form + Zod on the client, the same schema re-validated in the
// server action. The action receives the *raw* form values (strings), never the
// client-transformed output, so server parsing is the single source of truth.

export type ActionResultLike<T = unknown> =
  | { ok: true; data: T; message?: string }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

export function useActionForm<S extends z.ZodType<unknown, FieldValues>, T = unknown>({
  schema,
  defaultValues,
  action,
  onSuccess,
  successMessage,
  resetOnSuccess = false,
}: {
  schema: S
  defaultValues: DefaultValues<z.input<S>>
  action: (values: z.input<S>) => Promise<ActionResultLike<T>>
  onSuccess?: (data: T) => void
  successMessage?: string
  resetOnSuccess?: boolean
}) {
  const form = useForm<z.input<S>, unknown, z.output<S>>({
    resolver: zodResolver(schema as never) as never,
    defaultValues,
    mode: "onTouched",
  })
  const [pending, startTransition] = React.useTransition()

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues()
    startTransition(async () => {
      const result = await action(values)
      if (result.ok) {
        const message = result.message ?? successMessage
        if (message) toast.success(message)
        if (resetOnSuccess) form.reset(defaultValues)
        onSuccess?.(result.data)
      } else {
        if (result.fieldErrors) {
          for (const [name, errors] of Object.entries(result.fieldErrors)) {
            form.setError(name as Path<z.input<S>>, { type: "server", message: errors[0] })
          }
        }
        toast.error(result.error)
      }
    })
  })

  return { form, onSubmit, pending }
}

export function Form<T extends FieldValues>({
  form,
  onSubmit,
  children,
  className,
  ...props
}: {
  form: UseFormReturn<T, unknown, never> | UseFormReturn<T, unknown, unknown>
  onSubmit: (e?: React.BaseSyntheticEvent) => void | Promise<void>
  children: React.ReactNode
  className?: string
} & Omit<React.ComponentProps<"form">, "onSubmit">) {
  return (
    <FormProvider {...(form as UseFormReturn<T>)}>
      <form noValidate onSubmit={onSubmit} className={cn("space-y-4", className)} {...props}>
        {children}
      </form>
    </FormProvider>
  )
}

function useFieldError(name: string): string | undefined {
  const { formState } = useFormContext()
  const parts = name.split(".")
  let current: unknown = formState.errors
  for (const part of parts) current = (current as Record<string, unknown> | undefined)?.[part]
  return (current as { message?: string } | undefined)?.message
}

function FieldShell({
  name,
  label,
  description,
  required,
  children,
  className,
  htmlFor,
}: {
  name: string
  label?: React.ReactNode
  description?: React.ReactNode
  required?: boolean
  children: React.ReactNode
  className?: string
  htmlFor?: string
}) {
  const error = useFieldError(name)
  return (
    <div className={cn("grid gap-1.5", className)}>
      {label ? (
        <Label htmlFor={htmlFor ?? name}>
          {label}
          {required ? (
            <span className="text-danger" aria-hidden>
              {" "}
              *
            </span>
          ) : null}
        </Label>
      ) : null}
      {children}
      {description && !error ? <p className="text-xs text-muted-foreground" id={`${name}-desc`}>{description}</p> : null}
      {error ? (
        <p className="text-xs font-medium text-destructive" id={`${name}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

type BaseFieldProps = {
  name: string
  label?: React.ReactNode
  description?: React.ReactNode
  required?: boolean
  className?: string
  disabled?: boolean
}

export function TextField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  type = "text",
  placeholder,
  autoComplete,
  inputMode,
}: BaseFieldProps & {
  type?: "text" | "email" | "password" | "tel" | "number" | "date" | "datetime-local" | "url" | "month"
  placeholder?: string
  autoComplete?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
}) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  return (
    <FieldShell name={name} label={label} description={description} required={required} className={className}>
      <Input
        id={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : description ? `${name}-desc` : undefined}
        aria-required={required}
        {...register(name)}
      />
    </FieldShell>
  )
}

export function DateField(props: BaseFieldProps) {
  return <TextField {...props} type="date" />
}

export function TextareaField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  rows = 4,
  placeholder,
}: BaseFieldProps & { rows?: number; placeholder?: string }) {
  const { register } = useFormContext()
  const error = useFieldError(name)
  return (
    <FieldShell name={name} label={label} description={description} required={required} className={className}>
      <Textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${name}-error` : undefined}
        aria-required={required}
        {...register(name)}
      />
    </FieldShell>
  )
}

export type Option = { value: string; label: string }

const EMPTY = "__empty__"

export function SelectField({
  name,
  label,
  description,
  required,
  className,
  disabled,
  options,
  placeholder = "Izaberite…",
  allowEmpty,
  emptyLabel = "— Nije izabrano —",
}: BaseFieldProps & { options: Option[]; placeholder?: string; allowEmpty?: boolean; emptyLabel?: string }) {
  const { control } = useFormContext()
  const error = useFieldError(name)
  return (
    <FieldShell name={name} label={label} description={description} required={required} className={className}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={field.value ? String(field.value) : allowEmpty ? EMPTY : ""}
            onValueChange={(v) => field.onChange(v === EMPTY ? "" : v)}
            disabled={disabled}
          >
            <SelectTrigger id={name} className="w-full" aria-invalid={Boolean(error)} onBlur={field.onBlur}>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {allowEmpty ? <SelectItem value={EMPTY}>{emptyLabel}</SelectItem> : null}
              {options.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
    </FieldShell>
  )
}

export function CheckboxField({ name, label, description, className, disabled }: BaseFieldProps) {
  const { control } = useFormContext()
  const error = useFieldError(name)
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("flex items-start gap-2.5", className)}>
          <Checkbox
            id={name}
            checked={Boolean(field.value)}
            onCheckedChange={(v) => field.onChange(v === true)}
            disabled={disabled}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${name}-error` : undefined}
            className="mt-0.5"
          />
          <div className="grid gap-0.5">
            <Label htmlFor={name} className="leading-snug font-normal">
              {label}
            </Label>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
            {error ? (
              <p className="text-xs font-medium text-destructive" id={`${name}-error`} role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>
      )}
    />
  )
}

export function SwitchField({ name, label, description, className, disabled }: BaseFieldProps) {
  const { control } = useFormContext()
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <div className={cn("flex items-center justify-between gap-4 rounded-lg border p-3", className)}>
          <div className="grid gap-0.5">
            <Label htmlFor={name}>{label}</Label>
            {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Switch id={name} checked={Boolean(field.value)} onCheckedChange={field.onChange} disabled={disabled} />
        </div>
      )}
    />
  )
}

/** Multiple choice as a list of checkboxes; value is string[]. */
export function MultiCheckField({
  name,
  label,
  description,
  required,
  className,
  options,
  columns = 2,
}: BaseFieldProps & { options: Option[]; columns?: 1 | 2 | 3 }) {
  const { control } = useFormContext()
  return (
    <FieldShell name={name} label={label} description={description} required={required} className={className} htmlFor={`${name}-0`}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value: string[] = Array.isArray(field.value) ? field.value : []
          return (
            <div
              role="group"
              aria-label={typeof label === "string" ? label : undefined}
              className={cn("grid gap-2", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-3")}
            >
              {options.map((o, i) => {
                const id = `${name}-${i}`
                const checked = value.includes(o.value)
                return (
                  <label
                    key={o.value}
                    htmlFor={id}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-lg border p-2.5 text-sm transition-colors hover:bg-muted/50",
                      checked && "border-primary/50 bg-accent/60",
                    )}
                  >
                    <Checkbox
                      id={id}
                      checked={checked}
                      onCheckedChange={(v) =>
                        field.onChange(v === true ? [...value, o.value] : value.filter((x) => x !== o.value))
                      }
                      className="mt-0.5"
                    />
                    <span className="leading-snug">{o.label}</span>
                  </label>
                )
              })}
            </div>
          )
        }}
      />
    </FieldShell>
  )
}

/** Single file upload: uploads immediately to private storage, stores {storageKey, filename}. */
export function FileField({
  name,
  label,
  description = "PDF, slika, Word ili Excel, najviše 20 MB.",
  required,
  className,
  companyId,
  accept = ACCEPT_ATTRIBUTE,
  existing,
}: BaseFieldProps & {
  companyId: string | null
  accept?: string
  existing?: { filename: string } | null
}) {
  const { control } = useFormContext()
  const [uploading, setUploading] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <FieldShell name={name} label={label} description={description} required={required} className={className} htmlFor={`${name}-input`}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = field.value as UploadedFileInput | null | undefined
          return (
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={inputRef}
                id={`${name}-input`}
                type="file"
                accept={accept}
                className="sr-only"
                onChange={async (e) => {
                  const file = e.target.files?.[0]
                  e.target.value = ""
                  if (!file) return
                  setUploading(true)
                  try {
                    field.onChange(await uploadFile(file, companyId))
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Otpremanje nije uspelo.")
                  } finally {
                    setUploading(false)
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
                {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
                {uploading ? "Otpremanje…" : value || existing ? "Zameni fajl" : "Izaberi fajl"}
              </Button>
              {value ? (
                <span className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm">
                  <FileText className="size-4 shrink-0" aria-hidden />
                  <span className="truncate">{value.filename}</span>
                  <button
                    type="button"
                    onClick={() => field.onChange(null)}
                    className="rounded p-0.5 hover:bg-background"
                    aria-label="Ukloni fajl"
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ) : existing ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <FileText className="size-4" aria-hidden /> {existing.filename}
                </span>
              ) : null}
            </div>
          )
        }}
      />
    </FieldShell>
  )
}

/** Multiple attachments; value is UploadedFileInput[]. */
export function AttachmentsField({
  name,
  label = "Prilozi",
  description = "Do 10 fajlova, najviše 20 MB po fajlu.",
  className,
  companyId,
  accept = ACCEPT_ATTRIBUTE,
  max = 10,
}: BaseFieldProps & { companyId: string | null; accept?: string; max?: number }) {
  const { control } = useFormContext()
  const [uploading, setUploading] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)
  return (
    <FieldShell name={name} label={label} description={description} className={className} htmlFor={`${name}-input`}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value: UploadedFileInput[] = Array.isArray(field.value) ? field.value : []
          return (
            <div className="space-y-2">
              <input
                ref={inputRef}
                id={`${name}-input`}
                type="file"
                multiple
                accept={accept}
                className="sr-only"
                onChange={async (e) => {
                  const files = Array.from(e.target.files ?? []).slice(0, Math.max(0, max - value.length))
                  e.target.value = ""
                  if (!files.length) return
                  setUploading((n) => n + files.length)
                  const uploaded: UploadedFileInput[] = []
                  for (const file of files) {
                    try {
                      uploaded.push(await uploadFile(file, companyId))
                    } catch (err) {
                      toast.error(`${file.name}: ${err instanceof Error ? err.message : "otpremanje nije uspelo."}`)
                    } finally {
                      setUploading((n) => n - 1)
                    }
                  }
                  field.onChange([...value, ...uploaded])
                }}
              />
              {value.length ? (
                <ul className="flex flex-wrap gap-2">
                  {value.map((f) => (
                    <li key={f.storageKey} className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted px-2 py-1 text-sm">
                      <Paperclip className="size-3.5 shrink-0" aria-hidden />
                      <span className="max-w-48 truncate">{f.filename}</span>
                      <button
                        type="button"
                        onClick={() => field.onChange(value.filter((x) => x.storageKey !== f.storageKey))}
                        className="rounded p-0.5 hover:bg-background"
                        aria-label={`Ukloni ${f.filename}`}
                      >
                        <X className="size-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading > 0 || value.length >= max}
                onClick={() => inputRef.current?.click()}
              >
                {uploading > 0 ? <Loader2 className="animate-spin" /> : <Paperclip />}
                {uploading > 0 ? "Otpremanje…" : "Priloži fajlove"}
              </Button>
            </div>
          )
        }}
      />
    </FieldShell>
  )
}

export function SubmitButton({
  pending,
  children,
  className,
  variant,
}: {
  pending: boolean
  children: React.ReactNode
  className?: string
  variant?: React.ComponentProps<typeof Button>["variant"]
}) {
  return (
    <Button type="submit" disabled={pending} className={className} variant={variant}>
      {pending ? <Loader2 className="animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  )
}

export function FormGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 sm:grid-cols-2", className)}>{children}</div>
}

export function FileSizeNote({ size }: { size: number }) {
  return <span className="text-xs text-muted-foreground">{formatFileSize(size)}</span>
}
