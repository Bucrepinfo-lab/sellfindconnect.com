export type OnboardingIntent = "SELL"|"FIND"|"BOTH";
export type OnboardingStep = "INTENT"|"PROFILE"|"ADVERT"|"SEARCH"|"COMPLETE";

export const SELL_QUICK_STARTS = [
  { icon: "🏭", title: "Manufacturer / Producer", desc: "You make or grow products", role: "PRODUCER" },
  { icon: "📦", title: "Wholesaler / Supplier", desc: "You supply goods in bulk", role: "SUPPLIER" },
  { icon: "🚚", title: "Distributor / Logistics", desc: "You move or distribute goods", role: "DISTRIBUTOR" },
  { icon: "🔧", title: "Installer / Service Provider", desc: "You install or service products", role: "INSTALLER" },
  { icon: "🏦", title: "Financier / Lender", desc: "You provide trade finance", role: "FINANCIER" },
  { icon: "✅", title: "Certifier / Inspector", desc: "You certify or inspect goods", role: "CERTIFIER" },
];

export const FIND_QUICK_INDUSTRIES = [
  { icon: "🌾", label: "Agriculture", code: "AGRI", catalogCode: "AGRICULTURE" },
  { icon: "🏗️", label: "Construction", code: "CONST", catalogCode: "CONSTRUCTION" },
  { icon: "🛒", label: "Retail and FMCG", code: "RETAIL", catalogCode: "TRADE" },
  { icon: "💻", label: "Technology", code: "TECH", catalogCode: "TECHNOLOGY" },
  { icon: "🏥", label: "Healthcare", code: "HEALTH", catalogCode: "HEALTH" },
  { icon: "⚡", label: "Energy", code: "ENERGY", catalogCode: "UTILITIES" },
  { icon: "🚢", label: "Import and Export", code: "TRADE", catalogCode: "TRADE" },
  { icon: "🏭", label: "Manufacturing", code: "MFG", catalogCode: "MANUFACTURING" },
] as const;
