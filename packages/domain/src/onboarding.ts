export type OnboardingIntent = "SELL"|"FIND"|"BOTH";
export type OnboardingStep = "INTENT"|"PROFILE"|"ADVERT"|"SEARCH"|"COMPLETE";

export const SELL_QUICK_STARTS = [
  { title: "Manufacturer / Producer", desc: "You make or grow products", role: "PRODUCER" },
  { title: "Wholesaler / Supplier", desc: "You supply goods in bulk", role: "SUPPLIER" },
  { title: "Distributor / Logistics", desc: "You move or distribute goods", role: "DISTRIBUTOR" },
  { title: "Installer / Service Provider", desc: "You install or service products", role: "INSTALLER" },
  { title: "Financier / Lender", desc: "You provide trade finance", role: "FINANCIER" },
  { title: "Certifier / Inspector", desc: "You certify or inspect goods", role: "CERTIFIER" },
];

export const FIND_QUICK_INDUSTRIES = [
  { label: "Agriculture", code: "AGRI", catalogCode: "AGRICULTURE" },
  { label: "Construction", code: "CONST", catalogCode: "CONSTRUCTION" },
  { label: "Retail and FMCG", code: "RETAIL", catalogCode: "TRADE" },
  { label: "Technology", code: "TECH", catalogCode: "TECHNOLOGY" },
  { label: "Healthcare", code: "HEALTH", catalogCode: "HEALTH" },
  { label: "Energy", code: "ENERGY", catalogCode: "UTILITIES" },
  { label: "Import and Export", code: "TRADE", catalogCode: "TRADE" },
  { label: "Manufacturing", code: "MFG", catalogCode: "MANUFACTURING" },
] as const;
