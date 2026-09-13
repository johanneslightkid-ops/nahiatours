import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaTrash, FaEdit2, FaArrowUp, FaArrowDown, FaImage, FaVideo, FaHeading, FaParagraph, FaCloud, FaCheck, FaBullhorn, FaLink } from 'react-icons/fa';
import { StoryElement, StoryElementType, StoryElementsData, VideoOrientation, VideoSource, CTAButton, getStoryElements, saveStoryElements, createNewElement, uploadImage } from '../../services/storyElementsService';
import { JourneyLocale } from '../../services/introStoryService';

const StoryAdmin: React.FC = () => {
  const [locale, setLocale] = useState<JourneyLocale>('en');
  const [storyData, setStoryData] = useState<StoryElementsData>({
    storyTitle: '',
    storyTagline: '',
    elements: [],
  });
  const [editingElement, setEditingElement] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [expandedElement, setExpandedElement] = useState<string | null>(null);
  const [uploadingElements, setUploadingElements] = useState<Record<string, number>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadStory = useCallback(async () => {
    const data = await getStoryElements(locale);
    if (data) {
      setStoryData(data);
    } else {
      setStoryData({
        storyTitle: '',
        storyTagline: '',
        elements: [],
      });
    }
    setEditingElement(null);
  }, [locale]);

  useEffect(() => {
    loadStory();
  }, [loadStory]);

  const saveStory = async () => {
    if (!storyData.storyTitle.trim()) {
      setMessage({ type: 'error', text: 'Story title is required' });
      return;
    }

    setIsSaving(true);
    try {
      const success = await saveStoryElements(storyData, locale);
      if (success) {
        setMessage({ type: 'success', text: 'Story saved successfully!' });
      } else {
        setMessage({ type: 'error', text: 'Failed to save story' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error saving story' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const updateElement = (id: string, field: string, value: any) => {
    setStoryData((prev) => ({
      ...prev,
      elements: prev.elements.map((el) =>
        el.id === id
          ? { ...el, content: { ...el.content, [field]: value } }
          : el
      ),
    }));
  };

  const addElement = (type: StoryElementType, afterElementId?: string) => {
    const insertIndex = afterElementId
      ? storyData.elements.findIndex((el) => el.id === afterElementId) + 1
      : storyData.elements.length;

    const newElement = createNewElement(type, insertIndex);
    const newElements = [
      ...storyData.elements.slice(0, insertIndex),
      newElement,
      ...storyData.elements.slice(insertIndex).map((el, idx) => ({
        ...el,
        order: insertIndex + 1 + idx,
      })),
    ];

    setStoryData((prev) => ({ ...prev, elements: newElements }));
    setEditingElement(newElement.id);
  };

  const deleteElement = (id: string) => {
    const newElements = storyData.elements
      .filter((el) => el.id !== id)
      .map((el, idx) => ({ ...el, order: idx }));
    setStoryData((prev) => ({ ...prev, elements: newElements }));
    setEditingElement(null);
  };

  const moveElement = (id: string, direction: 'up' | 'down') => {
    const index = storyData.elements.findIndex((el) => el.id === id);
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === storyData.elements.length - 1)
    ) {
      return;
    }

    const newElements = [...storyData.elements];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newElements[index], newElements[swapIndex]] = [newElements[swapIndex], newElements[index]];

    newElements.forEach((el, idx) => {
      el.order = idx;
    });

    setStoryData((prev) => ({ ...prev, elements: newElements }));
  };

  const handleImageUpload = async (elementId: string, file: File) => {
    setUploadingElements((prev) => ({ ...prev, [elementId]: 0 }));

    try {
      const url = await uploadImage(file, (percent) => {
        setUploadingElements((prev) => ({ ...prev, [elementId]: percent }));
      });

      updateElement(elementId, 'imageUrl', url);
      setMessage({ type: 'success', text: 'Image uploaded successfully!' });
      setTimeout(() => setMessage(null), 2000);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to upload image. Check Cloudinary settings.' });
      console.error('Upload error:', error);
    } finally {
      setUploadingElements((prev) => {
        const newState = { ...prev };
        delete newState[elementId];
        return newState;
      });
    }
  };

  const triggerFileInput = (elementId: string) => {
    fileInputRefs.current[elementId]?.click();
  };

  const elementTypeIcon = (type: StoryElementType) => {
    switch (type) {
      case 'title':
        return <FaHeading className="text-blue-600" />;
      case 'paragraph':
        return <FaParagraph className="text-green-600" />;
      case 'picture':
        return <FaImage className="text-purple-600" />;
      case 'video':
        return <FaVideo className="text-red-600" />;
      case 'cta':
        return <FaBullhorn className="text-orange-600" />;
      default:
        return null;
    }
  };

  const renderElementEditor = (element: StoryElement) => {
    return (
      <div key={element.id} className="space-y-3">
        {element.type === 'title' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Title</label>
            <input
              type="text"
              value={element.content.title || ''}
              onChange={(e) => updateElement(element.id, 'title', e.target.value)}
              placeholder="Enter title"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {element.type === 'paragraph' && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Text</label>
            <textarea
              value={element.content.text || ''}
              onChange={(e) => updateElement(element.id, 'text', e.target.value)}
              placeholder="Enter paragraph text"
              rows={4}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        )}

        {element.type === 'picture' && (
          <div className="space-y-3">
            {/* Hidden file input */}
            <input
              ref={(ref) => {
                fileInputRefs.current[element.id] = ref;
              }}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  handleImageUpload(element.id, file);
                }
              }}
              className="hidden"
            />

            {/* Upload button */}
            <div className="flex gap-2">
              <button
                onClick={() => triggerFileInput(element.id)}
                disabled={uploadingElements[element.id] !== undefined}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white rounded-lg text-sm font-semibold transition"
              >
                {uploadingElements[element.id] !== undefined ? (
                  <>
                    <FaCloud className="animate-pulse" />
                    {Math.round(uploadingElements[element.id])}%
                  </>
                ) : (
                  <>
                    <FaCloud />
                    Upload Image
                  </>
                )}
              </button>
            </div>

            {/* Image URL input */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Image URL {element.content.imageUrl && <FaCheck className="inline text-green-600 ml-1" />}
              </label>
              <input
                type="text"
                value={element.content.imageUrl || ''}
                onChange={(e) => updateElement(element.id, 'imageUrl', e.target.value)}
                placeholder="Enter image URL or upload above"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Preview */}
            {element.content.imageUrl && (
              <div className="mt-2 rounded-lg overflow-hidden border border-slate-200">
                <img
                  src={element.content.imageUrl}
                  alt="Preview"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-40 object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>
        )}

        {element.type === 'video' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video Title</label>
              <input
                type="text"
                value={element.content.title || ''}
                onChange={(e) => updateElement(element.id, 'title', e.target.value)}
                placeholder="Enter video title"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video Source</label>
              <select
                value={element.content.videoSource || 'custom'}
                onChange={(e) => updateElement(element.id, 'videoSource', e.target.value as VideoSource)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="custom">Custom URL</option>
                <option value="vimeo">Vimeo</option>
                <option value="youtube">YouTube</option>
                <option value="tiktok">TikTok</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Video URL</label>
              <input
                type="text"
                value={element.content.videoUrl || ''}
                onChange={(e) => updateElement(element.id, 'videoUrl', e.target.value)}
                placeholder={
                  element.content.videoSource === 'vimeo'
                    ? 'https://vimeo.com/...'
                    : element.content.videoSource === 'youtube'
                    ? 'https://youtube.com/...'
                    : element.content.videoSource === 'tiktok'
                    ? 'https://tiktok.com/...'
                    : 'Enter video URL'
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Orientation</label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateElement(element.id, 'videoOrientation', 'vertical')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    element.content.videoOrientation === 'vertical'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Vertical
                </button>
                <button
                  onClick={() => updateElement(element.id, 'videoOrientation', 'horizontal')}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                    element.content.videoOrientation === 'horizontal'
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-200 text-slate-700'
                  }`}
                >
                  Horizontal
                </button>
              </div>
            </div>
          </div>
        )}

        {element.type === 'cta' && (
          <div className="space-y-4">
            {/* CTA Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">CTA Title</label>
              <input
                type="text"
                value={element.content.title || ''}
                onChange={(e) => updateElement(element.id, 'title', e.target.value)}
                placeholder="e.g., Ready for Your Adventure?"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* CTA Emoji/Icon */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Emoji/Icon</label>
              <input
                type="text"
                value={element.content.emoji || ''}
                onChange={(e) => updateElement(element.id, 'emoji', e.target.value)}
                placeholder="e.g., 🚀 or 🌴"
                maxLength={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* CTA Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
              <textarea
                value={element.content.description || ''}
                onChange={(e) => updateElement(element.id, 'description', e.target.value)}
                placeholder="Enter CTA description text"
                rows={3}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* CTA Buttons */}
            <div className="border-t border-slate-200 pt-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-xs font-semibold text-slate-700">Action Buttons</label>
                <button
                  onClick={() => {
                    const buttons = element.content.buttons || [];
                    const newButton: CTAButton = {
                      id: `btn-${Date.now()}`,
                      text: 'New Button',
                      link: '/tours',
                      variant: 'primary'
                    };
                    updateElement(element.id, 'buttons', [...buttons, newButton]);
                  }}
                  className="px-2 py-1 bg-teal-500 hover:bg-teal-600 text-white rounded text-xs font-semibold transition"
                >
                  + Add Button
                </button>
              </div>

              {element.content.buttons && element.content.buttons.length > 0 ? (
                <div className="space-y-3">
                  {element.content.buttons.map((button, btnIdx) => (
                    <div key={button.id} className="bg-slate-50 p-3 rounded-lg space-y-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={button.text}
                          onChange={(e) => {
                            const buttons = [...(element.content.buttons || [])];
                            buttons[btnIdx] = { ...button, text: e.target.value };
                            updateElement(element.id, 'buttons', buttons);
                          }}
                          placeholder="Button text"
                          className="flex-1 rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                        />
                        <button
                          onClick={() => {
                            const buttons = element.content.buttons?.filter((_, i) => i !== btnIdx) || [];
                            updateElement(element.id, 'buttons', buttons);
                          }}
                          className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-xs font-semibold transition"
                        >
                          Delete
                        </button>
                      </div>

                      <input
                        type="text"
                        value={button.link}
                        onChange={(e) => {
                          const buttons = [...(element.content.buttons || [])];
                          buttons[btnIdx] = { ...button, link: e.target.value };
                          updateElement(element.id, 'buttons', buttons);
                        }}
                        placeholder="Link (e.g., /tours or https://...)"
                        className="w-full rounded border border-slate-200 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
                      />

                      <div className="flex gap-2">
                        {(['primary', 'secondary', 'outline'] as const).map((variant) => (
                          <button
                            key={variant}
                            onClick={() => {
                              const buttons = [...(element.content.buttons || [])];
                              buttons[btnIdx] = { ...button, variant };
                              updateElement(element.id, 'buttons', buttons);
                            }}
                            className={`flex-1 px-2 py-1 rounded text-xs font-semibold transition ${
                              button.variant === variant
                                ? `${
                                    variant === 'primary'
                                      ? 'bg-teal-600 text-white'
                                      : variant === 'secondary'
                                      ? 'bg-slate-600 text-white'
                                      : 'bg-slate-300 text-slate-700'
                                  }`
                                : 'bg-slate-200 text-slate-600'
                            }`}
                          >
                            {variant.charAt(0).toUpperCase() + variant.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic">No buttons yet. Click "Add Button" to create one.</p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 md:py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-lg">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-4">Welcome Story Admin</h1>

          {/* Language Toggle */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setLocale('en')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                locale === 'en'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              English
            </button>
            <button
              onClick={() => setLocale('es')}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
                locale === 'es'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}
            >
              Español
            </button>
          </div>

          {/* Status Messages */}
          {message && (
            <div
              className={`mb-4 px-4 py-3 rounded-lg text-sm font-semibold ${
                message.type === 'success'
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-red-100 text-red-800 border border-red-300'
              }`}
            >
              {message.text}
            </div>
          )}
        </div>

        {/* Story Title & Tagline */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-lg space-y-4">
          <h2 className="text-xl font-bold text-slate-900">Story Header</h2>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Story Title</label>
            <input
              type="text"
              value={storyData.storyTitle}
              onChange={(e) => setStoryData({ ...storyData, storyTitle: e.target.value })}
              placeholder="Enter main title"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Story Tagline</label>
            <input
              type="text"
              value={storyData.storyTagline}
              onChange={(e) => setStoryData({ ...storyData, storyTagline: e.target.value })}
              placeholder="Enter tagline"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
        </div>

        {/* Add Element Buttons */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-lg">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Add New Element</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-3">
            {(['title', 'paragraph', 'picture', 'video', 'cta'] as StoryElementType[]).map((type) => (
              <button
                key={type}
                onClick={() => addElement(type)}
                className="flex items-center justify-center gap-2 px-3 py-3 md:py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-xs md:text-sm transition"
              >
                <FaPlus className="text-lg md:text-base" />
                <span className="hidden md:inline">{type === 'title' ? 'Title' : type === 'paragraph' ? 'Text' : type === 'picture' ? 'Image' : type === 'video' ? 'Video' : 'CTA'}</span>
                <span className="md:hidden">{type.charAt(0).toUpperCase()}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Story Elements */}
        <div className="bg-white rounded-3xl p-4 md:p-6 shadow-lg space-y-3">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Story Elements ({storyData.elements.length})</h2>

          {storyData.elements.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No elements yet. Add one to get started!</p>
          ) : (
            <div className="space-y-3">
              {storyData.elements.map((element, index) => (
                <div key={element.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  {/* Element Header */}
                  <button
                    onClick={() =>
                      setExpandedElement(expandedElement === element.id ? null : element.id)
                    }
                    className="w-full px-4 py-3 md:py-4 bg-slate-50 hover:bg-slate-100 transition flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-xl">{elementTypeIcon(element.type)}</span>
                      <div className="text-left min-w-0 flex-1">
                        <p className="text-xs md:text-sm text-slate-500 font-semibold">
                          #{index + 1} {element.type.toUpperCase()}
                        </p>
                        <p className="text-sm md:text-base font-semibold text-slate-900 truncate">
                          {element.content.title ||
                            element.content.text?.substring(0, 40) ||
                            'Untitled'}
                        </p>
                      </div>
                    </div>
                    <span className="text-slate-400 text-lg ml-2 flex-shrink-0">
                      {expandedElement === element.id ? '▼' : '▶'}
                    </span>
                  </button>

                  {/* Expanded Content */}
                  {expandedElement === element.id && (
                    <div className="border-t border-slate-200 px-4 py-4 space-y-4 bg-white">
                      {/* Element Editor */}
                      {renderElementEditor(element)}

                      {/* Actions */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200">
                        <button
                          onClick={() => moveElement(element.id, 'up')}
                          disabled={index === 0}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-slate-100 text-blue-700 disabled:text-slate-400 rounded-lg text-sm font-semibold transition"
                        >
                          <FaArrowUp /> Up
                        </button>
                        <button
                          onClick={() => moveElement(element.id, 'down')}
                          disabled={index === storyData.elements.length - 1}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 disabled:bg-slate-100 text-blue-700 disabled:text-slate-400 rounded-lg text-sm font-semibold transition"
                        >
                          <FaArrowDown /> Down
                        </button>
                        <button
                          onClick={() => deleteElement(element.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-semibold transition"
                        >
                          <FaTrash /> Delete
                        </button>
                      </div>

                      {/* Add After */}
                      <div className="pt-2 border-t border-slate-200">
                        <p className="text-xs font-semibold text-slate-600 mb-2">Add element after this</p>
                        <div className="grid grid-cols-2 gap-2">
                          {(['title', 'paragraph', 'picture', 'video', 'cta'] as StoryElementType[]).map((type) => (
                            <button
                              key={`${element.id}-${type}`}
                              onClick={() => addElement(type, element.id)}
                              className="px-2 py-2 bg-teal-100 hover:bg-teal-200 text-teal-700 rounded text-xs font-semibold transition"
                            >
                              + {type === 'cta' ? 'CTA' : type.charAt(0).toUpperCase() + type.slice(1)}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          onClick={saveStory}
          disabled={isSaving}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-teal-400 text-white px-6 py-4 rounded-2xl font-bold text-lg transition shadow-lg"
        >
          {isSaving ? 'Saving...' : 'Save Story'}
        </button>

        {/* JSONBin Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs md:text-sm text-blue-900">
          <p className="font-semibold mb-2">JSONBin Configuration Hint:</p>
          <p className="mb-2">For {locale === 'en' ? 'English' : 'Spanish'} story elements, ensure these env vars are set:</p>
          <code className="block bg-blue-100 p-2 rounded text-xs overflow-x-auto">
            {locale === 'en'
              ? 'VITE_JSONBIN_STORY_ELEMENTS_EN=your_bin_id'
              : 'VITE_JSONBIN_STORY_ELEMENTS_ES=your_bin_id'}
          </code>
        </div>
      </div>
    </div>
  );
};

export default StoryAdmin;
