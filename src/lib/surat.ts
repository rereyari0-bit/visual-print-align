export type Personel = {
  nrp: string;
  nama: string;
  pangkat: string;
  jabatan: string;
};

export type LetterData = {
  agency: string;
  region: string;
  resort: string;
  numberPrefix: string;
  numberSequence: string;
  numberKka: string;
  numberSuffix: string;
  issueDate: string;
  tugas: string;
  startDay: string;
  startDate: string;
  startTime: string;
  endDay: string;
  endDate: string;
  endTime: string;
  bases: string;
  duties: string;
  city: string;
  authority: string;
  office: string;
  signer: string;
  signerRank: string;
  copyTo: string;
};

export type SuratRecord = {
  id: string;
  nomor: string;
  tanggal: string;
  tugas: string;
  data: unknown;
  penerima_nrp: string[];
  created_at: string;
  updated_at: string;
};

export const initialLetterData: LetterData = {
  agency: "KEPOLISIAN NEGARA REPUBLIK INDONESIA",
  region: "DAERAH JAWA TIMUR",
  resort: "RESORT SITUBONDO",
  numberPrefix: "R/Sprint",
  numberSequence: "2487",
  numberKka: "PAM.3.3",
  numberSuffix: "",
  issueDate: "2016-02-21",
  tugas: "giat Lidik tentang Penunjukan Penjabat (Pj) Kepala Desa di wilayah Kab. Situbondo",
  startDay: "",
  startDate: "",
  startTime: "",
  endDay: "",
  endDate: "",
  endTime: "",
  bases:
    "Undang – Undang Negara Republik Indonesia Nomor 2 Tahun 2002 tgl 08 Januari 2002 tentang Kepolisian Negara Republik Indonesia;\nPeraturan Kepala Kepolisian Negara Republik Indonesia Nomor 15 Tahun 2007 tentang Naskah Dinas di lingkungan Kepolisian Negara Republik Indonesia;\nDisposisi Kasat Intelkam untuk Lidik dan Monitor",
  duties:
    "melaporkan hasil pelaksanaannya kepada pimpinan;\nmelaksanakan perintah ini dengan seksama dan penuh rasa tanggung jawab.",
  city: "Situbondo",
  authority: "a.n. KEPALA KEPOLISIAN RESORT SITUBONDO POLDA JATIM",
  office: "KASAT INTELKAM",
  signer: "MOHAMAD DJUPRI",
  signerRank: "INSPEKTUR POLISI SATU NRP 68020388",
  copyTo: "Kapolres Situbondo.",
};

const ROMAWI = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const BULAN_ID = [
  "Januari", "Pebruari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "Nopember", "Desember",
];

function parseIssueDate(value: string) {
  const [year, month, day] = (value ?? "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return { year, month, day };
}

export function buildNumber(data: Pick<LetterData, "numberPrefix" | "numberSequence" | "numberKka" | "numberSuffix" | "issueDate">) {
  const parsed = parseIssueDate(data.issueDate);
  const month = parsed ? ROMAWI[parsed.month - 1] : "…";
  const year = parsed ? String(parsed.year) : "…";
  const prefix = (data.numberPrefix ?? "").trim();
  const sequence = (data.numberSequence ?? "").trim() || "…";
  const kka = (data.numberKka ?? "").trim();
  const suffix = (data.numberSuffix ?? "").trim();
  const head = prefix ? `${prefix}/${sequence}` : sequence;
  return [head, month, kka, year, suffix].filter(Boolean).join("/");
}

export function formatTanggal(value: string) {
  const parsed = parseIssueDate(value);
  if (!parsed) return "…";
  return `${parsed.day} ${BULAN_ID[parsed.month - 1]} ${parsed.year}`;
}

export function hydrateLetterData(value: unknown): LetterData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return initialLetterData;
  return { ...initialLetterData, ...(value as Partial<LetterData>) };
}

const inheritedFields = ["bases", "duties", "city", "authority", "office", "signer", "signerRank", "copyTo"] as const;

export function newLetterDataFromLatest(value: unknown): LetterData {
  const data = { ...initialLetterData };
  if (!value || typeof value !== "object" || Array.isArray(value)) return data;
  const latest = value as Record<string, unknown>;
  for (const key of inheritedFields) {
    const saved = latest[key];
    if (typeof saved === "string") data[key] = saved;
  }
  return data;
}

const pad2 = (value: number) => String(value).padStart(2, "0");
export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
};

export function withDefaultLetterDates(data: LetterData): LetterData {
  const today = todayIso();
  const startDate = data.startDate || today;
  const endDate = data.endDate || today;
  return {
    ...data,
    issueDate: today,
    startDate,
    endDate,
    startTime: data.startTime || "00:00",
    endTime: data.endTime || "00:00",
    startDay: hariDari(startDate),
    endDay: hariDari(endDate),
  };
}

export const splitLines = (value: string) =>
  (value ?? "").split("\n").filter((line) => line.trim());
const HARI_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
export function hariDari(value: string) {
  const p = parseIssueDate(value);
  if (!p) return "";
  return HARI_ID[new Date(p.year, p.month - 1, p.day).getDay()] ?? "";
}
export function buildWaktu(d: LetterData) {
  const part = (day: string, date: string, time: string) =>
    [day || hariDari(date), date ? formatTanggal(date) : "", time ? `pukul ${time.replace(":", ".")} WIB` : ""].filter(Boolean).join(", ");
  const a = part(d.startDay ?? "", d.startDate ?? "", d.startTime ?? "");
  const b = part(d.endDay ?? "", d.endDate ?? "", d.endTime ?? "");
  if (!a && !b) return "";
  return b ? `${a} sampai dengan ${b}` : a;
}
