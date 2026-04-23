/** Parse minimal iCal (VEVENT) pour import Airbnb / Booking. */

export type ParsedVevent = {
  dateArrivee: string;
  dateDepart: string;
  summary: string;
};

function unfoldIcs(body: string): string {
  return body.replace(/\r\n/g, "\n").replace(/\n[ \t]/g, "");
}

function valueAfterColon(line: string): string {
  const idx = line.indexOf(":");
  if (idx === -1) return "";
  return line.slice(idx + 1).trim();
}

/** Retourne YYYY-MM-DD depuis DTSTART / DTEND (VALUE=DATE ou datetime Z). */
export function icalLineToDate(line: string): string | null {
  let v = valueAfterColon(line);
  if (!v) return null;
  if (v.includes(":")) v = v.split(":").pop() ?? v;
  const datePart = v.includes("T") ? v.split("T")[0]! : v;
  const compact = datePart.replace(/-/g, "");
  if (!/^\d{8}$/.test(compact)) return null;
  return `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}`;
}

function findLine(block: string, prefix: string): string | undefined {
  const re = new RegExp(`^${prefix}[;:]`, "i");
  return block
    .split("\n")
    .map((l) => l.trim())
    .find((l) => re.test(l));
}

export function parseVeventsFromIcs(icsBody: string): ParsedVevent[] {
  const text = unfoldIcs(icsBody);
  const out: ParsedVevent[] = [];
  const re = /BEGIN:VEVENT([\s\S]*?)END:VEVENT/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const block = m[1] ?? "";
    const dtStartLine =
      findLine(block, "DTSTART") ??
      block.split("\n").find((l) => l.includes("DTSTART")) ??
      "";
    const dtEndLine =
      findLine(block, "DTEND") ??
      block.split("\n").find((l) => l.includes("DTEND")) ??
      "";
    const sumLine = findLine(block, "SUMMARY") ?? "";
    const dateArrivee = icalLineToDate(dtStartLine);
    const dateDepart = icalLineToDate(dtEndLine);
    if (!dateArrivee || !dateDepart) continue;
    if (dateDepart <= dateArrivee) continue;
    const summary = valueAfterColon(sumLine) || "Réservation";
    out.push({ dateArrivee, dateDepart, summary });
  }
  return out;
}
