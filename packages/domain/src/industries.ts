export type IndustryCategory = {
  code: string;
  name: string;
  description: string;
};

export const industryCategories: IndustryCategory[] = [
  {
    code: 'AGRICULTURE',
    name: 'Agriculture, forestry, fishing and livestock',
    description: 'Growers, farmers, fisheries, forestry, inputs and agricultural services.',
  },
  {
    code: 'EXTRACTIVES',
    name: 'Mining, quarrying, oil, gas and minerals',
    description: 'Extraction, mineral supply, processing support and equipment.',
  },
  {
    code: 'MANUFACTURING',
    name: 'Manufacturing and processing',
    description: 'Factories, processors, fabricators, packaging and industrial production.',
  },
  {
    code: 'UTILITIES',
    name: 'Utilities, energy, water and waste',
    description: 'Power, renewables, water, sanitation, recycling and waste management.',
  },
  {
    code: 'CONSTRUCTION',
    name: 'Construction, building materials and infrastructure',
    description: 'Contractors, trades, materials, equipment and infrastructure services.',
  },
  {
    code: 'TRADE',
    name: 'Wholesale, retail, e-commerce and distribution',
    description: 'Wholesalers, retailers, merchants, marketplaces and distributors.',
  },
  {
    code: 'AUTOMOTIVE',
    name: 'Automotive, machinery, parts and repair',
    description: 'Vehicles, motorcycles, equipment, spare parts and maintenance.',
  },
  {
    code: 'LOGISTICS',
    name: 'Transport, logistics, shipping and warehousing',
    description: 'Freight, delivery, storage, clearing, forwarding and mobility.',
  },
  {
    code: 'HOSPITALITY',
    name: 'Hospitality, food service and tourism',
    description: 'Accommodation, restaurants, catering, travel and tourism services.',
  },
  {
    code: 'TECHNOLOGY',
    name: 'Information, communication, media and technology',
    description: 'Software, telecoms, digital services, media and communications.',
  },
  {
    code: 'FINANCE',
    name: 'Finance, insurance, fintech and accounting',
    description: 'Financial services, insurance, investment, payments and accounting.',
  },
  {
    code: 'REAL_ESTATE',
    name: 'Real estate, property, rentals and facilities',
    description: 'Property sales, leasing, management, maintenance and facilities.',
  },
  {
    code: 'PROFESSIONAL',
    name: 'Professional, scientific, legal and consulting services',
    description: 'Consulting, engineering, legal, research and specialist services.',
  },
  {
    code: 'BUSINESS_SUPPORT',
    name: 'Administrative and business support services',
    description: 'Staffing, cleaning, security, administration and operational support.',
  },
  {
    code: 'PUBLIC_NGO',
    name: 'Public administration, NGOs and associations',
    description: 'Government services, civil society, associations and development work.',
  },
  {
    code: 'EDUCATION',
    name: 'Education, training and research',
    description: 'Schools, tutors, training, professional learning and research.',
  },
  {
    code: 'HEALTH',
    name: 'Health, wellness, social care and medical supplies',
    description: 'Licensed care, wellness, pharmacies and compliant medical supply.',
  },
  {
    code: 'ARTS_SPORTS',
    name: 'Arts, entertainment, events, sports and recreation',
    description: 'Creative services, venues, events, sports and recreation.',
  },
  {
    code: 'PERSONAL_SERVICES',
    name: 'Beauty, fashion, personal care and repair',
    description: 'Fashion, beauty, grooming, tailoring and repair services.',
  },
  {
    code: 'HOME_SERVICES',
    name: 'Home, household, childcare and personal support',
    description: 'Household services, compliant childcare and personal assistance.',
  },
  {
    code: 'INTERNATIONAL',
    name: 'International organizations and export bodies',
    description: 'Cross-border agencies, trade bodies and international organizations.',
  },
];

export const supplyChainRoles = [
  'PRODUCER',
  'SUPPLIER',
  'DISTRIBUTOR',
  'WHOLESALER',
  'RETAILER',
  'SERVICE_PROVIDER',
  'BUYER',
  'CONSUMER',
  'AGENT',
  'INSTALLER',
  'MAINTAINER',
  'LOGISTICS_PROVIDER',
  'FINANCIER',
  'CERTIFIER',
] as const;

export type SupplyChainRole = (typeof supplyChainRoles)[number];
