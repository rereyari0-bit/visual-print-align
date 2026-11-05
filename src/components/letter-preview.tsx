import type { ReactNode } from "react";
import tribrataLogo from "@/assets/tribrata.png";

import { buildNumber, buildWaktu, formatTanggal, splitLines, type LetterData, type Personel } from "@/lib/surat";

export function LetterPreview({ data, recipients }: { data: LetterData; recipients: Personel[] }) {
  const activity = (data.tugas ?? "").replace(/^\s*giat\b\s*/i, "").trim();
  const pertimbangan = activity
    ? `bahwa dalam rangka mendukung kelancaran kegiatan ${activity}, dipandang perlu mengeluarkan surat perintah.`
    : "bahwa dipandang perlu mengeluarkan surat perintah.";
  return (
    <article className="print-sheet mx-auto bg-paper text-document shadow-paper">
      <header className="letterhead"><div>{data.agency}</div><div>{data.region}</div><div className="letterhead-rule">{data.resort}</div></header>
      <div className="document-title"><img className="document-logo" src={tribrataLogo.url} alt="Logo Tribrata" /><div className="document-title-inner"><h2>SURAT PERINTAH</h2><p>Nomor : {buildNumber(data)}</p></div></div>
      <div className="document-body">
        <DocumentRow label="Pertimbangan"><p>{pertimbangan}</p></DocumentRow>
        <DocumentRow label="Dasar"><ol className="document-list">{splitLines(data.bases).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></DocumentRow>
        <p className="command-title">DIPERINTAHKAN</p>
        <DocumentRow label="Kepada"><ol className="document-list recipients">{recipients.map((p) => <li key={p.nrp}><span className="recipient-name">{p.pangkat} {p.nama} NRP {p.nrp}</span><span className="recipient-role">{p.jabatan}</span></li>)}</ol></DocumentRow>
        <DocumentRow label="Untuk"><ol className="document-list duties">{activity ? <li>disamping melaksanakan tugas dan jabatan sehari-hari agar melaksanakan kegiatan {activity}{buildWaktu(data) ? `, pada ${buildWaktu(data)}` : ""};</li> : null}{splitLines(data.duties).map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol></DocumentRow>
        <p className="finished">Selesai.</p>
        <div className="signature-block">
          <div className="signature-meta"><span>Dikeluarkan di</span><b>:</b><span className="signature-city">{`${" ".repeat(15)}${data.city}`}</span><span>Pada tanggal</span><b>:</b><span className="signature-date">{formatTanggal(data.issueDate).replace(/^(\S+) (\S+) (\S+)$/, (_m, d, mo, y) => `${d}${" ".repeat(20)}${mo}${" ".repeat(10)}${y}`)}</span></div>
          <div className="signature-office"><p>{data.authority}</p><p>{data.office}</p></div>
          <div className="signature-name"><p>{data.signer}</p><p>{data.signerRank}</p></div>
        </div>
        <div className="copies"><p>Tembusan:</p>{(() => { const items = splitLines(data.copyTo); return items.length > 1 ? <ol className="document-list">{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol> : <p>{items[0] ?? ""}</p>; })()}</div>
      </div>
    </article>
  );
}

function DocumentRow({ label, children }: { label: string; children: ReactNode }) {
  return <div className="document-row"><div>{label}</div><div>:</div><div>{children}</div></div>;
}