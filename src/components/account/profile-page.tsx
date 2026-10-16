import { notFound } from "next/navigation"
import { db } from "@/lib/db"
import { requireUser } from "@/lib/authz"
import { isStaff } from "@/lib/permissions"
import { roleLabels } from "@/lib/labels"
import { PageHeader } from "@/components/shared/page-header"
import { ProfileForms } from "./profile-forms"

/** Profile page body shared by /portal/profil and /admin/profil. */
export async function ProfilePage() {
  const user = await requireUser()
  const record = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      passwordHash: true,
      notifyDeadlines: true,
      notifyRequests: true,
      notifyMessages: true,
      company: { select: { name: true } },
    },
  })
  if (!record) notFound()
  return (
    <>
      <PageHeader
        title="Profil i obaveštenja"
        description={`${roleLabels[user.role]}${record.company ? ` · ${record.company.name}` : ""}`}
      />
      <ProfileForms
        profile={{
          name: record.name,
          email: record.email,
          phone: record.phone,
          hasPassword: Boolean(record.passwordHash),
          notifyDeadlines: record.notifyDeadlines,
          notifyRequests: record.notifyRequests,
          notifyMessages: record.notifyMessages,
          isStaff: isStaff(user),
        }}
      />
    </>
  )
}
