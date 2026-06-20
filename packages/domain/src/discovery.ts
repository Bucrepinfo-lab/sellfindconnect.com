import type { SupplyChainRole } from './industries';

export type DiscoveryVector = Record<string, number>;

export type DiscoveryRelationshipKind =
  | 'SUPPLIES'
  | 'BUYS_FROM'
  | 'DISTRIBUTES'
  | 'SERVES'
  | 'FINANCES'
  | 'CERTIFIES';

export type DiscoveryRelationshipSignal = {
  role: SupplyChainRole;
  relationship: DiscoveryRelationshipKind;
  weight: number;
  reason: string;
};

export type DiscoveryDocumentInput = {
  title: string;
  displayName: string;
  description: string;
  industryCode: string;
  countryCode: string;
  role: SupplyChainRole;
  tags?: string[];
  relationshipSignals?: DiscoveryRelationshipSignal[];
};

export type DiscoveryIndexDocument = {
  searchText: string;
  tokenVector: DiscoveryVector;
  relationshipSignals: DiscoveryRelationshipSignal[];
};

export type DiscoveryVectorScore = {
  score: number;
  matchedTerms: string[];
};

const stopWords = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'by',
  'for',
  'from',
  'in',
  'near',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);

const roleRelationshipSignals: Record<SupplyChainRole, DiscoveryRelationshipSignal[]> = {
  PRODUCER: [
    relationshipSignal('SUPPLIER', 'SUPPLIES', 0.9, 'Producers often need suppliers and buyers.'),
    relationshipSignal(
      'DISTRIBUTOR',
      'DISTRIBUTES',
      0.78,
      'Distributors can move producer output.',
    ),
    relationshipSignal(
      'BUYER',
      'BUYS_FROM',
      0.86,
      'Buyers are likely clients for producer output.',
    ),
    relationshipSignal(
      'LOGISTICS_PROVIDER',
      'SERVES',
      0.72,
      'Logistics providers support producer delivery.',
    ),
  ],
  SUPPLIER: [
    relationshipSignal(
      'BUYER',
      'BUYS_FROM',
      0.94,
      'Buyers are likely clients for supplier offers.',
    ),
    relationshipSignal('RETAILER', 'SUPPLIES', 0.82, 'Retailers commonly source from suppliers.'),
    relationshipSignal(
      'WHOLESALER',
      'SUPPLIES',
      0.78,
      'Wholesalers can source supplier inventory.',
    ),
    relationshipSignal(
      'LOGISTICS_PROVIDER',
      'SERVES',
      0.7,
      'Logistics providers support supplier fulfillment.',
    ),
  ],
  DISTRIBUTOR: [
    relationshipSignal(
      'SUPPLIER',
      'DISTRIBUTES',
      0.84,
      'Distributors connect supplier inventory to markets.',
    ),
    relationshipSignal('RETAILER', 'SUPPLIES', 0.8, 'Retailers are likely distributor clients.'),
    relationshipSignal('BUYER', 'SUPPLIES', 0.74, 'Bulk buyers can source through distributors.'),
  ],
  WHOLESALER: [
    relationshipSignal('SUPPLIER', 'BUYS_FROM', 0.78, 'Wholesalers often buy from suppliers.'),
    relationshipSignal('RETAILER', 'SUPPLIES', 0.9, 'Retailers are likely wholesaler clients.'),
    relationshipSignal('BUYER', 'SUPPLIES', 0.76, 'Bulk buyers can source from wholesalers.'),
  ],
  RETAILER: [
    relationshipSignal('WHOLESALER', 'BUYS_FROM', 0.82, 'Retailers often source from wholesalers.'),
    relationshipSignal('CONSUMER', 'SUPPLIES', 0.9, 'Consumers are likely retailer clients.'),
    relationshipSignal('BUYER', 'SUPPLIES', 0.7, 'Local buyers can source from retailers.'),
  ],
  SERVICE_PROVIDER: [
    relationshipSignal('BUYER', 'SERVES', 0.86, 'Buyers are likely service clients.'),
    relationshipSignal('CONSUMER', 'SERVES', 0.74, 'Consumers can request service providers.'),
    relationshipSignal('AGENT', 'SERVES', 0.62, 'Agents can refer service demand.'),
  ],
  BUYER: [
    relationshipSignal(
      'SUPPLIER',
      'BUYS_FROM',
      0.94,
      'Suppliers are likely sources for buyer needs.',
    ),
    relationshipSignal('PRODUCER', 'BUYS_FROM', 0.84, 'Producers can satisfy buyer demand.'),
    relationshipSignal('DISTRIBUTOR', 'BUYS_FROM', 0.78, 'Distributors can fulfill buyer demand.'),
  ],
  CONSUMER: [
    relationshipSignal(
      'RETAILER',
      'BUYS_FROM',
      0.86,
      'Retailers are likely sources for consumers.',
    ),
    relationshipSignal(
      'SERVICE_PROVIDER',
      'SERVES',
      0.74,
      'Service providers can meet consumer demand.',
    ),
  ],
  AGENT: [
    relationshipSignal('SUPPLIER', 'SERVES', 0.7, 'Agents can connect suppliers to clients.'),
    relationshipSignal('BUYER', 'SERVES', 0.7, 'Agents can connect buyers to sources.'),
  ],
  INSTALLER: [
    relationshipSignal('SUPPLIER', 'BUYS_FROM', 0.74, 'Installers often need compliant suppliers.'),
    relationshipSignal('CONSUMER', 'SERVES', 0.7, 'Consumers are likely installer clients.'),
  ],
  MAINTAINER: [
    relationshipSignal('SUPPLIER', 'BUYS_FROM', 0.7, 'Maintainers need parts and supply sources.'),
    relationshipSignal('CONSUMER', 'SERVES', 0.72, 'Consumers may need maintenance support.'),
  ],
  LOGISTICS_PROVIDER: [
    relationshipSignal('SUPPLIER', 'SERVES', 0.78, 'Suppliers often need logistics providers.'),
    relationshipSignal('PRODUCER', 'SERVES', 0.74, 'Producers often need distribution support.'),
    relationshipSignal('BUYER', 'SERVES', 0.66, 'Buyers may need delivery coordination.'),
  ],
  FINANCIER: [
    relationshipSignal('SUPPLIER', 'FINANCES', 0.68, 'Suppliers may need working capital.'),
    relationshipSignal('PRODUCER', 'FINANCES', 0.68, 'Producers may need asset or stock finance.'),
    relationshipSignal('BUYER', 'FINANCES', 0.58, 'Buyers may need purchasing finance.'),
  ],
  CERTIFIER: [
    relationshipSignal('SUPPLIER', 'CERTIFIES', 0.72, 'Suppliers may need certification support.'),
    relationshipSignal('PRODUCER', 'CERTIFIES', 0.72, 'Producers may need certification support.'),
    relationshipSignal(
      'DISTRIBUTOR',
      'CERTIFIES',
      0.58,
      'Distributors may need compliance checks.',
    ),
  ],
};

export function buildDiscoveryIndexDocument(input: DiscoveryDocumentInput): DiscoveryIndexDocument {
  const relationshipSignals =
    input.relationshipSignals ?? inferDiscoveryRelationshipSignals(input.role);
  const searchText = buildDiscoverySearchText({ ...input, relationshipSignals });
  const tokenVector = buildDiscoveryVector({ ...input, relationshipSignals });

  return {
    searchText,
    tokenVector,
    relationshipSignals,
  };
}

export function buildDiscoverySearchText(input: DiscoveryDocumentInput): string {
  return [
    input.title,
    input.displayName,
    input.description,
    input.industryCode,
    input.countryCode,
    input.role,
    ...(input.tags ?? []),
    ...(input.relationshipSignals ?? []).flatMap((signal) => [
      signal.role,
      signal.relationship,
      signal.reason,
    ]),
  ]
    .join(' ')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function buildDiscoveryVector(input: DiscoveryDocumentInput): DiscoveryVector {
  const vector: DiscoveryVector = {};
  addWeightedTokens(vector, input.title, 4);
  addWeightedTokens(vector, input.displayName, 3);
  addWeightedTokens(vector, input.description, 1.5);
  addWeightedTokens(vector, input.industryCode, 2);
  addWeightedTokens(vector, input.countryCode, 1.25);
  addWeightedTokens(vector, input.role, 2);
  for (const tag of input.tags ?? []) {
    addWeightedTokens(vector, tag, 2);
  }
  for (const signal of input.relationshipSignals ?? []) {
    addWeightedTokens(vector, signal.role, 1.25 + signal.weight);
    addWeightedTokens(vector, signal.relationship, signal.weight);
    addWeightedTokens(vector, signal.reason, signal.weight);
  }

  return normalizeVector(vector);
}

export function scoreDiscoveryVector(
  query: string,
  document: DiscoveryVector,
): DiscoveryVectorScore {
  const queryVector = buildQueryVector(query);
  const matchedTerms = Object.keys(queryVector).filter((token) => document[token] !== undefined);
  if (!matchedTerms.length) {
    return { score: 0, matchedTerms: [] };
  }

  const dotProduct = matchedTerms.reduce(
    (sum, token) => sum + (queryVector[token] ?? 0) * (document[token] ?? 0),
    0,
  );
  const queryMagnitude = vectorMagnitude(queryVector);
  const documentMagnitude = vectorMagnitude(document);
  const cosine =
    queryMagnitude > 0 && documentMagnitude > 0
      ? dotProduct / (queryMagnitude * documentMagnitude)
      : 0;

  return {
    score: Math.round(cosine * 100),
    matchedTerms,
  };
}

export function inferDiscoveryRelationshipSignals(
  role: SupplyChainRole,
): DiscoveryRelationshipSignal[] {
  return roleRelationshipSignals[role] ?? [];
}

export function inferDesiredDiscoveryRoles(query: string): SupplyChainRole[] {
  const tokens = new Set(tokenizeDiscoveryText(query));
  const roles: SupplyChainRole[] = [];
  const add = (role: SupplyChainRole) => {
    if (!roles.includes(role)) {
      roles.push(role);
    }
  };

  if (
    tokens.has('buyer') ||
    tokens.has('buyers') ||
    tokens.has('client') ||
    tokens.has('clients')
  ) {
    add('BUYER');
  }
  if (
    tokens.has('consumer') ||
    tokens.has('consumers') ||
    tokens.has('customer') ||
    tokens.has('customers')
  ) {
    add('CONSUMER');
  }
  if (
    tokens.has('supplier') ||
    tokens.has('suppliers') ||
    tokens.has('source') ||
    tokens.has('sources')
  ) {
    add('SUPPLIER');
  }
  if (
    tokens.has('producer') ||
    tokens.has('producers') ||
    tokens.has('manufacturer') ||
    tokens.has('makers')
  ) {
    add('PRODUCER');
  }
  if (tokens.has('logistics') || tokens.has('transport') || tokens.has('delivery')) {
    add('LOGISTICS_PROVIDER');
  }
  if (
    tokens.has('retailer') ||
    tokens.has('retailers') ||
    tokens.has('shop') ||
    tokens.has('shops')
  ) {
    add('RETAILER');
  }
  if (tokens.has('wholesaler') || tokens.has('wholesalers')) {
    add('WHOLESALER');
  }

  return roles;
}

export function tokenizeDiscoveryText(value: string): string[] {
  return value
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !stopWords.has(token))
    .map(stemToken);
}

function buildQueryVector(query: string): DiscoveryVector {
  const vector: DiscoveryVector = {};
  addWeightedTokens(vector, query, 1);
  return normalizeVector(vector);
}

function addWeightedTokens(vector: DiscoveryVector, value: string, weight: number): void {
  for (const token of tokenizeDiscoveryText(value)) {
    vector[token] = (vector[token] ?? 0) + weight;
  }
}

function normalizeVector(vector: DiscoveryVector): DiscoveryVector {
  const magnitude = vectorMagnitude(vector);
  if (magnitude === 0) {
    return vector;
  }

  return Object.fromEntries(
    Object.entries(vector).map(([token, weight]) => [
      token,
      Number((weight / magnitude).toFixed(6)),
    ]),
  );
}

function vectorMagnitude(vector: DiscoveryVector): number {
  return Math.sqrt(Object.values(vector).reduce((sum, weight) => sum + weight * weight, 0));
}

function stemToken(token: string): string {
  if (token.length > 4 && token.endsWith('ies')) {
    return `${token.slice(0, -3)}y`;
  }
  if (token.length > 3 && token.endsWith('s')) {
    return token.slice(0, -1);
  }
  return token;
}

function relationshipSignal(
  role: SupplyChainRole,
  relationship: DiscoveryRelationshipKind,
  weight: number,
  reason: string,
): DiscoveryRelationshipSignal {
  return { role, relationship, weight, reason };
}
