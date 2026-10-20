import type { jsPDF as JsPdf } from 'jspdf';
import type { DayPlan, PlanItem, TravelProfile } from './types';
import { loadTourGuide, langOf } from '../lib/tourGuide';
import { localeText } from '../lib/localeText';

/**
 * The plan as a PDF to keep: a cover with the summary and the total, then
 * every day with its excursions — photograph, where it takes place on a map,
 * the planned date, what to expect, the price line by line — and a last page
 * with the totals and how to book.
 *
 * Drawn with jsPDF (fetched only when the guest presses the button), so the
 * text stays text: sharp at any zoom, searchable, light. Photographs are
 * re-encoded as JPEG (jsPDF cannot embed WebP). Maps are put together from
 * OpenStreetMap tiles on a canvas, with the place marked and the Bávaro /
 * Punta Cana hotel area as a reference; when tiles cannot be had (offline),
 * the map is left out and the place is still written.
 */

type L = { en: string; es: string; de: string; fr: string };

/** Where each kind of excursion happens (the activity, not the pick-up). */
const PLACES: Record<string, { lat: number; lng: number; name: string }> = {
  saona_lobster: { lat: 18.155, lng: -68.72, name: 'Isla Saona' },
  saona_classic: { lat: 18.155, lng: -68.72, name: 'Isla Saona' },
  catalina_reef: { lat: 18.355, lng: -69.01, name: 'Isla Catalina' },
  party_boat: { lat: 18.695, lng: -68.425, name: 'Playa Bávaro' },
  montana_redonda: { lat: 18.926, lng: -68.895, name: 'Montaña Redonda, Miches' },
  buggies: { lat: 18.763, lng: -68.546, name: 'Macao' },
  santo_domingo: { lat: 18.473, lng: -69.884, name: 'Santo Domingo, Zona Colonial' },
  cultural_safari: { lat: 18.615, lng: -68.708, name: 'Higüey' },
  speed_boat: { lat: 18.69, lng: -68.43, name: 'Bávaro' },
  parasailing: { lat: 18.68, lng: -68.42, name: 'Playa Bávaro' },
  coco_bongo: { lat: 18.639, lng: -68.389, name: 'Downtown Punta Cana' },
  imagine_cave: { lat: 18.597, lng: -68.392, name: 'Imagine, Punta Cana' },
  monkeyland: { lat: 18.735, lng: -68.583, name: 'Anamuya' },
  scape_park: { lat: 18.513, lng: -68.382, name: 'Scape Park, Cap Cana' },
  zipline: { lat: 18.74, lng: -68.528, name: 'Anamuya' },
  dolphin: { lat: 18.7, lng: -68.43, name: 'Bávaro' },
  scuba_doo: { lat: 18.666, lng: -68.336, name: 'Cabeza de Toro' },
  deep_sea_fishing: { lat: 18.503, lng: -68.369, name: 'Marina Cap Cana' },
  banana_boat: { lat: 18.69, lng: -68.43, name: 'Playa Bávaro' },
  jet_ski: { lat: 18.69, lng: -68.43, name: 'Playa Bávaro' },
};

/** The hotel area most guests stay in, drawn on every map for scale. */
const HOTELS = { lat: 18.68, lng: -68.45 };

const INK: [number, number, number] = [20, 22, 26];
const SOFT: [number, number, number] = [69, 75, 84];
const MANGO: [number, number, number] = [242, 163, 58];
const GOLD: [number, number, number] = [198, 161, 91];
const PAPER: [number, number, number] = [247, 244, 238];

/** jsPDF's built-in fonts speak Latin-1; anything else is replaced or dropped. */
const clean = (text: string) =>
  String(text ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/…/g, '...')
    .replace(/[→⇄]/g, '->')
    .replace(/•/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF]/g, '')
    .replace(/\s+\n/g, '\n')
    .trim();

const money = (value: number) => `US$ ${Number.isInteger(value) ? value : value.toFixed(2)}`;

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });

/** A photograph as a JPEG data URL, cover-cropped to the box's shape. */
const photo = async (src: string, width: number, height: number): Promise<string | null> => {
  try {
    const image = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const w = image.naturalWidth * scale;
    const h = image.naturalHeight * scale;
    context.drawImage(image, (width - w) / 2, (height - h) / 2, w, h);
    return canvas.toDataURL('image/jpeg', 0.82);
  } catch {
    return null;
  }
};

const tileX = (lng: number, zoom: number) => ((lng + 180) / 360) * 2 ** zoom;
const tileY = (lat: number, zoom: number) => {
  const rad = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) * 2 ** zoom;
};

/** A map of the place with the hotel area for reference, from OpenStreetMap tiles. */
const map = async (place: { lat: number; lng: number }, width = 720, height = 420): Promise<string | null> => {
  // The deepest zoom at which both the place and the hotels fit with a margin.
  let zoom = 12;
  for (; zoom > 6; zoom -= 1) {
    const dx = Math.abs(tileX(place.lng, zoom) - tileX(HOTELS.lng, zoom)) * 256;
    const dy = Math.abs(tileY(place.lat, zoom) - tileY(HOTELS.lat, zoom)) * 256;
    if (dx < width * 0.7 && dy < height * 0.7) break;
  }
  const centreX = (tileX(place.lng, zoom) + tileX(HOTELS.lng, zoom)) / 2;
  const centreY = (tileY(place.lat, zoom) + tileY(HOTELS.lat, zoom)) / 2;
  const left = centreX * 256 - width / 2;
  const top = centreY * 256 - height / 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;
  try {
    const tiles: Promise<void>[] = [];
    for (let tx = Math.floor(left / 256); tx <= Math.floor((left + width) / 256); tx += 1) {
      for (let ty = Math.floor(top / 256); ty <= Math.floor((top + height) / 256); ty += 1) {
        tiles.push(
          loadImage(`https://tile.openstreetmap.org/${zoom}/${tx}/${ty}.png`).then((image) => {
            context.drawImage(image, tx * 256 - left, ty * 256 - top);
          })
        );
      }
    }
    await Promise.all(tiles);
  } catch {
    return null;
  }
  const at = (point: { lat: number; lng: number }) => [tileX(point.lng, zoom) * 256 - left, tileY(point.lat, zoom) * 256 - top];
  // The hotel area: a small ink ring.
  const [hx, hy] = at(HOTELS);
  context.lineWidth = 3;
  context.strokeStyle = 'rgb(20,22,26)';
  context.fillStyle = 'rgba(255,255,255,0.9)';
  context.beginPath();
  context.arc(hx, hy, 8, 0, Math.PI * 2);
  context.fill();
  context.stroke();
  // The place: an amber pin.
  const [px, py] = at(place);
  context.fillStyle = 'rgb(242,163,58)';
  context.strokeStyle = 'rgb(20,22,26)';
  context.beginPath();
  context.moveTo(px, py);
  context.bezierCurveTo(px - 16, py - 20, px - 14, py - 38, px, py - 38);
  context.bezierCurveTo(px + 14, py - 38, px + 16, py - 20, px, py);
  context.fill();
  context.stroke();
  context.fillStyle = 'rgb(20,22,26)';
  context.beginPath();
  context.arc(px, py - 25, 5, 0, Math.PI * 2);
  context.fill();
  // Attribution, as the tiles' licence asks.
  context.font = '12px sans-serif';
  const credit = '© OpenStreetMap contributors';
  const w = context.measureText(credit).width + 10;
  context.fillStyle = 'rgba(255,255,255,0.85)';
  context.fillRect(width - w, height - 18, w, 18);
  context.fillStyle = 'rgb(20,22,26)';
  context.fillText(credit, width - w + 5, height - 5);
  try {
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return null;
  }
};

const dateOf = (start: string | undefined, dayIndex: number, locale: string): string => {
  if (!start) return '';
  const date = new Date(`${start}T12:00:00`);
  if (Number.isNaN(date.getTime())) return '';
  date.setDate(date.getDate() + dayIndex);
  return date.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

export interface PlanPdfInput {
  plan: DayPlan;
  profile: TravelProfile;
  locale: string;
  brandName: string;
  phone: string;
  /** Labels the planner already shows, in the guest's language. */
  slotOf?: (item: PlanItem) => string;
}

export const downloadPlanPdf = async ({ plan, profile, locale, brandName, phone }: PlanPdfInput): Promise<void> => {
  const say = (text: L) => clean(localeText(locale, text));
  const lang = langOf(locale);
  const { jsPDF } = await import('jspdf');
  const doc: JsPdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210;
  const H = 297;
  const M = 16;
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed > H - 18) {
      doc.addPage();
      y = M;
    }
  };
  const text = (value: string, x: number, size: number, style: 'normal' | 'bold' = 'normal', color = INK, maxWidth = W - 2 * M) => {
    doc.setFont('helvetica', style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(clean(value), maxWidth) as string[];
    const lineHeight = size * 0.42;
    lines.forEach((line) => {
      ensure(lineHeight);
      doc.text(line, x, y + lineHeight * 0.8);
      y += lineHeight;
    });
  };
  const rule = (color = GOLD, width = 0.4) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(M, y, W - M, y);
  };

  const items = plan.days.flatMap((day) => day.items);
  const guides = new Map(
    await Promise.all(items.map(async (item) => [item.entry.profile.key, await loadTourGuide(item.entry.profile.key).catch(() => null)] as const))
  );

  // ── Cover ──────────────────────────────────────────────────────────────
  const cover = items[0] ? await photo(items[0].entry.tour.image, 1600, 900) : null;
  doc.setFillColor(...INK);
  doc.rect(0, 0, W, 120, 'F');
  if (cover) doc.addImage(cover, 'JPEG', 0, 0, W, 118.1);
  doc.setFillColor(20, 22, 26);
  doc.setGState?.(new (doc as any).GState({ opacity: 0.55 }));
  doc.rect(0, 60, W, 60, 'F');
  doc.setGState?.(new (doc as any).GState({ opacity: 1 }));
  doc.setFillColor(...MANGO);
  doc.rect(0, 118, W, 2, 'F');
  y = 72;
  text(brandName.toUpperCase(), M, 9, 'bold', MANGO);
  y += 2;
  text(say({ en: 'Your plan in the Dominican Republic', es: 'Tu plan en República Dominicana', de: 'Dein Plan in der Dominikanischen Republik', fr: 'Votre plan en République dominicaine' }).toUpperCase(), M, 20, 'bold', [255, 255, 255]);
  y += 1;
  text(plan.persona.title, M, 13, 'normal', [234, 220, 183]);

  y = 132;
  text(plan.persona.blurb, M, 11, 'normal', SOFT);
  y += 6;

  const party = [
    `${profile.adults} ${say({ en: 'adults', es: 'adultos', de: 'Erwachsene', fr: 'adultes' })}`,
    profile.children ? `${profile.children} ${say({ en: 'children', es: 'niños', de: 'Kinder', fr: 'enfants' })}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const facts: [string, string][] = [
    [say({ en: 'Travellers', es: 'Viajeros', de: 'Reisende', fr: 'Voyageurs' }), party],
    [say({ en: 'Excursion days', es: 'Días de excursión', de: 'Ausflugstage', fr: 'Jours d’excursion' }), String(plan.days.length)],
    [say({ en: 'First day', es: 'Primer día', de: 'Erster Tag', fr: 'Premier jour' }), dateOf(profile.startDate, 0, locale) || say({ en: 'to be agreed', es: 'por definir', de: 'noch offen', fr: 'à convenir' })],
    [say({ en: 'Pick-up', es: 'Recogida', de: 'Abholung', fr: 'Prise en charge' }), profile.pickupZone || say({ en: 'your hotel', es: 'tu hotel', de: 'dein Hotel', fr: 'votre hôtel' })],
    [say({ en: 'Transport', es: 'Transporte', de: 'Transport', fr: 'Transport' }), `${plan.transport.vehicleLabel}${plan.transport.vehicleNote ? ` - ${plan.transport.vehicleNote}` : ''}`],
  ];
  facts.forEach(([label, value]) => {
    ensure(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...GOLD);
    doc.text(clean(label).toUpperCase(), M, y + 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...INK);
    const lines = doc.splitTextToSize(clean(value), W - 2 * M - 52) as string[];
    doc.text(lines, M + 52, y + 4);
    y += Math.max(7, lines.length * 5 + 2);
  });

  y += 4;
  doc.setFillColor(...PAPER);
  doc.rect(M, y, W - 2 * M, 26, 'F');
  doc.setFillColor(...MANGO);
  doc.rect(M, y, 2, 26, 'F');
  const boxTop = y;
  y = boxTop + 5;
  text(say({ en: 'Total for the group', es: 'Total del grupo', de: 'Gesamt für die Gruppe', fr: 'Total pour le groupe' }).toUpperCase(), M + 7, 8, 'bold', SOFT);
  y += 1;
  text(money(plan.grandTotal), M + 7, 22, 'bold');
  y = boxTop + 5;
  text(say({ en: 'Per person', es: 'Por persona', de: 'Pro Person', fr: 'Par personne' }).toUpperCase(), W / 2 + 10, 8, 'bold', SOFT);
  y += 1;
  text(money(plan.perPersonTotal), W / 2 + 10, 22, 'bold');
  y = boxTop + 32;

  // The days at a glance.
  text(say({ en: 'At a glance', es: 'De un vistazo', de: 'Auf einen Blick', fr: 'En un coup d’œil' }).toUpperCase(), M, 9, 'bold', GOLD);
  y += 1;
  plan.days.forEach((day, index) => {
    const when = dateOf(profile.startDate, index, locale);
    const titles = day.items.map((item) => item.entry.tour.title).join(' + ') || say({ en: 'Free day', es: 'Día libre', de: 'Freier Tag', fr: 'Journée libre' });
    text(`${say({ en: 'Day', es: 'Día', de: 'Tag', fr: 'Jour' })} ${index + 1}${when ? ` (${when})` : ''}: ${titles} - ${money(day.dayTotal)}`, M, 10, 'normal', INK);
  });

  // ── The days ───────────────────────────────────────────────────────────
  for (const [dayIndex, day] of plan.days.entries()) {
    doc.addPage();
    y = M;
    doc.setFillColor(...INK);
    doc.rect(0, 0, W, 26, 'F');
    doc.setFillColor(...MANGO);
    doc.rect(0, 26, W, 1.2, 'F');
    y = 8;
    text(`${say({ en: 'Day', es: 'Día', de: 'Tag', fr: 'Jour' })} ${dayIndex + 1}`.toUpperCase(), M, 16, 'bold', [255, 255, 255]);
    const when = dateOf(profile.startDate, dayIndex, locale);
    text(when || say({ en: 'Date to be agreed', es: 'Fecha por definir', de: 'Datum noch offen', fr: 'Date à convenir' }), M, 10, 'normal', [234, 220, 183]);
    y = 34;
    if (day.note) {
      text(day.note, M, 9.5, 'normal', SOFT);
      y += 2;
    }

    for (const item of day.items) {
      const { tour, profile: tourProfile } = item.entry;
      const guide = guides.get(tourProfile.key);
      const place = PLACES[tourProfile.key];
      const [image, mapImage] = await Promise.all([photo(tour.image, 900, 600), place ? map(place) : Promise.resolve(null)]);

      ensure(70);
      // Photograph and map side by side.
      const half = (W - 2 * M - 4) / 2;
      const boxH = half * (2 / 3);
      if (image) doc.addImage(image, 'JPEG', M, y, half, boxH);
      if (mapImage) doc.addImage(mapImage, 'JPEG', M + half + 4, y, half, boxH * 1.0);
      if (image || mapImage) {
        doc.setDrawColor(...INK);
        doc.setLineWidth(0.2);
        if (image) doc.rect(M, y, half, boxH);
        if (mapImage) doc.rect(M + half + 4, y, half, boxH);
        y += boxH + 4;
      }

      text(item.slotLabel.toUpperCase(), M, 8, 'bold', GOLD);
      text(tour.title, M, 15, 'bold');
      y += 1;
      const where = guide?.facts.where?.[lang] || place?.name || tour.destination || '';
      const detail: [string, string][] = [
        [say({ en: 'Where', es: 'Dónde', de: 'Wo', fr: 'Où' }), where],
        [say({ en: 'Duration', es: 'Duración', de: 'Dauer', fr: 'Durée' }), guide?.facts.duration?.[lang] || tour.duration || ''],
        [say({ en: 'Pick-up', es: 'Recogida', de: 'Abholung', fr: 'Prise en charge' }), guide?.facts.pickup?.[lang] || ''],
      ];
      detail
        .filter(([, value]) => value)
        .forEach(([label, value]) => {
          ensure(6);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.setTextColor(...GOLD);
          doc.text(clean(label).toUpperCase(), M, y + 3.5);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9.5);
          doc.setTextColor(...INK);
          const lines = doc.splitTextToSize(clean(value), W - 2 * M - 30) as string[];
          doc.text(lines, M + 30, y + 3.5);
          y += Math.max(5.5, lines.length * 4.2 + 1.5);
        });

      if (item.reasons.length) {
        y += 1;
        text(`${say({ en: 'Why it is in your plan', es: 'Por qué está en tu plan', de: 'Warum es in deinem Plan ist', fr: 'Pourquoi il est dans votre plan' })}: ${item.reasons.slice(0, 3).join('; ')}`, M, 9, 'normal', SOFT);
      }
      if (item.cautions.length) text(`! ${item.cautions.slice(0, 2).join('; ')}`, M, 9, 'normal', [182, 59, 40]);
      const highlights = guide?.highlights?.[lang]?.slice(0, 3) ?? [];
      if (highlights.length) {
        y += 1;
        highlights.forEach((line) => text(`- ${line}`, M + 2, 9, 'normal', SOFT));
      }

      // The price, line by line.
      y += 2;
      ensure(10 + item.pricing.lines.length * 5);
      doc.setFillColor(...PAPER);
      const priceTop = y;
      const priceH = 6 + item.pricing.lines.length * 5 + 7;
      doc.rect(M, priceTop, W - 2 * M, priceH, 'F');
      y = priceTop + 2;
      item.pricing.lines.forEach((line) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...INK);
        doc.text(clean(`${line.qty} x ${line.label}`), M + 4, y + 4);
        doc.text(clean(`${money(line.unit)}  =  ${money(line.total)}`), W - M - 4, y + 4, { align: 'right' });
        y += 5;
      });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(clean(say({ en: 'Excursion total', es: 'Total de la excursión', de: 'Ausflug gesamt', fr: 'Total de l’excursion' })), M + 4, y + 5.5);
      doc.text(clean(money(item.pricing.total)), W - M - 4, y + 5.5, { align: 'right' });
      y = priceTop + priceH + 7;
      rule(GOLD, 0.2);
      y += 6;
    }

    ensure(10);
    text(`${say({ en: 'Day total', es: 'Total del día', de: 'Tagessumme', fr: 'Total du jour' })}: ${money(day.dayTotal)}`, M, 12, 'bold');
  }

  // ── Totals and how to book ─────────────────────────────────────────────
  doc.addPage();
  y = M;
  text(say({ en: 'Summary and prices', es: 'Resumen y precios', de: 'Zusammenfassung und Preise', fr: 'Résumé et prix' }).toUpperCase(), M, 16, 'bold');
  y += 2;
  rule(MANGO, 0.8);
  y += 5;
  plan.days.forEach((day, index) => {
    day.items.forEach((item) => {
      ensure(7);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(...INK);
      const label = clean(`${say({ en: 'Day', es: 'Día', de: 'Tag', fr: 'Jour' })} ${index + 1} - ${item.entry.tour.title}`);
      doc.text(doc.splitTextToSize(label, W - 2 * M - 40)[0], M, y + 4);
      doc.text(clean(money(item.pricing.total)), W - M, y + 4, { align: 'right' });
      y += 6.5;
    });
  });
  y += 2;
  rule(INK, 0.3);
  y += 3;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(clean(say({ en: 'Total', es: 'Total', de: 'Gesamt', fr: 'Total' })), M, y + 5);
  doc.text(clean(money(plan.grandTotal)), W - M, y + 5, { align: 'right' });
  y += 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...SOFT);
  doc.text(clean(`${say({ en: 'Per person', es: 'Por persona', de: 'Pro Person', fr: 'Par personne' })}: ${money(plan.perPersonTotal)}`), M, y + 4);
  y += 12;
  text(
    say({
      en: 'Prices are from our current catalogue and are confirmed when you book. To book or change anything, write to us on WhatsApp — we answer within minutes during the day.',
      es: 'Los precios son los de nuestro catálogo actual y se confirman al reservar. Para reservar o cambiar algo, escríbenos por WhatsApp: respondemos en minutos durante el día.',
      de: 'Die Preise stammen aus unserem aktuellen Katalog und werden bei der Buchung bestätigt. Zum Buchen oder Ändern schreib uns per WhatsApp — tagsüber antworten wir in Minuten.',
      fr: 'Les prix sont ceux de notre catalogue actuel et sont confirmés à la réservation. Pour réserver ou modifier, écrivez-nous sur WhatsApp — nous répondons en quelques minutes en journée.',
    }),
    M,
    10,
    'normal',
    SOFT
  );
  y += 4;
  if (phone) text(`WhatsApp: ${phone}`, M, 12, 'bold');
  text(window.location.origin, M, 10, 'normal', SOFT);

  // Footer on every page.
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...SOFT);
    doc.text(clean(`${brandName} · ${new Date().toLocaleDateString(locale)}`), M, H - 8);
    doc.text(`${page} / ${pages}`, W - M, H - 8, { align: 'right' });
  }

  const stamp = profile.startDate || new Date().toISOString().slice(0, 10);
  doc.save(`${clean(brandName).replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'plan'}-${stamp}.pdf`);
};
