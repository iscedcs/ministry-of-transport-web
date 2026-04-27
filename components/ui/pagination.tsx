/**
 * Pagination - URL-based, works with Server Components. Uses Tailwind classes.
 */
import Link from "next/link";
import { cn } from "@/lib/utils";

interface PaginationProps {
  page: number;
  totalPages: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  className?: string;
}

function buildPageUrl(
  baseUrl: string,
  pageNumber: number,
  extra: Record<string, string> = {},
): string {
  const params = new URLSearchParams({ ...extra, page: String(pageNumber) });
  return `${baseUrl}?${params.toString()}`;
}

const btnBase =
  "inline-flex items-center justify-center min-w-[2.25rem] h-9 rounded-md border text-sm font-medium transition-colors select-none";
const btnDefault =
  "border-border text-muted-foreground hover:bg-secondary hover:text-foreground";
const btnActive =
  "border-primary bg-primary text-primary-foreground pointer-events-none";
const btnDisabled =
  "border-border/50 text-muted-foreground/40 opacity-40 cursor-not-allowed";

export function Pagination({
  page,
  totalPages,
  baseUrl,
  searchParams = {},
  className,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("...");
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  const prevUrl =
    page > 1 ? buildPageUrl(baseUrl, page - 1, searchParams) : null;
  const nextUrl =
    page < totalPages ? buildPageUrl(baseUrl, page + 1, searchParams) : null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center gap-1", className)}>
      {prevUrl ? (
        <Link
          href={prevUrl}
          className={cn(btnBase, btnDefault, "px-2.5")}
          aria-label="Previous page">
          &#8592;
        </Link>
      ) : (
        <button
          disabled
          className={cn(btnBase, btnDisabled, "px-2.5")}
          aria-label="Previous page">
          &#8592;
        </button>
      )}

      {pages.map((p, i) =>
        p === "..." ? (
          <span
            key={`e-${i}`}
            className={cn(
              btnBase,
              "border-transparent cursor-default",
              "px-1 text-muted-foreground",
            )}
            aria-hidden="true">
            &hellip;
          </span>
        ) : (
          <Link
            key={p}
            href={buildPageUrl(baseUrl, p, searchParams)}
            className={cn(btnBase, p === page ? btnActive : btnDefault)}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}>
            {p}
          </Link>
        ),
      )}

      {nextUrl ? (
        <Link
          href={nextUrl}
          className={cn(btnBase, btnDefault, "px-2.5")}
          aria-label="Next page">
          &#8594;
        </Link>
      ) : (
        <button
          disabled
          className={cn(btnBase, btnDisabled, "px-2.5")}
          aria-label="Next page">
          &#8594;
        </button>
      )}
    </nav>
  );
}
