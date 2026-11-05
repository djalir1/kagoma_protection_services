// Provinces and districts of Rwanda (2006 administrative reform).
export const RW_PROVINCES: Record<string, string[]> = {
  "Kigali City": ["Gasabo", "Kicukiro", "Nyarugenge"],
  "Northern Province": ["Burera", "Gakenke", "Gicumbi", "Musanze", "Rulindo"],
  "Southern Province": [
    "Gisagara",
    "Huye",
    "Kamonyi",
    "Muhanga",
    "Nyamagabe",
    "Nyanza",
    "Nyaruguru",
    "Ruhango",
  ],
  "Eastern Province": [
    "Bugesera",
    "Gatsibo",
    "Kayonza",
    "Kirehe",
    "Ngoma",
    "Nyagatare",
    "Rwamagana",
  ],
  "Western Province": [
    "Karongi",
    "Ngororero",
    "Nyabihu",
    "Nyamasheke",
    "Rubavu",
    "Rusizi",
    "Rutsiro",
  ],
};

export const provinceOf = (district?: string | null) =>
  Object.entries(RW_PROVINCES).find(([, ds]) => district && ds.includes(district))?.[0] ?? "";
