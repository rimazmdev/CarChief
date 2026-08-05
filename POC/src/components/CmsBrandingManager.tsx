import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { 
  Car, Compass, Anchor, Shield, Zap, Award, Trophy, Globe, Flame, Sparkles, Gauge, Crown, Target,
  Save, Undo, Image as ImageIcon, Code, Check
} from 'lucide-react';
import { BrandingSettings, defaultBranding } from '../types';

interface CmsBrandingManagerProps {
  branding?: BrandingSettings;
  onUpdateBranding?: (updatedBranding: BrandingSettings) => Promise<void>;
}

const PRESET_ICONS = [
  { name: 'Car', label: 'Car' },
  { name: 'Compass', label: 'Compass' },
  { name: 'Anchor', label: 'Anchor' },
  { name: 'Shield', label: 'Shield' },
  { name: 'Zap', label: 'Lightning' },
  { name: 'Award', label: 'Award' },
  { name: 'Trophy', label: 'Trophy' },
  { name: 'Globe', label: 'Globe' },
  { name: 'Flame', label: 'Flame' },
  { name: 'Sparkles', label: 'Sparkles' },
  { name: 'Gauge', label: 'Speedometer' },
  { name: 'Crown', label: 'Crown' },
  { name: 'Target', label: 'Target' }
];

const PRESET_BG_COLORS = [
  { hex: '#dc2626', name: 'Crimson Red' },
  { hex: '#ea580c', name: 'Sleek Orange' },
  { hex: '#ca8a04', name: 'Luxury Gold' },
  { hex: '#16a34a', name: 'Emerald Green' },
  { hex: '#2563eb', name: 'Royal Blue' },
  { hex: '#4f46e5', name: 'Indigo Aura' },
  { hex: '#171717', name: 'Matte Charcoal' },
  { hex: '#7c3aed', name: 'Imperial Violet' }
];

export default function CmsBrandingManager({
  branding = defaultBranding,
  onUpdateBranding
}: CmsBrandingManagerProps) {
  const [logoType, setLogoType] = useState<'icon' | 'image' | 'svg'>(branding.logoType || 'icon');
  const [logoIcon, setLogoIcon] = useState<string>(branding.logoIcon || 'Car');
  const [logoBgColor, setLogoBgColor] = useState<string>(branding.logoBgColor || '#dc2626');
  const [logoIconColor, setLogoIconColor] = useState<string>(branding.logoIconColor || '#ffffff');
  const [logoImageUrl, setLogoImageUrl] = useState<string>(branding.logoImageUrl || '');
  const [logoSvgCode, setLogoSvgCode] = useState<string>(branding.logoSvgCode || '');

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [dragActive, setDragActive] = useState(false);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processFile(file);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError("Please upload a valid image file (PNG, JPG, SVG, WebP, GIF).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // SVGs don't need resizing and should be loaded directly
      if (file.type === 'image/svg+xml') {
        setLogoImageUrl(result);
        setLogoType('image');
        setSuccess("SVG Logo successfully uploaded! Click 'Save Logo' to save changes.");
        return;
      }

      // Create an image element to resize non-SVG images to fit inside Firestore safely
      const img = new Image();
      img.onload = () => {
        const maxDimension = 256; // Excellent size for header brand logos
        let width = img.width;
        let height = img.height;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png');
          setLogoImageUrl(compressedDataUrl);
          setLogoType('image');
          setSuccess("Logo successfully uploaded & optimized! Click 'Save Logo' above to persist.");
        } else {
          setLogoImageUrl(result);
          setLogoType('image');
          setSuccess("Logo successfully loaded! Click 'Save Logo' above to persist.");
        }
      };
      img.onerror = () => {
        setLogoImageUrl(result);
        setLogoType('image');
        setSuccess("Logo successfully loaded! Click 'Save Logo' above to persist.");
      };
      img.src = result;
    };
    reader.onerror = () => {
      setError("Failed to read the file.");
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSave = async () => {
    if (!onUpdateBranding) return;
    setSaving(true);
    setSuccess(null);
    setError(null);

    const updated: BrandingSettings = {
      logoType,
      logoIcon,
      logoColor: 'bg-red-600', // legacy property preservation
      logoBgColor,
      logoIconColor,
      logoImageUrl,
      logoSvgCode
    };

    try {
      await onUpdateBranding(updated);
      setSuccess("Branding settings saved and updated successfully across all views!");
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save branding configurations. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to revert all branding back to default settings?")) {
      setLogoType(defaultBranding.logoType);
      setLogoIcon(defaultBranding.logoIcon);
      setLogoBgColor(defaultBranding.logoBgColor);
      setLogoIconColor(defaultBranding.logoIconColor);
      setLogoImageUrl(defaultBranding.logoImageUrl);
      setLogoSvgCode(defaultBranding.logoSvgCode);
    }
  };

  const renderPreviewLogo = (isMobile = false) => {
    const sizeClass = isMobile ? 'w-8 h-8 rounded-lg' : 'w-12 h-12 rounded-xl';
    const iconSizeClass = isMobile ? 'w-4 h-4' : 'w-6 h-6';

    if (logoType === 'image' && logoImageUrl) {
      return (
        <div className={`relative ${sizeClass} overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center`}>
          <img src={logoImageUrl} alt="Logo Preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
        </div>
      );
    }

    if (logoType === 'svg' && logoSvgCode) {
      return (
        <div 
          className={`relative ${sizeClass} overflow-hidden flex items-center justify-center p-1.5`}
          style={{ backgroundColor: logoBgColor }}
          dangerouslySetInnerHTML={{ __html: logoSvgCode }}
        />
      );
    }

    // Default Predefined Icon
    const IconComponent = (Icons as any)[logoIcon] || Car;
    return (
      <div 
        className={`relative flex items-center justify-center shadow-lg ${sizeClass}`}
        style={{ backgroundColor: logoBgColor }}
      >
        <IconComponent className={iconSizeClass} style={{ color: logoIconColor }} />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-neutral-100 shadow-md p-6" id="branding-cms-manager">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-neutral-100 pb-5 mb-6">
        <div>
          <span className="text-[10px] uppercase font-mono font-bold tracking-widest text-red-500">
            System Branding Console
          </span>
          <h2 className="text-xl font-black uppercase tracking-tight text-neutral-900 font-display">
            Project Logo CMS
          </h2>
          <p className="text-xs text-neutral-500">
            Customize the official CarChief brand logo icon or image displayed on the global header.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5 cursor-pointer"
          >
            <Undo className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all duration-200 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-md"
          >
            {saving ? (
              <Icons.RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : 'Save Logo'}
          </button>
        </div>
      </div>

      {success && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
          <Check className="w-4 h-4 shrink-0 text-green-600" />
          <span className="font-mono font-semibold">{success}</span>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2 animate-in fade-in duration-300">
          <Check className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-mono font-semibold">{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Configuration Panel */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Logo Type Selector */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500">
              1. Select Logo Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setLogoType('icon')}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  logoType === 'icon'
                    ? 'border-red-500 bg-red-50/20 text-red-600 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                <Car className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Predefined Icon</span>
              </button>

              <button
                onClick={() => setLogoType('image')}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  logoType === 'image'
                    ? 'border-red-500 bg-red-50/20 text-red-600 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                <ImageIcon className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Custom Image URL</span>
              </button>

              <button
                onClick={() => setLogoType('svg')}
                className={`p-4 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center gap-2 ${
                  logoType === 'svg'
                    ? 'border-red-500 bg-red-50/20 text-red-600 font-bold'
                    : 'border-neutral-200 hover:border-neutral-300 bg-white text-neutral-600'
                }`}
              >
                <Code className="w-5 h-5" />
                <span className="text-[10px] font-mono uppercase tracking-wider">Custom SVG Code</span>
              </button>
            </div>
          </div>

          {/* Option-Specific Inputs */}
          {logoType === 'icon' && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Icon Picker Grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Select Icon Symbol
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 gap-2">
                  {PRESET_ICONS.map((item) => {
                    const PresetComponent = (Icons as any)[item.name] || Car;
                    const isSelected = logoIcon === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => setLogoIcon(item.name)}
                        className={`p-3 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white font-bold'
                            : 'border-neutral-150 hover:border-neutral-300 text-neutral-600 hover:bg-neutral-50'
                        }`}
                        title={item.label}
                      >
                        <PresetComponent className="w-5 h-5" />
                        <span className="text-[8px] font-mono tracking-tighter truncate w-full text-center">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Background Color Picker */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                    Background Color Presets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_BG_COLORS.map((col) => (
                      <button
                        key={col.hex}
                        onClick={() => setLogoBgColor(col.hex)}
                        className="w-8 h-8 rounded-full border border-neutral-200 transition-all hover:scale-110 flex items-center justify-center cursor-pointer shadow-sm"
                        style={{ backgroundColor: col.hex }}
                        title={col.name}
                      >
                        {logoBgColor.toLowerCase() === col.hex.toLowerCase() && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                    Custom Colors
                  </label>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={logoBgColor} 
                        onChange={(e) => setLogoBgColor(e.target.value)}
                        className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0"
                      />
                      <span className="text-[10px] font-mono uppercase font-bold text-neutral-700">{logoBgColor}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <input 
                        type="color" 
                        value={logoIconColor} 
                        onChange={(e) => setLogoIconColor(e.target.value)}
                        className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0"
                      />
                      <span className="text-[10px] font-mono uppercase font-bold text-neutral-700">Icon: {logoIconColor}</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {logoType === 'image' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Drag and Drop Zone */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Upload Custom Logo File
                </label>
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all duration-200 relative flex flex-col items-center justify-center gap-3 ${
                    dragActive 
                      ? "border-red-500 bg-red-50/15" 
                      : logoImageUrl && logoImageUrl.startsWith('data:image')
                        ? "border-green-500/50 bg-green-50/5"
                        : "border-neutral-200 bg-neutral-50/50 hover:bg-neutral-50 hover:border-neutral-300"
                  }`}
                >
                  <input
                    type="file"
                    id="logo-file-input"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                  />

                  {logoImageUrl && logoImageUrl.startsWith('data:image') ? (
                    <>
                      <div className="w-16 h-16 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-900 flex items-center justify-center shadow-md">
                        <img src={logoImageUrl} alt="Uploaded logo preview" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      </div>
                      <div className="text-xs text-neutral-700">
                        <p className="font-bold text-green-600">Active Custom File Logo Loaded</p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-0.5">Size: {Math.round(logoImageUrl.length * 0.75 / 1024)} KB (optimized)</p>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <label
                          htmlFor="logo-file-input"
                          className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-750 text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-all"
                        >
                          Change File
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setLogoImageUrl('');
                            setSuccess("Uploaded logo removed. Resetting back to default icon.");
                          }}
                          className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-[10px] font-mono font-bold uppercase rounded-lg cursor-pointer transition-all flex items-center gap-1"
                        >
                          <Icons.Trash2 className="w-3 h-3" />
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                        <Icons.Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs text-neutral-600">
                        <p className="font-semibold text-neutral-800">
                          Drag &amp; drop your logo file here, or{' '}
                          <label htmlFor="logo-file-input" className="text-red-500 hover:text-red-600 font-bold underline cursor-pointer">
                            browse
                          </label>
                        </p>
                        <p className="text-[10px] text-neutral-400 font-mono mt-1">
                          PNG, JPG, SVG, WebP, GIF accepted. Autoscaled and optimized on import.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* URL fallback option */}
              <div className="space-y-1 pt-2 border-t border-neutral-100">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Or Paste Custom Logo Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logoImageUrl && !logoImageUrl.startsWith('data:image') ? logoImageUrl : ''}
                    onChange={(e) => {
                      setLogoImageUrl(e.target.value);
                      setLogoType('image');
                    }}
                    placeholder="https://example.com/assets/logo.png"
                    className="flex-1 bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs font-mono p-3 rounded-xl outline-none transition-all"
                  />
                  {logoImageUrl && !logoImageUrl.startsWith('data:image') && (
                    <button
                      type="button"
                      onClick={() => setLogoImageUrl('')}
                      className="px-3 bg-neutral-100 hover:bg-neutral-200 text-neutral-750 rounded-xl transition-all"
                      title="Clear URL"
                    >
                      <Icons.X className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-neutral-400 font-mono">
                  Provide an absolute online image link. Transparent PNG/SVG format looks best.
                </p>
              </div>
            </div>
          )}

          {logoType === 'svg' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  Raw SVG Code / Paths
                </label>
                <textarea
                  value={logoSvgCode}
                  onChange={(e) => setLogoSvgCode(e.target.value)}
                  placeholder="&lt;svg viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot;&gt;...&lt;/svg&gt;"
                  rows={6}
                  className="w-full bg-neutral-50 border border-neutral-200 focus:border-red-500 focus:bg-white text-xs font-mono p-3 rounded-xl outline-none transition-all resize-y"
                />
                <p className="text-[10px] text-neutral-400 font-mono">
                  Paste clean, valid SVG XML code. Do not include style tags or classes that break color inheritance.
                </p>
              </div>

              {/* Background Color for SVG container */}
              <div className="space-y-2">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-neutral-500 block">
                  SVG Container Background Color
                </label>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <input 
                      type="color" 
                      value={logoBgColor} 
                      onChange={(e) => setLogoBgColor(e.target.value)}
                      className="w-8 h-8 rounded border border-neutral-300 cursor-pointer p-0"
                    />
                    <span className="text-[10px] font-mono uppercase font-bold text-neutral-700">{logoBgColor}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Live Preview Panel */}
        <div className="lg:col-span-4 bg-neutral-900 rounded-2xl p-6 border border-neutral-800 text-white flex flex-col justify-between">
          <div className="space-y-6">
            <div>
              <span className="text-[9px] uppercase font-mono font-bold tracking-widest text-neutral-400 block mb-1">
                Real-time Sandbox
              </span>
              <h3 className="text-sm font-bold uppercase tracking-wider font-display border-b border-neutral-800 pb-2.5 mb-4">
                Interactive Preview
              </h3>
            </div>

            {/* Desktop Preview */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest">
                Desktop Layout Rendering
              </span>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {renderPreviewLogo(false)}
                  <span className="text-base font-display font-black tracking-tight text-white uppercase">
                    CAR<span className="text-red-500">CHIEF</span>
                  </span>
                </div>
                <span className="text-[8px] font-mono text-neutral-500 border border-neutral-850 px-2 py-0.5 rounded uppercase">
                  Header
                </span>
              </div>
            </div>

            {/* Mobile Drawer Preview */}
            <div className="space-y-2">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest block">
                Mobile Drawer Rendering
              </span>
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-850 flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  {renderPreviewLogo(true)}
                  <span className="text-sm font-display font-black tracking-tight text-white uppercase">
                    CAR<span className="text-red-500">CHIEF</span>
                  </span>
                </div>
                <span className="text-[8px] font-mono text-neutral-500 border border-neutral-850 px-2 py-0.5 rounded uppercase">
                  Drawer
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-neutral-800 text-[10px] text-neutral-400 font-mono leading-relaxed">
            Verify layout spacing and color contrasts. All changes sync dynamically across every active viewing viewport after saving.
          </div>
        </div>

      </div>
    </div>
  );
}
