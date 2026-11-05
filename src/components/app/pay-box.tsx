import { useEffect, useState } from "react";
import { Copy, Loader2, Smartphone, Landmark } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { rwf } from "@/lib/format";
import { Field, inputClass } from "@/components/app/kit";

type Details = {
  momo: { code: string; name: string; ussd: string } | null;
  bank: {
    bank: string;
    account: string;
    account_name: string;
    branch: string | null;
    swift: string | null;
    currency: string;
  } | null;
  note: string | null;
};

let cache: Details | null = null;

export function usePaymentDetails() {
  const [d, setD] = useState<Details | null>(cache);
  useEffect(() => {
    if (cache) return;
    supabase.rpc("payment_details").then(({ data }) => {
      cache = data as Details;
      setD(cache);
    });
  }, []);
  return d;
}

const copy = (s: string) => {
  navigator.clipboard?.writeText(s);
  toast.success("Copied");
};

export function PaymentInstructions({ amount }: { amount: number }) {
  const d = usePaymentDetails();
  if (!d) return null;
  const ussd = d.momo?.ussd?.replace("{amount}", String(Math.round(amount)));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {d.momo && (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Smartphone className="h-4 w-4 text-primary" /> MTN MoMo
          </div>
          <div className="mt-2 text-xs text-muted-foreground">Dial on your phone:</div>
          <button
            onClick={() => ussd && copy(ussd)}
            className="mt-1 inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 font-mono text-sm"
          >
            {ussd} <Copy className="h-3.5 w-3.5" />
          </button>
          <div className="mt-2 text-xs text-muted-foreground">
            Pays {d.momo.name} (code {d.momo.code}). Keep the transaction ID from the SMS.
          </div>
          <a
            href={`tel:${encodeURIComponent(ussd ?? "")}`}
            className="mt-2 inline-block text-xs font-semibold text-primary sm:hidden"
          >
            Dial now
          </a>
        </div>
      )}
      {d.bank && (
        <div className="rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Landmark className="h-4 w-4 text-primary" /> Bank transfer
          </div>
          <dl className="mt-2 space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Bank:</span> {d.bank.bank}
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground">Account:</span>
              <button
                onClick={() => copy(d.bank!.account)}
                className="inline-flex items-center gap-1 font-mono"
              >
                {d.bank.account} <Copy className="h-3 w-3" />
              </button>
            </div>
            <div>
              <span className="text-muted-foreground">Name:</span> {d.bank.account_name}
            </div>
            <div>
              <span className="text-muted-foreground">Amount:</span> {rwf(amount)}
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}

export function SubmitPaymentForm({
  courseId,
  amount,
  onDone,
}: {
  courseId: string;
  amount: number;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { data, error } = await supabase.rpc("submit_certificate_payment", {
      p_course: courseId,
      p_amount: Number(f.get("amount")),
      p_method: String(f.get("method")),
      p_reference: String(f.get("reference")).trim(),
      p_phone: String(f.get("phone")).trim() || null,
    });
    setBusy(false);
    const r = data as { ok: boolean; reason?: string } | null;
    if (error || !r?.ok) {
      const why =
        r?.reason === "duplicate_reference"
          ? "That transaction ID has already been used."
          : r?.reason === "not_eligible"
            ? "Kagoma must confirm your identity before a certificate can be issued."
            : r?.reason === "exam_not_passed"
              ? "Pass the final exam first."
              : (error?.message ?? "The payment could not be recorded.");
      return toast.error(why);
    }
    toast.success(
      "Payment sent for confirmation. Your certificate is issued once Kagoma confirms it.",
    );
    onDone();
  }
  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
      <Field label="Amount paid (RWF)">
        <input
          name="amount"
          type="number"
          min={1}
          defaultValue={amount}
          required
          className={inputClass}
        />
      </Field>
      <Field label="Method">
        <select name="method" className={inputClass} defaultValue="momo">
          <option value="momo">MTN MoMo</option>
          <option value="airtel">Airtel Money</option>
          <option value="bank">Bank transfer</option>
        </select>
      </Field>
      <Field label="Transaction ID / reference">
        <input
          name="reference"
          required
          placeholder="From your SMS or bank slip"
          className={inputClass}
        />
      </Field>
      <Field label="Phone used">
        <input name="phone" type="tel" placeholder="+250…" className={inputClass} />
      </Field>
      <button
        disabled={busy}
        className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground sm:col-span-2"
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />} Submit payment
      </button>
    </form>
  );
}
