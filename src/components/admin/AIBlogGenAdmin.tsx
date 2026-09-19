import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaStop, FaUpload, FaMagic, FaCopy, FaCheck } from 'react-icons/fa';
import { getTours, Tour } from '../../services/toursService';
import { getAISettings } from '../../services/aiSettingsService';
import { generateBlogPost, BlogGenerationParams } from '../../services/aiGeneratorService';
import { saveBlogArticle, BlogArticle } from '../../services/blogService';
import { getSocialApiSettings } from '../../services/socialApiSettingsService';
import { useI18n } from '../../contexts/I18nContext';
import { apiPost } from '../../services/apiClient';
import { getAdminPassword } from '../../services/authStore';
import { useBrand } from '../../contexts/BrandContext';

const AIBlogGenAdmin: React.FC = () => {
  const { brandSettings } = useBrand();
  const { locale } = useI18n();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [socialApiSettings, setSocialApiSettings] = useState<any>(null);

  // Form State
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [povOrigin, setPovOrigin] = useState('Estados Unidos');
  const [povAge, setPovAge] = useState('Adultos');
  const [povGroup, setPovGroup] = useState('Familia');
  const [povGender, setPovGender] = useState('Mixto');
  const [povExclusivity, setPovExclusivity] = useState('Standard');
  const [numPosts, setNumPosts] = useState(1);
  const [autoPost, setAutoPost] = useState(false);
  const [autoPostSocial, setAutoPostSocial] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [mediaBase64, setMediaBase64] = useState<string | undefined>();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  
  // Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);
  /**
   * Text the recogniser has committed. Interim results are *cumulative* — each
   * onresult repeats the whole in-progress phrase — so they must never be
   * accumulated into state, only shown after the finalised text. Keeping the
   * final text in a ref means an interim update cannot double it.
   */
  const finalTranscriptRef = useRef('');

  // Output State
  const [generatedPosts, setGeneratedPosts] = useState<Array<{en: {title: string, content: string}, es: {title: string, content: string}, saved: boolean}>>([]);

  useEffect(() => {
    loadInitialData();
    initSpeechRecognition();
    return () => {
      // Leaving the panel mid-recording should release the microphone.
      try {
        recognitionRef.current?.stop();
      } catch {
        /* already stopped */
      }
      recognitionRef.current = null;
    };
  }, []);

  const loadInitialData = async () => {
    const fetchedTours = await getTours('en');
    setTours(fetchedTours);
    const settings = await getAISettings();
    setAiSettings(settings);
    const socialSettings = await getSocialApiSettings();
    setSocialApiSettings(socialSettings);
  };

  const initSpeechRecognition = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event: any) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const chunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            // Each result finalises exactly once, so this appends once.
            finalTranscriptRef.current += chunk;
          } else {
            interimTranscript += chunk;
          }
        }
        // Rebuilt from the committed text every time, never appended to.
        setVoiceTranscript(finalTranscriptRef.current + interimTranscript);
      };

      // The recogniser stops itself after a silence, which used to leave the
      // button claiming it was still recording.
      recognitionRef.current.onend = () => setIsRecording(false);
      recognitionRef.current.onerror = () => setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    const recognition = recognitionRef.current;
    if (!recognition) return;

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
      return;
    }

    finalTranscriptRef.current = '';
    setVoiceTranscript('');
    try {
      recognition.start();
      setIsRecording(true);
    } catch {
      // start() throws if the recogniser is already running; the onend
      // handler will settle the state.
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setMediaFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaBase64(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTourSelection = (tourId: string) => {
    setSelectedTours(prev => 
      prev.includes(tourId) ? prev.filter(id => id !== tourId) : [...prev, tourId]
    );
  };

  const handleGenerate = async () => {
    if (!aiSettings || !aiSettings.activeProvider) {
      alert("Primero configura un proveedor de IA en la pestaña de Integraciones de IA.");
      return;
    }

    setLoading(true);
    const newPosts = [];

    try {
      for (let i = 0; i < numPosts; i++) {
        const params: Omit<BlogGenerationParams, 'language'> = {
          povOrigin, povAge, povGroup, povGender, povExclusivity,
          selectedTours, voiceTranscript, mediaBase64,
          // The model writes for the configured company, not a made-up one.
          brandName: brandSettings.brandName,
        };

        const [enPost, esPost] = await Promise.all([
          generateBlogPost(aiSettings, { ...params, language: 'en' }),
          generateBlogPost(aiSettings, { ...params, language: 'es' })
        ]);

        const postData = { en: enPost, es: esPost, saved: false };
        
        let mediaUrl = '';
        if (autoPostSocial && mediaFile) {
           mediaUrl = await uploadMedia(mediaFile);
        }

        if (autoPost) {
          await savePostToKV(postData);
          postData.saved = true;
        }

        if (autoPostSocial && socialApiSettings?.facebookLongLivedToken) {
          await publishToSocialMedia(enPost.content, mediaUrl);
        }

        newPosts.push(postData);
      }
      setGeneratedPosts(newPosts);
    } catch (error) {
      console.error(error);
      alert("No se pudieron generar las entradas. Revisa la configuración de IA y la consola.");
    } finally {
      setLoading(false);
    }
  };

  const uploadMedia = async (file: File): Promise<string> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'social-media');
      
      const adminPassword = getAdminPassword() ?? '';
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'X-Admin-Password': adminPassword },
        body: formData
      });
      const data = await res.json();
      return data.secure_url || '';
    } catch (e) {
      console.error('No se pudo subir el archivo', e);
      return '';
    }
  };

  const publishToSocialMedia = async (content: string, mediaUrl: string) => {
    if (!socialApiSettings?.facebookLongLivedToken) return;

    try {
      if (socialApiSettings.selectedFacebookPageId) {
        await apiPost<any>('social-publish', {
          message: content,
          mediaUrl,
          platform: 'facebook',
          pageId: socialApiSettings.selectedFacebookPageId,
          token: socialApiSettings.facebookLongLivedToken
        });
      }

      if (socialApiSettings.selectedInstagramAccountId && mediaUrl) {
         await apiPost<any>('social-publish', {
          message: content,
          mediaUrl,
          platform: 'instagram',
          igAccountId: socialApiSettings.selectedInstagramAccountId,
          token: socialApiSettings.facebookLongLivedToken
        });
      }
    } catch (e) {
      console.error('No se pudo publicar en redes', e);
    }
  };

  const savePostToKV = async (postData: any) => {
    const id = `post-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const enArticle: BlogArticle = {
      id,
      title: postData.en.title,
      tour: selectedTours.join(','),
      post: postData.en.content,
      date: new Date().toISOString().split('T')[0],
      slug: postData.en.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
      locale: 'en'
    };

    const esArticle: BlogArticle = {
      ...enArticle,
      title: postData.es.title,
      post: postData.es.content,
      slug: postData.es.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-'),
      locale: 'es'
    };

    await saveBlogArticle(enArticle, 'en');
    await saveBlogArticle(esArticle, 'es');
  };

  const handleSavePost = async (postData: any, index: number) => {
    await savePostToKV(postData);
    setGeneratedPosts(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index].saved = true;
      }
      return copy;
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('¡Copiado al portapapeles!');
  };

  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-ink mb-6 flex items-center gap-3">
        <FaMagic className="text-purple-600" /> Generador de blog con IA
      </h2>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          
          {/* Media & Voice */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <h3 className="text-lg font-bold text-ink mb-4">Contenido de partida</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-ink-soft mb-2">Dictado por voz (notas)</label>
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition ${isRecording ? 'bg-red-500 hover:bg-coral-deep animate-pulse' : 'bg-blue-500 hover:bg-sea-deep'}`}
                  >
                    {isRecording ? <><FaStop /> Detener grabación</> : <><FaMicrophone /> Activar micrófono</>}
                  </button>
                </div>
                <textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Habla o escribe tus notas aquí..."
                  className="w-full p-3 rounded-xl border border-ink/15 focus:ring-2 focus:ring-purple-500 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-ink-soft mb-2">Subir archivo</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-paper-warm hover:bg-paper-deep text-ink-soft font-bold rounded-lg cursor-pointer transition">
                    <FaUpload /> Elegir imagen o video
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
                  </label>
                  {mediaBase64 && <span className="text-sm text-green-600 font-bold flex items-center gap-1"><FaCheck /> Archivo adjunto</span>}
                </div>
                <p className="text-xs text-ink-light mt-2">La conexión directa con las redes sociales llegará pronto. Por ahora, descarga el archivo de Facebook o Instagram y súbelo aquí.</p>
              </div>
            </div>
          </div>

          {/* POV & Tours */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <h3 className="text-lg font-bold text-ink mb-4">Público al que le hablas y tema</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-ink-light uppercase tracking-wide mb-1">Procedencia</label>
                <select value={povOrigin} onChange={e=>setPovOrigin(e.target.value)} className="w-full p-2 rounded-lg border border-ink/15">
                  <option>Estados Unidos</option><option>Canadá</option><option>América Latina</option><option>Europa</option><option>Asia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-light uppercase tracking-wide mb-1">Grupo de edad</label>
                <select value={povAge} onChange={e=>setPovAge(e.target.value)} className="w-full p-2 rounded-lg border border-ink/15">
                  <option>Jóvenes</option><option>Adultos</option><option>Personas mayores</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-light uppercase tracking-wide mb-1">Grupo</label>
                <select value={povGroup} onChange={e=>setPovGroup(e.target.value)} className="w-full p-2 rounded-lg border border-ink/15">
                  <option>Familia</option><option>Amigos</option><option>Pareja</option><option>Solo/a</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-light uppercase tracking-wide mb-1">Género</label>
                <select value={povGender} onChange={e=>setPovGender(e.target.value)} className="w-full p-2 rounded-lg border border-ink/15">
                  <option>Mixto</option><option>Hombres</option><option>Mujeres</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-light uppercase tracking-wide mb-1">Budget/Vibe</label>
                <select value={povExclusivity} onChange={e=>setPovExclusivity(e.target.value)} className="w-full p-2 rounded-lg border border-ink/15">
                  <option>Standard / Economic</option><option>Exclusive / VIP</option><option>Party / Fiesta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-soft mb-2">Excursiones que aparecen</label>
              <div className="max-h-40 overflow-y-auto border border-ink/15 rounded-xl p-3 space-y-2">
                {tours.map(tour => (
                  <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedTours.includes(tour.id)} onChange={() => toggleTourSelection(tour.id)} className="rounded text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm">{tour.title}</span>
                  </label>
                ))}
                {tours.length === 0 && <span className="text-ink-light text-sm">No hay excursiones disponibles.</span>}
              </div>
            </div>
          </div>

          {/* Generate Options */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
             <div className="flex items-center gap-6 mb-4">
               <div>
                  <label className="block text-sm font-semibold text-ink-soft mb-1">Variaciones</label>
                  <input type="number" min="1" max="5" value={numPosts} onChange={e=>setNumPosts(parseInt(e.target.value))} className="w-24 p-2 rounded-lg border border-ink/15" />
               </div>
               <div className="pt-5 flex flex-col gap-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={autoPost} onChange={e=>setAutoPost(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500 w-5 h-5" />
                   <span className="font-semibold text-ink-soft">Guardar automáticamente en el sitio</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={autoPostSocial} onChange={e=>setAutoPostSocial(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" />
                   <span className="font-semibold text-ink-soft">Publicar automáticamente en FB e IG</span>
                 </label>
               </div>
             </div>

             <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl text-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {loading ? 'Generando…' : <><FaMagic /> Generar entradas</>}
             </button>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-6">
          {generatedPosts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-paper rounded-2xl border-2 border-dashed border-ink/15 p-8">
              <FaMagic className="text-6xl mb-4 opacity-20" />
              <p className="text-center font-semibold">Las entradas generadas aparecerán aquí.</p>
            </div>
          ) : (
            generatedPosts.map((post, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg border border-ink/15 overflow-hidden">
                <div className="bg-paper p-4 border-b border-ink/15 flex justify-between items-center">
                  <h3 className="font-bold text-ink">Entrada generada {idx + 1}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleSavePost(post, idx)} disabled={post.saved} className="px-3 py-1 bg-sea-deep text-white rounded font-bold text-sm hover:bg-[#0f4f59] disabled:opacity-50">
                      {post.saved ? 'Guardado' : 'Guardar en el sitio'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="font-bold text-xl mb-4 flex justify-between items-center">
                    Versión en inglés
                    <button onClick={() => copyToClipboard(post.en.title + '\n\n' + post.en.content)} className="text-slate-400 hover:text-ink-soft"><FaCopy /></button>
                  </h4>
                  <div className="bg-paper p-4 rounded-xl text-sm whitespace-pre-wrap text-ink-soft max-h-64 overflow-y-auto mb-6">
                    <strong>{post.en.title}</strong><br/><br/>
                    {post.en.content}
                  </div>

                  <h4 className="font-bold text-xl mb-4 flex justify-between items-center">
                    Versión en español
                    <button onClick={() => copyToClipboard(post.es.title + '\n\n' + post.es.content)} className="text-slate-400 hover:text-ink-soft"><FaCopy /></button>
                  </h4>
                  <div className="bg-paper p-4 rounded-xl text-sm whitespace-pre-wrap text-ink-soft max-h-64 overflow-y-auto">
                    <strong>{post.es.title}</strong><br/><br/>
                    {post.es.content}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AIBlogGenAdmin;
