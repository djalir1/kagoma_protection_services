import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Upload, Save } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { rwf } from "@/lib/format";
import { fetchCourses, type Course } from "@/lib/queries";
import { Field, inputClass, Loading, PageHeader, Panel } from "@/components/app/kit";
import { RoleGate, ADMIN } from "@/components/app/role-gate";

export const Route = createFileRoute("/dashboard/settings")({
  component: () => (
    <RoleGate roles={ADMIN}>
      <Settings />
    </RoleGate>
  ),
});

type Co = Record<string, string | number | boolean | null>;

const SECTIONS: { title: string; fields: [string, string, string?][] }[] = [
  {
    title: "Company",
    fields: [
      ["legal_name", "Legal name"],
      ["trading_name", "Trading name"],
      ["tin", "TIN"],
      ["company_code", "Company code"],
      ["address_line", "Registered address"],
      ["phone_1", "Phone 1"],
      ["phone_2", "Phone 2"],
      ["email", "Email"],
      ["website", "Website"],
    ],
  },
  {
    title: "Signatory",
    fields: [
      ["director_name", "Name"],
      ["director_title", "Title"],
      ["director_postnominals", "Post-nominals"],
    ],
  },
  {
    title: "Payments",
    fields: [
      ["momo_code", "MoMo merchant code"],
      ["momo_name", "MoMo account name"],
      ["momo_ussd_pattern", "MoMo dial string", "Use {amount} where the amount goes"],
      ["bank_name", "Bank"],
      ["bank_account", "Account number"],
      ["bank_account_name", "Account name"],
      ["bank_branch", "Branch"],
      ["bank_swift", "SWIFT"],
      ["payment_note", "Note shown to payers"],
      ["vat_rate", "VAT rate (%)"],
    ],
  },
];

function Settings() {
  const [co, setCo] = useState<Co | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [sig, setSig] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [c, s, cs] = await Promise.all([
      supabase.from("company_settings").select("*").eq("id", 1).single(),
      supabase.rpc("get_signature"),
      fetchCourses(),
    ]);
    setCo(c.data as Co);
    setSig((s.data as { data: string | null })?.data ?? null);
    setCourses(cs);
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const patch: Co = {};
    SECTIONS.flatMap((s) => s.fields).forEach(([k]) => {
      const v = String(f.get(k) ?? "").trim();
      patch[k] = k === "vat_rate" ? Number(v || 18) : v || null;
    });
    patch.vat_registered = f.get("vat_registered") === "on";
    patch.updated_at = new Date().toISOString();
    setBusy(true);
    const { error } = await supabase.from("company_settings").update(patch).eq("id", 1);
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    load();
  }

  async function upload(file: File) {
    if (file.size > 400_000)
      return toast.error("Use an image under 400 KB (a transparent PNG works best).");
    const data = await new Promise<string>((res) => {
      const r = new FileReader();
      r.onload = () => res(String(r.result));
      r.readAsDataURL(file);
    });
    const { error } = await supabase.rpc("set_signature", { p_data: data });
    if (error) return toast.error(error.message);
    setSig(data);
    toast.success("Signature saved. It appears only on documents staff choose to sign.");
  }

  async function saveFee(c: Course, field: "certificate_fee_rwf" | "fee_rwf", value: string) {
    const { error } = await supabase
      .from("courses")
      .update({ [field]: value === "" ? null : Number(value) })
      .eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(`${c.id} updated`);
  }

  if (!co) return <Loading />;

  return (
    <>
      <PageHeader
        title="Company settings"
        subtitle="Printed on every document and certificate, and used for payment instructions."
      />
      <form onSubmit={save} className="space-y-6">
        {SECTIONS.map((s) => (
          <Panel key={s.title} title={s.title}>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {s.fields.map(([k, label, hint]) => (
                <Field key={k} label={label} hint={hint}>
                  <input name={k} defaultValue={String(co[k] ?? "")} className={inputClass} />
                </Field>
              ))}
              {s.title === "Payments" && (
                <label className="flex items-center gap-2 self-end pb-2.5 text-sm">
                  <input
                    type="checkbox"
                    name="vat_registered"
                    defaultChecked={!!co.vat_registered}
                  />{" "}
                  Registered for VAT
                </label>
              )}
            </div>
          </Panel>
        ))}
        <button
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
          settings
        </button>
      </form>

      <Panel title="Signature" className="mt-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-24 w-64 items-center justify-center rounded-xl border border-dashed border-border bg-white">
            {sig ? (
              <img src={sig} alt="Signature" className="max-h-20 object-contain" />
            ) : (
              <span className="text-xs text-neutral-500">No signature uploaded</span>
            )}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm hover:border-primary/60">
            <Upload className="h-4 w-4" /> Upload signature image
            <input
              type="file"
              accept="image/png,image/webp,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
            />
          </label>
          <p className="text-xs text-muted-foreground sm:max-w-xs">
            Stored privately. Only signed-in staff can see it, and only on documents they sign.
          </p>
        </div>
      </Panel>

      <Panel title="Course fees" className="mt-6" bodyClassName="overflow-x-auto p-0 md:p-2">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2">Course</th>
              <th className="px-3 py-2">Study fee (empty = free)</th>
              <th className="px-3 py-2">Certificate fee (0 = issued on passing)</th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c) => (
              <tr key={c.id} className="border-b border-border/60">
                <td className="px-3 py-2">
                  <span className="font-display text-xs text-primary">{c.id}</span> {c.title}
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={c.fee_rwf ?? ""}
                    onBlur={(e) =>
                      e.target.value !== String(c.fee_rwf ?? "") &&
                      saveFee(c, "fee_rwf", e.target.value)
                    }
                    className={`${inputClass} w-36 py-1.5`}
                    placeholder="Free"
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="number"
                    min={0}
                    defaultValue={c.certificate_fee_rwf ?? ""}
                    onBlur={(e) =>
                      e.target.value !== String(c.certificate_fee_rwf ?? "") &&
                      saveFee(c, "certificate_fee_rwf", e.target.value)
                    }
                    className={`${inputClass} w-36 py-1.5`}
                  />{" "}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {rwf(c.certificate_fee_rwf)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </>
  );
}
