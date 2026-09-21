import React, { useState } from 'react';
import { FaYoutube, FaTrash, FaPlus } from 'react-icons/fa';

interface TikTokVideo {
  id: string;
  adventureId: string;
  title: string;
  url: string;
  description: string;
  createdAt: string;
}

interface TikTokAdminProps {
  onSave?: (videos: TikTokVideo[]) => void;
}

const TikTokAdmin: React.FC<TikTokAdminProps> = ({ onSave }) => {
  const [videos, setVideos] = useState<TikTokVideo[]>([
    {
      id: '1',
      adventureId: 'buggy',
      title: 'Cuatrimotos por la selva',
      url: 'https://www.tiktok.com/@youraccount/video/123456789',
      description: 'Vive la emoción de recorrer la selva dominicana en cuatrimoto',
      createdAt: '2024-03-01'
    },
    {
      id: '2',
      adventureId: 'party_boat',
      title: 'Fiesta en el barco',
      url: 'https://www.tiktok.com/@youraccount/video/987654321',
      description: 'Un día completo de sol, música y sabor caribeño en el mar',
      createdAt: '2024-03-02'
    },
    {
      id: '3',
      adventureId: 'waterfall',
      title: 'Magia de cascadas',
      url: 'https://www.tiktok.com/@youraccount/video/456789123',
      description: 'Descubre las cascadas de Samaná escondidas en la selva',
      createdAt: '2024-03-03'
    }
  ]);
  const [newVideo, setNewVideo] = useState({
    adventureId: 'buggy',
    title: '',
    url: '',
    description: ''
  });

  const handleAddVideo = () => {
    if (newVideo.title && newVideo.url) {
      const video: TikTokVideo = {
        id: Date.now().toString(),
        ...newVideo,
        createdAt: new Date().toISOString().split('T')[0]
      };
      setVideos([...videos, video]);
      setNewVideo({
        adventureId: 'buggy',
        title: '',
        url: '',
        description: ''
      });
      onSave?.([...videos, video]);
    }
  };

  const handleDeleteVideo = (id: string) => {
    const updated = videos.filter(v => v.id !== id);
    setVideos(updated);
    onSave?.(updated);
  };

  const getTikTokEmbedUrl = (url: string) => {
    // Convert TikTok URL to embed format
    const videoId = url.split('/video/')[1]?.split('?')[0];
    if (videoId) {
      return `https://www.tiktok.com/embed/v2/${videoId}`;
    }
    return url;
  };

  return (
    <div className="w-full space-y-8">
      <h2 className="text-3xl font-bold text-ink mb-6">Videos de TikTok</h2>

      {/* Add new video form */}
      <div className="bg-gradient-to-br from-black to-slate-900 rounded-2xl p-8 text-white">
        <h3 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <FaPlus /> Agregar video de TikTok
        </h3>

        <div className="space-y-4">
          {/* Adventure selection */}
          <div>
            <label className="block text-sm font-semibold mb-2">Categoría de aventura</label>
            <select
              value={newVideo.adventureId}
              onChange={(e) => setNewVideo({ ...newVideo, adventureId: e.target.value })}
              className="w-full px-4 py-2 bg-slate-800 border-2 border-pink-500 rounded-lg text-white focus:outline-none"
            >
              <option value="buggy">🏜️ Buggies por la selva</option>
              <option value="party_boat">🎉 Party boat (Saona)</option>
              <option value="waterfall">🌊 Cascadas (Samaná)</option>
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-semibold mb-2">Título del video</label>
            <input
              type="text"
              value={newVideo.title}
              onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              placeholder="ej.: Aventura en cuatrimoto"
              className="w-full px-4 py-2 bg-slate-800 border-2 border-pink-500 rounded-lg text-white focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* TikTok URL */}
          <div>
            <label className="block text-sm font-semibold mb-2">Enlace de TikTok</label>
            <input
              type="url"
              value={newVideo.url}
              onChange={(e) => setNewVideo({ ...newVideo, url: e.target.value })}
              placeholder="https://www.tiktok.com/@tucuenta/video/123456789"
              className="w-full px-4 py-2 bg-slate-800 border-2 border-pink-500 rounded-lg text-white focus:outline-none placeholder-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold mb-2">Descripción</label>
            <textarea
              value={newVideo.description}
              onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
              placeholder="Descripción corta del video..."
              rows={3}
              className="w-full px-4 py-2 bg-slate-800 border-2 border-pink-500 rounded-lg text-white focus:outline-none placeholder-slate-400 resize-none"
            />
          </div>

          {/* Submit button */}
          <button
            onClick={handleAddVideo}
            disabled={!newVideo.title || !newVideo.url}
            className="w-full py-3 px-4 bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold rounded-lg hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Agregar video
          </button>
        </div>
      </div>

      {/* Video list */}
      <div>
        <h3 className="text-2xl font-bold text-ink mb-6">Videos actuales ({videos.length})</h3>

        <div className="grid md:grid-cols-2 gap-6">
          {videos.map((video) => (
            <div key={video.id} className="bg-white rounded-2xl overflow-hidden shadow-lg border-2 border-ink/15">
              {/* Video preview */}
              <div className="w-full h-64 bg-paper-deep flex items-center justify-center overflow-hidden">
                <FaYoutube className="text-6xl text-slate-400" />
              </div>

              {/* Video info */}
              <div className="p-6 space-y-3">
                <h4 className="font-bold text-ink text-lg">{video.title}</h4>
                <p className="text-sm text-ink-soft">{video.description}</p>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-ink-light">
                    Aventura:{' '}
                    <span className="font-semibold">
                      {video.adventureId === 'buggy'
                        ? '🏜️ Buggies'
                        : video.adventureId === 'party_boat'
                          ? '🎉 Party Boat'
                          : '🌊 Cascadas'}
                    </span>
                  </span>
                  <span className="text-ink-light">{video.createdAt}</span>
                </div>

                <div className="border-t-2 border-ink/15 pt-3 flex gap-2">
                  <a
                    href={video.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 px-3 py-2 bg-gradient-to-r from-pink-500 to-orange-500 text-white text-sm font-semibold rounded text-center hover:shadow-lg transition-all"
                  >
                    Ver en TikTok
                  </a>
                  <button
                    onClick={() => handleDeleteVideo(video.id)}
                    className="px-4 py-2 bg-red-500 text-white rounded hover:bg-sunset-dark transition-colors"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TikTokAdmin;
