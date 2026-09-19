import React, { useState, useEffect } from 'react';
import { useI18n } from '../../contexts/I18nContext';
import { BlogArticle, getBlogArticles, deleteBlogArticle, toggleBlogArticleVisibility } from '../../services/blogService';
import { FaTrash, FaEye, FaEyeSlash } from 'react-icons/fa';

const BlogAdminPanel: React.FC = () => {
  const { locale } = useI18n();
  const [articles, setArticles] = useState<BlogArticle[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchArticles = async () => {
    setLoading(true);
    const data = await getBlogArticles(locale);
    setArticles(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchArticles();
  }, [locale]);

  const handleToggleVisibility = async (id: string) => {
    const success = await toggleBlogArticleVisibility(id, locale);
    if (success) {
      setArticles(prev => prev.map(a => a.id === id ? { ...a, visible: !a.visible } : a));
    } else {
      alert('No se pudo cambiar la visibilidad');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Seguro que quieres eliminar esta entrada del blog para siempre?')) return;
    const success = await deleteBlogArticle(id, locale);
    if (success) {
      setArticles(prev => prev.filter(a => a.id !== id));
    } else {
      alert('No se pudo eliminar la entrada');
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-ink-light">Cargando entradas del blog...</div>;
  }

  return (
    <div className="w-full space-y-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-ink">Blog</h2>
        <div className="text-sm text-ink-light font-medium">Entradas en total: {articles.length}</div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-ink/15 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-paper border-b border-ink/15 text-sm font-semibold text-ink-soft">
                <th className="p-4">Título</th>
                <th className="p-4">Fecha</th>
                <th className="p-4">Etiquetas</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {articles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-ink-light">No hay entradas del blog.</td>
                </tr>
              ) : (
                articles.map(article => (
                  <tr key={article.id} className={`hover:bg-paper transition ${!article.visible ? 'opacity-60 bg-paper/50' : ''}`}>
                    <td className="p-4">
                      <div className="font-bold text-ink line-clamp-1">{article.title}</div>
                      <div className="text-xs text-ink-light line-clamp-1">{article.slug}</div>
                    </td>
                    <td className="p-4 text-sm text-ink-soft whitespace-nowrap">
                      {article.date || 'Unknown'}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {article.tags?.map((tag, i) => (
                          <span key={i} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-paper-warm text-ink-soft">
                            {tag}
                          </span>
                        ))}
                        {(!article.tags || article.tags.length === 0) && <span className="text-xs text-slate-400 italic">Ninguna</span>}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${article.visible ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                        {article.visible ? 'Published' : 'Oculta'}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap space-x-2">
                      <button 
                        onClick={() => handleToggleVisibility(article.id)}
                        className={`inline-flex items-center justify-center p-2 rounded transition-colors ${article.visible ? 'text-slate-400 hover:text-amber-600 hover:bg-amber-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50'}`}
                        title={article.visible ? 'Hide Post' : 'Publicar entrada'}
                      >
                        {article.visible ? <FaEyeSlash /> : <FaEye />}
                      </button>
                      <button 
                        onClick={() => handleDelete(article.id)}
                        className="inline-flex items-center justify-center p-2 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar la entrada para siempre"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BlogAdminPanel;
