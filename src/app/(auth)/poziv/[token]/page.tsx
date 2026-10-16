import type { Metadata } from "next"
import Link from "next/link"
import { TimerOff } from "lucide-react"
import { findValidInvite } from "@/lib/invites"
import { roleLabels } from "@/lib/labels"
import { AcceptInviteForm } from "./form"

export const metadata: Metadata = { title: "Prihvatanje pozivnice" }

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invite = await findValidInvite(token)
  if (!invite) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning">
          <TimerOff className="size-7" aria-hidden />
        </div>
        <h1 className="text-xl font-semibold">Pozivnica nije važeća</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Pozivnica je istekla (važi 72 sata), već je iskorišćena ili je opozvana. Zatražite novu pozivnicu od svog
          konsultanta.
        </p>
        <Link href="/prijava" className="mt-6 inline-block text-sm text-primary underline-offset-4 hover:underline">
          Idi na prijavu
        </Link>
      </div>
    )
  }
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">Dobro došli na SafeTrack</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Pozvani ste kao <strong>{roleLabels[invite.role]}</strong>
        {invite.company ? (
          <>
            {" "}
            za firmu <strong>{invite.company.name}</strong>
          </>
        ) : null}
        . Postavite lozinku da biste aktivirali nalog <strong>{invite.email}</strong>.
      </p>
      <AcceptInviteForm token={token} defaultName={invite.name ?? ""} />
    </>
  )
}
