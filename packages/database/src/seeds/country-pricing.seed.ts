import { PrismaClient } from '@prisma/client';

const COUNTRY_PRICING = [
  { country: 'KE', currency: 'KES', amountMinor: BigInt(10000),   display: 'KSh 100',    mode: 'floor' },
  { country: 'NG', currency: 'NGN', amountMinor: BigInt(100000),  display: 'NGN 1000',   mode: 'floor' },
  { country: 'UG', currency: 'UGX', amountMinor: BigInt(2000),    display: 'USh 2000',   mode: 'floor' },
  { country: 'TZ', currency: 'TZS', amountMinor: BigInt(2000),    display: 'TSh 2000',   mode: 'floor' },
  { country: 'RW', currency: 'RWF', amountMinor: BigInt(1000),    display: 'FRw 1000',   mode: 'floor' },
  { country: 'ET', currency: 'ETB', amountMinor: BigInt(10000),   display: 'Br 100',     mode: 'floor' },
  { country: 'EG', currency: 'EGP', amountMinor: BigInt(3500),    display: 'E£35',       mode: 'floor' },
  { country: 'GH', currency: 'GHS', amountMinor: BigInt(1000),    display: 'GHS 10',     mode: 'literal' },
  { country: 'ZA', currency: 'ZAR', amountMinor: BigInt(1000),    display: 'R10',        mode: 'literal' },
  { country: 'IN', currency: 'INR', amountMinor: BigInt(6000),    display: 'Rs 60',      mode: 'floor' },
  { country: 'ID', currency: 'IDR', amountMinor: BigInt(1000000), display: 'Rp 10000',   mode: 'floor' },
  { country: 'PH', currency: 'PHP', amountMinor: BigInt(4000),    display: 'PHP 40',     mode: 'floor' },
  { country: 'VN', currency: 'VND', amountMinor: BigInt(2000000), display: 'VND 20000',  mode: 'floor' },
  { country: 'MY', currency: 'MYR', amountMinor: BigInt(1000),    display: 'RM10',       mode: 'literal' },
  { country: 'TH', currency: 'THB', amountMinor: BigInt(2500),    display: 'THB 25',     mode: 'floor' },
  { country: 'BR', currency: 'BRL', amountMinor: BigInt(1000),    display: 'R\',      mode: 'literal' },
  { country: 'MX', currency: 'MXN', amountMinor: BigInt(1000),    display: 'MXN 10',     mode: 'literal' },
  { country: 'CO', currency: 'COP', amountMinor: BigInt(300000),  display: 'COP 3000',   mode: 'floor' },
  { country: 'AR', currency: 'ARS', amountMinor: BigInt(100000),  display: 'ARS 1000',   mode: 'floor' },
  { country: 'US', currency: 'USD', amountMinor: BigInt(1000),    display: 'USD 10',     mode: 'literal' },
  { country: 'EU', currency: 'EUR', amountMinor: BigInt(1000),    display: 'EUR 10',     mode: 'literal' },
  { country: 'GB', currency: 'GBP', amountMinor: BigInt(1000),    display: 'GBP 10',     mode: 'literal' },
  { country: 'CA', currency: 'CAD', amountMinor: BigInt(1000),    display: 'CAD 10',     mode: 'literal' },
  { country: 'AU', currency: 'AUD', amountMinor: BigInt(1000),    display: 'AUD 10',     mode: 'literal' },
] as const;

async function main() {
  const prisma = new PrismaClient();
  try {
    let upserted = 0;
    for (const row of COUNTRY_PRICING) {
      await prisma.countryPricing.upsert({
        where: { country: row.country },
        create: row,
        update: { currency: row.currency, amountMinor: row.amountMinor, display: row.display, mode: row.mode },
      });
      upserted++;
    }
    console.log('CountryPricing: ' + upserted + ' rows upserted');
  } finally {
    await prisma.disconnect();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
