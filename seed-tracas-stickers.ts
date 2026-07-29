import "dotenv/config";
import { db } from "./lib/db";

const TRACAS_STICKER_URLS = [
  "https://transpaytms.com/v/status1772618635928",
  "https://transpaytms.com/v/status1772620867345",
  "https://transpaytms.com/v/status1772628437142",
  "https://transpaytms.com/v/status1772621361961",
  "https://transpaytms.com/v/status1772628338689",
  "https://transpaytms.com/v/status1772628090070",
];

async function main() {
  console.log("Seeding TRACAS physical QR sticker URLs into MOT inventory pool...");

  for (const url of TRACAS_STICKER_URLS) {
    const parts = url.split("/");
    const code = parts[parts.length - 1];

    await db.tracasSticker.upsert({
      where: { stickerUrl: url },
      update: {},
      create: {
        stickerUrl: url,
        stickerCode: code,
        isAssigned: false,
      },
    });

    console.log(`✓ Added TRACAS sticker: ${code} (${url})`);
  }

  console.log("Done seeding TRACAS stickers!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
