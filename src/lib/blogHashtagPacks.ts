export type HashtagCategory =
  | 'destination'
  | 'activity'
  | 'sensory'
  | 'culture'
  | 'planning'
  | 'audience';

export interface BlogHashtag {
  tag: string;
  category: HashtagCategory;
  description: string;
  topics?: string[];
  tourTerms?: string[];
  audiences?: string[];
}

export interface BlogHashtagPack {
  id: string;
  label: string;
  description: string;
  tags: string[];
  topics?: string[];
  tourTerms?: string[];
  audiences?: string[];
}

export const HASHTAG_CATEGORIES: Array<{ id: HashtagCategory | 'all' | 'recommended'; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'recommended', label: 'Para tu selección' },
  { id: 'destination', label: 'Lugar y excursión' },
  { id: 'activity', label: 'Actividad' },
  { id: 'sensory', label: 'Sensación y momento' },
  { id: 'culture', label: 'Cultura y sabores' },
  { id: 'planning', label: 'Detalles prácticos' },
  { id: 'audience', label: 'Tipo de viaje' },
];

export const BLOG_HASHTAGS: BlogHashtag[] = [
  { tag: 'SaonaIslandDay', category: 'destination', description: 'Un día en Isla Saona.', topics: ['saona'], tourTerms: ['saona'] },
  { tag: 'SaonaNaturalPool', category: 'activity', description: 'Piscina natural de Saona; selecciónala solo si forma parte del recorrido.', topics: ['saona'], tourTerms: ['saona', 'natural pool'] },
  { tag: 'SaonaByBoat', category: 'activity', description: 'Llegada o recorrido en barco hacia Saona.', topics: ['saona'], tourTerms: ['saona', 'boat', 'catamaran'] },
  { tag: 'IslaSaona', category: 'destination', description: 'Nombre local de Isla Saona.', topics: ['saona'], tourTerms: ['saona'] },
  { tag: 'SaonaShoreline', category: 'sensory', description: 'Orilla y ambiente costero de Saona.', topics: ['saona'], tourTerms: ['saona'] },
  { tag: 'DayOutInSaona', category: 'sensory', description: 'Tono de crónica para una jornada en Saona.', topics: ['saona'], tourTerms: ['saona'] },
  { tag: 'CatalinaReefDay', category: 'destination', description: 'Isla Catalina y su arrecife.', topics: ['catalina'], tourTerms: ['catalina'] },
  { tag: 'CatalinaSnorkelStop', category: 'activity', description: 'Parada de snorkel en Catalina; confirma que esté incluida.', topics: ['catalina'], tourTerms: ['catalina', 'snorkel'] },
  { tag: 'ReefSidePuntaCana', category: 'sensory', description: 'Un momento junto al arrecife, sin prometer avistamientos.', topics: ['catalina'], tourTerms: ['catalina', 'snorkel'] },
  { tag: 'MaskAndBlue', category: 'sensory', description: 'Sensación de snorkel y agua clara, cuando la imagen lo respalde.', topics: ['catalina'], tourTerms: ['catalina', 'snorkel'] },
  { tag: 'BuggyTrailPuntaCana', category: 'activity', description: 'Ruta en buggy por Punta Cana.', topics: ['buggy'], tourTerms: ['buggy', 'atv', 'quad'] },
  { tag: 'MacaoByBuggy', category: 'activity', description: 'Buggy vinculado a Macao.', topics: ['buggy'], tourTerms: ['buggy', 'macao'] },
  { tag: 'DominicanCountryside', category: 'destination', description: 'Paisaje rural dominicano.', topics: ['buggy', 'culture'], tourTerms: ['buggy', 'safari', 'macao'] },
  { tag: 'OffRoadDayOut', category: 'sensory', description: 'Tono de aventura todoterreno, sin exagerar el riesgo.', topics: ['buggy'], tourTerms: ['buggy', 'atv', 'quad'] },
  { tag: 'MacaoBeachStop', category: 'destination', description: 'Parada en Playa Macao; úsala si aparece en la excursión.', topics: ['beach', 'buggy'], tourTerms: ['macao'] },
  { tag: 'BavaroCatamaranDay', category: 'activity', description: 'Jornada de catamarán en Bávaro.', topics: ['catamaran'], tourTerms: ['catamaran', 'boat'] },
  { tag: 'BavaroCoastBySea', category: 'destination', description: 'Costa de Bávaro vista desde el mar.', topics: ['catamaran', 'beach'], tourTerms: ['catamaran', 'boat', 'bavaro'] },
  { tag: 'CatamaranPuntaCana', category: 'activity', description: 'Excursión en catamarán en Punta Cana.', topics: ['catamaran'], tourTerms: ['catamaran', 'boat'] },
  { tag: 'CaribbeanSailingMoment', category: 'sensory', description: 'Un momento de navegación caribeña.', topics: ['catamaran'], tourTerms: ['catamaran', 'boat'] },
  { tag: 'UnderSailInBavaro', category: 'sensory', description: 'Vela y brisa en Bávaro, si la escena lo muestra.', topics: ['catamaran'], tourTerms: ['catamaran', 'boat'] },
  { tag: 'HoyoAzulMoment', category: 'destination', description: 'Hoyo Azul en Cap Cana.', topics: ['waterfall'], tourTerms: ['hoyo azul', 'cap cana'] },
  { tag: 'MontanaRedondaView', category: 'destination', description: 'Vistas de Montaña Redonda.', topics: ['waterfall'], tourTerms: ['montana redonda'] },
  { tag: 'OjosIndigenasWalk', category: 'activity', description: 'Caminata por Ojos Indígenas.', topics: ['waterfall', 'culture'], tourTerms: ['ojos indigenas', 'indigenous eyes'] },
  { tag: 'SantoDomingoDay', category: 'destination', description: 'Una jornada en Santo Domingo.', topics: ['culture'], tourTerms: ['santo domingo'] },
  { tag: 'AltosDeChavonWalk', category: 'destination', description: 'Paseo por Altos de Chavón.', topics: ['culture'], tourTerms: ['altos de chavon'] },
  { tag: 'DominicanCultureInContext', category: 'culture', description: 'Contexto cultural con respeto y sin exotizar.', topics: ['culture'] },
  { tag: 'LocalVoicesDR', category: 'culture', description: 'Historias contadas desde las voces locales; úsala si el artículo las incluye.', topics: ['culture'] },
  { tag: 'DominicanCoffeeMoment', category: 'culture', description: 'Café dominicano, solo si aparece en la experiencia o la historia.', topics: ['food', 'culture'] },
  { tag: 'CocinaDominicana', category: 'culture', description: 'Cocina dominicana y platos concretos mencionados.', topics: ['food'] },
  { tag: 'SaboresDeQuisqueya', category: 'culture', description: 'Sabores dominicanos; adecuada para historias culinarias reales.', topics: ['food'] },
  { tag: 'MamajuanaStory', category: 'culture', description: 'Mamajuana solo cuando sea parte confirmada del contexto.', topics: ['food', 'culture'] },
  { tag: 'PiesEnLaArena', category: 'sensory', description: 'Una escena cercana de playa y arena.', topics: ['beach', 'saona'] },
  { tag: 'BrisaDeBavaro', category: 'sensory', description: 'La brisa de la costa de Bávaro.', topics: ['beach', 'catamaran'] },
  { tag: 'SalitreCaribeno', category: 'sensory', description: 'Sensación del aire marino caribeño.', topics: ['beach', 'catamaran', 'saona'] },
  { tag: 'LaLuzDeMacao', category: 'sensory', description: 'Luz y ambiente de Playa Macao.', topics: ['beach', 'buggy'], tourTerms: ['macao'] },
  { tag: 'PausaFrenteAlMar', category: 'sensory', description: 'Un descanso junto al mar, si el relato lo describe.', topics: ['beach', 'saona', 'catamaran'] },
  { tag: 'CaribbeanColorPalette', category: 'sensory', description: 'Color de mar y costa, sin prometer condiciones exactas.', topics: ['beach', 'saona', 'catalina'] },
  { tag: 'QueLlevarASaona', category: 'planning', description: 'Consejos concretos para preparar una salida a Saona.', topics: ['saona'], tourTerms: ['saona'] },
  { tag: 'MacaoDayTripNotes', category: 'planning', description: 'Notas prácticas para visitar Macao.', topics: ['beach', 'buggy'], tourTerms: ['macao'] },
  { tag: 'PuntaCanaExcursionNotes', category: 'planning', description: 'Detalles útiles para planificar la excursión descrita.' },
  { tag: 'ARealDayInPuntaCana', category: 'sensory', description: 'Un relato cotidiano y realista, no una promesa publicitaria.' },
  { tag: 'SmallDetailsBigDay', category: 'sensory', description: 'Detalles concretos que hacen memorable el día.' },
  { tag: 'FamilyDayInBavaro', category: 'audience', description: 'Plan familiar situado en Bávaro.', topics: ['family', 'beach'], audiences: ['us-family-beach', 'latam-family-classic', 'canada-family-island', 'france-family-island', 'uk-family-catamaran', 'multi-gen-family'] },
  { tag: 'ViajarEnFamilia', category: 'audience', description: 'Viaje en familia, con consejos concretos.', topics: ['family'], audiences: ['latam-family-classic', 'caribbean-family-roots', 'multi-gen-family'] },
  { tag: 'PuntaCanaForTwo', category: 'audience', description: 'Una experiencia para dos, sin asumir luna de miel.', topics: ['couples'], audiences: ['us-couple-island', 'us-couple-snorkel', 'canada-couple-sailing', 'france-couple-culture', 'europe-couple-premium', 'latam-couple-beach'] },
  { tag: 'IslandDayForTwo', category: 'audience', description: 'Salida isleña pensada para compartir en pareja.', topics: ['couples', 'saona'], audiences: ['us-couple-island', 'europe-couple-premium'] },
  { tag: 'FriendsOutdoorsPuntaCana', category: 'audience', description: 'Actividad al aire libre para un grupo de amigos.', topics: ['buggy'], audiences: ['us-friends-buggy', 'latam-friends-buggy', 'canada-friends-adventure', 'uk-friends-buggy'] },
  { tag: 'AQuietIslandDay', category: 'sensory', description: 'Ritmo tranquilo en una salida isleña, no una promesa de poca gente.', topics: ['saona', 'beach'], audiences: ['us-couple-island', 'latam-couple-beach', 'france-family-island'] },
  { tag: 'PremiumWithTheDetails', category: 'audience', description: 'Enfoque en confort o inclusiones premium que estén confirmadas.', audiences: ['us-couple-island', 'canada-couple-sailing', 'europe-couple-premium', 'adult-friends-premium'] },
];

export const BLOG_HASHTAG_PACKS: BlogHashtagPack[] = [
  { id: 'saona-in-the-moment', label: 'Saona · isla y sensaciones', description: 'Lugar, agua y escenas de la isla.', tags: ['SaonaIslandDay', 'SaonaNaturalPool', 'IslaSaona', 'SaonaShoreline', 'DayOutInSaona'], topics: ['saona'], tourTerms: ['saona'] },
  { id: 'saona-practical', label: 'Saona · preparación', description: 'Ideas prácticas y contexto de la excursión.', tags: ['QueLlevarASaona', 'SaonaByBoat', 'SaonaNaturalPool', 'PuntaCanaExcursionNotes'], topics: ['saona'], tourTerms: ['saona'] },
  { id: 'buggy-countryside', label: 'Buggy · caminos y campo', description: 'Ruta, Macao y paisaje rural.', tags: ['BuggyTrailPuntaCana', 'MacaoByBuggy', 'DominicanCountryside', 'OffRoadDayOut', 'MacaoBeachStop'], topics: ['buggy'], tourTerms: ['buggy', 'atv', 'quad', 'macao'] },
  { id: 'catalina-water', label: 'Catalina · arrecife y snorkel', description: 'Actividad de mar, sin inventar avistamientos.', tags: ['CatalinaReefDay', 'CatalinaSnorkelStop', 'ReefSidePuntaCana', 'MaskAndBlue'], topics: ['catalina'], tourTerms: ['catalina', 'snorkel'] },
  { id: 'bavaro-by-boat', label: 'Bávaro · catamarán y costa', description: 'Navegación y costa de Bávaro.', tags: ['BavaroCatamaranDay', 'BavaroCoastBySea', 'CatamaranPuntaCana', 'CaribbeanSailingMoment', 'UnderSailInBavaro'], topics: ['catamaran'], tourTerms: ['catamaran', 'boat', 'bavaro'] },
  { id: 'culture-and-taste', label: 'Cultura · voces y sabores', description: 'Contexto cultural, cocina y voces locales.', tags: ['DominicanCultureInContext', 'LocalVoicesDR', 'DominicanCoffeeMoment', 'CocinaDominicana', 'SaboresDeQuisqueya', 'MamajuanaStory'], topics: ['culture', 'food'] },
  { id: 'coastline-sensory', label: 'Costa · brisa y arena', description: 'Sensory detail for truthful coastal scenes.', tags: ['PiesEnLaArena', 'BrisaDeBavaro', 'SalitreCaribeno', 'PausaFrenteAlMar', 'CaribbeanColorPalette'], topics: ['beach', 'saona', 'catamaran'] },
  { id: 'family-practical', label: 'Familia · día compartido', description: 'Family perspective plus useful, non-assumptive planning.', tags: ['FamilyDayInBavaro', 'ViajarEnFamilia', 'PuntaCanaExcursionNotes', 'SmallDetailsBigDay'], topics: ['family'], audiences: ['us-family-beach', 'latam-family-classic', 'canada-family-island', 'france-family-island', 'uk-family-catamaran', 'multi-gen-family'] },
  { id: 'couples-gentle', label: 'Pareja · isla sin clichés', description: 'A shared island day without default honeymoon tropes.', tags: ['PuntaCanaForTwo', 'IslandDayForTwo', 'AQuietIslandDay', 'PausaFrenteAlMar'], topics: ['couples', 'saona'], audiences: ['us-couple-island', 'us-couple-snorkel', 'canada-couple-sailing', 'france-couple-culture', 'europe-couple-premium', 'latam-couple-beach'] },
  { id: 'nature-and-views', label: 'Naturaleza · miradores y senderos', description: 'Hoyo Azul, Montaña Redonda and Ojos Indígenas.', tags: ['HoyoAzulMoment', 'MontanaRedondaView', 'OjosIndigenasWalk', 'CaribbeanColorPalette'], topics: ['waterfall'], tourTerms: ['hoyo azul', 'montana redonda', 'ojos indigenas'] },
  { id: 'old-town-stories', label: 'Patrimonio · paseo con contexto', description: 'Santo Domingo, Altos de Chavón and cultural context.', tags: ['SantoDomingoDay', 'AltosDeChavonWalk', 'DominicanCultureInContext', 'LocalVoicesDR'], topics: ['culture'], tourTerms: ['santo domingo', 'altos de chavon'] },
  { id: 'friends-adventure', label: 'Amigos · aventura al aire libre', description: 'An active day with grounded expectations.', tags: ['FriendsOutdoorsPuntaCana', 'BuggyTrailPuntaCana', 'DominicanCountryside', 'OffRoadDayOut'], topics: ['buggy'], audiences: ['us-friends-buggy', 'latam-friends-buggy', 'canada-friends-adventure', 'uk-friends-buggy'] },
];

export const findRelevantHashtags = (
  selectedTours: string[],
  selectedTopics: string[],
  selectedAudiences: string[]
): Array<{ hashtag: BlogHashtag; relevance: number }> => {
  const tours = selectedTours.map((tour) => tour.toLowerCase());
  return BLOG_HASHTAGS
    .map((item) => {
      let relevance = 0;
      if (item.topics?.some((topic) => selectedTopics.includes(topic))) relevance += 2;
      if (item.audiences?.some((audience) => selectedAudiences.includes(audience))) relevance += 1;
      if (item.tourTerms?.some((term) => tours.some((tour) => tour.includes(term.toLowerCase())))) relevance += 3;
      return { hashtag: item, relevance };
    })
    .sort((a, b) => b.relevance - a.relevance)
};
