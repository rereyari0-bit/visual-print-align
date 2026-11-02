import { describe, expect, test } from "bun:test";
import { initialLetterData, newLetterDataFromLatest, todayIso, withDefaultLetterDates } from "../src/lib/surat";

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
