import "dotenv/config";
import { db } from "../lib/db";
import { ANAMBRA_LGAS } from "../lib/consts";
import fs from "node:fs";
import path from "node:path";

// Standard towns per LGA in Anambra State
const DEFAULT_TOWNS: Record<string, string[]> = {
  Aguata: ["Ekwulobia", "Amesi", "Uga", "Igbo-Ukwu", "Achina", "Aguluezechukwu"],
  "Anambra East": ["Aguleri", "Otuocha", "Eziagulu Otu", "Igbariam", "Nando"],
  "Anambra West": ["Nzam", "Ifite Anam", "Umueze Anam", "Umuoba Anam"],
  Anaocha: ["Neni", "Agulu", "Adazi-Nnukwu", "Adazi-Ani", "Adazi-Enu", "Aguluzigbo"],
  "Awka North": ["Achalla", "Amansea", "Isu-Aniocha", "Mgbakwu", "Ugbene", "Urum"],
  "Awka South": ["Awka", "Amawbia", "Okpuno", "Nibo", "Nise", "Mbaukwu"],
  Ayamelum: ["Anaku", "Omor", "Omasi", "Igbakwu", "Umueje", "Ifite Ogwari"],
  Dunukofia: ["Ukpo", "Ifitedunu", "Umunnachi", "Umudioka", "Ukwulu", "Nawgu"],
  Ekwusigo: ["Ozubulu", "Oraifite", "Ichi", "Ihembosi"],
  "Idemili North": ["Ogidi", "Nkpor", "Obosi", "Uke", "Abatete", "Ideani", "Oraukwu"],
  "Idemili South": ["Ojoto", "Oba", "Nnobi", "Alor", "Awka-Etiti", "Nnokwa"],
  Ihiala: ["Ihiala", "Okija", "Uli", "Amorka", "Azia", "Mbosi", "Isseke"],
  Njikoka: ["Abagana", "Enugwu-Ukwu", "Nawfia", "Abba", "Enugwu-Agidi"],
  "Nnewi North": ["Nnewi", "Otolo", "Uruagu", "Umudim", "Nnewichi"],
  "Nnewi South": ["Ukpor", "Utuh", "Amichi", "Osumenyi", "Ebenator", "Ekwulumili"],
  Ogbaru: ["Atani", "Okpoko", "Ossomala", "Ogwu-Ikpele", "Akili-Ogidi", "Odekpe"],
  "Onitsha North": ["Onitsha", "Odoakpu", "GRA Onitsha", "Inland Town"],
  "Onitsha South": ["Fegge", "Ochanja", "Woliwo", "Bridge Head"],
  "Orumba North": ["Ajalli", "Ufuma", "Ndikelionwu", "Nanka", "Oko", "Awa"],
  "Orumba South": ["Umunze", "Ihite", "Isulo", "Ezira", "Eziagu", "Nawfija"],
  Oyi: ["Nteje", "Awkuzu", "Ogbunike", "Nkwelle-Ezunaka", "Umunya"],
};

async function main() {
  console.log("Seeding CVR LGAs and Towns...");

  // 1. Seed all 21 Anambra LGAs
  for (const lgaName of ANAMBRA_LGAS) {
    process.stdout.write(`Seeding ${lgaName}... `);
    const lga = await db.cvrLga.upsert({
      where: { name_state: { name: lgaName, state: "Anambra" } },
      update: {},
      create: {
        name: lgaName,
        state: "Anambra",
      },
    });

    // Add default towns for this LGA
    const towns = DEFAULT_TOWNS[lgaName] || [lgaName];
    for (const townName of towns) {
      await db.cvrTown.upsert({
        where: { name_lgaId: { name: townName, lgaId: lga.id } },
        update: {},
        create: {
          name: townName,
          state: "Anambra",
          lgaId: lga.id,
        },
      });
    }
    console.log("OK");
  }

  // 2. Also incorporate any valid towns from allmotorparks.json
  const parksPath = path.join(process.cwd(), "app", "api", "allmotorparks.json");
  if (fs.existsSync(parksPath)) {
    try {
      const content = JSON.parse(fs.readFileSync(parksPath, "utf-8"));
      const parks = content.data || [];
      for (const p of parks) {
        const town = p.townCommunity?.trim();
        const lgaName = (p.branches?.[0]?.lga || "").trim();
        if (town && lgaName) {
          const lga = await db.cvrLga.findFirst({
            where: { name: { equals: lgaName, mode: "insensitive" } },
          });
          if (lga) {
            await db.cvrTown.upsert({
              where: { name_lgaId: { name: town, lgaId: lga.id } },
              update: {},
              create: {
                name: town,
                state: lga.state,
                lgaId: lga.id,
              },
            });
          }
        }
      }
    } catch (e) {
      console.warn("Could not read allmotorparks.json for extra towns:", e);
    }
  }

  const lgaCount = await db.cvrLga.count();
  const townCount = await db.cvrTown.count();
  console.log(`Seeded successfully! Total CvrLgas: ${lgaCount}, Total CvrTowns: ${townCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
