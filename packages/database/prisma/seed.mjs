import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import {
  continents,
  countries,
  industryCategories,
  kenyaPilotTaxProfileDraft,
  kenyaPilotVatRuleId,
} from '@telpen/domain';

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

const now = new Date().toISOString();
const existingKenyaProfile = await prisma.financeWorkbenchRecord.findUnique({
  where: {
    collection_recordId: { collection: 'countryProfile', recordId: 'KE' },
  },
});
const existingKenyaPayload =
  existingKenyaProfile &&
  typeof existingKenyaProfile.payload === 'object' &&
  existingKenyaProfile.payload !== null &&
  !Array.isArray(existingKenyaProfile.payload)
    ? existingKenyaProfile.payload
    : null;
const kenyaAlreadyApproved =
  existingKenyaPayload?.status === 'APPROVED' || Boolean(existingKenyaPayload?.approvedBy);

if (!kenyaAlreadyApproved) {
  const profilePayload = {
    id: kenyaPilotTaxProfileDraft.id,
    countryCode: kenyaPilotTaxProfileDraft.countryCode,
    taxAuthorityName: kenyaPilotTaxProfileDraft.taxAuthorityName,
    taxRegistrationStatus: kenyaPilotTaxProfileDraft.taxRegistrationStatus,
    filingPortalUrl: kenyaPilotTaxProfileDraft.filingPortalUrl,
    localFinanceOwner: kenyaPilotTaxProfileDraft.localFinanceOwner,
    filingFrequency: kenyaPilotTaxProfileDraft.filingFrequency,
    recordRetentionYears: kenyaPilotTaxProfileDraft.recordRetentionYears,
    taxInclusivePricing: kenyaPilotTaxProfileDraft.taxInclusivePricing,
    status: kenyaPilotTaxProfileDraft.status,
    createdAt:
      typeof existingKenyaPayload?.createdAt === 'string' ? existingKenyaPayload.createdAt : now,
    updatedAt: now,
  };

  await prisma.financeWorkbenchRecord.upsert({
    where: {
      collection_recordId: { collection: 'countryProfile', recordId: 'KE' },
    },
    create: {
      collection: 'countryProfile',
      recordId: 'KE',
      countryCode: 'KE',
      payload: profilePayload,
    },
    update: {
      countryCode: 'KE',
      payload: profilePayload,
    },
  });

  const existingVatRule = await prisma.financeWorkbenchRecord.findUnique({
    where: {
      collection_recordId: { collection: 'taxRule', recordId: kenyaPilotVatRuleId },
    },
  });
  const existingVatPayload =
    existingVatRule &&
    typeof existingVatRule.payload === 'object' &&
    existingVatRule.payload !== null &&
    !Array.isArray(existingVatRule.payload)
      ? existingVatRule.payload
      : null;

  await prisma.financeWorkbenchRecord.upsert({
    where: {
      collection_recordId: { collection: 'taxRule', recordId: kenyaPilotVatRuleId },
    },
    create: {
      collection: 'taxRule',
      recordId: kenyaPilotVatRuleId,
      countryCode: 'KE',
      payload: {
        id: kenyaPilotVatRuleId,
        countryCode: 'KE',
        taxType: 'VAT',
        taxRate: kenyaPilotTaxProfileDraft.proposedVatRate,
        productTaxCode: kenyaPilotTaxProfileDraft.proposedProductTaxCode,
        registrationThreshold: kenyaPilotTaxProfileDraft.registrationThresholdKes,
        effectiveFrom: '2023-07-01T00:00:00.000Z',
        notes: 'Proposed KRA general VAT rate for the SaaS subscription. Draft only.',
        createdAt: now,
      },
    },
    update: {
      countryCode: 'KE',
      payload: {
        id: kenyaPilotVatRuleId,
        countryCode: 'KE',
        taxType: 'VAT',
        taxRate: kenyaPilotTaxProfileDraft.proposedVatRate,
        productTaxCode: kenyaPilotTaxProfileDraft.proposedProductTaxCode,
        registrationThreshold: kenyaPilotTaxProfileDraft.registrationThresholdKes,
        effectiveFrom: '2023-07-01T00:00:00.000Z',
        notes: 'Proposed KRA general VAT rate for the SaaS subscription. Draft only.',
        createdAt:
          typeof existingVatPayload?.createdAt === 'string' ? existingVatPayload.createdAt : now,
      },
    },
  });
}

console.log(
  JSON.stringify({
    status: 'seeded',
    continents: continents.length,
    countries: countries.length,
    industryCategories: industryCategories.length,
    kenyaTaxProfile: kenyaAlreadyApproved ? 'APPROVED_PRESERVED' : 'DRAFT',
  }),
);

await prisma.$disconnect();
