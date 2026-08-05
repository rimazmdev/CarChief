/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { 
  ImageIcon, RefreshCw, Sparkles, X, ChevronLeft, ChevronRight, 
  Eye, EyeOff, UploadCloud, ClipboardList, CheckSquare, Square
} from 'lucide-react';

interface CategorizedImageManagerProps {
  auctionPictures: string[];
  auctionSheet: string[];
  japanPictures: string[];
  durbanPictures: string[];
  showAuctionPictures: boolean;
  showJapanPictures: boolean;
  showDurbanPictures: boolean;
  onChange: (updated: {
    auctionPictures: string[];
    auctionSheet: string[];
    japanPictures: string[];
    durbanPictures: string[];
    showAuctionPictures: boolean;
    showJapanPictures: boolean;
    showDurbanPictures: boolean;
  }) => void;
  onGeneratePresets?: (type: 'sports' | 'suv' | 'luxury') => void;
}

type PictureCategory = 'auctionPictures' | 'auctionSheet' | 'japanPictures' | 'durbanPictures';

export default function CategorizedImageManager({
  auctionPictures = [],
  auctionSheet = [],
  japanPictures = [],
  durbanPictures = [],
  showAuctionPictures = true,
  showJapanPictures = true,
  showDurbanPictures = true,
  onChange,
  onGeneratePresets
}: CategorizedImageManagerProps) {
  const [activeTab, setActiveTab] = useState<PictureCategory>('auctionPictures');
  const [dragActive, setDragActive] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [isCompressing, setIsCompressing] = useState(false);

  const getCategoryDetails = (category: PictureCategory) => {
    switch (category) {
      case 'auctionPictures':
        return {
          title: 'Auction Pictures',
          description: 'Sourced pictures from the Japan auction block.',
          images: auctionPictures,
          showOnDetail: showAuctionPictures,
          toggleKey: 'showAuctionPictures',
          allowsPublicToggle: true,
        };
      case 'auctionSheet':
        return {
          title: 'Auction Sheet',
          description: 'Official auction grade sheet. ALWAYS HIDDEN from public/customer page.',
          images: auctionSheet,
          showOnDetail: false,
          toggleKey: '',
          allowsPublicToggle: false,
        };
      case 'japanPictures':
        return {
          title: 'Japan Pictures',
          description: 'Yard pictures from the Japanese holding/export yard.',
          images: japanPictures,
          showOnDetail: showJapanPictures,
          toggleKey: 'showJapanPictures',
          allowsPublicToggle: true,
        };
      case 'durbanPictures':
        return {
          title: 'Durban Pictures',
          description: 'Port and holding yard pictures taken upon arrival in Durban, South Africa.',
          images: durbanPictures,
          showOnDetail: showDurbanPictures,
          toggleKey: 'showDurbanPictures',
          allowsPublicToggle: true,
        };
    }
  };

  const activeDetails = getCategoryDetails(activeTab);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const readImage = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve(event.target?.result as string);
      };
      reader.onerror = () => {
        resolve("");
      };
      reader.readAsDataURL(file);
    });
  };

  const processFiles = async (files: FileList) => {
    const fileArray = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (fileArray.length === 0) return;

    setIsCompressing(true);
    try {
      const originalImages = await Promise.all(
        fileArray.map(file => readImage(file))
      );
      const validImages = originalImages.filter(img => img !== "");
      
      const currentImages = activeDetails.images;
      updateCategoryImages(activeTab, [...currentImages, ...validImages]);
    } catch (err) {
      console.error("Error reading image:", err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files);
      e.target.value = '';
    }
  };

  const addUrl = () => {
    const trimmed = urlInput.trim();
    if (trimmed && !activeDetails.images.includes(trimmed)) {
      updateCategoryImages(activeTab, [...activeDetails.images, trimmed]);
      setUrlInput('');
    }
  };

  const updateCategoryImages = (category: PictureCategory, images: string[]) => {
    onChange({
      auctionPictures,
      auctionSheet,
      japanPictures,
      durbanPictures,
      showAuctionPictures,
      showJapanPictures,
      showDurbanPictures,
      [category]: images
    });
  };

  const toggleDisplaySetting = (key: string) => {
    if (!key) return;
    onChange({
      auctionPictures,
      auctionSheet,
      japanPictures,
      durbanPictures,
      showAuctionPictures,
      showJapanPictures,
      showDurbanPictures,
      [key]: !((this as any) || {
        showAuctionPictures,
        showJapanPictures,
        showDurbanPictures
      } as any)[key]
    });
  };

  const handleCheckboxToggle = (key: 'showAuctionPictures' | 'showJapanPictures' | 'showDurbanPictures') => {
    onChange({
      auctionPictures,
      auctionSheet,
      japanPictures,
      durbanPictures,
      showAuctionPictures: key === 'showAuctionPictures' ? !showAuctionPictures : showAuctionPictures,
      showJapanPictures: key === 'showJapanPictures' ? !showJapanPictures : showJapanPictures,
      showDurbanPictures: key === 'showDurbanPictures' ? !showDurbanPictures : showDurbanPictures,
    });
  };

  const moveLeft = (idx: number) => {
    if (idx === 0) return;
    const next = [...activeDetails.images];
    const temp = next[idx];
    next[idx] = next[idx - 1];
    next[idx - 1] = temp;
    updateCategoryImages(activeTab, next);
  };

  const moveRight = (idx: number) => {
    if (idx === activeDetails.images.length - 1) return;
    const next = [...activeDetails.images];
    const temp = next[idx];
    next[idx] = next[idx + 1];
    next[idx + 1] = temp;
    updateCategoryImages(activeTab, next);
  };

  const removeImage = (idx: number) => {
    const next = activeDetails.images.filter((_, i) => i !== idx);
    updateCategoryImages(activeTab, next);
  };

  const setAsCover = (idx: number) => {
    if (idx === 0) return;
    const next = [...activeDetails.images];
    const item = next.splice(idx, 1)[0];
    next.unshift(item);
    updateCategoryImages(activeTab, next);
  };

  return (
    <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200/80 space-y-5">
      {/* Tabbed Header */}
      <div>
        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-2 font-mono">
          Vehicle Sourced Media Ledger
        </span>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-1 bg-neutral-200/60 p-1 rounded-xl">
          {(['auctionPictures', 'auctionSheet', 'japanPictures', 'durbanPictures'] as PictureCategory[]).map((category) => {
            const count = getCategoryDetails(category).images.length;
            const label = getCategoryDetails(category).title;
            const isSelected = activeTab === category;
            return (
              <button
                key={category}
                type="button"
                onClick={() => setActiveTab(category)}
                className={`py-2 px-3 text-center text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  isSelected 
                    ? 'bg-neutral-900 text-white shadow' 
                    : 'text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100'
                }`}
              >
                <span>{label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-red-600 text-white' : 'bg-neutral-300 text-neutral-700'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* active tab controls & description */}
      <div className="bg-white rounded-xl border border-neutral-200/60 p-4 space-y-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-3 border-b border-neutral-100">
          <div>
            <h4 className="text-xs font-black uppercase text-neutral-800 tracking-wider">
              {activeDetails.title}
            </h4>
            <p className="text-[11px] text-neutral-400 font-medium">
              {activeDetails.description}
            </p>
          </div>

          {/* Visibility toggle check */}
          {activeDetails.allowsPublicToggle && activeDetails.toggleKey && (
            <button
              type="button"
              onClick={() => handleCheckboxToggle(activeDetails.toggleKey as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                activeDetails.showOnDetail 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-neutral-50 border-neutral-200 text-neutral-500'
              }`}
            >
              {activeDetails.showOnDetail ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              <span>{activeDetails.showOnDetail ? 'Visible' : 'Hidden'} on Detail Page</span>
            </button>
          )}

          {!activeDetails.allowsPublicToggle && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-500 bg-red-50 border border-red-100 px-2.5 py-1 rounded">
              Internal Staff Only
            </span>
          )}
        </div>

        {/* Drag & Drop Main Box */}
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-5 transition-all flex flex-col items-center justify-center text-center cursor-pointer ${
            dragActive 
              ? 'border-red-500 bg-red-50/50 scale-[0.99] shadow-inner' 
              : 'border-neutral-300 hover:border-neutral-400 bg-neutral-50/40'
          }`}
        >
          {isCompressing ? (
            <div className="flex flex-col items-center py-2">
              <RefreshCw className="w-8 h-8 mb-2 text-red-600 animate-spin" />
              <p className="text-xs font-semibold text-neutral-800">
                Compressing & optimizing pictures...
              </p>
            </div>
          ) : (
            <>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className={`w-8 h-8 mb-2 transition-transform ${dragActive ? 'text-red-500 scale-110' : 'text-neutral-400'}`} />
              <p className="text-xs font-semibold text-neutral-800">
                Drag & drop {activeDetails.title} here or <span className="text-red-600 underline">browse</span>
              </p>
              <p className="text-[10px] text-neutral-400 mt-0.5">
                PNG, JPG, WEBP • Auto-compressed for performance
              </p>
            </>
          )}
        </div>

        {/* URL Input */}
        <div className="flex gap-2 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200">
          <input
            type="text"
            placeholder={`Paste direct image URL for ${activeDetails.title}...`}
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            className="flex-1 text-xs px-2.5 focus:outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={addUrl}
            className="bg-neutral-900 hover:bg-neutral-800 text-white text-[10px] uppercase font-bold px-3 py-1.5 rounded-md tracking-wider transition-colors"
          >
            Add URL
          </button>
        </div>

        {/* Thumbnail Sequencing Grid */}
        {activeDetails.images.length > 0 ? (
          <div className="space-y-2 pt-2">
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
              Sequencing and cover priority ({activeDetails.images.length} uploaded)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {activeDetails.images.map((img, idx) => (
                <div 
                  key={idx} 
                  className="group relative aspect-[4/3] rounded-lg overflow-hidden bg-neutral-100 border border-neutral-200 shadow-sm flex items-center justify-center"
                >
                  <img 
                    src={img} 
                    alt="Thumbnail" 
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover" 
                  />
                  
                  {/* Indices badge */}
                  <div className="absolute top-1.5 left-1.5 bg-black/75 text-white font-bold font-mono text-[9px] px-1.5 py-0.5 rounded shadow">
                    #{idx + 1}
                  </div>

                  {/* Top-Right Quick Trash */}
                  <button
                    type="button"
                    onClick={() => removeImage(idx)}
                    className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-md shadow opacity-0 group-hover:opacity-100 transition-all duration-150"
                    title="Remove Image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Sequencing overlay controls */}
                  <div className="absolute inset-x-0 bottom-0 bg-black/80 backdrop-blur-xs p-1.5 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveLeft(idx)}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setAsCover(idx)}
                      className={`text-[8px] uppercase tracking-wider font-extrabold px-1.5 py-1 rounded transition-all ${
                        idx === 0 
                          ? 'bg-red-600 text-white' 
                          : 'bg-white hover:bg-neutral-150 text-neutral-800'
                      }`}
                    >
                      {idx === 0 ? 'Cover' : 'Set Cover'}
                    </button>

                    <button
                      type="button"
                      disabled={idx === activeDetails.images.length - 1}
                      onClick={() => moveRight(idx)}
                      className="p-1 bg-neutral-800 hover:bg-neutral-700 text-white rounded disabled:opacity-30 disabled:pointer-events-none"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-neutral-200 rounded-lg bg-neutral-50/50">
            <ImageIcon className="w-6 h-6 text-neutral-300 mx-auto mb-1.5" />
            <p className="text-[11px] font-bold text-neutral-400">
              No pictures uploaded in this ledger category yet.
            </p>
          </div>
        )}
      </div>

      {/* Presets */}
      {onGeneratePresets && activeTab === 'auctionPictures' && (
        <div className="flex flex-wrap items-center gap-2 text-[10px] bg-white p-2 rounded-xl border border-neutral-200/60">
          <span className="text-neutral-400 font-medium">Quick Preset Photo Injectors:</span>
          <button
            type="button"
            onClick={() => onGeneratePresets('sports')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Sports Spec
          </button>
          <button
            type="button"
            onClick={() => onGeneratePresets('suv')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Elite SUV
          </button>
          <button
            type="button"
            onClick={() => onGeneratePresets('luxury')}
            className="bg-red-50 hover:bg-red-100 text-red-600 font-bold px-2 py-1 rounded flex items-center gap-1 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" /> Luxury Sedan
          </button>
        </div>
      )}
    </div>
  );
}
