import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { uploadDocument } from "@/lib/spaces";

export async function POST(req: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }

    // Call S3/Spaces helper to upload
    const uploaded = await uploadDocument(file, "cac");

    // Save document details in database
    const doc = await db.document.create({
      data: {
        uploadedByUserId: session.userId,
        fileName: uploaded.fileName,
        fileType: uploaded.fileMimeType.split("/")[1] ?? "bin",
        fileSize: uploaded.fileSize,
        fileUrl: uploaded.url,
        fileMimeType: uploaded.fileMimeType,
        linkedToType: "MOTOR_PARK",
        linkedToId: "pending", // updated after parent record is created
      },
      select: { id: true },
    });

    return NextResponse.json({
      success: true,
      documentId: doc.id,
      url: uploaded.url,
    });
  } catch (err) {
    console.error("[API Upload Error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed." },
      { status: 500 }
    );
  }
}
