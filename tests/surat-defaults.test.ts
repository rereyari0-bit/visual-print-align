import { describe, expect, test } from "bun:test";
import { initialLetterData, newLetterDataFromLatest, todayIso, withDefaultLetterDates } from "../src/lib/surat";

describe("isian awal dari surat terakhir", () => {
  test("only inherits the eight requested fields", () => {
    const inherited = {
      bases: "Dasar terakhir", duties: "Untuk terakhir", city: "Kota terakhir",
      authority: "Atas nama terakhir", office: "Jabatan terakhir", signer: "Nama terakhir",
      signerRank: "Pangkat terakhir", copyTo: "Tembusan terakhir",
    };
    expect(newLetterDataFromLatest({ ...inherited, tugas: "Jangan salin", startDate: "2026-10-13", numberSequence: "9999" }))
      .toEqual({ ...initialLetterData, ...inherited, numberSequence: "" });
  });
  test("preserves empty saved values and falls back for missing or invalid fields", () => {
    expect(newLetterDataFromLatest({ city: "", bases: null, signer: 42 }))
      .toEqual({ ...initialLetterData, city: "", numberSequence: "" });
    for (const value of [null, undefined, [], "invalid"]) {
      expect(newLetterDataFromLatest(value)).toEqual(initialLetterData);
    }
  });
  test("new-letter fields remain editable without mutating defaults or saved data", () => {
    const latest = { city: "Situbondo" };
    const data = newLetterDataFromLatest(latest);
    data.city = "Kota baru";
    expect(latest.city).toBe("Situbondo");
    expect(initialLetterData.city).toBe("Situbondo");
    expect(data.city).toBe("Kota baru");
  });
});

describe("tanggal dan jam default surat baru", () => {
  test("tanggal surat, mulai, dan selesai default ke hari ini; jam default 00:00", () => {
    const data = withDefaultLetterDates(newLetterDataFromLatest(null));
    expect(data.issueDate).toBe(todayIso());
    expect(data.startDate).toBe(todayIso());
    expect(data.endDate).toBe(todayIso());
    expect(data.startTime).toBe("00:00");
    expect(data.endTime).toBe("00:00");
  });
  test("hari mulai dan selesai mengikuti tanggal yang dipakai", () => {
    const data = withDefaultLetterDates({ ...initialLetterData, startDate: "", endDate: "" });
    expect(data.startDay).not.toBe("");
    expect(data.endDay).not.toBe("");
    expect(data.startDay).toBe(data.endDay);
  });
  test("isian yang sudah ada tidak ditimpa, tetap bisa diedit", () => {
    const data = withDefaultLetterDates({ ...initialLetterData, startTime: "07.30", endTime: "13.00" });
    expect(data.startTime).toBe("07.30");
    expect(data.endTime).toBe("13.00");
    data.startTime = "08.00";
    expect(data.startTime).toBe("08.00");
  });
});
