import React, { useCallback, useEffect, useState, useRef } from 'react';
import { getBrandSettings, saveBrandSettings, BrandSettings, uploadBrandIcon } from '../services/brandService';
import { showsBrandName } from '../lib/brandDisplay';
import BrandIconEditor from '../components/admin/BrandIconEditor';
import { getTours, saveTours, Tour } from '../services/toursService';
import { useI18n } from '../contexts/I18nContext';
import ServiceAdminPanel from '../components/admin/ServiceAdminPanel';
import TikTokAdmin from '../components/admin/TikTokAdmin';
import SocialMediaAdmin from '../components/admin/SocialMediaAdmin';
import StoryAdmin from '../components/admin/StoryAdmin';
import AIAssistantAdmin from '../components/admin/AIAssistantAdmin';
import AIBlogGenAdmin from '../components/admin/AIBlogGenAdmin';
import TestimonialsAdmin from '../components/admin/TestimonialsAdmin';
import AdminPasswordPanel from '../components/admin/AdminPasswordPanel';
import PaymentSettingsPanel from '../components/admin/PaymentSettingsPanel';
import ContactRequestsPanel from '../components/admin/ContactRequestsPanel';
import NotifySettingsPanel from '../components/admin/NotifySettingsPanel';
import SalesActivityPanel from '../components/admin/SalesActivityPanel';
import SiteTextsAdmin from '../components/admin/SiteTextsAdmin';
import { FaVideo, FaShareAlt, FaBook, FaRobot, FaMagic } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';

const Admin: React.FC = () => {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    brandName: 'Tours',
    contactName: '',
    phoneNumber: '+1 (809) 555-0123',
    paypalMeLink: 'https://www.paypal.com/paypalme/tours',
    verifoneLink: '',
    brandicon: '',
  });
  const [editingBrand, setEditingBrand] = useState(false);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  /** File picked but not yet framed — drives the crop editor. */
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get('section') || 'brand';

  useEffect(() => {
    const fetchBrand = async () => {
      const fetchedBrand = await getBrandSettings();
      setBrandSettings(fetchedBrand);
    };
    fetchBrand();
  }, []);

  const handleBrandIconUpload = async (file: File) => {
    setUploadingIcon(true);
    try {
      const iconUrl = await uploadBrandIcon(file);
      if (iconUrl) {
        setBrandSettings({ ...brandSettings, brandicon: iconUrl });
      }
      setPendingIconFile(null);
    } catch (error) {
      console.error('No se pudo subir el logo:', error);
    } finally {
      setUploadingIcon(false);
    }
  };

  const triggerBrandIconUpload = () => fileInputRef.current?.click();

  const loadTours = useCallback(async () => {
    const fetchedTours = await getTours(locale);
    setTours(fetchedTours);
  }, [locale]);

  return (
    <div className="min-h-screen bg-paper-warm py-6">
      <div className="container mx-auto space-y-8 px-4">
        {/* What guests asked for outside WhatsApp, on the page the operator opens first. */}
        {activeSection === 'brand' && <ContactRequestsPanel />}
        {activeSection === 'sales' && (
          <>
            <SalesActivityPanel />
            <ContactRequestsPanel />
            <NotifySettingsPanel />
          </>
        )}

        {/* Brand Settings Section */}
        {activeSection === 'brand' && (
          <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-ink">Datos del negocio</h2>
            {editingBrand ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-ink-soft mb-2">Logo del negocio</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-paper-warm ring-1 ring-slate-200">
                      {brandSettings.brandicon ? (
                        <img
                          src={brandSettings.brandicon}
                          alt="Vista previa del logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-ink-light text-xs uppercase tracking-[.2em]">
                          Sin logo
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={triggerBrandIconUpload}
                        disabled={uploadingIcon}
                        className="inline-flex items-center justify-center rounded-full bg-lagoon-dark px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0f4f59] disabled:bg-lagoon"
                      >
                        {uploadingIcon ? 'Subiendo…' : 'Subir logo'}
                      </button>
                      <p className="text-xs text-ink-light">Sube un logo cuadrado para usarlo en el menú del panel y en la cabecera del sitio.</p>
                    </div>
                  </div>
                  <input
                    ref={(ref) => {
                      fileInputRef.current = ref;
                    }}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        // Frame it first; the editor hands back the crop.
                        setPendingIconFile(file);
                      }
                      // Reset, so picking the same file twice still fires.
                      event.target.value = '';
                    }}
                  />
                </div>
                <input
                  type="text"
                  value={brandSettings.brandName}
                  onChange={(event) => setBrandSettings({ ...brandSettings, brandName: event.target.value })}
                  placeholder="Nombre del negocio"
                  className="rounded-2xl border border-ink/15 px-4 py-3"
                />
                <label className="flex items-center gap-3 rounded-2xl border border-ink/15 px-4 py-3 text-sm font-semibold text-ink-soft md:col-span-2">
                  <input
                    type="checkbox"
                    checked={showsBrandName(brandSettings)}
                    onChange={(event) => setBrandSettings({ ...brandSettings, showBrandName: event.target.checked })}
                    className="h-4 w-4"
                  />
                  Mostrar el nombre del negocio junto al logo, en la barra de navegación
                </label>
                <input
                  type="text"
                  value={brandSettings.phoneNumber}
                  onChange={(event) => setBrandSettings({ ...brandSettings, phoneNumber: event.target.value })}
                  placeholder="Número de teléfono"
                  className="rounded-2xl border border-ink/15 px-4 py-3"
                />
                <input
                  type="text"
                  value={brandSettings.contactName}
                  onChange={(event) => setBrandSettings({ ...brandSettings, contactName: event.target.value })}
                  placeholder="Nombre de la persona de contacto (WhatsApp)"
                  className="rounded-2xl border border-ink/15 px-4 py-3 md:col-span-2"
                />
                <input
                  type="text"
                  value={brandSettings.paypalMeLink}
                  onChange={(event) => setBrandSettings({ ...brandSettings, paypalMeLink: event.target.value })}
                  placeholder="Enlace de PayPal"
                  className="rounded-2xl border border-ink/15 px-4 py-3 md:col-span-2"
                />
                <p className="md:col-span-2 rounded-2xl bg-paper-warm/60 px-4 py-3 text-sm text-ink-soft">
                  El fondo de la portada (fotos y videos) se cambia en{' '}
                  <a href="/admin/look" className="font-bold text-lagoon-dark underline">Admin › Aspecto</a>.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await saveBrandSettings(brandSettings);
                      setEditingBrand(false);
                    }}
                    className="rounded-full bg-lagoon-dark px-5 py-2 font-semibold text-white"
                  >
                    Guardar
                  </button>
                  <button
                    onClick={() => setEditingBrand(false)}
                    className="rounded-full bg-paper-deep px-5 py-2 font-semibold text-ink"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-ink-soft">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-paper-warm ring-1 ring-slate-200">
                    {brandSettings.brandicon ? (
                      <img src={brandSettings.brandicon} alt="Logo del negocio" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-ink-light text-xs uppercase tracking-[.2em]">
                        Sin logo
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-ink-soft">Icono del menú, arriba a la izquierda</span>
                </div>
                <p><strong>Negocio:</strong> {brandSettings.brandName}</p>
                <p><strong>Nombre junto al logo:</strong> {showsBrandName(brandSettings) ? 'visible' : 'oculto'}</p>
                <p><strong>Teléfono:</strong> {brandSettings.phoneNumber}</p>
                <p><strong>Contacto:</strong> {brandSettings.contactName || '—'}</p>
                <p><strong>PayPal:</strong> {brandSettings.paypalMeLink}</p>
                <button onClick={() => setEditingBrand(true)} className="mt-4 rounded-full bg-lagoon-dark px-5 py-2 font-semibold text-white">
                  Editar datos del negocio
                </button>
              </div>
            )}

            {/* How the business takes money, and who can get in here at all.
                Both live with the brand settings because that is the page an
                operator opens to change "our" things. */}
            <PaymentSettingsPanel
              brandSettings={brandSettings}
              setBrandSettings={setBrandSettings}
            />
            <AdminPasswordPanel />
          </div>
        )}

        {/* Story Admin Section */}
        {activeSection === 'story' && <StoryAdmin />}

        {/* Tours Admin Section */}
        {activeSection === 'tours' && (
          <ServiceAdminPanel
            title="Excursiones"
            category="tours"
            services={tours}
            setServices={setTours}
            loadServices={loadTours}
            saveServices={(services) => saveTours(services, locale)}
            locale={locale}
            loadTranslation={(to) => getTours(to, true)}
            saveTranslation={(services, to) => saveTours(services, to)}
          />
        )}

        {/* Reviews Admin Section */}
        {activeSection === 'testimonials' && (
          <div className="rounded-3xl bg-paper p-6 shadow-lg border border-ink/15">
            <TestimonialsAdmin />
          </div>
        )}

        {/* Menus, buttons and headings, per language */}
        {activeSection === 'texts' && (
          <div className="rounded-3xl bg-paper p-6 shadow-lg border border-ink/15">
            <SiteTextsAdmin />
          </div>
        )}

        {/* TikTok Videos Admin Panel */}
        {activeSection === 'tiktok' && (
          <div className="rounded-3xl bg-paper-card p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <FaVideo className="text-3xl text-pink-600" />
              <h2 className="text-2xl font-bold text-ink">Videos de TikTok</h2>
            </div>
            <TikTokAdmin />
          </div>
        )}

        {/* Social Media Admin Panel */}
        {activeSection === 'social' && (
          <div className="rounded-3xl bg-paper-card p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <FaShareAlt className="text-3xl text-blue-600" />
              <h2 className="text-2xl font-bold text-ink">Redes sociales</h2>
            </div>
            <SocialMediaAdmin />
          </div>
        )}

        {/* AI Settings Section */}
        {activeSection === 'aiSettings' && (
          <div className="rounded-3xl bg-paper-card p-6 shadow-lg">
            <AIAssistantAdmin />
          </div>
        )}

        {/* AI Blog Gen Section */}
        {activeSection === 'aiBlogGen' && (
          <div className="rounded-3xl bg-paper p-6 shadow-lg border border-ink/15">
            <AIBlogGenAdmin />
          </div>
        )}
      </div>
      {pendingIconFile && (
        <BrandIconEditor
          file={pendingIconFile}
          busy={uploadingIcon}
          onCancel={() => setPendingIconFile(null)}
          onApply={handleBrandIconUpload}
        />
      )}

    </div>
  );
};

export default Admin;
