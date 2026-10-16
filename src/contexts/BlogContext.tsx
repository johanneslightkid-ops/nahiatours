import React, { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { useI18n } from './I18nContext';
import { useBrand } from './BrandContext';
import { BlogArticle, getBlogArticles } from '../services/blogService';
import { applyBrandTokensDeep } from '../utils/brandText';

type Locale = 'en' | 'es' | 'de' | 'fr';

interface BlogContextType {
  blogArticles: Partial<Record<Locale, BlogArticle[]>>;
  loading: boolean;
  error: boolean;
}

const BlogContext = createContext<BlogContextType | undefined>(undefined);

export const useBlog = (): BlogContextType => {
  const context = useContext(BlogContext);
  if (!context) {
    throw new Error('useBlog must be used within a BlogProvider');
  }
  return context;
};

interface BlogProviderProps {
  children: ReactNode;
}

export const BlogProvider: React.FC<BlogProviderProps> = ({ children }) => {
  const { locale } = useI18n();
  // Articles carry {{brand}} rather than a hardcoded company name.
  const { brandSettings } = useBrand();
  const brandName = brandSettings.brandName;
  const [blogArticles, setBlogArticles] = useState<Partial<Record<Locale, BlogArticle[]>>>({ en: [], es: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadBlogContent = async () => {
      setLoading(true);
      setError(false);

      try {
        console.log('[BlogContext] Starting blog content load...');
        // English and Spanish always (the home page cross-links them), plus the
        // reader's own language when it is German or French.
        const extra: Locale | null = locale === 'de' || locale === 'fr' ? locale : null;
        const [enArticles, esArticles, extraArticles] = await Promise.all([
          getBlogArticles('en'),
          getBlogArticles('es'),
          extra ? getBlogArticles(extra) : Promise.resolve(null),
        ]);
        setBlogArticles({
          en: enArticles,
          es: esArticles,
          ...(extra && extraArticles ? { [extra]: extraArticles.length ? extraArticles : enArticles } : {}),
        });
      } catch (err) {
        console.error('[BlogContext] Blog loading error:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadBlogContent();
  }, [locale]);

  const brandedArticles = useMemo(
    () => applyBrandTokensDeep(blogArticles, brandName),
    [blogArticles, brandName]
  );

  return (
    <BlogContext.Provider value={{ blogArticles: brandedArticles, loading, error }}>
      {children}
    </BlogContext.Provider>
  );
};
