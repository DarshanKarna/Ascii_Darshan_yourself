import React, { useRef } from 'react';
import { AsciiOptions, DENSITY_MAPS } from '../types';
import { Sliders, Monitor, Type, Palette, Upload, RotateCcw } from 'lucide-react';
import { playButtonSound, playStartupSound } from '../utils/soundEffects';

interface ControlPanelProps {
  options: AsciiOptions;
  setOptions: React.Dispatch<React.SetStateAction<AsciiOptions>>;
  uploadedImage: HTMLImageElement | null;
  setUploadedImage: (img: HTMLImageElement | null) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({ options, setOptions, uploadedImage, setUploadedImage }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (key: keyof AsciiOptions, value: any) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleModeChange = (key: keyof AsciiOptions, value: any) => {
      playButtonSound();
      handleChange(key, value);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          setUploadedImage(img);
          playStartupSound();
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="absolute bottom-0 w-full bg-black/80 border-t border-green-900/50 backdrop-blur-sm p-4 z-30 transition-all duration-300">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-6 justify-center items-center text-green-500 text-xs font-mono">
        
        {/* Input Source (Upload/Camera Toggle) */}
        <div className="flex flex-col gap-2">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleFileUpload} 
            />
            <div className="flex items-center gap-2">
                <Upload className="w-3 h-3 animate-pulse" />
                <span>INPUT FEED</span>
            </div>
            {uploadedImage ? (
                <button
                    onClick={() => { setUploadedImage(null); playStartupSound(); }}
                    className="px-2 py-1 border border-red-500/50 bg-red-900/20 text-red-400 hover:border-red-500 hover:bg-red-500/20 text-[10px] uppercase tracking-wider transition-colors duration-150 flex items-center gap-1.5 font-bold"
                >
                    <RotateCcw className="w-3 h-3" />
                    <span>USE LIVE CAMERA</span>
                </button>
            ) : (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2 py-1 border border-green-500/50 bg-green-900/20 text-green-400 hover:border-green-500 hover:bg-green-500/20 text-[10px] uppercase tracking-wider transition-colors duration-150 flex items-center gap-1.5 font-bold shadow-[0_0_8px_rgba(0,255,0,0.1)]"
                >
                    <Upload className="w-3 h-3" />
                    <span>UPLOAD FILES</span>
                </button>
            )}
        </div>

        {/* Font Size */}
        <div className="flex flex-col gap-1 w-32">
          <div className="flex items-center gap-2 mb-1">
             <Type className="w-3 h-3" />
             <label>FONT SIZE: {options.fontSize}px</label>
          </div>
          <input 
            type="range" 
            min="6" 
            max="24" 
            value={options.fontSize} 
            onChange={(e) => handleChange('fontSize', Number(e.target.value))}
            className="accent-green-500 h-1 bg-green-900 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Brightness */}
        <div className="flex flex-col gap-1 w-32">
           <div className="flex items-center gap-2 mb-1">
             <Sliders className="w-3 h-3" />
             <label>GAIN: {options.brightness.toFixed(1)}</label>
           </div>
          <input 
            type="range" 
            min="0.5" 
            max="2.0" 
            step="0.1" 
            value={options.brightness} 
            onChange={(e) => handleChange('brightness', Number(e.target.value))}
            className="accent-green-500 h-1 bg-green-900 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Contrast */}
        <div className="flex flex-col gap-1 w-32">
           <div className="flex items-center gap-2 mb-1">
             <Monitor className="w-3 h-3" />
             <label>CONTRAST: {options.contrast.toFixed(1)}</label>
           </div>
          <input 
            type="range" 
            min="0.5" 
            max="3.0" 
            step="0.1" 
            value={options.contrast} 
            onChange={(e) => handleChange('contrast', Number(e.target.value))}
            className="accent-green-500 h-1 bg-green-900 rounded-lg appearance-none cursor-pointer"
          />
        </div>

        {/* Color Mode */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Palette className="w-3 h-3" />
                <span>MODE</span>
            </div>
            <div className="flex gap-1">
                {(['matrix', 'bw', 'retro', 'color'] as const).map(mode => (
                    <button
                        key={mode}
                        onClick={() => handleModeChange('colorMode', mode)}
                        className={`px-2 py-1 border ${options.colorMode === mode ? 'bg-green-500 text-black border-green-500' : 'bg-transparent border-green-800 text-green-700 hover:border-green-500'} text-[10px] uppercase transition-colors`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>

        {/* Density Map */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Type className="w-3 h-3" />
                <span>CHARSET</span>
            </div>
            <div className="flex gap-1">
                {(Object.keys(DENSITY_MAPS) as Array<keyof typeof DENSITY_MAPS>).map(mode => (
                    <button
                        key={mode}
                        onClick={() => handleModeChange('density', mode)}
                        className={`px-2 py-1 border ${options.density === mode ? 'bg-green-500 text-black border-green-500' : 'bg-transparent border-green-800 text-green-700 hover:border-green-500'} text-[10px] uppercase transition-colors`}
                    >
                        {mode}
                    </button>
                ))}
            </div>
        </div>
        {/* Auto Enhance */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Sliders className="w-3 h-3" />
                <span>ENHANCE</span>
            </div>
            <button
                onClick={() => handleModeChange('autoEnhance', !options.autoEnhance)}
                className={`px-2 py-1 border ${options.autoEnhance ? 'bg-green-500 text-black border-green-500' : 'bg-transparent border-green-800 text-green-700 hover:border-green-500'} text-[10px] uppercase transition-colors`}
            >
                {options.autoEnhance ? 'AUTO: ON' : 'AUTO: OFF'}
            </button>
        </div>

        {/* Edge Detection */}
        <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
                <Sliders className="w-3 h-3" />
                <span>EDGES</span>
            </div>
            <button
                onClick={() => handleModeChange('edgeDetection', !options.edgeDetection)}
                className={`px-2 py-1 border ${options.edgeDetection ? 'bg-green-500 text-black border-green-500' : 'bg-transparent border-green-800 text-green-700 hover:border-green-500'} text-[10px] uppercase transition-colors`}
            >
                {options.edgeDetection ? 'EDGES: ON' : 'EDGES: OFF'}
            </button>
        </div>

      </div>
    </div>
  );
};