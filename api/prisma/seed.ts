import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const demoEmail = "agent@agriwatch.demo";
  const demoPassword = "agriwatch";
  const passwordHash = await bcrypt.hash(demoPassword, 12);

  const user = await prisma.user.upsert({
    where: { email: demoEmail },
    update: {},
    create: {
      email: demoEmail,
      passwordHash,
      preferences: {
        create: {
          temperatureUnit: "celsius",
          preferredProvider: "open-meteo",
        },
      },
    },
  });

  // Sample parcel: Yverdon-les-Bains region (Ecorobotix HQ in Vaud, Switzerland)
  await prisma.parcel.upsert({
    where: {
      userId_label: {
        userId: user.id,
        label: "Demo parcel — Yverdon",
      },
    },
    update: {},
    create: {
      userId: user.id,
      label: "Demo parcel — Yverdon",
      displayName: "Yverdon-les-Bains, Vaud, Switzerland",
      latitude: 46.7785,
      longitude: 6.6411,
      countryCode: "CH",
      timezone: "Europe/Zurich",
      cropType: "wheat",
    },
  });

  console.log(`Seeded demo user: ${demoEmail} (password: "${demoPassword}")`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
