import { findKenyaCounty } from './kenya-places';

/**
 * Well-known Kenyan trading places a business can name as "where to find us":
 * open-air and municipal markets, wholesale and trade streets, industrial
 * areas, malls and supermarket chains. A starter list of widely known names,
 * not a complete register: businesses can always type their own landmark.
 * Names are used only as location references; no logos or brand artwork.
 */
export type KenyaLandmarkKind =
  | 'OPEN_MARKET'
  | 'WHOLESALE_HUB'
  | 'TRADE_STREET'
  | 'INDUSTRIAL_AREA'
  | 'MALL'
  | 'SUPERMARKET_CHAIN';

export type KenyaLandmark = {
  name: string;
  kind: KenyaLandmarkKind;
  /** Official county name; absent for national chains with many branches. */
  county?: string;
  /** Town, estate or street, as people say it. */
  area?: string;
  /** What it is best known for, in plain words. */
  knownFor: string;
};

export const kenyaLandmarkKinds: Array<{ kind: KenyaLandmarkKind; label: string; plural: string }> = [
  { kind: 'OPEN_MARKET', label: 'Market', plural: 'Markets' },
  { kind: 'WHOLESALE_HUB', label: 'Wholesale hub', plural: 'Wholesale hubs' },
  { kind: 'TRADE_STREET', label: 'Trade street', plural: 'Trade streets' },
  { kind: 'INDUSTRIAL_AREA', label: 'Industrial area', plural: 'Industrial areas' },
  { kind: 'MALL', label: 'Mall', plural: 'Malls' },
  { kind: 'SUPERMARKET_CHAIN', label: 'Supermarket chain', plural: 'Supermarket chains' },
];

const market = (name: string, county: string, area: string, knownFor: string): KenyaLandmark => ({
  name,
  kind: 'OPEN_MARKET',
  county,
  area,
  knownFor,
});
const hub = (name: string, county: string, area: string, knownFor: string): KenyaLandmark => ({
  name,
  kind: 'WHOLESALE_HUB',
  county,
  area,
  knownFor,
});
const street = (name: string, county: string, area: string, knownFor: string): KenyaLandmark => ({
  name,
  kind: 'TRADE_STREET',
  county,
  area,
  knownFor,
});
const industrial = (name: string, county: string, area: string, knownFor: string): KenyaLandmark => ({
  name,
  kind: 'INDUSTRIAL_AREA',
  county,
  area,
  knownFor,
});
const mall = (name: string, county: string, area: string): KenyaLandmark => ({
  name,
  kind: 'MALL',
  county,
  area,
  knownFor: 'Retail shops, services and food',
});
const chain = (name: string, knownFor: string): KenyaLandmark => ({ name, kind: 'SUPERMARKET_CHAIN', knownFor });

export const kenyaLandmarks: KenyaLandmark[] = [
  // Nairobi markets and wholesale hubs
  market('Gikomba Market', 'Nairobi', 'Kamukunji', 'Second-hand clothes, shoes, fish and household goods'),
  market('Muthurwa Market', 'Nairobi', 'Nairobi CBD', 'Fresh produce, clothes and everyday goods'),
  market('Wakulima Market (Marikiti)', 'Nairobi', 'Haile Selassie Avenue', 'Wholesale fruit and vegetables'),
  market('City Market', 'Nairobi', 'Muindi Mbingu Street', 'Meat, fish, flowers and curios'),
  market('Toi Market', 'Nairobi', 'Kibra', 'Second-hand clothes and fresh produce'),
  market('Kariokor Market', 'Nairobi', 'Starehe', 'Leather goods, sandals, bags and nyama choma'),
  market('Kangemi Market', 'Nairobi', 'Westlands', 'Fresh produce and clothes'),
  market('Kawangware Market', 'Nairobi', 'Dagoretti North', 'Fresh produce and household goods'),
  market('Ngara Market', 'Nairobi', 'Starehe', 'Clothes, shoes and fresh produce'),
  market('Maasai Market', 'Nairobi', 'Rotating city venues', 'Crafts, beadwork, fabrics and gifts'),
  hub('Kamukunji Grounds', 'Nairobi', 'Kamukunji', 'Jua kali metalwork, sufurias, boxes and household wares'),
  hub('Eastleigh', 'Nairobi', 'Kamukunji', 'Wholesale clothes, fabrics, shoes and electronics'),
  hub('Nyamakima', 'Nairobi', 'Nairobi CBD', 'Wholesale cereals, grains and general goods'),
  street('Kirinyaga Road', 'Nairobi', 'Nairobi CBD', 'Motor vehicle spare parts'),
  street('Luthuli Avenue', 'Nairobi', 'Nairobi CBD', 'Electronics, phones and sound equipment'),
  street('River Road', 'Nairobi', 'Nairobi CBD', 'Hardware, printing, electronics and general trade'),
  street('Biashara Street', 'Nairobi', 'Nairobi CBD', 'Fabrics, uniforms, curtains and baby wear'),
  industrial('Industrial Area', 'Nairobi', 'Enterprise Road and Lunga Lunga Road', 'Factories, warehouses and distributors'),
  industrial('Kariobangi Light Industries', 'Nairobi', 'Kariobangi', 'Fabrication, plastics, food processing and machines'),
  industrial('Baba Dogo', 'Nairobi', 'Ruaraka', 'Manufacturing and warehousing'),

  // Nairobi malls
  mall('Sarit Centre', 'Nairobi', 'Westlands'),
  mall('Westgate Shopping Mall', 'Nairobi', 'Westlands'),
  mall('Village Market', 'Nairobi', 'Gigiri'),
  mall('Garden City Mall', 'Nairobi', 'Thika Road'),
  mall('Thika Road Mall (TRM)', 'Nairobi', 'Roysambu'),
  mall('The Hub Karen', 'Nairobi', 'Karen'),
  mall('The Junction Mall', 'Nairobi', 'Ngong Road'),
  mall('Galleria Shopping Mall', 'Nairobi', 'Langata Road'),
  mall('Yaya Centre', 'Nairobi', 'Kilimani'),
  mall('Capital Centre', 'Nairobi', 'Mombasa Road'),
  mall('Nextgen Mall', 'Nairobi', 'Mombasa Road'),
  mall('The Imaara Mall', 'Nairobi', 'Mombasa Road'),
  mall('Greenspan Mall', 'Nairobi', 'Donholm'),
  mall('Two Rivers Mall', 'Kiambu', 'Limuru Road, Ruaka'),

  // Mombasa and the coast
  market('Kongowea Market', 'Mombasa', 'Nyali', 'Wholesale fresh produce and cereals'),
  market('Mackinnon Market (Marikiti)', 'Mombasa', 'Mombasa Island', 'Spices, fruit and vegetables'),
  market('Majengo Market', 'Mombasa', 'Mvita', 'Fresh produce, fish and clothes'),
  industrial('Changamwe Industrial Area', 'Mombasa', 'Changamwe', 'Port logistics, warehouses and factories'),
  mall('City Mall Nyali', 'Mombasa', 'Nyali'),
  mall('Nyali Centre', 'Mombasa', 'Nyali'),
  market('Malindi Market', 'Kilifi', 'Malindi', 'Fresh produce, fish and general goods'),
  market('Mtwapa Market', 'Kilifi', 'Mtwapa', 'Fresh produce and general goods'),

  // Kisumu and western Kenya
  market('Kibuye Market', 'Kisumu', 'Kisumu Central', 'Fresh produce, fish, clothes and household goods'),
  market('Jubilee Market', 'Kisumu', 'Kisumu CBD', 'Fresh produce and fish'),
  mall('Mega City Mall', 'Kisumu', 'Kisumu, Nairobi Road'),
  mall('West End Mall', 'Kisumu', 'Kisumu CBD'),
  market('Daraja Mbili Market', 'Kisii', 'Kisii town', 'Bananas, fresh produce and general goods'),
  market('Kakamega Municipal Market', 'Kakamega', 'Kakamega town', 'Fresh produce, cereals and clothes'),
  market('Busia Border Market', 'Busia', 'Busia town', 'Cross-border trade in cereals, fish and produce'),
  market('Chwele Market', 'Bungoma', 'Kabuchai', 'Open-air fresh produce and cereals'),

  // Rift Valley
  market('Nakuru Wakulima Market', 'Nakuru', 'Nakuru town', 'Wholesale fruit, vegetables and cereals'),
  market('Nakuru Top Market', 'Nakuru', 'Nakuru town', 'Fresh produce and general goods'),
  mall('Westside Mall', 'Nakuru', 'Nakuru town'),
  market('Naivasha Market', 'Nakuru', 'Naivasha', 'Fresh produce and fish'),
  market('Eldoret Main Market', 'Uasin Gishu', 'Eldoret town', 'Fresh produce, cereals and clothes'),
  mall('Rupa’s Mall', 'Uasin Gishu', 'Eldoret'),
  market('Kitale Municipal Market', 'Trans Nzoia', 'Kitale town', 'Maize, cereals and fresh produce'),
  market('Kericho Market', 'Kericho', 'Kericho town', 'Fresh produce and general goods'),
  market('Narok Market', 'Narok', 'Narok town', 'Livestock, cereals and fresh produce'),
  market('Kitengela Market', 'Kajiado', 'Kitengela', 'Fresh produce, meat and general goods'),
  market('Ngong Market', 'Kajiado', 'Ngong town', 'Fresh produce and clothes'),
  market('Nyahururu Market', 'Laikipia', 'Nyahururu town', 'Potatoes, vegetables and general goods'),
  market('Nanyuki Market', 'Laikipia', 'Nanyuki town', 'Fresh produce and general goods'),

  // Central Kenya
  market('Githurai Market', 'Kiambu', 'Githurai', 'Fresh produce, clothes and household goods'),
  market('Jamhuri Market', 'Kiambu', 'Thika town', 'Fresh produce and general goods'),
  market('Limuru Market', 'Kiambu', 'Limuru town', 'Vegetables, potatoes and clothes'),
  market('Kiambu Market', 'Kiambu', 'Kiambu town', 'Fresh produce and general goods'),
  industrial('Ruiru Industrial Area', 'Kiambu', 'Ruiru', 'Factories, warehouses and distributors'),
  industrial('Thika Industrial Area', 'Kiambu', 'Thika', 'Food processing, textiles and manufacturing'),
  mall('Juja City Mall', 'Kiambu', 'Juja'),
  mall('Ananas Mall', 'Kiambu', 'Thika'),
  market('Karatina Market', 'Nyeri', 'Karatina town', 'One of the largest open-air produce markets'),
  market('Nyeri Open Air Market', 'Nyeri', 'Nyeri town', 'Fresh produce and clothes'),
  market('Mukuyu Market', "Murang'a", "Murang'a town", 'Fresh produce and general goods'),
  market('Kagio Market', 'Kirinyaga', 'Kagio', 'Wholesale vegetables, tomatoes and rice'),
  market('Soko Mjinga', 'Nyandarua', 'Kinangop, Nairobi–Nakuru highway', 'Potatoes, cabbages and carrots'),

  // Eastern and north-eastern Kenya
  market('Machakos Marikiti Market', 'Machakos', 'Machakos town', 'Fresh produce and general goods'),
  industrial('Athi River (EPZ)', 'Machakos', 'Mavoko', 'Cement, steel, export processing and warehouses'),
  mall('Gateway Mall', 'Machakos', 'Syokimau, Mombasa Road'),
  market('Gakoromone Market', 'Meru', 'Meru town', 'Fresh produce, miraa and general goods'),
  market('Embu Market', 'Embu', 'Embu town', 'Fresh produce and general goods'),
  market('Wote Market', 'Makueni', 'Wote town', 'Fruit, cereals and general goods'),
  market('Kitui Kalundu Market', 'Kitui', 'Kitui town', 'Fresh produce, cereals and livestock'),
  market('Garissa Market', 'Garissa', 'Garissa town', 'Livestock, cereals and general goods'),
  market('Isiolo Market', 'Isiolo', 'Isiolo town', 'Livestock, miraa and general goods'),

  // Supermarket chains (many branches; no single county)
  chain('Naivas', 'Supermarket chain with branches in most large towns'),
  chain('Quickmart', 'Supermarket chain with branches in most large towns'),
  chain('Carrefour', 'Hypermarkets, mostly inside malls'),
  chain('Chandarana Foodplus', 'Supermarket chain, mostly in Nairobi and large towns'),
  chain('Cleanshelf', 'Supermarket chain, mostly in Nairobi and Kiambu'),
  chain('Khetia’s', 'Supermarket and wholesale chain in western Kenya'),
  chain('Magunas', 'Supermarket chain in central and eastern Kenya'),
  chain('Eastmatt', 'Supermarket chain in Nairobi and nearby towns'),
  chain('Mathai Supermarket', 'Supermarket chain in central Kenya'),
];

const fold = (value: string) => value.trim().toLowerCase();

/** Landmarks in one county; national chains are left out unless asked for. */
export function kenyaLandmarksInCounty(countyName: string, options: { includeChains?: boolean } = {}): KenyaLandmark[] {
  const county = findKenyaCounty(countyName);
  if (!county) return [];
  return kenyaLandmarks.filter(
    (landmark) =>
      (landmark.county && fold(landmark.county) === fold(county.name)) ||
      (options.includeChains === true && landmark.kind === 'SUPERMARKET_CHAIN'),
  );
}

export function kenyaLandmarkKindLabel(kind: KenyaLandmarkKind): string {
  return kenyaLandmarkKinds.find((item) => item.kind === kind)?.label ?? kind;
}
