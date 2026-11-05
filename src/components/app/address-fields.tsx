import { useState } from "react";
import { RW_PROVINCES, provinceOf } from "@/lib/rwanda";
import { Field, inputClass } from "@/components/app/kit";

type Addr = {
  province?: string | null;
  district?: string | null;
  sector?: string | null;
  cell?: string | null;
  village?: string | null;
};

/** Province → district pickers and free-text sector, cell and village. Uses form field names. */
export function AddressFields({ value, required }: { value?: Addr; required?: boolean }) {
  const [province, setProvince] = useState(
    value?.province && RW_PROVINCES[value.province]
      ? value.province
      : provinceOf(value?.district) || "",
  );
  const districts = RW_PROVINCES[province] ?? [];
  return (
    <>
      <Field label="Province" required={required}>
        <select
          name="province"
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          required={required}
          className={inputClass}
        >
          <option value="">Select…</option>
          {Object.keys(RW_PROVINCES).map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </Field>
      <Field label="District" required={required}>
        <select
          name="district"
          defaultValue={value?.district ?? ""}
          key={province}
          required={required}
          className={inputClass}
        >
          <option value="">Select…</option>
          {districts.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Sector">
        <input name="sector" defaultValue={value?.sector ?? ""} className={inputClass} />
      </Field>
      <Field label="Cell">
        <input name="cell" defaultValue={value?.cell ?? ""} className={inputClass} />
      </Field>
      <Field label="Village (Umudugudu)">
        <input name="village" defaultValue={value?.village ?? ""} className={inputClass} />
      </Field>
    </>
  );
}
