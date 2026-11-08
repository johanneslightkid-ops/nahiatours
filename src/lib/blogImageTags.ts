export interface BlogImageTag {
  tag: string;
  label: string;
  description: string;
  terms: string[];
}

// Based on the Dominican Republic tourism board's Punta Cana destination guide:
// https://www.godominicanrepublic.com/destinations/punta-cana/
// These describe a photo's visible subject, not a promise about tour inclusions.
export const BLOG_IMAGE_TAGS: BlogImageTag[] = [
  { tag: 'PuntaCana', label: 'Destino · Punta Cana', description: 'Escenas del destino Punta Cana.', terms: ['punta cana', 'punta-cana', 'bavaro', 'bávaro'] },
  { tag: 'Bavaro', label: 'Lugar · Bávaro', description: 'Playa o entorno de Bávaro.', terms: ['bavaro', 'bávaro'] },
  { tag: 'MacaoBeach', label: 'Lugar · Playa Macao', description: 'Playa Macao o su entorno.', terms: ['macao'] },
  { tag: 'SaonaIsland', label: 'Lugar · Isla Saona', description: 'Paisajes o momentos de Isla Saona.', terms: ['saona'] },
  { tag: 'CatalinaIsland', label: 'Lugar · Isla Catalina', description: 'Isla Catalina o su arrecife.', terms: ['catalina'] },
  { tag: 'Catamaran', label: 'Actividad · catamarán', description: 'Embarcación o navegación en catamarán.', terms: ['catamaran', 'catamarán', 'sailing', 'boat', 'boat trip'] },
  { tag: 'Snorkeling', label: 'Actividad · snorkel', description: 'Equipo o actividad visible de snorkel.', terms: ['snorkel', 'snorkeling', 'snorkelling'] },
  { tag: 'BuggyTour', label: 'Actividad · buggy o ATV', description: 'Vehículo o recorrido todoterreno.', terms: ['buggy', 'atv', 'quad', 'off-road', 'off road'] },
  { tag: 'DominicanCountryside', label: 'Paisaje · campo dominicano', description: 'Paisaje rural o caminos del interior.', terms: ['countryside', 'rural', 'campo', 'cacao', 'farm'] },
  { tag: 'HoyoAzul', label: 'Lugar · Hoyo Azul', description: 'El cenote Hoyo Azul, si aparece en la imagen.', terms: ['hoyo azul', 'cap cana'] },
  { tag: 'OjosIndigenas', label: 'Lugar · Ojos Indígenas', description: 'Sendero o laguna de Ojos Indígenas.', terms: ['ojos indigenas', 'ojos indígenas', 'indigenous eyes'] },
  { tag: 'LosHaitises', label: 'Lugar · Los Haitises', description: 'Manglares, cuevas o paisaje de Los Haitises.', terms: ['los haitises', 'haitises', 'mangrove', 'manglar'] },
  { tag: 'MontanaRedonda', label: 'Lugar · Montaña Redonda', description: 'Mirador o paisaje de Montaña Redonda.', terms: ['montana redonda', 'montaña redonda'] },
  { tag: 'SantoDomingo', label: 'Lugar · Santo Domingo', description: 'Calles o patrimonio de Santo Domingo.', terms: ['santo domingo', 'colonial zone', 'zona colonial'] },
  { tag: 'AltosDeChavon', label: 'Lugar · Altos de Chavón', description: 'Arquitectura o espacios de Altos de Chavón.', terms: ['altos de chavon', 'altos de chavón'] },
  { tag: 'PlayaJuanillo', label: 'Lugar · Playa Juanillo', description: 'Playa Juanillo, cuando sea identificable.', terms: ['juanillo'] },
  { tag: 'CabezaDeToro', label: 'Lugar · Cabeza de Toro', description: 'Playa o costa de Cabeza de Toro.', terms: ['cabeza de toro'] },
  { tag: 'CaribbeanSea', label: 'Paisaje · mar Caribe', description: 'Mar, costa o navegación caribeña.', terms: ['caribbean', 'caribe', 'sea', 'ocean', 'coast', 'beach', 'island'] },
  { tag: 'DominicanCulture', label: 'Cultura · vida local', description: 'Personas, oficios o vida local mostrados con contexto y respeto.', terms: ['culture', 'cultura', 'local', 'community', 'comunidad', 'craft', 'artesania'] },
  { tag: 'DominicanFood', label: 'Gastronomía · comida dominicana', description: 'Plato o comida dominicana que aparece en la foto.', terms: ['food', 'comida', 'cocina', 'meal', 'dish', 'gastronomy'] },
  { tag: 'FamilyTrip', label: 'Viaje · familias', description: 'La imagen muestra una experiencia compartida en familia.', terms: ['family', 'familia', 'kids', 'children', 'children'] },
  { tag: 'CouplesTrip', label: 'Viaje · parejas', description: 'La imagen muestra una experiencia para dos.', terms: ['couple', 'pareja', 'romantic', 'two people'] },
];
