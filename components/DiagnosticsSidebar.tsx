import React, { useEffect, useState, useRef } from 'react';
import { AsciiOptions } from '../types';
import { Terminal } from 'lucide-react';

interface DiagnosticsSidebarProps {
  options: AsciiOptions;
  isAnalyzing: boolean;
}

export const DiagnosticsSidebar: React.FC<DiagnosticsSidebarProps> = ({ options, isAnalyzing }) => {
  const [logs, setLogs] = useState<string[]>([
    "SYS.INIT // ASCII_DARSHAN CORE LOADED",
    "KERNEL.OK // NEURAL NET ACQUIRED",
    "VIDEO.FEED // WEBCAM SYNC STABLE",
  ]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to add a log line
  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-40), `[${timestamp}] ${message}`]);
  };

  // Log option changes
  useEffect(() => {
    addLog(`CONFIG_CHANGED // FONT_SIZE: ${options.fontSize}px`);
  }, [options.fontSize]);

  useEffect(() => {
    addLog(`GAIN_ADJUSTED // VALUE: ${options.brightness.toFixed(2)}`);
  }, [options.brightness]);

  useEffect(() => {
    addLog(`CONTRAST_ADJUSTED // VALUE: ${options.contrast.toFixed(2)}`);
  }, [options.contrast]);

  useEffect(() => {
    addLog(`COLOR_PALETTE // ACTIVE: ${options.colorMode.toUpperCase()}`);
  }, [options.colorMode]);

  useEffect(() => {
    addLog(`CHARSET_LOADED // TYPE: ${options.density.toUpperCase()}`);
  }, [options.density]);

  useEffect(() => {
    addLog(`IMAGE_STRETCH // AUTO_GAIN: ${options.autoEnhance ? "ON" : "OFF"}`);
  }, [options.autoEnhance]);

  useEffect(() => {
    addLog(`GRADIENT_SOBEL // EDGES: ${options.edgeDetection ? "ON" : "OFF"}`);
  }, [options.edgeDetection]);

  // Log scan state
  useEffect(() => {
    if (isAnalyzing) {
      addLog("NEURAL_SCAN // INITIATING PACKET UPLOAD...");
      addLog("LOCK_ON // ACQUIRING BIOMETRIC VECTOR DATA...");
    } else if (logs.length > 3) {
      addLog("NEURAL_SCAN // PROCESS COMPLETED. DATA DECRYPTED.");
    }
  }, [isAnalyzing]);

  // Auto scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div className="w-80 h-full bg-black/90 border-l border-green-900/50 backdrop-blur-md p-4 hidden md:flex flex-col gap-4 font-mono z-20">
      <div className="flex items-center gap-2 text-green-500 border-b border-green-900/30 pb-2">
        <Terminal className="w-4 h-4 animate-pulse" />
        <h3 className="text-sm font-bold uppercase tracking-wider">Diagnostic Feed</h3>
      </div>
      
      {/* Scrollable log feed */}
      <div 
        ref={containerRef}
        className="flex-grow overflow-y-auto space-y-2 text-[10px] text-green-600 leading-relaxed scrollbar-thin select-none"
      >
        {logs.map((log, index) => (
          <div key={index} className="hover:text-green-400 transition-colors duration-100">
            {log}
          </div>
        ))}
      </div>

      <div className="border-t border-green-900/30 pt-2 text-[10px] text-green-800 space-y-1">
        <div className="flex justify-between">
          <span>MEM.BUFFER:</span>
          <span>98.2% READY</span>
        </div>
        <div className="flex justify-between">
          <span>FPS.STABLE:</span>
          <span>60.0 FPS</span>
        </div>
      </div>
    </div>
  );
};
