import fs from 'fs/promises';
import path from 'path';
import { ROOT, resolveSiteUrl } from './site-config.mjs';

const projectRoot = ROOT;
const sitemapPath = path.join(projectRoot, 'public', 'sitemap.xml');

// Resolved centrally (scripts/site-config.mjs) so the sitemap, robots.txt and
// the SEO meta tags always agree on where the site lives.
const siteUrl = resolveSiteUrl();

const slugify = (value) =>
  value
    .normalize('NFD')
    .replace(/[-]/g, '')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/^-+|-+$/g, '');

const parseServicesFromTs = async (filename) => {
  const contents = await fs.readFile(filename, 'utf-8');
  const regex = /\{[^}]*?id\s*:\s*([0-9]+)[\s\S]*?title\s*:\s*['"]([^'"]+)['"]/g;
  const items = [];
  let match;
  while ((match = regex.exec(contents)) !== null) {
    items.push({ id: match[1], title: match[2] });
  }
  return items;
};

const writeUrl = (url, priority, changefreq, alternates) => {
  const alternateLinks = alternates
    .map((alt) => `    <xhtml:link rel="alternate" hreflang="${alt.lang}" href="${alt.href}"/>`)
    .join('\n');

  return `  <url>\n    <loc>${url}</loc>\n    <lastmod>${new Date().toISOString().slice(0, 10)}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n${alternateLinks}\n  </url>`;
};

const buildSitemap = async () => {
  const tours = await parseServicesFromTs(path.join(projectRoot, 'src', 'data', 'tours.ts'));
  const transports = await parseServicesFromTs(path.join(projectRoot, 'src', 'data', 'transportServices.ts'));

  const pages = [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: '/plan', priority: '0.9', changefreq: 'weekly' },
    { path: '/tours', priority: '0.9', changefreq: 'weekly' },
    { path: '/transport', priority: '0.9', changefreq: 'weekly' },
    { path: '/blog', priority: '0.8', changefreq: 'daily' },
    { path: '/contact', priority: '0.8', changefreq: 'monthly' },
  ];

  const entries = pages.map((page) =>
    writeUrl(`${siteUrl}${page.path}`, page.priority, page.changefreq, [
      { lang: 'en', href: `${siteUrl}${page.path}?lang=en` },
      { lang: 'es', href: `${siteUrl}${page.path}?lang=es` },
    ])
  );

  const tourEntries = tours.map((item) => {
    const route = `/details/tours/${item.id}-${slugify(item.title)}`;
    return writeUrl(`${siteUrl}${route}`, '0.7', 'monthly', [
      { lang: 'en', href: `${siteUrl}${route}?lang=en` },
      { lang: 'es', href: `${siteUrl}${route}?lang=es` },
    ]);
  });

  const transportEntries = transports.map((item) => {
    const route = `/details/transport/${item.id}-${slugify(item.title)}`;
    return writeUrl(`${siteUrl}${route}`, '0.7', 'monthly', [
      { lang: 'en', href: `${siteUrl}${route}?lang=en` },
      { lang: 'es', href: `${siteUrl}${route}?lang=es` },
    ]);
  });

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...entries, ...tourEntries, ...transportEntries].join('\n')}\n</urlset>`;

  await fs.mkdir(path.dirname(sitemapPath), { recursive: true });
  await fs.writeFile(sitemapPath, sitemap, 'utf-8');
  console.log(`Generated sitemap with ${entries.length + tourEntries.length + transportEntries.length} URLs at ${sitemapPath}`);
};

buildSitemap().catch((error) => {
  console.error('Failed to generate sitemap:', error);
  process.exit(1);
});
