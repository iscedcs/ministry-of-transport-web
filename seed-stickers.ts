import "dotenv/config";
import { db } from "./lib/db";

async function main() {
  const urls = [
    "https://transpaytms.com/v/status1772628800404",
    "https://transpaytms.com/v/status1772628288905",
    "https://transpaytms.com/v/status1772628704796",
    "https://transpaytms.com/v/status1772628296270",
    "https://transpaytms.com/v/status1772618456899",
  ];

  console.log("Seeding 5 boat sticker URLs...");
  for (const url of urls) {
    const parts = url.split("/");
    const code = parts[parts.length - 1];

    await db.boatSticker.upsert({
      where: { stickerUrl: url },
      update: {},
      create: {
        stickerUrl: url,
        stickerCode: code,
        isAssigned: false,
      },
    });
    console.log(`✓ Added sticker: ${code} (${url})`);
  }
  console.log("Done seeding stickers!");
}

main()
  .catch((e) => {
    console.error("Seeding error:", e);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });
