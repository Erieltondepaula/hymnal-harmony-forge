import { mod12 } from "./chromatic";

const INTERVAL_NAMES: Record<number, string> = {
  0: "Uníssono",
  1: "2ª menor",
  2: "2ª maior",
  3: "3ª menor",
  4: "3ª maior",
  5: "4ª justa",
  6: "Trítono",
  7: "5ª justa",
  8: "6ª menor",
  9: "6ª maior",
  10: "7ª menor",
  11: "7ª maior",
};

export function intervalName(fromPc: number, toPc: number): string {
  return INTERVAL_NAMES[mod12(toPc - fromPc)] ?? "";
}
