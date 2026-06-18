import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { continents, countries, industryCategories } from '@telpen/domain';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

for (const continent of continents) {
  await prisma.continent.upsert({
    where: { code: continent.code },
    update: { name: continent.name },
    create: {
      code: continent.code,
      name: continent.name,
    },
  });
}

for (const country of countries) {
  await prisma.country.upsert({
    where: { code: country.code },
    update: {
      name: country.name,
      flagEmoji: country.flag,
      continentCode: country.continentCode,
      currencyCode: country.currencyCode,
      currencyName: country.currencyName,
      locale: country.locale,
      timezone: country.timezone,
      monthlySubscriptionAmount: country.monthlySubscriptionAmount,
      isPilot: country.pilot,
    },
    create: {
      code: country.code,
      name: country.name,
      flagEmoji: country.flag,
      continentCode: country.continentCode,
      currencyCode: country.currencyCode,
      currencyName: country.currencyName,
      locale: country.locale,
      timezone: country.timezone,
      monthlySubscriptionAmount: country.monthlySubscriptionAmount,
      isPilot: country.pilot,
    },
  });
}

for (const industry of industryCategories) {
  await prisma.industryCategory.upsert({
    where: { code: industry.code },
    update: {
      name: industry.name,
      description: industry.description,
      isBlocked: false,
    },
    create: {
      code: industry.code,
      name: industry.name,
      description: industry.description,
      isBlocked: false,
    },
  });
}

console.log(
  JSON.stringify({
    status: 'seeded',
    continents: continents.length,
    countries: countries.length,
    industryCategories: industryCategories.length,
  }),
);

await prisma.$disconnect();
