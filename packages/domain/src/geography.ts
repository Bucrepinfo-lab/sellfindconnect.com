export type Continent = {
  code: string;
  name: string;
};

export type Country = {
  code: string;
  name: string;
  flag: string;
  continentCode: string;
  currencyCode: string;
  currencyName: string;
  locale: string;
  timezone: string;
  monthlySubscriptionAmount: number;
  pilot: boolean;
};

export const continents: Continent[] = [
  { code: 'AF', name: 'Africa' },
  { code: 'AS', name: 'Asia' },
  { code: 'EU', name: 'Europe' },
  { code: 'NA', name: 'North America' },
  { code: 'SA', name: 'South America' },
  { code: 'OC', name: 'Oceania' },
  { code: 'AN', name: 'Antarctica' },
];

export const countries: Country[] = [
  {
    code: 'KE',
    name: 'Kenya',
    flag: '🇰🇪',
    continentCode: 'AF',
    currencyCode: 'KES',
    currencyName: 'Kenyan shilling',
    locale: 'en-KE',
    timezone: 'Africa/Nairobi',
    // Basic plan, founding price (owner decision 18/11/26); see subscription-pricing.ts.
    monthlySubscriptionAmount: 499,
    pilot: true,
  },
];

export function getCountry(code: string): Country | undefined {
  return countries.find((country) => country.code === code.toUpperCase());
}
