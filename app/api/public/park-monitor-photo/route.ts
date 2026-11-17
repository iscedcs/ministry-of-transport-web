import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sniffImage } from "@/lib/image-sniff";
import { uploadParkMonitorPhoto } from "@/lib/spaces";

/**
 * PUBLIC passport-photo upload for the Special Enforcement Unit / Park Monitor
 * application form. An applicant has no account yet, so this cannot require a
 * session — which makes it an unauthenticated write to public storage. It is
 * therefore deliberately narrow:
 *
 *  - images only, identified by their real bytes (not the claimed type/name)
 *  - hard 1 MB cap (the browser shrinks photos to ~100 KB first)
 *  - written under a fixed folder with a server-chosen name
 *  - no database row; the returned URL is attached to the application on submit
 *  - per-IP rate limit for anonymous callers (signed-in staff are exempt, since
 *    an office onboarding many applicants shares one IP)
 *
 * The general /api/upload route stays login-only.
 */

const MAX_BYTES = 1024 * 1024; // keep in step with PASSPORT_MAX_BYTES in lib/spaces.ts
const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 15;

// Best-effort, per server instance. Enough to blunt a casual script; the size
// cap and image check above are the real guarantees.
const hits = new Map<string, number[]>();

function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  if (recent.length >= MAX_PER_WINDOW) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session && limited(clientIp(req))) {
      return NextResponse.json(
        { error: "Too many uploads. Please wait a few minutes and try again." },
        { status: 429 },
      );
    }

    // Refuse oversized bodies before buffering them.
    const declared = Number(req.headers.get("content-length") ?? 0);
    if (declared > MAX_BYTES + 64 * 1024) {
      return NextResponse.json(
        { error: "This photo is too large. Retake it or choose a smaller one." },
        { status: 413 },
      );
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No photo provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "This photo is too large. Retake it or choose a smaller one." },
        { status: 413 },
      );
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const kind = sniffImage(bytes);
    if (!kind) {
      return NextResponse.json(
        { error: "Please use a JPEG, PNG or WEBP photo." },
        { status: 400 },
      );
    }

    // Rebuild the file so neither the name nor the type is caller-controlled.
    const clean = new File([bytes], `passport.${kind.ext}`, { type: kind.mime });
    const uploaded = await uploadParkMonitorPhoto(clean);

    return NextResponse.json({ success: true, url: uploaded.url });
  } catch (err) {
    console.error("[Public passport upload error]", err);
    return NextResponse.json(
      { error: "Could not upload the photo. Please try again." },
      { status: 500 },
    );
  }
}
