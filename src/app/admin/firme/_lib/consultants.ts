import "server-only"
import { db } from "@/lib/db"
import { roleLabels } from "@/lib/labels"

/** Active staff users that can be assigned to a company. */
export async function consultantOptions() {
  const users = await db.user.findMany({
    where: { active: true, role: { in: ["CONSULTANT", "ADMIN"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, role: true },
  })
  return users.map((u) => ({ value: u.id, label: `${u.name ?? u.email} (${roleLabels[u.role]})` }))
}
