import { useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Loader2, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useIsAdmin } from "@/hooks/use-is-admin";
import { supabase } from "@/integrations/supabase/client";
import { buildNumber, hariDari, hydrateLetterData, initialLetterData, newLetterDataFromLatest, withDefaultLetterDates, type LetterData, type Personel } from "@/lib/surat";

const adminOnly: Array<keyof LetterData> = ["agency","region","resort","duties","city","authority","office","signer","signerRank"];
const fields: Array<{ key: keyof LetterData; label: string; multiline?: boolean; hint?: string }> = [
  { key: "agency", label: "Instansi" }, { key: "region", label: "Daerah" }, { key: "resort", label: "Kesatuan" },
  { key: "tugas", label: "Tugas", multiline: true, hint: "Dipakai pada bagian Pertimbangan dan butir pertama Untuk" },
  { key: "city", label: "Dikeluarkan di" }, { key: "authority", label: "Atas nama" },
  { key: "office", label: "Jabatan penanda tangan" }, { key: "signer", label: "Nama penanda tangan" },
  { key: "signerRank", label: "Pangkat / NRP" },
];

export function SuratForm({ id }: { id?: string }) {
  const navigate = useNavigate();
  const [data, setData] = useState(initialLetterData);
  const [personel, setPersonel] = useState<Personel[]>([]);
  const [selectedNrp, setSelectedNrp] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const { isAdmin, canConfigure } = useIsAdmin();
  const [pick, setPick] = useState("");
  const emptyPersonel: Personel = { nrp: "", nama: "", pangkat: "", jabatan: "" };
  const [personelForm, setPersonelForm] = useState<Personel | null>(null);
  const [personelSaving, setPersonelSaving] = useState(false);
  const [personelError, setPersonelError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    Promise.all([
      supabase.from("personel").select("nrp, nama, pangkat, jabatan").order("nama"),
      id
        ? supabase.from("surat_perintah").select("data, penerima_nrp").eq("id", id).single()
        : supabase.from("surat_perintah").select("data, penerima_nrp").order("created_at", { ascending: false }).order("id", { ascending: false }).limit(1).maybeSingle(),
    ]).then(([people, letter]) => {
      if (!active) return;
      if (people.data) setPersonel(people.data);
      if (id && letter.data) {
        setData(hydrateLetterData(letter.data.data));
        setSelectedNrp(letter.data.penerima_nrp ?? []);
      } else if (id) setError("Surat tidak ditemukan atau tidak dapat dibuka.");
      else {
        setData(withDefaultLetterDates(newLetterDataFromLatest(letter.data?.data)));
        setSelectedNrp([]);
        if (letter.error) setError("Isian surat terakhir gagal dimuat. Isian awal digunakan; silakan periksa sebelum menyimpan.");
      }
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setError("Data formulir gagal dimuat. Silakan muat ulang halaman.");
      setLoading(false);
    });
    return () => { active = false; };
  }, [id]);

  const update = (key: keyof LetterData, value: string) => setData((current) => ({ ...current, [key]: value }));
  const toggle = (nrp: string) => setSelectedNrp((current) => current.includes(nrp) ? current.filter((item) => item !== nrp) : [...current, nrp]);
  const simpanPersonel = async () => {
    if (!personelForm) return;
    if (!personelForm.nrp.trim() || !personelForm.nama.trim()) { setPersonelError("NRP dan nama wajib diisi."); return; }
    setPersonelSaving(true); setPersonelError("");
    const row = { nrp: personelForm.nrp.trim(), nama: personelForm.nama.trim(), pangkat: personelForm.pangkat.trim(), jabatan: personelForm.jabatan.trim() };
    const { error: err } = await supabase.from("personel").upsert(row, { onConflict: "nrp" });
    setPersonelSaving(false);
    if (err) { setPersonelError("Data personel gagal disimpan. Silakan coba lagi."); return; }
    setPersonel((current) => [...current.filter((p) => p.nrp !== row.nrp), row].sort((a, b) => a.nama.localeCompare(b.nama)));
    setPersonelForm(null);
  };
  const hapusPersonel = async (nrp: string) => {
    if (!window.confirm("Hapus personel ini dari data? Surat yang sudah ada tidak ikut berubah.")) return;
    const { error: err } = await supabase.from("personel").delete().eq("nrp", nrp);
    if (err) { setPersonelError("Data personel gagal dihapus. Silakan coba lagi."); return; }
    setPersonel((current) => current.filter((p) => p.nrp !== nrp));
    setSelectedNrp((current) => current.filter((item) => item !== nrp));
  };
  const simpan = async () => {
    setSaving(true); setError("");
    const row = { nomor: buildNumber(data), tanggal: data.issueDate, tugas: data.tugas ?? "", data: data as unknown as Record<string, string>, penerima_nrp: selectedNrp, updated_at: new Date().toISOString() };
    const result = id
      ? await supabase.from("surat_perintah").update(row).eq("id", id).select("id").single()
      : await supabase.from("surat_perintah").insert(row).select("id").single();
    setSaving(false);
    if (result.error) { setError("Surat gagal disimpan. Silakan coba lagi."); return; }
    navigate({ to: "/surat/$id", params: { id: result.data.id }, replace: true });
  };

  return (
    <AppShell title={id ? "Edit Surat Perintah" : "Buat Surat Perintah"} description={id ? "Perbarui isi surat yang tersimpan" : "Lengkapi data untuk membuat surat baru"} action={<Button variant="outline" onClick={() => history.back()}><ArrowLeft />Kembali</Button>}>
      {loading ? <div className="flex min-h-80 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 animate-spin" />Memuat surat…</div> : (
        <div className="mx-auto max-w-5xl space-y-6">
          {error ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div> : null}
          <FormSection title="Identitas surat" description="Nomor surat tersusun otomatis dari tanggal yang dipilih.">
            <div className="flex flex-wrap gap-x-4 gap-y-4">
              <Field label="Awalan" className="w-36"><Input value={data.numberPrefix} onChange={(e) => update("numberPrefix", e.target.value)} /></Field>
              <Field label="Nomor urut" className="w-28"><Input inputMode="numeric" value={data.numberSequence} onChange={(e) => update("numberSequence", e.target.value)} /></Field>
              <Field label="KKA" className="w-44"><Input value={data.numberKka} onChange={(e) => update("numberKka", e.target.value)} /></Field>
              <Field label="Tanggal surat" className="w-48"><Input type="date" value={data.issueDate} onChange={(e) => update("issueDate", e.target.value)} /></Field>
              <Field label="Akhiran" className="min-w-32 flex-1"><Input value={data.numberSuffix} onChange={(e) => update("numberSuffix", e.target.value)} /></Field>
            </div>
            <div className="mt-4 rounded-md bg-muted px-4 py-3 text-sm"><span className="text-muted-foreground">Nomor lengkap</span><strong className="mt-1 block">{buildNumber(data)}</strong></div>
          </FormSection>
          <FormSection title="Penerima perintah" description="Pilih satu atau beberapa personel dari data yang tersedia.">
            {isAdmin ? (
              <div className="space-y-3">
                {personelError ? <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{personelError}</div> : null}
                <div className="grid gap-2 md:grid-cols-2">{personel.map((p) => (
                  <div key={p.nrp} className="flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:bg-accent">
                    <label className="flex flex-1 cursor-pointer items-start gap-3">
                      <input type="checkbox" className="mt-1" checked={selectedNrp.includes(p.nrp)} onChange={() => toggle(p.nrp)} />
                      <span><strong className="block text-sm">{p.pangkat} {p.nama}</strong><span className="text-xs text-muted-foreground">NRP {p.nrp} · {p.jabatan}</span></span>
                    </label>
                    <div className="flex shrink-0 gap-1">
                      <Button type="button" variant="ghost" size="icon" aria-label="Ubah personel" onClick={() => { setPersonelForm({ ...p }); setPersonelError(""); }}><Pencil className="h-4 w-4" /></Button>
                      <Button type="button" variant="ghost" size="icon" aria-label="Hapus personel" onClick={() => hapusPersonel(p.nrp)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                ))}</div>
                {personelForm ? (
                  <div className="space-y-3 rounded-md border border-border bg-muted/40 p-4">
                    <h3 className="text-sm font-semibold">{personel.some((p) => p.nrp === personelForm.nrp) ? "Ubah personel" : "Tambah personel baru"}</h3>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Field label="NRP"><Input value={personelForm.nrp} onChange={(e) => setPersonelForm({ ...personelForm, nrp: e.target.value })} /></Field>
                      <Field label="Nama"><Input value={personelForm.nama} onChange={(e) => setPersonelForm({ ...personelForm, nama: e.target.value })} /></Field>
                      <Field label="Pangkat"><Input value={personelForm.pangkat} onChange={(e) => setPersonelForm({ ...personelForm, pangkat: e.target.value })} /></Field>
                      <Field label="Jabatan"><Input value={personelForm.jabatan} onChange={(e) => setPersonelForm({ ...personelForm, jabatan: e.target.value })} /></Field>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => setPersonelForm(null)}>Batal</Button>
                      <Button type="button" onClick={simpanPersonel} disabled={personelSaving}>{personelSaving ? <Loader2 className="animate-spin" /> : <Save />}Simpan personel</Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" onClick={() => { setPersonelForm({ ...emptyPersonel }); setPersonelError(""); }}><Plus />Tambah personel baru</Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex gap-2"><select className="h-10 flex-1 rounded-md border border-input bg-background px-3 text-sm" value={pick} onChange={(e) => setPick(e.target.value)}><option value="">Pilih personel…</option>{personel.filter((p) => !selectedNrp.includes(p.nrp)).map((p) => <option key={p.nrp} value={p.nrp}>{p.pangkat} {p.nama} — NRP {p.nrp}</option>)}</select><Button type="button" variant="outline" disabled={!pick} onClick={() => { toggle(pick); setPick(""); }}>Tambah</Button></div>
                <ul className="space-y-2">{personel.filter((p) => selectedNrp.includes(p.nrp)).map((p) => <li key={p.nrp} className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"><span><strong>{p.pangkat} {p.nama}</strong><span className="block text-xs text-muted-foreground">NRP {p.nrp} · {p.jabatan}</span></span><Button type="button" variant="ghost" size="sm" onClick={() => toggle(p.nrp)}>Hapus</Button></li>)}</ul>
              </div>
            )}
          </FormSection>
          <FormSection title="Waktu pelaksanaan tugas" description="Ditambahkan pada butir pertama Untuk, setelah tugas. Hari terisi otomatis dari tanggal.">
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Hari mulai tugas"><Input value={data.startDay} readOnly /></Field>
              <Field label="Tanggal mulai tugas"><Input type="date" value={data.startDate} onChange={(e) => setData((c) => ({ ...c, startDate: e.target.value, startDay: hariDari(e.target.value) }))} /></Field>
              <Field label="Jam mulai tugas"><Input type="time" value={data.startTime} onChange={(e) => update("startTime", e.target.value)} /></Field>
            </div>
            <p className="my-3 text-center text-sm font-semibold text-muted-foreground">sampai dengan</p>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Hari selesai tugas"><Input value={data.endDay} readOnly /></Field>
              <Field label="Tanggal selesai tugas"><Input type="date" value={data.endDate} onChange={(e) => setData((c) => ({ ...c, endDate: e.target.value, endDay: hariDari(e.target.value) }))} /></Field>
              <Field label="Jam selesai tugas"><Input type="time" value={data.endTime} onChange={(e) => update("endTime", e.target.value)} /></Field>
            </div>
          </FormSection>
          <FormSection title="Isi dan penandatangan" description="Dasar diisi per butir; gunakan satu baris untuk setiap butir pada kolom Untuk.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Dasar" wide><ButirList value={data.bases} onChange={(v) => update("bases", v)} noun="dasar" /></Field>
              <Field label="Untuk" hint="Butir pertama (melaksanakan kegiatan) dibuat otomatis dari kolom Tugas" wide><ButirList value={data.duties} onChange={(v) => update("duties", v)} noun="untuk" /></Field>
              {fields.filter((f) => canConfigure || !adminOnly.includes(f.key)).map((field) => <Field key={field.key} label={field.label} hint={field.hint ?? ""} wide={field.multiline ?? false}>{field.multiline ? <Textarea className="min-h-28" value={data[field.key]} onChange={(e) => update(field.key, e.target.value)} /> : <Input value={data[field.key]} onChange={(e) => update(field.key, e.target.value)} />}</Field>)}
              <Field label="Tembusan" hint="Satu butir tampil tanpa nomor di lembar surat; lebih dari satu butir tampil bernomor" wide><ButirList value={data.copyTo} onChange={(v) => update("copyTo", v)} noun="tembusan" /></Field>
            </div>
          </FormSection>
          <div className="sticky bottom-4 flex justify-end rounded-md border border-border bg-card p-3 shadow-sm"><Button size="lg" onClick={simpan} disabled={saving}>{saving ? <Loader2 className="animate-spin" /> : <Save />}{saving ? "Menyimpan…" : "Simpan surat"}</Button></div>
        </div>
      )}
    </AppShell>
  );
}

function FormSection({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="rounded-md border border-border bg-card"><div className="border-b border-border px-5 py-4"><h2 className="font-bold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div><div className="p-5">{children}</div></section>;
}

function Field({ label, hint, wide, className, children }: { label: string; hint?: string; wide?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={cn("block", wide && "md:col-span-2", className)}><span className="mb-1.5 block text-sm font-semibold">{label}</span>{children}{hint ? <span className="mt-1 block text-xs text-muted-foreground">{hint}</span> : null}</label>;
}

function ButirList({ value, onChange, noun }: { value: string; onChange: (value: string) => void; noun: string }) {
  const lines = value.split("\n");
  return (
    <div className="space-y-2">
      {lines.map((line, index) => (
        <div key={index} className="flex items-start gap-2">
          <span className="mt-2.5 w-6 shrink-0 text-right text-sm text-muted-foreground">{index + 1}.</span>
          <Textarea className="min-h-10 flex-1" rows={1} value={line} onChange={(e) => onChange(lines.map((l, i) => (i === index ? e.target.value : l)).join("\n"))} />
          <Button type="button" variant="ghost" size="icon" aria-label={`Hapus butir ${noun}`} disabled={lines.length <= 1} onClick={() => onChange(lines.filter((_, i) => i !== index).join("\n"))}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={() => onChange(`${value}\n`)}><Plus />Tambah butir {noun}</Button>
    </div>
  );
}