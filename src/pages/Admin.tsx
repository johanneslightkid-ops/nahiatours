import React, { useCallback, useEffect, useState, useRef } from 'react';
import { getBrandSettings, saveBrandSettings, BrandSettings, uploadBrandIcon } from '../services/brandService';
import BrandIconEditor from '../components/admin/BrandIconEditor';
import { getTours, saveTours, Tour } from '../services/toursService';
import { useI18n } from '../contexts/I18nContext';
import ServiceAdminPanel from '../components/admin/ServiceAdminPanel';
import TikTokAdmin from '../components/admin/TikTokAdmin';
import SocialMediaAdmin from '../components/admin/SocialMediaAdmin';
import StoryAdmin from '../components/admin/StoryAdmin';
import AIAssistantAdmin from '../components/admin/AIAssistantAdmin';
import AIBlogGenAdmin from '../components/admin/AIBlogGenAdmin';
import { FaVideo, FaShareAlt, FaBook, FaRobot, FaMagic } from 'react-icons/fa';
import { useSearchParams } from 'react-router-dom';

const Admin: React.FC = () => {
  const { locale } = useI18n();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [brandSettings, setBrandSettings] = useState<BrandSettings>({
    brandName: 'Tours',
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
      console.error('Brand icon upload failed:', error);
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
    <div className="min-h-screen bg-slate-100 py-8">
      <div className="container mx-auto space-y-8 px-4">
        {/* Admin Navigation */}
        <div className="rounded-3xl bg-white p-4 md:p-6 shadow-lg">
          <div className="mb-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                {brandSettings.brandicon ? (
                  <img
                    src={brandSettings.brandicon}
                    alt={`${brandSettings.brandName} logo`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs uppercase tracking-[.2em]">
                    Logo
                  </div>
                )}
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Admin Dashboard</h1>
            </div>
          </div>
        </div>

        {/* Brand Settings Section */}
        {activeSection === 'brand' && (
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-2xl font-bold text-slate-900">Brand Settings</h2>
            {editingBrand ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Brand Icon</label>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    <div className="h-20 w-20 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                      {brandSettings.brandicon ? (
                        <img
                          src={brandSettings.brandicon}
                          alt="Brand icon preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs uppercase tracking-[.2em]">
                          No icon
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <button
                        type="button"
                        onClick={triggerBrandIconUpload}
                        disabled={uploadingIcon}
                        className="inline-flex items-center justify-center rounded-full bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:bg-teal-400"
                      >
                        {uploadingIcon ? 'Uploading…' : 'Upload Brand Icon'}
                      </button>
                      <p className="text-xs text-slate-500">Upload a square logo or brand image to use in the admin menu and site header.</p>
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
                  placeholder="Brand Name"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
                <input
                  type="text"
                  value={brandSettings.phoneNumber}
                  onChange={(event) => setBrandSettings({ ...brandSettings, phoneNumber: event.target.value })}
                  placeholder="Phone Number"
                  className="rounded-2xl border border-slate-200 px-4 py-3"
                />
                <input
                  type="text"
                  value={brandSettings.paypalMeLink}
                  onChange={(event) => setBrandSettings({ ...brandSettings, paypalMeLink: event.target.value })}
                  placeholder="PayPal link"
                  className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2"
                />
                <input
                  type="text"
                  value={brandSettings.verifoneLink}
                  onChange={(event) => setBrandSettings({ ...brandSettings, verifoneLink: event.target.value })}
                  placeholder="Verifone link"
                  className="rounded-2xl border border-slate-200 px-4 py-3 md:col-span-2"
                />
                <div className="flex gap-3">
                  <button
                    onClick={async () => {
                      await saveBrandSettings(brandSettings);
                      setEditingBrand(false);
                    }}
                    className="rounded-full bg-teal-600 px-5 py-2 font-semibold text-white"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingBrand(false)}
                    className="rounded-full bg-slate-200 px-5 py-2 font-semibold text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-slate-700">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full overflow-hidden bg-slate-100 ring-1 ring-slate-200">
                    {brandSettings.brandicon ? (
                      <img src={brandSettings.brandicon} alt="Brand icon" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-500 text-xs uppercase tracking-[.2em]">
                        No icon
                      </div>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-slate-700">Top-left admin menu icon</span>
                </div>
                <p><strong>Brand:</strong> {brandSettings.brandName}</p>
                <p><strong>Phone:</strong> {brandSettings.phoneNumber}</p>
                <p><strong>PayPal:</strong> {brandSettings.paypalMeLink}</p>
                <p><strong>Verifone:</strong> {brandSettings.verifoneLink || '—'}</p>
                <button onClick={() => setEditingBrand(true)} className="mt-4 rounded-full bg-blue-600 px-5 py-2 font-semibold text-white">
                  Edit Brand Settings
                </button>
              </div>
            )}
          </div>
        )}

        {/* Story Admin Section */}
        {activeSection === 'story' && <StoryAdmin />}

        {/* Tours Admin Section */}
        {activeSection === 'tours' && (
          <ServiceAdminPanel
            title="Tours Admin"
            category="tours"
            services={tours}
            setServices={setTours}
            loadServices={loadTours}
            saveServices={(services) => saveTours(services, locale)}
            siblingAdminPath="/admin/transport"
            siblingAdminLabel="Go to Transport Admin"
          />
        )}

        {/* Transport Admin Section */}
        {activeSection === 'transport' && (
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <p className="text-slate-600">Transport Admin Section (navigate from Tours Admin)</p>
          </div>
        )}

        {/* TikTok Videos Admin Panel */}
        {activeSection === 'tiktok' && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <FaVideo className="text-3xl text-pink-600" />
              <h2 className="text-2xl font-bold text-slate-900">TikTok Videos Admin</h2>
            </div>
            <TikTokAdmin />
          </div>
        )}

        {/* Social Media Admin Panel */}
        {activeSection === 'social' && (
          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <div className="mb-6 flex items-center gap-3">
              <FaShareAlt className="text-3xl text-blue-600" />
              <h2 className="text-2xl font-bold text-slate-900">Social Media Management</h2>
            </div>
            <SocialMediaAdmin />
          </div>
        )}

        {/* AI Settings Section */}
        {activeSection === 'aiSettings' && (
          <div className="rounded-3xl bg-white p-6 shadow-lg">
            <AIAssistantAdmin />
          </div>
        )}

        {/* AI Blog Gen Section */}
        {activeSection === 'aiBlogGen' && (
          <div className="rounded-3xl bg-slate-50 p-6 shadow-lg border border-slate-200">
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
