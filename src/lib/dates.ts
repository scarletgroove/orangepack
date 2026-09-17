export function todayInBangkok() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bangkok" }).format(new Date());
}

export function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(fromIso: string, toIso: string) {
  const ms = Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

const longThai = new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "UTC" });
const shortThai = new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "UTC" });

export function formatThaiDate(isoDate: string) {
  return longThai.format(new Date(`${isoDate}T00:00:00Z`));
}

export function formatThaiDateShort(isoDate: string) {
  return shortThai.format(new Date(`${isoDate}T00:00:00Z`));
}

const thaiDateTime = new Intl.DateTimeFormat("th-TH", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Bangkok",
});

export function formatThaiDateTime(instant: Date) {
  return thaiDateTime.format(instant);
}
