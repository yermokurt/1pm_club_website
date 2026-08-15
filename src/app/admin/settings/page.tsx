import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/data";
export default async function SettingsPage() {
  return (
    <section className="pt-8">
      <p className="eyebrow">Business controls</p>
      <h2 className="display text-5xl mt-2">Settings</h2>
      <div className="mt-7">
        <SettingsForm settings={await getSettings()} />
      </div>
    </section>
  );
}
