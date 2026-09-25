/** Whole-naira amount in words, e.g. 50000 -> "Fifty Thousand". */
const ONES = [
  "",
  "One",
  "Two",
  "Three",
  "Four",
  "Five",
  "Six",
  "Seven",
  "Eight",
  "Nine",
  "Ten",
  "Eleven",
  "Twelve",
  "Thirteen",
  "Fourteen",
  "Fifteen",
  "Sixteen",
  "Seventeen",
  "Eighteen",
  "Nineteen",
];
const TENS = [
  "",
  "",
  "Twenty",
  "Thirty",
  "Forty",
  "Fifty",
  "Sixty",
  "Seventy",
  "Eighty",
  "Ninety",
];

export function inWords(n: number): string {
  if (n === 0) return "Zero";
  const chunk = (num: number): string => {
    if (num === 0) return "";
    if (num < 20) return ONES[num];
    if (num < 100)
      return `${TENS[Math.floor(num / 10)]}${num % 10 ? ` ${ONES[num % 10]}` : ""}`;
    return `${ONES[Math.floor(num / 100)]} Hundred${
      num % 100 ? ` and ${chunk(num % 100)}` : ""
    }`;
  };
  const scales: [number, string][] = [
    [1_000_000_000, "Billion"],
    [1_000_000, "Million"],
    [1_000, "Thousand"],
  ];
  let rest = Math.floor(n);
  const parts: string[] = [];
  for (const [value, name] of scales) {
    if (rest >= value) {
      parts.push(`${chunk(Math.floor(rest / value))} ${name}`);
      rest %= value;
    }
  }
  if (rest > 0) parts.push(chunk(rest));
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

