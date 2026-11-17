export type UploadActionResult =
  | { success: true; documentId: string; url: string }
  | { success: false; error: string };

/**
 * Document upload client wrapper — Ministry of Transport Platform
 *
 * Calls `/api/upload` route handler which supports larger payloads (up to 5MB)
 * bypassing Server Action limits.
 */
export async function uploadCacDocument(
  formData: FormData,
): Promise<UploadActionResult> {
  try {
    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Upload failed with status ${res.status}`,
      };
    }

    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

/**
 * Generic document upload client wrapper
 *
 * Calls `/api/upload` route handler which supports larger payloads (up to 5MB)
 * bypassing Server Action limits.
 */
export async function uploadGenericDocument(
  file: File,
  folder: string,
  linkedToType: string,
): Promise<UploadActionResult> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);
    formData.append("linkedToType", linkedToType);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: data.error || `Upload failed with status ${res.status}`,
      };
    }

    return await res.json();
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}

/**
 * Passport photo for the Special Enforcement Unit / Park Monitor application.
 *
 * Uses the PUBLIC endpoint, because an applicant is not signed in. Works the
 * same for signed-in staff. The general /api/upload stays login-only.
 */
export async function uploadPassportPhoto(
  file: File,
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/public/park-monitor-photo", {
      method: "POST",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.url) {
      return {
        success: false,
        error: data.error || `Upload failed with status ${res.status}`,
      };
    }
    return { success: true, url: data.url };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Upload failed.",
    };
  }
}
