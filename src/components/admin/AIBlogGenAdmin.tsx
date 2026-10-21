import React, { useEffect, useState } from 'react';
import { FaCheck, FaCopy, FaImages, FaMagic, FaMicrophone, FaRedo, FaSave, FaSearch, FaShareAlt, FaSpinner, FaStop, FaTrash } from 'react-icons/fa';
import { getTours, Tour } from '../../services/toursService';
import { getAISettings, AISettings } from '../../services/aiSettingsService';
import { AiGenerationError, GeneratedArticle, GeneratedPost, generateBlogPost, providerStatus } from '../../services/aiGeneratorService';
import { saveBlogArticle, getBlogArticles, BlogArticle } from '../../services/blogService';
import TranslateBar from './TranslateBar';
import { useTranslationSync } from './useTranslationSync';
import { Lang, translateRecord } from '../../lib/autoTranslate';
import { SUPPORTED_LOCALES, useI18n } from '../../contexts/I18nContext';
import { useDictation } from '../../lib/useDictation';
import { getSocialApiSettings } from '../../services/socialApiSettingsService';
import { getSocialMediaData, SocialMediaAccount } from '../../services/socialMediaService';
import { apiPost } from '../../services/apiClient';
import { getAdminPassword } from '../../services/authStore';
import { useBrand } from '../../contexts/BrandContext';
import { TOPICS, hashtagsFor, keywordsFor, seasonalNote, BlogLang } from '../../lib/blogTopics';
import { BLOG_TEMPLATES } from '../../lib/blogTemplates';
import { getPublishedTestimonials } from '../../services/testimonialService';
import { SHARE_TARGETS, shareTo, copyText, shareTargetFor } from '../../lib/socialShare';
import ArticleBody from '../ui/ArticleBody';

/**
 * The blog generator.
 *
 * The panel this replaces was a column of long dropdowns above a wall of raw
 * Markdown in a <pre>. Nothing told you what the article would be about, the
 * tour picker was a list of every excursion with no way to find one, and the
 * only preview was the source text. It also had exactly one button that did
 * anything — "Generate" — and when that failed it said "Failed to generate
 * blog posts" and nothing else.
 *
 * This is three steps, in the order the work actually happens: say what the
 * piece is about, choose how it should come out, then read it and publish it.
 * The preview is the real article, rendered by the same component the public
 * blog uses, so what is approved here is what ships.
 */

type Audience = {
  origin: string;
  age: string;
  group: string;
  gender: string;
  style: string;
};

const AUDIENCE_OPTIONS = {
  origin: ['Estados Unidos', 'Canadá', 'Europa', 'América Latina', 'Asia'],
  age: ['Jóvenes', 'Adultos', 'Personas mayores', 'Todas las edades'],
  group: ['Familia', 'Pareja', 'Amigos', 'Grupo', 'Solo/a'],
  gender: ['Mixto', 'Mujeres', 'Hombres'],
  style: ['Estándar', 'Premium', 'Económico', 'Aventura', 'Relajado'],
};

const AUDIENCE_LABELS: Record<keyof Audience, string> = {
  origin: 'Procedencia',
  age: 'Edad',
  group: 'Viajan como',
  gender: 'Público',
  style: 'Estilo',
};

interface PostState {
  id: string;
  post: GeneratedPost;
  saved: boolean;
  /** Which language the preview is showing. */
  view: BlogLang;
}

/** The generator writes every site language itself, from the English piece. */
const EDITIONS = SUPPORTED_LOCALES.filter((l) => l !== 'en') as BlogLang[];
const LANGUAGE_TABS: Record<BlogLang, string> = { es: 'Español', en: 'English', fr: 'Français', de: 'Deutsch' };
const PROGRESS_LANGUAGE: Record<BlogLang, string> = { en: 'inglés', es: 'español', fr: 'francés', de: 'alemán' };

/** Short, well-rated reviews make the best quotes. */
const quotableReviews = (reviews: { review: string; rating: number }[]): string[] =>
  reviews
    .filter((r) => Number(r.rating) >= 4 && r.review && r.review.length >= 30 && r.review.length <= 280)
    .sort((a, b) => Number(b.rating) - Number(a.rating))
    .slice(0, 3)
    .map((r) => r.review.replace(/\s+/g, ' ').trim());

const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const AIBlogGenAdmin: React.FC = () => {
  const { brandSettings } = useBrand();

  const [tours, setTours] = useState<Tour[]>([]);
  const [tourQuery, setTourQuery] = useState('');
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [socialApiSettings, setSocialApiSettings] = useState<any>(null);
  const [socialAccounts, setSocialAccounts] = useState<SocialMediaAccount[]>([]);

  // ── The brief ────────────────────────────────────────────────────────────
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [template, setTemplate] = useState<string>(BLOG_TEMPLATES[0].id);
  const [reviews, setReviews] = useState<string[]>([]);
  const [quoteReviews, setQuoteReviews] = useState(true);
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [audience, setAudience] = useState<Audience>({
    origin: 'Estados Unidos',
    age: 'Adultos',
    group: 'Familia',
    gender: 'Mixto',
    style: 'Estándar',
  });
  const [notes, setNotes] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [firstImageBase64, setFirstImageBase64] = useState<string | undefined>();
  const [uploading, setUploading] = useState(false);

  // ── How it comes out ─────────────────────────────────────────────────────
  const [variations, setVariations] = useState(1);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [autoSave, setAutoSave] = useState(false);
  const [autoPublish, setAutoPublish] = useState(false);

  // ── Running ──────────────────────────────────────────────────────────────
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [problem, setProblem] = useState('');
  /** One sentence per provider that was tried, when more than one was. */
  const [problemFailures, setProblemFailures] = useState<{ provider: string; error: string }[]>([]);
  /** Null until the deployment has been asked; false means nothing can run. */
  const [anyProviderUsable, setAnyProviderUsable] = useState<boolean | null>(null);
  const [posts, setPosts] = useState<PostState[]>([]);
  const [copied, setCopied] = useState('');
  const sync = useTranslationSync('en');

  // ── Dictation ────────────────────────────────────────────────────────────
  // The notes are dictated in the language the admin is working in.
  const { locale } = useI18n();
  const dictation = useDictation(notes, setNotes, locale);

  useEffect(() => {
    (async () => {
      setTours(await getTours('en'));
      setAiSettings(await getAISettings());
      setSocialApiSettings(await getSocialApiSettings());
      // Asked once, so the panel can say "nothing is configured" before a
      // click rather than after a wait.
      const status = await providerStatus();
      if (status) setAnyProviderUsable(status.providers.some((prov) => prov.usable));
      try {
        setReviews(quotableReviews(await getPublishedTestimonials()));
      } catch {
        setReviews([]);
      }
      const social = await getSocialMediaData();
      setSocialAccounts((social.accounts || []).filter((a: SocialMediaAccount) => a.enabled));
    })();

  }, []);

  const toggle = (list: string[], value: string) =>
    list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

  /** Upload straight away, so the article can reference a real URL. */
  const handleImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setProblem('');

    for (const file of Array.from(files).slice(0, 6)) {
      try {
        const form = new FormData();
        form.append('file', file);
        form.append('folder', 'blog');
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'X-Admin-Password': getAdminPassword() ?? '' },
          body: form,
        });
        const data = await res.json().catch(() => ({}));
        if (data.secure_url) {
          setImages((prev) => [...prev, data.secure_url]);
          // The first picture also goes to the model as vision input.
          if (!firstImageBase64) {
            const reader = new FileReader();
            reader.onloadend = () => setFirstImageBase64(reader.result as string);
            reader.readAsDataURL(file);
          }
        } else {
          setProblem(data.error || 'No se pudo subir una de las imágenes.');
        }
      } catch (error) {
        setProblem(error instanceof Error ? error.message : String(error));
      }
    }

    setUploading(false);
  };

  const buildArticleRecord = (
    article: GeneratedArticle,
    post: GeneratedPost,
    locale: Lang,
    id: string
  ): BlogArticle => ({
    id,
    title: article.title,
    tour: selectedTours.join(', '),
    post: article.body,
    date: new Date().toISOString().split('T')[0],
    slug: slugify(article.title) || id,
    locale,
    tags: article.tags,
    visible: true,
    caption: article.caption,
    prelude: article.prelude,
    images: post.images,
    social: post.social,
  });

  /** This one article, in a language the generator did not write. */
  const translatePost = async (entry: PostState, to: Lang, report: (line: string) => void) => {
    const { value } = await translateRecord(entry.post.en, 'en', to, (n, total) => report(`${n}/${total}`));
    if (!(await saveBlogArticle(buildArticleRecord(value, entry.post, to, entry.id), to))) {
      throw new Error('no se pudo guardar');
    }
    return '1 artículo traducido';
  };

  /** All four languages at once; an edition the model could not write is translated instead. */
  const savePost = async (entry: PostState) => {
    await saveBlogArticle(buildArticleRecord(entry.post.en, entry.post, 'en', entry.id), 'en');
    for (const lang of EDITIONS) {
      if (entry.post.missing.includes(lang)) continue;
      await saveBlogArticle(buildArticleRecord(entry.post[lang], entry.post, lang, entry.id), lang);
    }
    setPosts((prev) => prev.map((p) => (p.id === entry.id ? { ...p, saved: true } : p)));
    const toTranslate = entry.post.missing.filter((lang) => EDITIONS.includes(lang)) as Lang[];
    if (toTranslate.length > 0) {
      void sync.afterSave((to, report) => translatePost(entry, to, report), toTranslate);
    }
  };

  /** The published articles of this session that a language does not have yet. */
  const fillMissingPosts = async (to: Lang, report: (line: string) => void): Promise<string | null> => {
    const theirs = new Set((await getBlogArticles(to, true)).map((article) => article.id));
    const missing = posts.filter((entry) => entry.saved && !theirs.has(entry.id));
    for (const [i, entry] of missing.entries()) {
      report(`${i + 1}/${missing.length}`);
      await translatePost(entry, to, () => undefined);
    }
    return missing.length ? `${missing.length} artículo(s) traducido(s)` : null;
  };

  /** Publish through the configured Graph API token, when there is one. */
  const publish = async (entry: PostState) => {
    const token = socialApiSettings?.facebookLongLivedToken;
    if (!token) return;
    const message =
      entry.post.social.find((c) => c.platform === 'facebook')?.text ||
      `${entry.post.en.title}\n\n${entry.post.en.prelude}`;
    const mediaUrl = entry.post.images[0] || '';

    try {
      if (socialApiSettings.selectedFacebookPageId) {
        await apiPost('social-publish', {
          message,
          mediaUrl,
          platform: 'facebook',
          pageId: socialApiSettings.selectedFacebookPageId,
          token,
        });
      }
      if (socialApiSettings.selectedInstagramAccountId && mediaUrl) {
        await apiPost('social-publish', {
          message:
            entry.post.social.find((c) => c.platform === 'instagram')?.text || message,
          mediaUrl,
          platform: 'instagram',
          igAccountId: socialApiSettings.selectedInstagramAccountId,
          token,
        });
      }
    } catch (error) {
      setProblem(
        `El artículo se generó, pero no se pudo publicar en redes: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  };

  const handleGenerate = async () => {
    if (!aiSettings) return;
    setBusy(true);
    setProblem('');
    setProblemFailures([]);
    const made: PostState[] = [];

    try {
      for (let i = 0; i < variations; i += 1) {
        const of = variations > 1 ? ` (${i + 1}/${variations})` : '';
        setProgress(`Escribiendo en inglés${of}…`);

        const post = await generateBlogPost(aiSettings, {
          povOrigin: audience.origin,
          povAge: audience.age,
          povGroup: audience.group,
          povGender: audience.gender,
          povExclusivity: audience.style,
          selectedTours,
          topics: selectedTopics,
          voiceTranscript: notes,
          mediaBase64: firstImageBase64,
          images,
          brandName: brandSettings.brandName,
          socialPlatforms: platforms,
          template,
          reviews: quoteReviews ? reviews : [],
          languages: EDITIONS,
          onProgress: (lang) => setProgress(`Escribiendo la edición en ${PROGRESS_LANGUAGE[lang]}${of}…`),
        });

        const entry: PostState = {
          id: `post-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          post,
          saved: false,
          view: 'es',
        };

        if (autoSave) {
          await savePost(entry);
          entry.saved = true;
        }
        if (autoPublish) await publish(entry);

        made.push(entry);
        setPosts([...made]);
      }
    } catch (error) {
      // The provider's own words, carried all the way from the Worker.
      setProblem(error instanceof Error ? error.message : String(error));
      setProblemFailures(error instanceof AiGenerationError ? error.failures : []);
    } finally {
      setBusy(false);
      setProgress('');
    }
  };

  const copy = async (key: string, text: string) => {
    if (await copyText(text)) {
      setCopied(key);
      setTimeout(() => setCopied(''), 1800);
    }
  };

  const visibleTours = tours.filter((tour) =>
    tourQuery.trim() ? tour.title.toLowerCase().includes(tourQuery.trim().toLowerCase()) : true
  );

  const providerLabel = aiSettings
    ? { cloudflare: 'Cloudflare Workers AI', gemini: 'Google Gemini', openrouter: 'OpenRouter', openai: 'ChatGPT (OpenAI)' }[
        aiSettings.activeProvider
      ]
    : '…';

  const chip = (active: boolean) =>
    `rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ${
      active
        ? 'border-lagoon-dark bg-lagoon-dark text-white'
        : 'border-ink/20 bg-white text-ink-soft hover:border-lagoon'
    }`;

  /**
   * The same action, rendered at both ends of the page.
   *
   * The brief is long enough that by the time it is filled in the button that
   * starts it is off-screen, and after a run the results push it further away
   * still. One handler, one `busy`, two buttons: whichever is in view is the
   * live one, and both show the same progress line so neither can look idle
   * while the other is working.
   */
  const GenerateButton = ({ size }: { size: 'lead' | 'foot' }) => (
    <button
      type="button"
      onClick={handleGenerate}
      disabled={busy}
      aria-busy={busy}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-mango font-bold uppercase tracking-[0.1em] text-ink transition hover:brightness-95 disabled:opacity-60 ${
        size === 'lead' ? 'px-7 py-3.5 text-sm' : 'w-full px-8 py-4 text-base sm:w-auto'
      }`}
    >
      {busy ? (
        <>
          <FaSpinner className="animate-spin" /> {progress || 'Generando…'}
        </>
      ) : (
        <>
          <FaMagic /> Generar artículo
        </>
      )}
    </button>
  );

  const card = 'rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:p-6';
  const step = 'mb-4 flex items-baseline gap-3';
  const stepNo =
    'grid h-7 w-7 shrink-0 place-items-center rounded-full bg-ink text-[0.78rem] font-bold text-paper';

  return (
    <div className="space-y-6">
      {/* ── Heading and the one primary action ──────────────────────────── */}
      <div className="flex flex-col gap-4 rounded-3xl border border-ink/12 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h2 className="flex items-center gap-3 text-2xl font-bold text-ink sm:text-3xl">
            <FaMagic className="text-mango" /> Generador de blog
          </h2>
          <p className="mt-1 text-sm text-ink-light">
            Escribe un artículo largo en inglés, español, francés y alemán, con pie de foto,
            entrada en negrita, imágenes colocadas y las búsquedas de cada idioma. Proveedor
            activo:{' '}
            <strong className="text-ink">{providerLabel}</strong>
          </p>
        </div>
        <GenerateButton size="lead" />
      </div>

      {anyProviderUsable === false && !problem && (
        <div className="rounded-2xl border border-sunset/50 bg-sunset/10 p-5">
          <p className="text-sm font-bold text-ink">Ningún proveedor de IA está listo</p>
          <p className="mt-1 text-sm text-ink-soft">
            Esta instalación no tiene el binding de Workers AI ni una clave guardada. Abre
            “Integraciones de IA” y pega una clave de ChatGPT (OpenAI), Gemini o OpenRouter — o vuelve a
            desplegar el sitio, que es lo que concede el binding de Cloudflare y no necesita
            ninguna clave.
          </p>
        </div>
      )}

      {problem && (
        <div className="rounded-2xl border border-hibiscus/40 bg-hibiscus/10 p-5">
          <p className="text-sm font-bold text-hibiscus-dark">No se pudo generar</p>
          {/* What to change, not what broke. The Worker turns each provider's
              own wording into one instruction, and when it tried more than one
              provider each gets its own line — "la clave de Gemini fue
              rechazada" and "Cloudflare no tiene el binding" are two different
              repairs, and seeing only the first sends you to fix the wrong
              thing. */}
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink-soft">{problem}</p>
          {problemFailures.length > 1 && (
            <ul className="mt-3 space-y-1.5 border-t border-hibiscus/25 pt-3">
              {problemFailures.map((f) => (
                <li key={f.provider} className="text-xs text-ink-soft">
                  <strong className="uppercase tracking-[0.08em] text-ink">{f.provider}</strong>{' '}
                  — {f.error}
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-ink-light">
            Puedes probar cada proveedor por separado en “Integraciones de IA”, con el botón
            “Probar”. Cloudflare Workers AI funciona sin clave en esta instalación.
          </p>
        </div>
      )}

      {/* ── 1. The brief ────────────────────────────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>1</span>
          <div>
            <h3 className="text-lg font-bold text-ink">¿De qué trata el artículo?</h3>
            <p className="text-sm text-ink-light">Toca los temas. Puedes elegir varios.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              type="button"
              onClick={() => setSelectedTopics((prev) => toggle(prev, topic.id))}
              className={chip(selectedTopics.includes(topic.id))}
            >
              {topic.label.es}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
            Formato del artículo
          </p>
          <div className="flex flex-wrap gap-2">
            {BLOG_TEMPLATES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTemplate(t.id)}
                title={t.hint}
                className={chip(template === t.id)}
              >
                {t.label.es}
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-light">
            {BLOG_TEMPLATES.find((t) => t.id === template)?.hint}
          </p>
        </div>

        {selectedTopics.length > 0 && (
          <div className="mt-4 rounded-2xl bg-paper-warm p-3">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Búsquedas que el artículo trabajará (español)
            </p>
            <p className="mb-3 mt-1 break-words text-sm text-ink-soft">
              {keywordsFor(selectedTopics, 'es').join(' · ')}
            </p>
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Hashtags que se usarán
            </p>
            <p className="mt-1 break-words text-sm text-ink-soft">
              {hashtagsFor(selectedTopics)
                .slice(0, 18)
                .map((h) => `#${h}`)
                .join('  ')}
            </p>
          </div>
        )}
      </section>

      {/* ── 2. Tours, audience, notes, photos ───────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>2</span>
          <div>
            <h3 className="text-lg font-bold text-ink">Excursiones y público</h3>
            <p className="text-sm text-ink-light">
              Lo que se menciona en el texto y para quién está escrito.
            </p>
          </div>
        </div>

        {/* Tours: searchable chips instead of a list of everything. */}
        <div className="relative mb-3">
          <FaSearch className="pointer-events-none absolute left-4 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-light" />
          <input
            type="search"
            value={tourQuery}
            onChange={(event) => setTourQuery(event.target.value)}
            placeholder="Buscar excursión…"
            className="w-full rounded-full border border-ink/15 py-2.5 pl-10 pr-4 text-sm"
          />
        </div>

        <div className="max-h-56 overflow-y-auto rounded-2xl border border-ink/10 p-2">
          <div className="flex flex-wrap gap-2">
            {visibleTours.map((tour) => {
              const active = selectedTours.includes(tour.title);
              return (
                <button
                  key={tour.id}
                  type="button"
                  onClick={() => setSelectedTours((prev) => toggle(prev, tour.title))}
                  className={`flex items-center gap-2 ${chip(active)} !py-1 !pl-1 !pr-3.5`}
                >
                  {tour.image && (
                    <img
                      src={tour.image}
                      alt=""
                      loading="lazy"
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <span className="max-w-[16rem] truncate">{tour.title}</span>
                </button>
              );
            })}
            {visibleTours.length === 0 && (
              <p className="p-3 text-sm text-ink-light">Ninguna excursión coincide.</p>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-ink-light">
          {selectedTours.length} seleccionada{selectedTours.length === 1 ? '' : 's'}
          {selectedTours.length > 0 && (
            <button
              type="button"
              onClick={() => setSelectedTours([])}
              className="ml-3 font-semibold text-sunset-dark hover:underline"
            >
              Quitar todas
            </button>
          )}
        </p>

        {/* Audience: five short rows of chips, not five dropdowns. */}
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {(Object.keys(AUDIENCE_OPTIONS) as Array<keyof Audience>).map((facet) => (
            <div key={facet}>
              <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                {AUDIENCE_LABELS[facet]}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {AUDIENCE_OPTIONS[facet].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAudience((prev) => ({ ...prev, [facet]: option }))}
                    className={`${chip(audience[facet] === option)} !px-3 !py-1 !text-[0.8rem]`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Notes. Large on a phone, because this is the field that is dictated
            into and then corrected by thumb. */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Notas para el artículo
            </p>
            {dictation.mode !== 'none' && (
              <button
                type="button"
                onClick={dictation.toggle}
                disabled={dictation.transcribing}
                aria-pressed={dictation.listening}
                className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition disabled:opacity-60 ${
                  dictation.listening ? 'bg-hibiscus text-white' : 'border border-ink/20 text-ink-soft hover:border-lagoon'
                }`}
              >
                {dictation.transcribing ? (
                  <><FaSpinner className="animate-spin" /> Transcribiendo…</>
                ) : dictation.listening ? (
                  <><FaStop /> Detener{dictation.mode === 'record' ? ` · ${dictation.seconds}s` : ''}</>
                ) : (
                  <><FaMicrophone /> Dictar</>
                )}
              </button>
            )}
          </div>
          {dictation.error && <p className="mb-2 text-xs font-semibold text-hibiscus-dark">{dictation.error}</p>}
          {dictation.mode === 'none' && (
            <p className="mb-2 text-xs text-ink-light">
              Este navegador no permite dictar. Puedes usar el micrófono del teclado del teléfono.
            </p>
          )}
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            rows={6}
            placeholder="Cuenta lo que hace especial el día: el agua, la comida, la gente, lo que incluye, qué llevar…"
            className="min-h-[9rem] w-full rounded-2xl border border-ink/15 p-4 text-base leading-relaxed"
          />
          <p className="mt-1 text-xs text-ink-light">
            Todo lo que escribas aquí se trata como verdad y entra en el artículo.
          </p>
        </div>

        {/* Photos. Uploaded immediately so the article can reference real URLs. */}
        <div className="mt-6">
          <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
            Fotos del artículo
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {images.map((url, index) => (
              <div key={url} className="relative">
                <img
                  src={url}
                  alt=""
                  className="h-20 w-20 rounded-xl border border-ink/15 object-cover"
                />
                <span className="absolute -left-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-paper">
                  {index + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                  className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-hibiscus text-[0.6rem] text-white"
                  aria-label="Quitar la foto"
                >
                  ×
                </button>
              </div>
            ))}
            <label className="inline-flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-ink/25 text-ink-light transition hover:border-lagoon hover:text-ink">
              <FaImages />
              <span className="text-[0.62rem] font-bold">{uploading ? 'Subiendo…' : 'Añadir'}</span>
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => {
                  handleImages(event.target.files);
                  event.target.value = '';
                }}
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-ink-light">
            La IA coloca cada foto donde el texto la describe. Si no encuentra un lugar claro, van
            justo después de la entrada en negrita.
          </p>
        </div>
      </section>

      {/* ── 3. How it comes out ─────────────────────────────────────────── */}
      <section className={card}>
        <div className={step}>
          <span className={stepNo}>3</span>
          <div>
            <h3 className="text-lg font-bold text-ink">Cómo se publica</h3>
            <p className="text-sm text-ink-light">Versiones, redes sociales y guardado.</p>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Cuántas versiones
            </p>
            <div className="flex gap-1.5">
              {[1, 2, 3].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setVariations(n)}
                  className={`${chip(variations === n)} !px-5`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
              Versión para redes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SHARE_TARGETS.map((target) => {
                const configured = socialAccounts.some(
                  (a) => a.platform === target.platform
                );
                return (
                  <button
                    key={target.platform}
                    type="button"
                    onClick={() => setPlatforms((prev) => toggle(prev, target.platform))}
                    title={configured ? 'Cuenta configurada' : 'Sin cuenta configurada — se podrá copiar y compartir'}
                    className={`${chip(platforms.includes(target.platform))} !px-3 !py-1 !text-[0.8rem]`}
                  >
                    {target.label}
                    {configured && <span className="ml-1.5 text-[0.7em]">●</span>}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-light">
              ● = cuenta configurada. Las demás se generan igual y se comparten con copiar y pegar.
            </p>
          </div>
        </div>

        <p className="mt-5 rounded-2xl bg-paper-warm p-3 text-xs text-ink-soft">
          <strong className="text-ink">Temporada:</strong> {seasonalNote()}
        </p>

        <div className="mt-5 flex flex-wrap gap-5 border-t border-ink/10 pt-5">
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={quoteReviews && reviews.length > 0}
              onChange={(event) => setQuoteReviews(event.target.checked)}
              disabled={reviews.length === 0}
              className="h-4 w-4"
            />
            Citar reseñas reales
            <span className="text-xs font-normal text-ink-light">
              ({reviews.length ? `${reviews.length} disponibles` : 'no hay reseñas publicadas'})
            </span>
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={autoSave}
              onChange={(event) => setAutoSave(event.target.checked)}
              className="h-4 w-4"
            />
            Guardar en el sitio automáticamente
          </label>
          <label className="inline-flex items-center gap-2.5 text-sm font-semibold text-ink-soft">
            <input
              type="checkbox"
              checked={autoPublish}
              onChange={(event) => setAutoPublish(event.target.checked)}
              disabled={!socialApiSettings?.facebookLongLivedToken}
              className="h-4 w-4"
            />
            Publicar en Facebook e Instagram
            {!socialApiSettings?.facebookLongLivedToken && (
              <span className="text-xs font-normal text-ink-light">(falta el token)</span>
            )}
          </label>
        </div>
      </section>

      {/* ── The result ──────────────────────────────────────────────────── */}
      {/* Only for an edition the model could not write itself. */}
      {posts.some((entry) => entry.post.missing.length > 0) && (
        <TranslateBar
          sync={sync}
          what="el artículo publicado"
          languages={EDITIONS as Lang[]}
          fillMissing={fillMissingPosts}
          disabled={!posts.some((entry) => entry.saved)}
        />
      )}
      {posts.map((entry) => {
        const article = entry.post[entry.view];
        const plain = `${article.title}\n\n${article.caption}\n\n${article.prelude}\n\n${article.body}`;

        return (
          <section key={entry.id} className={card}>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-ink/10 pb-4">
              <div className="inline-flex rounded-full bg-paper-warm p-1">
                {(['es', 'en', 'fr', 'de'] as const).map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() =>
                      setPosts((prev) =>
                        prev.map((p) => (p.id === entry.id ? { ...p, view: lang } : p))
                      )
                    }
                    className={`rounded-full px-4 py-1.5 text-sm font-bold transition ${
                      entry.view === lang ? 'bg-white text-ink shadow-sm' : 'text-ink-light'
                    }`}
                  >
                    {LANGUAGE_TABS[lang]}
                    {entry.post.missing.includes(lang) && (
                      <span className="ml-1 text-[0.7em] text-sunset-dark" title="Se traducirá al guardar">
                        *
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => copy(`${entry.id}-article`, plain)}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
                >
                  {copied === `${entry.id}-article` ? <FaCheck /> : <FaCopy />} Copiar
                </button>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink disabled:opacity-50"
                >
                  <FaRedo /> Regenerar
                </button>
                <button
                  type="button"
                  onClick={() => setPosts((prev) => prev.filter((p) => p.id !== entry.id))}
                  className="inline-flex items-center gap-2 rounded-full border border-ink/20 px-4 py-2 text-xs font-bold text-sunset-dark transition hover:border-hibiscus"
                >
                  <FaTrash /> Descartar
                </button>
                <button
                  type="button"
                  onClick={() => savePost(entry)}
                  disabled={entry.saved}
                  className="inline-flex items-center gap-2 rounded-full bg-jungle-dark px-5 py-2 text-xs font-bold uppercase tracking-[0.1em] text-white transition hover:brightness-110 disabled:opacity-60"
                >
                  {entry.saved ? <><FaCheck /> Guardado</> : <><FaSave /> Publicar en el sitio</>}
                </button>
              </div>
            </div>

            {/* The preview is the real thing: same component as the blog. */}
            <article className="mx-auto max-w-3xl">
              <h1 className="mb-4 font-display text-3xl font-bold leading-tight text-ink sm:text-4xl">
                {article.title}
              </h1>
              <ArticleBody
                caption={article.caption}
                prelude={article.prelude}
                body={article.body}
                images={entry.post.images}
                title={article.title}
              />
              {article.tags.length > 0 && (
                <ul className="mt-6 flex flex-wrap gap-2 border-t border-ink/10 pt-5">
                  {article.tags.map((tag) => (
                    <li
                      key={tag}
                      className="rounded-full border border-ink/15 px-3 py-1 text-[0.7rem] font-bold uppercase tracking-[0.12em] text-ink-light"
                    >
                      #{tag}
                    </li>
                  ))}
                </ul>
              )}
            </article>

            <p className="mt-6 text-center text-xs text-ink-light">
              {entry.post.provider} · {entry.post.model} ·{' '}
              {article.body.split(/\s+/).filter(Boolean).length} palabras
            </p>

            {/* The social cut. */}
            {entry.post.social.length > 0 && (
              <div className="mt-8 border-t border-ink/10 pt-6">
                <h4 className="mb-4 text-lg font-bold text-ink">Versión para redes</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  {entry.post.social.map((cut) => {
                    const target = shareTargetFor(cut.platform);
                    const key = `${entry.id}-${cut.platform}`;
                    const url =
                      typeof window !== 'undefined'
                        ? `${window.location.origin}/blog#${slugify(article.title)}`
                        : '';
                    return (
                      <div
                        key={cut.platform}
                        className="flex flex-col rounded-2xl border border-ink/12 bg-paper-warm p-4"
                      >
                        <p className="mb-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-ink-light">
                          {target?.label || cut.platform}
                        </p>
                        <p className="flex-1 whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                          {cut.text}
                        </p>
                        {target && (
                          <p className="mt-3 text-xs text-ink-light">{target.note.es}</p>
                        )}
                        <div className="mt-3 flex gap-2">
                          <button
                            type="button"
                            onClick={() => copy(key, cut.text)}
                            className="inline-flex items-center gap-2 rounded-full border border-ink/20 bg-white px-4 py-2 text-xs font-bold text-ink-soft transition hover:border-lagoon hover:text-ink"
                          >
                            {copied === key ? <FaCheck /> : <FaCopy />} Copiar
                          </button>
                          <button
                            type="button"
                            onClick={() => shareTo(cut.platform, cut.text, url)}
                            className="inline-flex items-center gap-2 rounded-full bg-lagoon-dark px-4 py-2 text-xs font-bold text-white transition hover:brightness-110"
                          >
                            <FaShareAlt /> Compartir
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </section>
        );
      })}

      {posts.length === 0 && !busy && (
        <p className="rounded-3xl border border-dashed border-ink/20 p-10 text-center text-sm text-ink-light">
          Los artículos generados aparecerán aquí, con vista previa real y botones para publicar.
        </p>
      )}

      {/* ── The same action again, where the form ends ─────────────────── */}
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-ink/12 bg-white p-6 text-center shadow-sm">
        <p className="text-sm text-ink-light">
          {posts.length > 0
            ? 'Genera otra versión con el mismo resumen, o cambia algo arriba y vuelve a intentarlo.'
            : 'Cuando el resumen esté listo, genera el artículo desde aquí.'}
        </p>
        <GenerateButton size="foot" />
        <p className="text-xs text-ink-light">
          Proveedor activo: <strong className="text-ink-soft">{providerLabel}</strong>
        </p>
      </div>
    </div>
  );
};

export default AIBlogGenAdmin;
