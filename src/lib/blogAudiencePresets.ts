export interface BlogAudience {
  origin: string;
  age: string;
  group: string;
  gender: string;
  style: string;
}

export interface BlogAudiencePreset {
  id: string;
  label: string;
  explanation: string;
  audience: BlogAudience;
  focus: string;
}

const preset = (
  id: string,
  label: string,
  origin: string,
  age: string,
  group: string,
  style: string,
  explanation: string,
  focus: string,
  gender = 'Mixto'
): BlogAudiencePreset => ({
  id,
  label,
  explanation,
  audience: { origin, age, group, gender, style },
  focus,
});

export const BLOG_AUDIENCE_PRESETS: BlogAudiencePreset[] = [
  preset('us-family-beach', 'USA · familia y playa', 'Estados Unidos', 'Todas las edades', 'Familia', 'Estándar', 'Plan claro y flexible para un día de playa con varias edades.', 'Explain the day simply, include practical preparation, and avoid assuming every family has the same structure.'),
  preset('us-couple-island', 'USA · pareja e isla', 'Estados Unidos', 'Adultos', 'Pareja', 'Premium', 'Una escapada cómoda para dos, con detalles concretos de la experiencia.', 'Emphasize comfort and meaningful shared moments without assuming a honeymoon.'),
  preset('us-friends-buggy', 'USA · amigos y buggy', 'Estados Unidos', 'Adultos', 'Amigos', 'Aventura', 'Aventura todoterreno con preparación y expectativas realistas.', 'Describe the terrain and preparation using confirmed details; do not exaggerate risk or speed.'),
  preset('us-couple-snorkel', 'USA · pareja y snorkel', 'Estados Unidos', 'Adultos', 'Pareja', 'Relajado', 'Una salida de mar para quienes quieren combinar navegación y agua.', 'Set expectations about time on the water and snorkeling only where operator notes confirm specifics.'),
  preset('us-senior-culture', 'USA · adultos mayores y cultura', 'Estados Unidos', 'Personas mayores', 'Grupo', 'Relajado', 'Enfoque pausado en cultura, comodidad y logística verificable.', 'Use a calm pace and clear logistics. Do not make assumptions about mobility or health.'),
  preset('us-solo-nature', 'USA · viajero/a solo/a y naturaleza', 'Estados Unidos', 'Adultos', 'Solo/a', 'Aventura', 'Una experiencia de naturaleza contada para decidir con confianza.', 'Explain the shared-tour setting and what is known before booking; never imply safety guarantees.'),
  preset('canada-family-island', 'Canadá · familia e isla', 'Canadá', 'Todas las edades', 'Familia', 'Estándar', 'Consejos prácticos para una jornada familiar fuera del hotel.', 'Make the sequence, sun preparation, and confirmed family-relevant details easy to picture.'),
  preset('canada-couple-sailing', 'Canadá · pareja y navegación', 'Canadá', 'Adultos', 'Pareja', 'Premium', 'Una salida de navegación relajada para dos.', 'Balance the atmosphere with concrete inclusions and practical planning.'),
  preset('canada-friends-adventure', 'Canadá · amigos y aventura', 'Canadá', 'Adultos', 'Amigos', 'Aventura', 'Actividad compartida con energía, sin venderla como extrema.', 'Focus on the experience and what to bring; keep every activity claim grounded.'),
  preset('latam-family-classic', 'Latinoamérica · familia clásica', 'América Latina', 'Todas las edades', 'Familia', 'Estándar', 'Un plan cercano y útil para familias que viajan juntas.', 'Use warm natural Spanish, practical tips, and no assumptions about family roles or budget.'),
  preset('latam-couple-beach', 'Latinoamérica · pareja y playa', 'América Latina', 'Adultos', 'Pareja', 'Relajado', 'Una salida para disfrutar la costa sin un tono de lujo forzado.', 'Keep the language familiar and specific; explain the actual experience rather than relying on clichés.'),
  preset('latam-friends-buggy', 'Latinoamérica · amigos y buggy', 'América Latina', 'Adultos', 'Amigos', 'Aventura', 'Una aventura entre amigos con preparación clara.', 'Describe the activity in lively, grounded Spanish and distinguish confirmed facts from unknowns.'),
  preset('latam-mixed-group-culture', 'Latinoamérica · grupo y cultura local', 'América Latina', 'Adultos', 'Grupo', 'Estándar', 'Un recorrido compartido con contexto local respetuoso.', 'Treat Dominican people as hosts and professionals, not scenery; give context without exoticising.'),
  preset('france-couple-culture', 'Francia · pareja y cultura', 'Francia', 'Adultos', 'Pareja', 'Relajado', 'Un enfoque cultural y sensorial escrito en francés natural.', 'Use idiomatic French, explain local context, and avoid stereotypes or romanticised claims.'),
  preset('france-family-island', 'Francia · familia e isla', 'Francia', 'Todas las edades', 'Familia', 'Estándar', 'Una jornada isleña explicada con claridad para distintas edades.', 'Write idiomatic French with practical sequence and family-relevant details that are actually confirmed.'),
  preset('germany-family-practical', 'Alemania · familia práctica', 'Alemania', 'Todas las edades', 'Familia', 'Estándar', 'La logística y el orden del día son fáciles de entender.', 'Use direct natural German, precise confirmed details, and candidly identify unknowns.'),
  preset('germany-couple-nature', 'Alemania · pareja y naturaleza', 'Alemania', 'Adultos', 'Pareja', 'Aventura', 'Naturaleza con información útil para planificar la salida.', 'Use clear natural German and concrete preparation advice without unsupported claims.'),
  preset('uk-family-catamaran', 'Reino Unido · familia y catamarán', 'Reino Unido', 'Todas las edades', 'Familia', 'Relajado', 'Una salida en barco presentada con ritmo familiar y expectativas claras.', 'Use natural British English, explain what is included, and avoid promising conditions at sea.'),
  preset('uk-friends-buggy', 'Reino Unido · amigos y buggy', 'Reino Unido', 'Adultos', 'Amigos', 'Aventura', 'Una actividad dinámica con información práctica y tono cercano.', 'Use natural British English, grounded adventure language, and clear preparation.'),
  preset('europe-couple-premium', 'Europa · pareja premium', 'Europa', 'Adultos', 'Pareja', 'Premium', 'Comodidad, servicio y momentos para dos, sin presumir de lujo vacío.', 'Be specific about confirmed comfort and inclusions; do not invent exclusivity.'),
  preset('europe-senior-culture', 'Europa · grupo senior y cultura', 'Europa', 'Personas mayores', 'Grupo', 'Relajado', 'Un recorrido tranquilo con énfasis en tiempos y logística.', 'Use a measured pace and useful logistics without assuming age determines ability.'),
  preset('caribbean-family-roots', 'Caribe · familia y raíces', 'Caribe', 'Todas las edades', 'Familia', 'Estándar', 'Una perspectiva familiar caribeña sin tratar la cultura como espectáculo.', 'Respect regional diversity and focus on real shared experience and local voices.'),
  preset('brazil-couple-sea', 'Brasil · pareja y mar', 'América Latina', 'Adultos', 'Pareja', 'Relajado', 'Una salida costera con lenguaje cálido; puede adaptarse al portugués en instrucciones.', 'Keep the copy warm and concrete. Do not assume language preference from origin alone.'),
  preset('asia-couple-culture', 'Asia · pareja y cultura', 'Asia', 'Adultos', 'Pareja', 'Estándar', 'Contexto cultural y detalles prácticos para una primera visita.', 'Explain local customs only when verified; avoid treating diverse Asian markets as one culture.'),
  preset('multi-gen-family', 'Multigeneracional · familia', 'Europa', 'Todas las edades', 'Familia', 'Relajado', 'Un mismo plan explicado para acompañantes de varias generaciones.', 'Offer practical options for different paces without assuming abilities or family roles.'),
  preset('adult-friends-premium', 'Adultos · amigos premium', 'Estados Unidos', 'Adultos', 'Amigos', 'Premium', 'Una actividad entre amigos con énfasis en servicio y detalles confirmados.', 'Describe value through confirmed inclusions and service, not status stereotypes.'),
  preset('small-group-history', 'Grupo pequeño · historia', 'Europa', 'Adultos', 'Grupo', 'Estándar', 'Un recorrido de interés histórico con contexto y ritmo de grupo.', 'Separate historical facts from storytelling and use respectful, specific local context.'),
];

export const findAudiencePreset = (id: string) =>
  BLOG_AUDIENCE_PRESETS.find((item) => item.id === id);
