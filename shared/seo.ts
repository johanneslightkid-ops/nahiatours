/**
 * What a search engine sees, page by page.
 *
 * The site is a single-page app: every address used to receive the same
 * index.html, with the same title, the same description and a canonical link
 * pointing at the home page — so to a crawler the whole site was one page, and
 * every tour was a duplicate of it. Worse, the canonical and the sitemap came
 * from the build's SITE_URL, which on several sites was unset and fell back to
 * a host that does not exist.
 *
 * So the Worker fills the head of each page itself, from the same data the
 * page renders (KV, else the copy bundled with the build):
 *
 *   • its own <title>, description, canonical link and social-card tags,
 *     with a real photo for the preview;
 *   • structured data — the business, the breadcrumb trail, the list of
 *     tours, each tour as a TouristTrip with its price, the blog's posts;
 *   • a <noscript> copy of the page's text and links, for crawlers that do
 *     not run JavaScript (the app replaces nothing of it: it is never shown
 *     to a browser that does);
 *
 * and answers /sitemap.xml and /robots.txt from live data.
 *
 * WHERE THE SITE LIVES. `SITE_URL` (wrangler.toml [vars]) is the address the
 * site should be found under — its own domain, or its workers.dev address
 * when it has none. Every canonical link, sitemap entry and social tag points
 * there, whichever hostname the request came in on. Without it, the request's
 * own origin is used.
 */

export interface SeoEnv {
  SITE_URL?: string;
  /** The language the site opens in, and so the language of its head tags. */
  SITE_LOCALE?: string;
  DATA_KV_F?: any;
  DATA_KV?: any;
  ASSETS?: { fetch: (request: Request) => Promise<Response> };
  [key: string]: unknown;
}

const BEGIN = '<!-- seo:begin';
const END = '<!-- seo:end -->';

/* ── Where, and in which language ──────────────────────────────────────── */

const normalizeOrigin = (value: unknown): string | null => {
  if (typeof value !== 'string' || !value.trim()) return null;
  const trimmed = value.trim().replace(/\/+$/, '');
  try {
    return new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`).origin;
  } catch {
    return null;
  }
};

export const siteOrigin = (env: SeoEnv, url: URL): string => normalizeOrigin(env.SITE_URL) ?? url.origin;

const LOCALES = ['en', 'es', 'fr', 'de'] as const;
type Locale = (typeof LOCALES)[number];
const siteLocale = (env: SeoEnv): Locale => {
  const value = String(env.SITE_LOCALE ?? '').slice(0, 2).toLowerCase();
  return (LOCALES as readonly string[]).includes(value) ? (value as Locale) : 'en';
};
const say = (locale: Locale, texts: Record<Locale, string>) => texts[locale] ?? texts.en;

/* ── Data, from KV or the copy in the build ────────────────────────────── */

const cache = new Map<string, { at: number; value: unknown }>();
const CACHE_MS = 60_000;

const kvOf = (env: SeoEnv) => {
  const kv = env.DATA_KV_F ?? env.DATA_KV;
  return kv && typeof kv.get === 'function' ? kv : null;
};

const loadJson = async (env: SeoEnv, origin: string, key: string): Promise<unknown> => {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;
  let value: unknown = null;
  const kv = kvOf(env);
  if (kv) {
    try {
      value = await kv.get(key, { type: 'json' });
    } catch {
      value = null;
    }
  }
  if (value === null && env.ASSETS) {
    try {
      const response = await env.ASSETS.fetch(new Request(`${origin}/data/${key}.json`));
      if (response.ok && (response.headers.get('content-type') ?? '').includes('json')) value = await response.json();
    } catch {
      value = null;
    }
  }
  const unwrapped = (value as any)?.record ?? value;
  cache.set(key, { at: Date.now(), value: unwrapped });
  if (cache.size > 64) cache.clear();
  return unwrapped;
};

interface Brand {
  brandName: string;
  contactName: string;
  phoneNumber: string;
  brandicon: string;
  heroImage: string;
}

const readBrand = async (env: SeoEnv, origin: string): Promise<Brand> => {
  const raw: any = (await loadJson(env, origin, 'brand')) ?? {};
  const heroImage = Array.isArray(raw.heroMedia)
    ? String(raw.heroMedia.find((item: any) => item?.type === 'image' && item?.url)?.url ?? '')
    : '';
  return {
    brandName: String(raw.brandName ?? '').trim() || 'Tours',
    contactName: String(raw.contactName ?? '').trim(),
    phoneNumber: String(raw.phoneNumber ?? '').trim(),
    brandicon: String(raw.brandicon ?? '').trim(),
    heroImage,
  };
};

const readSocial = async (env: SeoEnv, origin: string): Promise<string[]> => {
  const raw: any = await loadJson(env, origin, 'social-media');
  const accounts = Array.isArray(raw?.accounts) ? raw.accounts : [];
  return accounts
    .filter((account: any) => account?.enabled !== false && /^https:\/\//.test(String(account?.url ?? '')))
    .map((account: any) => String(account.url));
};

/** The same slug the app builds (src/services/toursService.ts getServiceSlug). */
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

interface Service {
  id: number;
  slug: string;
  category: 'tours' | 'transport';
  title: string;
  description: string;
  price: number | null;
  images: string[];
}

const amountOf = (price: unknown): number | null => {
  const value = Number(String(price ?? '').replace(/[^\d.]/g, ''));
  return Number.isFinite(value) && value > 0 ? value : null;
};

const readServices = async (env: SeoEnv, origin: string, category: 'tours' | 'transport', locale: Locale): Promise<Service[]> => {
  const key = category === 'tours' ? `tours-${locale}` : `transport-services-${locale}`;
  const raw: any = await loadJson(env, origin, key);
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.tours) ? raw.tours : [];
  return list
    .map((item: any, index: number): Service => {
      const id = Number(item?.id ?? index + 1);
      const title = String(item?.title ?? '').trim();
      const slug = slugify(title);
      const pricing = Array.isArray(item?.pricing) ? item.pricing : [];
      const price = amountOf(pricing.map((p: any) => p?.price).find(Boolean) ?? item?.price);
      const images = (Array.isArray(item?.images) ? item.images : [])
        .map((image: any) => String(image?.localPath ?? '').trim())
        .concat(item?.image ? [String(item.image)] : [])
        .filter(Boolean);
      return { id, slug: slug ? `${id}-${slug}` : String(id), category, title, description: String(item?.description ?? ''), price, images };
    })
    .filter((service: Service) => service.title);
};

interface Post {
  title: string;
  slug: string;
  date: string;
  caption: string;
  image: string;
}

const readPosts = async (env: SeoEnv, origin: string, locale: Locale): Promise<Post[]> => {
  const raw: any = await loadJson(env, origin, `blog-${locale}`);
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.posts) ? raw.posts : [];
  return list
    .filter((post: any) => post?.visible !== false && post?.title)
    .map((post: any) => ({
      title: String(post.title),
      slug: String(post.slug ?? post.id ?? ''),
      date: String(post.date ?? ''),
      caption: String(post.caption ?? post.prelude ?? ''),
      image: String((Array.isArray(post.images) ? post.images[0]?.url ?? post.images[0] : '') ?? ''),
    }))
    .sort((a: Post, b: Post) => b.date.localeCompare(a.date));
};

/* ── Text helpers ──────────────────────────────────────────────────────── */

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Markdown and bullets out, one line, cut at a word near `max`. */
const plain = (value: string, max = 0) => {
  const text = value
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#>`~]+/g, '')
    .replace(/[•·]/g, ',')
    .replace(/\s*\n+\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s+,/g, ',')
    .trim();
  if (!max || text.length <= max) return text;
  const cut = text.slice(0, max - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), max - 20)).replace(/[,;:.\s]+$/, '')}…`;
};

const paragraphs = (value: string) =>
  value
    .split(/\n{2,}/)
    .map((block) => plain(block))
    .filter(Boolean);

const absolute = (origin: string, path: string) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  return `${origin}/${path.replace(/^\/+/, '')}`;
};

const jsonLd = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

const usd = (amount: number) => `US$${Number.isInteger(amount) ? amount : amount.toFixed(2)}`;

/* ── Page descriptions ─────────────────────────────────────────────────── */

interface Crumb {
  name: string;
  path: string;
}

interface PageMeta {
  title: string;
  description: string;
  image: string;
  type: 'website' | 'article' | 'product';
  robots: string;
  status: number;
  crumbs: Crumb[];
  structured: unknown[];
  /** Body of the <noscript> copy, already HTML. */
  body: string;
  /** Where the page really lives, when it was asked for under another slug. */
  canonicalPath?: string;
}

const PRIVATE = /^\/(admin|cart|payment)(\/|$)/;

const AREA = {
  streetAddress: 'El Cortecito, Bávaro',
  addressLocality: 'Punta Cana',
  addressRegion: 'La Altagracia',
  postalCode: '23000',
  addressCountry: 'DO',
};

export const describePage = async (env: SeoEnv, url: URL): Promise<PageMeta & { origin: string; locale: Locale; brand: Brand; social: string[] }> => {
  const origin = siteOrigin(env, url);
  const locale = siteLocale(env);
  const path = url.pathname.replace(/\/+$/, '') || '/';
  const [brand, social, tours, transport] = await Promise.all([
    readBrand(env, origin),
    readSocial(env, origin),
    readServices(env, origin, 'tours', locale),
    readServices(env, origin, 'transport', locale),
  ]);
  const name = brand.brandName;
  const where = say(locale, { en: 'Punta Cana & Bávaro', es: 'Punta Cana y Bávaro', fr: 'Punta Cana et Bávaro', de: 'Punta Cana & Bávaro' });
  const firstImage = brand.heroImage || tours.find((tour) => tour.images[0])?.images[0] || '';
  const home: Crumb = { name: say(locale, { en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Start' }), path: '/' };
  const tourNames = tours.slice(0, 4).map((tour) => tour.title.split(':')[0].trim());

  const tourLinks = (list: Service[]) =>
    `<ul>${list
      .map(
        (service) =>
          `<li><a href="/details/${service.category}/${escapeHtml(service.slug)}">${escapeHtml(service.title)}</a>${
            service.price ? ` — ${usd(service.price)}` : ''
          }<br>${escapeHtml(plain(service.description, 180))}</li>`
      )
      .join('')}</ul>`;

  const itemList = (list: Service[]) => ({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    itemListElement: list.map((service, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      url: `${origin}/details/${service.category}/${service.slug}`,
      name: service.title,
    })),
  });

  const base = {
    image: firstImage,
    type: 'website' as const,
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    status: 200,
    structured: [] as unknown[],
  };

  if (PRIVATE.test(path)) {
    return {
      ...base,
      origin, locale, brand, social,
      title: name,
      description: '',
      robots: 'noindex, nofollow',
      crumbs: [home],
      body: '',
    };
  }

  if (path === '/') {
    const description = say(locale, {
      en: `${name}: tours, excursions and private transfers from ${where}${tourNames.length ? ` — ${tourNames.join(', ')} and more` : ''}. Local guides, hotel pick-up, booking on WhatsApp.`,
      es: `${name}: tours, excursiones y traslados privados desde ${where}${tourNames.length ? ` — ${tourNames.join(', ')} y más` : ''}. Guías locales, recogida en el hotel, reserva por WhatsApp.`,
      fr: `${name} : excursions et transferts privés depuis ${where}${tourNames.length ? ` — ${tourNames.join(', ')} et plus` : ''}. Guides locaux, prise en charge à l’hôtel, réservation sur WhatsApp.`,
      de: `${name}: Touren, Ausflüge und private Transfers ab ${where}${tourNames.length ? ` — ${tourNames.join(', ')} und mehr` : ''}. Lokale Guides, Abholung am Hotel, Buchung per WhatsApp.`,
    });
    return {
      ...base,
      origin, locale, brand, social,
      title: say(locale, {
        en: `${name} — Tours & Excursions in Punta Cana, Dominican Republic`,
        es: `${name} — Tours y excursiones en Punta Cana, República Dominicana`,
        fr: `${name} — Excursions à Punta Cana, République dominicaine`,
        de: `${name} — Touren & Ausflüge in Punta Cana, Dominikanische Republik`,
      }),
      description: plain(description, 160),
      crumbs: [home],
      structured: [itemList(tours)],
      body: `<h1>${escapeHtml(name)}</h1><p>${escapeHtml(description)}</p><h2>${escapeHtml(say(locale, { en: 'Tours', es: 'Tours', fr: 'Excursions', de: 'Touren' }))}</h2>${tourLinks(tours)}`,
    };
  }

  if (path === '/tours') {
    const description = say(locale, {
      en: `All ${tours.length || ''} tours and excursions from ${where} with ${name}: ${tourNames.join(', ')}. Prices per person, hotel pick-up included.`,
      es: `Los ${tours.length || ''} tours y excursiones desde ${where} con ${name}: ${tourNames.join(', ')}. Precio por persona, recogida en el hotel incluida.`,
      fr: `Les ${tours.length || ''} excursions depuis ${where} avec ${name} : ${tourNames.join(', ')}. Prix par personne, prise en charge à l’hôtel incluse.`,
      de: `Alle ${tours.length || ''} Touren und Ausflüge ab ${where} mit ${name}: ${tourNames.join(', ')}. Preise pro Person, Abholung am Hotel inklusive.`,
    }).replace(/\s{2,}/g, ' ');
    const crumb = { name: say(locale, { en: 'Tours', es: 'Tours', fr: 'Excursions', de: 'Touren' }), path: '/tours' };
    return {
      ...base,
      origin, locale, brand, social,
      title: say(locale, {
        en: `Tours & Excursions in Punta Cana | ${name}`,
        es: `Tours y excursiones en Punta Cana | ${name}`,
        fr: `Excursions à Punta Cana | ${name}`,
        de: `Touren & Ausflüge in Punta Cana | ${name}`,
      }),
      description: plain(description, 160),
      crumbs: [home, crumb],
      structured: [itemList(tours)],
      body: `<h1>${escapeHtml(crumb.name)}</h1><p>${escapeHtml(description)}</p>${tourLinks(tours)}`,
    };
  }

  if (path === '/transport') {
    const description = say(locale, {
      en: `Airport transfers and private transport in ${where} with ${name}: Punta Cana airport (PUJ), hotels, Santo Domingo and beyond. Fixed prices, booked on WhatsApp.`,
      es: `Traslados al aeropuerto y transporte privado en ${where} con ${name}: aeropuerto de Punta Cana (PUJ), hoteles, Santo Domingo y más. Precios fijos, reserva por WhatsApp.`,
      fr: `Transferts aéroport et transport privé à ${where} avec ${name} : aéroport de Punta Cana (PUJ), hôtels, Saint-Domingue et plus. Prix fixes, réservation sur WhatsApp.`,
      de: `Flughafentransfers und private Fahrten in ${where} mit ${name}: Flughafen Punta Cana (PUJ), Hotels, Santo Domingo und mehr. Festpreise, Buchung per WhatsApp.`,
    });
    const crumb = { name: say(locale, { en: 'Transport', es: 'Transporte', fr: 'Transport', de: 'Transfer' }), path: '/transport' };
    return {
      ...base,
      origin, locale, brand, social,
      title: say(locale, {
        en: `Airport Transfers & Private Transport in Punta Cana | ${name}`,
        es: `Traslados aeropuerto y transporte privado en Punta Cana | ${name}`,
        fr: `Transferts aéroport et transport privé à Punta Cana | ${name}`,
        de: `Flughafentransfer & private Fahrten in Punta Cana | ${name}`,
      }),
      description: plain(description, 160),
      crumbs: [home, crumb],
      structured: transport.length ? [itemList(transport)] : [],
      body: `<h1>${escapeHtml(crumb.name)}</h1><p>${escapeHtml(description)}</p>${tourLinks(transport)}`,
    };
  }

  if (path === '/plan') {
    const description = say(locale, {
      en: `Not sure which tour? Answer a few questions and ${name} plans your day in ${where} — beaches, islands, adventure or culture.`,
      es: `¿No sabes qué tour elegir? Responde unas preguntas y ${name} planea tu día en ${where}: playas, islas, aventura o cultura.`,
      fr: `Vous hésitez ? Répondez à quelques questions et ${name} prépare votre journée à ${where} : plages, îles, aventure ou culture.`,
      de: `Unsicher, welche Tour? Ein paar Fragen, und ${name} plant Ihren Tag in ${where} — Strände, Inseln, Abenteuer oder Kultur.`,
    });
    const crumb = { name: say(locale, { en: 'Plan my day', es: 'Planear mi día', fr: 'Planifier ma journée', de: 'Meinen Tag planen' }), path: '/plan' };
    return {
      ...base,
      origin, locale, brand, social,
      title: `${crumb.name} | ${name}`,
      description: plain(description, 160),
      crumbs: [home, crumb],
      body: `<h1>${escapeHtml(crumb.name)}</h1><p>${escapeHtml(description)}</p>`,
    };
  }

  if (path === '/blog') {
    const posts = await readPosts(env, origin, locale);
    const description = say(locale, {
      en: `Travel stories and tips from ${where} by ${name}${posts[0] ? ` — latest: ${posts[0].title}` : ''}.`,
      es: `Historias de viaje y consejos desde ${where} por ${name}${posts[0] ? ` — lo último: ${posts[0].title}` : ''}.`,
      fr: `Récits de voyage et conseils depuis ${where} par ${name}${posts[0] ? ` — dernier : ${posts[0].title}` : ''}.`,
      de: `Reisegeschichten und Tipps aus ${where} von ${name}${posts[0] ? ` — neu: ${posts[0].title}` : ''}.`,
    });
    const crumb = { name: 'Blog', path: '/blog' };
    return {
      ...base,
      origin, locale, brand, social,
      image: absolute(origin, posts.find((post) => post.image)?.image ?? '') || firstImage,
      title: say(locale, {
        en: `Travel Stories from Punta Cana | ${name}`,
        es: `Historias de viaje desde Punta Cana | ${name}`,
        fr: `Récits de voyage de Punta Cana | ${name}`,
        de: `Reisegeschichten aus Punta Cana | ${name}`,
      }),
      description: plain(description, 160),
      crumbs: [home, crumb],
      structured: posts.length
        ? [
            {
              '@context': 'https://schema.org',
              '@type': 'Blog',
              name: `${name} Blog`,
              url: `${origin}/blog`,
              blogPost: posts.slice(0, 20).map((post) => ({
                '@type': 'BlogPosting',
                headline: post.title,
                ...(post.date ? { datePublished: post.date } : {}),
                ...(post.caption ? { description: plain(post.caption, 200) } : {}),
                ...(post.image ? { image: absolute(origin, post.image) } : {}),
                url: `${origin}/blog`,
                author: { '@type': 'Organization', name },
              })),
            },
          ]
        : [],
      body: `<h1>Blog</h1><p>${escapeHtml(description)}</p><ul>${posts
        .slice(0, 30)
        .map((post) => `<li><strong>${escapeHtml(post.title)}</strong>${post.date ? ` (${escapeHtml(post.date)})` : ''}<br>${escapeHtml(plain(post.caption, 220))}</li>`)
        .join('')}</ul>`,
    };
  }

  if (path === '/contact') {
    const description = say(locale, {
      en: `Contact ${name}${brand.contactName ? ` (${brand.contactName})` : ''} in ${where}${brand.phoneNumber ? ` — WhatsApp or call ${brand.phoneNumber}` : ''}. Questions about tours and transfers answered by a person.`,
      es: `Contacta a ${name}${brand.contactName ? ` (${brand.contactName})` : ''} en ${where}${brand.phoneNumber ? ` — WhatsApp o llamada al ${brand.phoneNumber}` : ''}. Te responde una persona.`,
      fr: `Contactez ${name}${brand.contactName ? ` (${brand.contactName})` : ''} à ${where}${brand.phoneNumber ? ` — WhatsApp ou appel au ${brand.phoneNumber}` : ''}. Une vraie personne vous répond.`,
      de: `Kontakt zu ${name}${brand.contactName ? ` (${brand.contactName})` : ''} in ${where}${brand.phoneNumber ? ` — WhatsApp oder Anruf unter ${brand.phoneNumber}` : ''}. Es antwortet ein Mensch.`,
    });
    const crumb = { name: say(locale, { en: 'Contact', es: 'Contacto', fr: 'Contact', de: 'Kontakt' }), path: '/contact' };
    return {
      ...base,
      origin, locale, brand, social,
      title: `${crumb.name} | ${name}`,
      description: plain(description, 160),
      crumbs: [home, crumb],
      body: `<h1>${escapeHtml(crumb.name)}</h1><p>${escapeHtml(description)}</p>`,
    };
  }

  const detail = /^\/details\/(tours|transport)\/([^/]+)$/.exec(path);
  if (detail) {
    const category = detail[1] as 'tours' | 'transport';
    const list = category === 'tours' ? tours : transport;
    const id = decodeURIComponent(detail[2]).split('-')[0];
    const service = list.find((item) => String(item.id) === id);
    const listCrumb =
      category === 'tours'
        ? { name: say(locale, { en: 'Tours', es: 'Tours', fr: 'Excursions', de: 'Touren' }), path: '/tours' }
        : { name: say(locale, { en: 'Transport', es: 'Transporte', fr: 'Transport', de: 'Transfer' }), path: '/transport' };
    if (!service) {
      return {
        ...base,
        origin, locale, brand, social,
        title: name,
        description: '',
        // Gone or never there. Only when the list itself loaded, so a KV hiccup cannot 404 a real tour.
        status: list.length ? 404 : 200,
        robots: 'noindex, follow',
        crumbs: [home, listCrumb],
        body: '',
      };
    }
    const canonicalPath = `/details/${category}/${service.slug}`;
    const description = plain(service.description, 160);
    const images = service.images.map((image) => absolute(origin, image)).slice(0, 6);
    return {
      ...base,
      origin, locale, brand, social,
      title: `${service.title}${service.price ? ` — ${say(locale, { en: 'from', es: 'desde', fr: 'dès', de: 'ab' })} ${usd(service.price)}` : ''} | ${name}`,
      description,
      image: images[0] || firstImage,
      type: 'product',
      crumbs: [home, listCrumb, { name: service.title, path: canonicalPath }],
      structured: [
        {
          '@context': 'https://schema.org',
          '@type': 'TouristTrip',
          name: service.title,
          description: plain(service.description, 600),
          url: `${origin}${canonicalPath}`,
          ...(images.length ? { image: images } : {}),
          touristType: say(locale, { en: 'Leisure', es: 'Ocio', fr: 'Loisirs', de: 'Freizeit' }),
          provider: { '@type': 'TravelAgency', name, url: origin },
          ...(service.price
            ? {
                offers: {
                  '@type': 'Offer',
                  price: service.price,
                  priceCurrency: 'USD',
                  url: `${origin}${canonicalPath}`,
                  availability: 'https://schema.org/InStock',
                },
              }
            : {}),
        },
      ],
      body: `<h1>${escapeHtml(service.title)}</h1>${service.price ? `<p><strong>${escapeHtml(usd(service.price))}</strong></p>` : ''}${paragraphs(service.description)
        .map((text) => `<p>${escapeHtml(text)}</p>`)
        .join('')}`,
      // A detail page asked for under an old slug still points at the real one.
      canonicalPath,
    };
  }

  // Any other address the app answers: the site's general description.
  return {
    ...base,
    origin, locale, brand, social,
    title: name,
    description: '',
    crumbs: [home],
    body: '',
  };
};

/* ── Rendering into index.html ─────────────────────────────────────────── */

const headBlock = (page: Awaited<ReturnType<typeof describePage>>, path: string): string => {
  const { origin, brand, locale } = page;
  const canonical = `${origin}${page.canonicalPath ?? path}`;
  const description = page.description || page.title;
  const image = absolute(origin, page.image);
  const ogLocale = { en: 'en_US', es: 'es_DO', fr: 'fr_FR', de: 'de_DE' }[locale];

  const organization = {
    '@context': 'https://schema.org',
    '@type': 'TravelAgency',
    '@id': `${origin}/#business`,
    name: brand.brandName,
    url: `${origin}/`,
    ...(brand.brandicon ? { logo: absolute(origin, brand.brandicon) } : { logo: `${origin}/favicon.svg` }),
    ...(image ? { image } : {}),
    ...(brand.phoneNumber ? { telephone: brand.phoneNumber } : {}),
    address: { '@type': 'PostalAddress', ...AREA },
    geo: { '@type': 'GeoCoordinates', latitude: 18.6945, longitude: -68.4156 },
    areaServed: ['Punta Cana', 'Bávaro', 'La Altagracia', 'Dominican Republic'],
    priceRange: '$$',
    ...(page.social.length ? { sameAs: page.social } : {}),
  };
  const website = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: brand.brandName,
    url: `${origin}/`,
    inLanguage: locale,
    publisher: { '@id': `${origin}/#business` },
  };
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: page.crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: `${origin}${crumb.path}`,
    })),
  };

  const meta = [
    `<title>${escapeHtml(page.title)}</title>`,
    page.description ? `<meta name="description" content="${escapeHtml(page.description)}" />` : '',
    `<meta name="robots" content="${page.robots}" />`,
    `<link rel="canonical" href="${escapeHtml(canonical)}" />`,
    `<meta property="og:site_name" content="${escapeHtml(brand.brandName)}" />`,
    `<meta property="og:title" content="${escapeHtml(page.title)}" />`,
    `<meta property="og:description" content="${escapeHtml(description)}" />`,
    `<meta property="og:type" content="${page.type === 'product' ? 'website' : page.type}" />`,
    `<meta property="og:url" content="${escapeHtml(canonical)}" />`,
    `<meta property="og:locale" content="${ogLocale}" />`,
    image ? `<meta property="og:image" content="${escapeHtml(image)}" />` : '',
    image ? `<meta property="og:image:alt" content="${escapeHtml(page.title)}" />` : '',
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`,
    `<meta name="twitter:description" content="${escapeHtml(description)}" />`,
    image ? `<meta name="twitter:image" content="${escapeHtml(image)}" />` : '',
    `<meta name="geo.region" content="DO-11" />`,
    `<meta name="geo.placename" content="Punta Cana" />`,
    `<meta name="geo.position" content="18.6945;-68.4156" />`,
    `<meta name="ICBM" content="18.6945, -68.4156" />`,
    ...[organization, website, page.crumbs.length > 1 ? breadcrumbs : null, ...page.structured]
      .filter(Boolean)
      .map((value) => `<script type="application/ld+json">${jsonLd(value)}</script>`),
  ].filter(Boolean);

  return `<!-- seo:begin — filled per page by shared/seo.ts -->\n    ${meta.join('\n    ')}\n    ${END}`;
};

/** What a crawler without JavaScript reads: the page's text and the site's links. */
const noscriptBlock = (page: Awaited<ReturnType<typeof describePage>>): string => {
  if (!page.body) return '';
  const { brand, locale } = page;
  const nav = [
    ['/', say(locale, { en: 'Home', es: 'Inicio', fr: 'Accueil', de: 'Start' })],
    ['/tours', say(locale, { en: 'Tours', es: 'Tours', fr: 'Excursions', de: 'Touren' })],
    ['/transport', say(locale, { en: 'Transport', es: 'Transporte', fr: 'Transport', de: 'Transfer' })],
    ['/plan', say(locale, { en: 'Plan my day', es: 'Planear mi día', fr: 'Planifier ma journée', de: 'Meinen Tag planen' })],
    ['/blog', 'Blog'],
    ['/contact', say(locale, { en: 'Contact', es: 'Contacto', fr: 'Contact', de: 'Kontakt' })],
  ]
    .map(([href, label]) => `<a href="${href}">${escapeHtml(label)}</a>`)
    .join(' · ');
  const contact = brand.phoneNumber
    ? `<p>${escapeHtml(brand.brandName)}${brand.contactName ? ` — ${escapeHtml(brand.contactName)}` : ''} · WhatsApp <a href="tel:${escapeHtml(brand.phoneNumber.replace(/[^\d+]/g, ''))}">${escapeHtml(brand.phoneNumber)}</a> · ${escapeHtml(AREA.streetAddress)}, ${escapeHtml(AREA.addressLocality)}</p>`
    : '';
  return `<noscript><div style="max-width:60rem;margin:2rem auto;padding:0 1rem;font-family:system-ui,sans-serif;line-height:1.5"><nav>${nav}</nav>${page.body}${contact}</div></noscript>`;
};

const isPageRequest = (request: Request, url: URL) =>
  (request.method === 'GET' || request.method === 'HEAD') &&
  !url.pathname.startsWith('/api/') &&
  !/\.[a-z0-9]{2,5}$/i.test(url.pathname);

/**
 * Fill in the head (and the noscript copy) of an HTML page the asset server
 * produced. Anything that is not a page, or not HTML, passes through.
 */
export const withPageSeo = async (request: Request, response: Response, env: SeoEnv): Promise<Response> => {
  const url = new URL(request.url);
  if (!isPageRequest(request, url) || !response.ok) return response;
  if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;
  try {
    const html = await response.clone().text();
    const start = html.indexOf(BEGIN);
    const end = html.indexOf(END);
    if (start === -1 || end === -1) return response;
    const page = await describePage(env, url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    let next = html.slice(0, start) + headBlock(page, path) + html.slice(end + END.length);
    next = next.replace(/<html lang="[a-z-]*"/i, `<html lang="${page.locale}"`);
    const noscript = noscriptBlock(page);
    if (noscript) next = next.replace(/<body([^>]*)>/i, (tag) => `${tag}\n    ${noscript}`);
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.delete('etag');
    if (page.robots.startsWith('noindex')) headers.set('X-Robots-Tag', page.robots);
    return new Response(request.method === 'HEAD' ? null : next, { status: page.status, headers });
  } catch (error) {
    console.warn('[seo] page left as built:', error);
    return response;
  }
};

/* ── The tab icon, the home-screen icon and the web app manifest ────────── */

/** Each icon a browser asks for, and the square it should be. */
const ICONS: Record<string, { size: number; background?: string }> = {
  '/favicon.ico': { size: 48 },
  '/favicon.svg': { size: 64 },
  '/favicon-16x16.png': { size: 16 },
  '/favicon-32x32.png': { size: 32 },
  // iOS paints a transparent home-screen icon black, so that one gets a white ground.
  '/apple-touch-icon.png': { size: 180, background: 'white' },
  '/android-chrome-192x192.png': { size: 192 },
  '/android-chrome-512x512.png': { size: 512 },
};

const CLOUDINARY_IMAGE = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * The icons and the manifest follow the logo and the name set in Admin › Marca,
 * so a new brand is a new tab icon and a new home-screen name without a
 * deploy. A Cloudinary logo is cut to each square on the way out (padded, not
 * cropped: a wide logo stays whole); any other logo is sent as it is; with no
 * logo, the neutral icons that ship with the site. Null for any other address.
 */
export const brandAssetResponse = async (env: SeoEnv, url: URL): Promise<Response | null> => {
  const icon = ICONS[url.pathname];
  if (!icon && url.pathname !== '/site.webmanifest') return null;
  const origin = siteOrigin(env, url);
  const brand = await readBrand(env, origin);

  if (icon) {
    if (!brand.brandicon) return null; // the file in public/
    const cloud = CLOUDINARY_IMAGE.exec(brand.brandicon);
    const target = cloud
      ? `${cloud[1]}c_pad,w_${icon.size},h_${icon.size}${icon.background ? `,b_${icon.background}` : ''}/f_png/${cloud[2]}`
      : absolute(origin, brand.brandicon);
    return new Response(null, { status: 302, headers: { Location: target, 'Cache-Control': 'public, max-age=3600' } });
  }

  const name = brand.brandName;
  const manifest = {
    name,
    short_name: name.length <= 12 ? name : name.split(/\s+/)[0].slice(0, 12),
    icons: [
      { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    theme_color: '#14161A',
    background_color: '#F7F4EE',
    display: 'standalone',
  };
  return new Response(JSON.stringify(manifest), {
    headers: { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
};

/* ── /sitemap.xml and /robots.txt ──────────────────────────────────────── */

export const sitemapResponse = async (env: SeoEnv, url: URL): Promise<Response> => {
  const origin = siteOrigin(env, url);
  const locale = siteLocale(env);
  const [tours, transport, posts] = await Promise.all([
    readServices(env, origin, 'tours', locale),
    readServices(env, origin, 'transport', locale),
    readPosts(env, origin, locale),
  ]);
  const xmlEscape = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const entry = (path: string, priority: string, changefreq: string, images: string[] = [], lastmod = '') =>
    `  <url>\n    <loc>${xmlEscape(`${origin}${path}`)}</loc>\n${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${images
      .slice(0, 5)
      .map((image) => `    <image:image><image:loc>${xmlEscape(absolute(origin, image))}</image:loc></image:image>\n`)
      .join('')}  </url>`;
  const latestPost = posts.find((post) => /^\d{4}-\d{2}-\d{2}/.test(post.date))?.date.slice(0, 10) ?? '';
  const urls = [
    entry('/', '1.0', 'weekly'),
    entry('/tours', '0.9', 'weekly', tours.map((tour) => tour.images[0]).filter(Boolean)),
    entry('/transport', '0.8', 'monthly'),
    entry('/plan', '0.7', 'monthly'),
    entry('/blog', '0.7', 'weekly', [], latestPost),
    entry('/contact', '0.6', 'yearly'),
    ...tours.map((tour) => entry(`/details/tours/${tour.slug}`, '0.8', 'monthly', tour.images)),
    ...transport.map((service) => entry(`/details/transport/${service.slug}`, '0.6', 'monthly', service.images)),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${urls.join('\n')}\n</urlset>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};

export const robotsResponse = (env: SeoEnv, url: URL): Response => {
  const origin = siteOrigin(env, url);
  const body = [
    'User-agent: *',
    // The pages render from these two; blocking them hid every tour from crawlers that render.
    'Allow: /api/data',
    'Allow: /api/blog',
    'Disallow: /api/',
    'Disallow: /admin',
    'Disallow: /cart',
    'Disallow: /payment',
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
