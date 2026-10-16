import type { Metadata } from "next"
import { Scale } from "lucide-react"
import type { IntervalKey } from "@prisma/client"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { PageHeader } from "@/components/shared/page-header"
import { requireAdmin } from "@/lib/authz"
import { db } from "@/lib/db"
import { intervalKeyLabels } from "@/lib/labels"
import { loadAppSettings } from "@/lib/settings"
import { dueSoonWindow } from "@/lib/obligations/calc"
import { BrandingForm, CompanyInfoForm, IntervalsForm, ReminderOffsetsForm } from "@/components/admin/settings/settings-forms"

export const metadata: Metadata = { title: "Podešavanja" }

export default async function SettingsPage() {
  await requireAdmin()
  const [settings, intervals] = await Promise.all([loadAppSettings(), db.intervalSetting.findMany()])
  const byKey = new Map(intervals.map((i) => [i.key, i]))
  const rows = (Object.keys(intervalKeyLabels) as IntervalKey[]).map((key) => {
    const row = byKey.get(key)
    return { key, label: row?.label || intervalKeyLabels[key], description: row?.description ?? null, months: row?.months ?? null }
  })
  const offsets = [...settings.reminderOffsets].sort((a, b) => b - a)

  return (
    <>
      <PageHeader title="Podešavanja" description="Zakonski intervali, podsetnici, podaci o firmi i brending portala SafeTrack." />
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Zakonski intervali</CardTitle>
            <CardDescription>
              Na osnovu ovih vrednosti portal predlaže datum važenja osposobljavanja, lekarskih pregleda, pregleda opreme,
              ispitivanja radne sredine i revizije procene rizika.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <Scale aria-hidden />
              <AlertTitle>Uskladite intervale sa važećim propisima</AlertTitle>
              <AlertDescription>
                Vrednosti nisu ugrađene u aplikaciju – odgovornost je konsultanata da ih održavaju u skladu sa važećim
                zakonima i pravilnicima iz oblasti BZR i aktom o proceni rizika klijenta. Izmena intervala važi za nove
                unose; postojećim evidencijama datumi važenja se ne menjaju (po potrebi ih izmenite pojedinačno).
              </AlertDescription>
            </Alert>
            <IntervalsForm rows={rows} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Podsetnici</CardTitle>
            <CardDescription>
              Koliko dana pre roka se šalju email podsetnici konsultantima i kontakt osobama klijenata. Obaveza dobija
              status „Uskoro ističe” kada do roka ostane {dueSoonWindow(offsets)} dana ili manje (najveća vrednost), a
              podsetnik se šalje i kada rok istekne – svaki samo jednom.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReminderOffsetsForm offsets={offsets} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Podaci o firmi</CardTitle>
            <CardDescription>Prikazuju se u izveštajima i email porukama.</CardDescription>
          </CardHeader>
          <CardContent>
            <CompanyInfoForm info={settings} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Brending</CardTitle>
            <CardDescription>Logo i tekst na dnu email poruka.</CardDescription>
          </CardHeader>
          <CardContent>
            <BrandingForm hasLogo={Boolean(settings.logoFileId)} emailFooter={settings.emailFooter} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
