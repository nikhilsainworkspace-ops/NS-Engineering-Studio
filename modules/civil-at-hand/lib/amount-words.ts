// "Rupees One Lakh Twenty Thousand Five Hundred and Paise Fifty Only" — Indian numbering for printed documents.
const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number): string {
  if (value < 20) return ones[value];
  return `${tens[Math.floor(value / 10)]}${value % 10 ? ` ${ones[value % 10]}` : ""}`;
}
function belowThousand(value: number): string {
  const hundred = Math.floor(value / 100); const rest = value % 100;
  return [hundred ? `${ones[hundred]} Hundred` : "", rest ? belowHundred(rest) : ""].filter(Boolean).join(" ");
}

export function indianNumberWords(value: number): string {
  let number = Math.floor(Math.abs(value));
  if (number === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(number / 1e7); number %= 1e7;
  const lakh = Math.floor(number / 1e5); number %= 1e5;
  const thousand = Math.floor(number / 1e3); number %= 1e3;
  if (crore) parts.push(`${indianNumberWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (number) parts.push(belowThousand(number));
  return parts.join(" ");
}

export function rupeesInWords(amount: number): string {
  if (!Number.isFinite(amount)) return "";
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  return `Rupees ${indianNumberWords(rupees)}${paise ? ` and Paise ${belowHundred(paise)}` : ""} Only`;
}
