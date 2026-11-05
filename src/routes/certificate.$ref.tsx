import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import QRCode from "qrcode";
import { ArrowLeft, Printer, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { date, titleCase } from "@/lib/format";
import { Loading } from "@/components/app/kit";
import plate from "@/assets/brand/plate.webp";
import seal from "@/assets/brand/seal.webp";
import crest from "@/assets/brand/crest.webp";
import signature from "@/assets/brand/signature.webp";

export const Route = createFileRoute("/certificate/$ref")({
  head: () => ({ meta: [{ title: "Certificate — KAGOMA" }] }),
  component: CertificatePage,
});

type Verify = {
  found: boolean;
  certificate_number?: string;
  holder?: string;
  course?: string;
  issued?: string;
  expires?: string | null;
  level?: string;
  status?: string;
};

function CertificatePage() {
  const { ref } = Route.useParams();
  const [c, setC] = useState<Verify | null>(null);
  const [qr, setQr] = useState("");

  useEffect(() => {
    supabase
      .rpc("verify_certificate", { p_ref: ref })
      .then(({ data }) => setC((data as Verify) ?? { found: false }));
    const url = `${window.location.origin}/verify?ref=${encodeURIComponent(ref)}`;
    QRCode.toDataURL(url, {
      margin: 0,
      width: 240,
      color: { dark: "#1a1407", light: "#ffffff00" },
    }).then(setQr);
  }, [ref]);

  if (!c)
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loading />
      </div>
    );

  if (!c.found) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
        <ShieldAlert className="h-12 w-12 text-destructive" />
        <h1 className="font-display text-2xl font-bold">No certificate with number {ref}</h1>
        <Link to="/verify" className="text-primary hover:underline">
          Check another number
        </Link>
      </div>
    );
  }

  const invalid = c.status !== "valid";

  return (
    <div className="min-h-screen bg-neutral-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4 landscape; margin: 0; } @media print { html, body { width: 297mm; height: 210mm; } }`}</style>
      <div className="no-print mx-auto mb-4 flex max-w-[297mm] items-center justify-between px-4">
        <Link
          to="/dashboard/certificates"
          className="inline-flex items-center gap-1 text-sm text-neutral-700 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Link>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white"
        >
          <Printer className="h-4 w-4" /> Print or save as PDF
        </button>
      </div>

      <div className="mx-auto w-full max-w-[297mm] overflow-x-auto px-2 print:px-0">
        <article
          className="print-sheet relative mx-auto aspect-[297/210] w-[297mm] min-w-[720px] overflow-hidden bg-white text-[#1a1407] shadow-2xl print:shadow-none"
          style={{ fontFamily: "'EB Garamond', Georgia, serif" }}
        >
          <img src={plate} alt="" className="absolute inset-0 h-full w-full object-cover" />
          {invalid && (
            <div className="absolute inset-0 z-20 flex items-center justify-center">
              <div className="rotate-[-18deg] border-4 border-red-700 px-10 py-3 font-sans text-6xl font-black uppercase tracking-widest text-red-700/80">
                {titleCase(c.status)}
              </div>
            </div>
          )}
          <div className="relative z-10 flex h-full flex-col items-center px-[22mm] pt-[16mm] text-center">
            <img src={crest} alt="" className="h-[20mm] w-auto" />
            <div className="mt-2 font-display text-[13px] font-bold tracking-[0.35em]">
              KAGOMA PROTECTION SERVICES
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-[#8a6f10]">
              Discipline · Vigilance · Protection
            </div>

            <h1 className="mt-[8mm] font-display text-[34px] font-bold tracking-[0.08em] text-[#8a6f10]">
              Certificate of {c.level === "trained" ? "Training" : "Competence"}
            </h1>
            <div className="mt-[4mm] text-[15px] italic">This is to certify that</div>
            <div className="mt-[2mm] font-display text-[30px] font-bold">{c.holder}</div>
            <div className="mx-auto mt-1 h-px w-[120mm] bg-[#c9a227]" />
            <div className="mt-[4mm] max-w-[200mm] text-[15px] italic">
              has successfully completed the course and passed the assessment for
            </div>
            <div className="mt-[2mm] font-display text-[20px] font-bold">{c.course}</div>
            <div className="mt-[3mm] text-[12px]">
              Issued {date(c.issued, { day: "numeric", month: "long", year: "numeric" })}
              {c.expires &&
                ` · valid until ${date(c.expires, { day: "numeric", month: "long", year: "numeric" })}`}{" "}
              · Level: {titleCase(c.level)}
            </div>

            <div className="mt-auto mb-[14mm] grid w-full grid-cols-3 items-end gap-[6mm]">
              <div className="justify-self-start text-center">
                {qr && (
                  <img src={qr} alt="Verification QR code" className="mx-auto h-[24mm] w-[24mm]" />
                )}
                <div className="mt-1 text-[8px] uppercase tracking-[0.15em]">Scan to verify</div>
                <div className="font-mono text-[9px]">{c.certificate_number}</div>
              </div>
              <img
                src={seal}
                alt="Kagoma seal"
                className="mx-auto h-[38mm] w-[38mm] object-contain"
              />
              <div className="justify-self-end text-center">
                <img src={signature} alt="Signature" className="mx-auto h-[16mm] object-contain" />
                <div className="mx-auto w-[60mm] border-t border-[#1a1407] pt-1 text-[11px] font-semibold">
                  Honore CYUBAHIRO Elyse
                </div>
                <div className="text-[9px]">Managing Director · SRMP-C · SRMP-R</div>
              </div>
            </div>
          </div>
        </article>
      </div>
      <p className="no-print mx-auto mt-4 max-w-[297mm] px-4 text-center text-xs text-neutral-600">
        Anyone can confirm this certificate at{" "}
        {typeof window !== "undefined" ? window.location.host : ""}/verify with the number{" "}
        {c.certificate_number}.
      </p>
    </div>
  );
}
