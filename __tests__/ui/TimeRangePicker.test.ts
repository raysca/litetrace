import { test, expect, describe } from "bun:test";

// Pure logic extracted from TimeRangePicker — no DOM required

const PRESETS = [
  { label: "Last 1 hour",   durationMs: 1 * 60 * 60 * 1000 },
  { label: "Last 6 hours",  durationMs: 6 * 60 * 60 * 1000 },
  { label: "Last 24 hours", durationMs: 24 * 60 * 60 * 1000 },
  { label: "Last 7 days",   durationMs: 7 * 24 * 60 * 60 * 1000 },
  { label: "Last 30 days",  durationMs: 30 * 24 * 60 * 60 * 1000 },
  { label: "Last 90 days",  durationMs: 90 * 24 * 60 * 60 * 1000 },
];

function toDateStr(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

function fromDateStr(str: string): number {
  return new Date(str + "T00:00:00Z").getTime();
}

function matchesPreset(from: number, to: number): typeof PRESETS[number] | null {
  const duration = to - from;
  for (const p of PRESETS) {
    if (Math.abs(duration - p.durationMs) < 60_000) return p;
  }
  return null;
}

function formatLabel(from: number, to: number): string {
  const preset = matchesPreset(from, to);
  if (preset) return preset.label;
  return `${toDateStr(from)} → ${toDateStr(to)}`;
}

describe("TimeRangePicker logic", () => {
  describe("toDateStr", () => {
    test("formats UTC date correctly", () => {
      const ms = new Date("2024-03-15T00:00:00Z").getTime();
      expect(toDateStr(ms)).toBe("2024-03-15");
    });

    test("formats end of day correctly", () => {
      const ms = new Date("2024-12-31T23:59:59Z").getTime();
      expect(toDateStr(ms)).toBe("2024-12-31");
    });
  });

  describe("fromDateStr", () => {
    test("parses date string to UTC midnight", () => {
      const ms = fromDateStr("2024-03-15");
      expect(ms).toBe(new Date("2024-03-15T00:00:00Z").getTime());
    });

    test("round-trips through toDateStr", () => {
      const original = new Date("2024-06-01T00:00:00Z").getTime();
      const str = toDateStr(original);
      const parsed = fromDateStr(str);
      expect(parsed).toBe(original);
    });
  });

  describe("matchesPreset", () => {
    test("matches Last 7 days exactly", () => {
      const to = Date.now();
      const from = to - 7 * 24 * 60 * 60 * 1000;
      const match = matchesPreset(from, to);
      expect(match?.label).toBe("Last 7 days");
    });

    test("matches Last 1 hour exactly", () => {
      const to = Date.now();
      const from = to - 1 * 60 * 60 * 1000;
      const match = matchesPreset(from, to);
      expect(match?.label).toBe("Last 1 hour");
    });

    test("matches Last 30 days exactly", () => {
      const to = Date.now();
      const from = to - 30 * 24 * 60 * 60 * 1000;
      const match = matchesPreset(from, to);
      expect(match?.label).toBe("Last 30 days");
    });

    test("matches Last 90 days exactly", () => {
      const to = Date.now();
      const from = to - 90 * 24 * 60 * 60 * 1000;
      const match = matchesPreset(from, to);
      expect(match?.label).toBe("Last 90 days");
    });

    test("tolerates up to 59s of drift", () => {
      const to = Date.now();
      const from = to - 7 * 24 * 60 * 60 * 1000 + 59_000; // 59s shorter
      const match = matchesPreset(from, to);
      expect(match?.label).toBe("Last 7 days");
    });

    test("returns null for custom range (14 days)", () => {
      const to = Date.now();
      const from = to - 14 * 24 * 60 * 60 * 1000;
      const match = matchesPreset(from, to);
      expect(match).toBeNull();
    });

    test("returns null for arbitrary range", () => {
      const from = new Date("2024-01-01").getTime();
      const to = new Date("2024-04-15").getTime();
      expect(matchesPreset(from, to)).toBeNull();
    });
  });

  describe("formatLabel", () => {
    test("returns preset label for standard ranges", () => {
      const to = Date.now();
      const from = to - 7 * 24 * 60 * 60 * 1000;
      expect(formatLabel(from, to)).toBe("Last 7 days");
    });

    test("returns date range string for custom ranges", () => {
      const from = new Date("2024-01-01T00:00:00Z").getTime();
      const to = new Date("2024-02-15T00:00:00Z").getTime();
      expect(formatLabel(from, to)).toBe("2024-01-01 → 2024-02-15");
    });

    test("all presets produce their own label", () => {
      const baseTime = Date.now();
      for (const preset of PRESETS) {
        const from = baseTime - preset.durationMs;
        const to = baseTime;
        expect(formatLabel(from, to)).toBe(preset.label);
      }
    });
  });

  describe("preset durations", () => {
    test("all preset durations are positive", () => {
      for (const p of PRESETS) {
        expect(p.durationMs).toBeGreaterThan(0);
      }
    });

    test("presets are ordered ascending by duration", () => {
      for (let i = 1; i < PRESETS.length; i++) {
        expect(PRESETS[i].durationMs).toBeGreaterThan(PRESETS[i - 1].durationMs);
      }
    });

    test("Last 1 hour is 3600000ms", () => {
      expect(PRESETS[0].durationMs).toBe(3_600_000);
    });

    test("Last 7 days is 604800000ms", () => {
      const preset = PRESETS.find(p => p.label === "Last 7 days");
      expect(preset?.durationMs).toBe(7 * 24 * 60 * 60 * 1000);
    });
  });
});
