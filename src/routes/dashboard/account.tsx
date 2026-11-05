import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, ShieldCheck, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth, roleLabel, isLearnerRole } from "@/lib/auth";
import { Field, inputClass, PageHeader, Panel, StatusBadge } from "@/components/app/kit";
import { AddressFields } from "@/components/app/address-fields";
import { date } from "@/lib/format";

export const Route = createFileRoute("/dashboard/account")({
  component: AccountPage,
});

function AccountPage() {
  const { profile, user, refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  const [pwBusy, setPwBusy] = useState(false);
  if (!profile || !user) return null;
  const learner = isLearnerRole(profile.role);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const v = (k: string) => {
      const s = String(f.get(k) ?? "").trim();
      return s === "" ? null : s;
    };
    const patch: Record<string, string | null> = learner
      ? {
          first_name: v("first_name"),
          last_name: v("last_name"),
          phone: v("phone"),
          date_of_birth: v("date_of_birth"),
          national_id: v("national_id"),
          gender: v("gender"),
          country_name: v("country_name"),
          province: v("province"),
          district: v("district"),
          sector: v("sector"),
          cell: v("cell"),
          village: v("village"),
        }
      : { full_name: v("full_name"), phone: v("phone"), address_line: v("address_line") };
    setBusy(true);
    const { error } = await supabase.from("profiles").update(patch).eq("id", profile!.id);
    setBusy(false);
    if (error) {
      return toast.error(
        /national_id/.test(error.message)
          ? "That national ID is already registered to another account."
          : error.message,
      );
    }
    toast.success("Your details are saved");
    refresh();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const pw = String(f.get("pw"));
    if (pw.length < 8) return toast.error("Use at least 8 characters.");
    if (pw !== String(f.get("pw2"))) return toast.error("The two passwords do not match.");
    setPwBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password changed");
    e.currentTarget.reset();
  }

  return (
    <>
      <PageHeader title="Account" subtitle="Your details and sign-in." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Panel title={learner ? "Personal details" : "Organisation details"}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {learner ? (
              <>
                <Field label="First name">
                  <input
                    name="first_name"
                    defaultValue={profile.first_name ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Last name">
                  <input
                    name="last_name"
                    defaultValue={profile.last_name ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Date of birth">
                  <input
                    name="date_of_birth"
                    type="date"
                    defaultValue={profile.date_of_birth ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field
                  label="National ID / passport"
                  hint="Used to confirm your identity. Never shown publicly."
                >
                  <input
                    name="national_id"
                    defaultValue={profile.national_id ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Gender">
                  <select name="gender" defaultValue={profile.gender ?? ""} className={inputClass}>
                    <option value="">Prefer not to say</option>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="undisclosed">Undisclosed</option>
                  </select>
                </Field>
                <Field label="Phone">
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile.phone ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Country">
                  <input
                    name="country_name"
                    defaultValue={profile.country_name ?? "Rwanda"}
                    className={inputClass}
                  />
                </Field>
                <div className="hidden sm:block" />
                <AddressFields value={profile} />
              </>
            ) : (
              <>
                <Field label="Name" className="sm:col-span-2">
                  <input
                    name="full_name"
                    defaultValue={profile.full_name ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone">
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={profile.phone ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label="Address">
                  <input
                    name="address_line"
                    defaultValue={profile.address_line ?? ""}
                    className={inputClass}
                  />
                </Field>
              </>
            )}
            <div className="sm:col-span-2">
              <button
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />} Save details
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-6">
          <Panel title="Account">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">Email</dt>
                <dd className="mt-0.5 break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Account type
                </dt>
                <dd className="mt-0.5">
                  {roleLabel[profile.role]}
                  {profile.staff_title ? ` · ${profile.staff_title}` : ""}
                </dd>
              </div>
              {learner && (
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Identity check
                  </dt>
                  <dd className="mt-1 flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" />{" "}
                    <StatusBadge status={profile.vetting_status} />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                  Member since
                </dt>
                <dd className="mt-0.5">{date(profile.created_at)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel title="Change password">
            <form onSubmit={changePassword} className="space-y-3">
              <Field label="New password">
                <input
                  name="pw"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </Field>
              <Field label="Confirm">
                <input
                  name="pw2"
                  type="password"
                  autoComplete="new-password"
                  required
                  className={inputClass}
                />
              </Field>
              <button
                disabled={pwBusy}
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold hover:border-primary/60"
              >
                {pwBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <KeyRound className="h-4 w-4" />
                )}{" "}
                Update password
              </button>
            </form>
          </Panel>
        </div>
      </div>
    </>
  );
}
