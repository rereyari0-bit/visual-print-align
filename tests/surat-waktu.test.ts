import { describe, expect, test } from "bun:test";
import { buildWaktu, initialLetterData } from "../src/lib/surat";

describe("kalimat waktu pelaksanaan tugas", () => {
  test("susunan: pada hari ... tanggal ... pukul ... sampai dengan hari ... tanggal ...", () => {
    const waktu = buildWaktu({
      ...initialLetterData,
      startDay: "Minggu", startDate: "2026-11-01", startTime: "06:00",
      endDay: "Minggu", endDate: "2026-11-15", endTime: "18:00",
    });
    expect(waktu).toBe(
      "hari Minggu tanggal 1 November 2026 pukul 06.00 WIB sampai dengan hari Minggu tanggal 15 November 2026 pukul 18.00 WIB",
    );
  });
  test("tanpa tanggal selesai hanya menampilkan bagian mulai", () => {
    const waktu = buildWaktu({ ...initialLetterData, startDate: "2026-11-01", startTime: "06:00", endDate: "", endTime: "" });
    expect(waktu).toBe("hari Minggu tanggal 1 November 2026 pukul 06.00 WIB");
  });
  test("tanpa waktu apa pun menghasilkan teks kosong", () => {
    expect(buildWaktu(initialLetterData)).toBe("");
  });
});
