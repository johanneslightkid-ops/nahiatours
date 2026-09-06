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

const AIBlogGenAdmin: React.FC = () => {
  const { locale } = useI18n();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiSettings, setAiSettings] = useState<any>(null);
  const [socialApiSettings, setSocialApiSettings] = useState<any>(null);

  // Form State
  const [selectedTours, setSelectedTours] = useState<string[]>([]);
  const [povOrigin, setPovOrigin] = useState('USA');
  const [povAge, setPovAge] = useState('Adults');
  const [povGroup, setPovGroup] = useState('Family');
  const [povGender, setPovGender] = useState('Mixed');
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
      alert("Please configure an AI provider in the AI Integrations tab first.");
      return;
    }

    setLoading(true);
    const newPosts = [];

    try {
      for (let i = 0; i < numPosts; i++) {
        const params: Omit<BlogGenerationParams, 'language'> = {
          povOrigin, povAge, povGroup, povGender, povExclusivity,
          selectedTours, voiceTranscript, mediaBase64
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
      alert("Failed to generate blog posts. Please check AI settings and console.");
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
      console.error('Upload failed', e);
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
      console.error('Social Publish failed', e);
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
    alert('Copied to clipboard!');
  };

  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-slate-900 mb-6 flex items-center gap-3">
        <FaMagic className="text-purple-600" /> AI Blog Generator
      </h2>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Left Column: Inputs */}
        <div className="space-y-6">
          
          {/* Media & Voice */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Content Input</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Voice Dictation (Notes)</label>
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={toggleRecording}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white transition ${isRecording ? 'bg-red-500 hover:bg-red-600 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'}`}
                  >
                    {isRecording ? <><FaStop /> Stop Recording</> : <><FaMicrophone /> Start Mic</>}
                  </button>
                </div>
                <textarea
                  value={voiceTranscript}
                  onChange={(e) => setVoiceTranscript(e.target.value)}
                  placeholder="Speak or type your notes here..."
                  className="w-full p-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-purple-500 h-24"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Media Upload</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg cursor-pointer transition">
                    <FaUpload /> Select Image/Video
                    <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMediaUpload} />
                  </label>
                  {mediaBase64 && <span className="text-sm text-green-600 font-bold flex items-center gap-1"><FaCheck /> Media attached</span>}
                </div>
                <p className="text-xs text-slate-500 mt-2">Connecting to Social Media directly is coming soon. For now, download from Facebook/Instagram and upload here.</p>
              </div>
            </div>
          </div>

          {/* POV & Tours */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Target Audience (POV) & Subject</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Origin</label>
                <select value={povOrigin} onChange={e=>setPovOrigin(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200">
                  <option>USA</option><option>Canada</option><option>Latin America</option><option>Europe</option><option>Asia</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Age Group</label>
                <select value={povAge} onChange={e=>setPovAge(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200">
                  <option>Youth</option><option>Adults</option><option>Seniors</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Group</label>
                <select value={povGroup} onChange={e=>setPovGroup(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200">
                  <option>Family</option><option>Friends</option><option>Couple</option><option>Single</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Gender</label>
                <select value={povGender} onChange={e=>setPovGender(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200">
                  <option>Mixed</option><option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Budget/Vibe</label>
                <select value={povExclusivity} onChange={e=>setPovExclusivity(e.target.value)} className="w-full p-2 rounded-lg border border-slate-200">
                  <option>Standard / Economic</option><option>Exclusive / VIP</option><option>Party / Fiesta</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Select Tours Featured</label>
              <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-xl p-3 space-y-2">
                {tours.map(tour => (
                  <label key={tour.id} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={selectedTours.includes(tour.id)} onChange={() => toggleTourSelection(tour.id)} className="rounded text-purple-600 focus:ring-purple-500" />
                    <span className="text-sm">{tour.title}</span>
                  </label>
                ))}
                {tours.length === 0 && <span className="text-slate-500 text-sm">No tours available.</span>}
              </div>
            </div>
          </div>

          {/* Generate Options */}
          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-100">
             <div className="flex items-center gap-6 mb-4">
               <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Variations</label>
                  <input type="number" min="1" max="5" value={numPosts} onChange={e=>setNumPosts(parseInt(e.target.value))} className="w-24 p-2 rounded-lg border border-slate-200" />
               </div>
               <div className="pt-5 flex flex-col gap-2">
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={autoPost} onChange={e=>setAutoPost(e.target.checked)} className="rounded text-purple-600 focus:ring-purple-500 w-5 h-5" />
                   <span className="font-semibold text-slate-700">Auto Save to Website</span>
                 </label>
                 <label className="flex items-center gap-2 cursor-pointer">
                   <input type="checkbox" checked={autoPostSocial} onChange={e=>setAutoPostSocial(e.target.checked)} className="rounded text-blue-600 focus:ring-blue-500 w-5 h-5" />
                   <span className="font-semibold text-slate-700">Auto Post to FB & IG</span>
                 </label>
               </div>
             </div>

             <button 
                onClick={handleGenerate}
                disabled={loading}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl text-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
             >
               {loading ? 'Generating...' : <><FaMagic /> Generate Blog Posts</>}
             </button>
          </div>
        </div>

        {/* Right Column: Output */}
        <div className="space-y-6">
          {generatedPosts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-8">
              <FaMagic className="text-6xl mb-4 opacity-20" />
              <p className="text-center font-semibold">Generated blog posts will appear here.</p>
            </div>
          ) : (
            generatedPosts.map((post, idx) => (
              <div key={idx} className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Generated Post {idx + 1}</h3>
                  <div className="flex gap-2">
                    <button onClick={() => handleSavePost(post, idx)} disabled={post.saved} className="px-3 py-1 bg-teal-600 text-white rounded font-bold text-sm hover:bg-teal-700 disabled:opacity-50">
                      {post.saved ? 'Saved' : 'Save Internally'}
                    </button>
                  </div>
                </div>
                
                <div className="p-6">
                  <h4 className="font-bold text-xl mb-4 flex justify-between items-center">
                    English Version
                    <button onClick={() => copyToClipboard(post.en.title + '\n\n' + post.en.content)} className="text-slate-400 hover:text-slate-600"><FaCopy /></button>
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto mb-6">
                    <strong>{post.en.title}</strong><br/><br/>
                    {post.en.content}
                  </div>

                  <h4 className="font-bold text-xl mb-4 flex justify-between items-center">
                    Spanish Version
                    <button onClick={() => copyToClipboard(post.es.title + '\n\n' + post.es.content)} className="text-slate-400 hover:text-slate-600"><FaCopy /></button>
                  </h4>
                  <div className="bg-slate-50 p-4 rounded-xl text-sm whitespace-pre-wrap text-slate-700 max-h-64 overflow-y-auto">
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
