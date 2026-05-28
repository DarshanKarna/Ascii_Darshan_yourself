import React, { useRef, useEffect, useState } from 'react';
import { AsciiOptions } from '../types';
import { getAsciiChar } from '../utils/asciiConverter';
import { playStartupSound, playScanSound, startAmbientHum, stopAmbientHum, playButtonSound } from '../utils/soundEffects';
import { ScanEye, Camera, Upload, Copy, FileCode, RotateCcw } from 'lucide-react';

interface AsciiCanvasProps {
  options: AsciiOptions;
  onCapture: (imageData: string) => void;
  uploadedImage: HTMLImageElement | null;
  setUploadedImage: (img: HTMLImageElement | null) => void;
}

export const AsciiCanvas: React.FC<AsciiCanvasProps> = ({ options, onCapture, uploadedImage, setUploadedImage }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null); // For processing pixels
  const prevFrameRef = useRef<Float32Array | null>(null); // Store previous frame for smoothing
  const animationRef = useRef<number>();
  const lastAsciiTextRef = useRef<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 640 }, 
            height: { ideal: 480 }, 
            facingMode: 'user' 
          } 
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video actually plays
          await videoRef.current.play().catch(e => console.error("Play error:", e));
          
          // Play sci-fi startup sound when camera is ready
          playStartupSound();
          // Start the continuous background hum
          startAmbientHum();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError("Unable to access camera. Please allow permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      stopAmbientHum();
    };
  }, []);

  // Handle Canvas Resizing
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current) {
            // Check parent size to avoid scrollbar issues, fallback to window
            const parent = canvasRef.current.parentElement;
            if (parent) {
                canvasRef.current.width = parent.clientWidth;
                canvasRef.current.height = parent.clientHeight;
            } else {
                canvasRef.current.width = window.innerWidth;
                canvasRef.current.height = window.innerHeight;
            }
        }
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Reset smoothing buffer when dimensions likely change
    prevFrameRef.current = null;
  }, [options.fontSize]);

  useEffect(() => {
    const renderLoop = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const hiddenCanvas = hiddenCanvasRef.current;
      
      // Check if canvas exists, and either an uploaded image exists or the video is ready
      if (!canvas || !hiddenCanvas || (!uploadedImage && (!video || video.readyState < 2))) {
        animationRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      const ctx = canvas.getContext('2d', { alpha: false });
      const hiddenCtx = hiddenCanvas.getContext('2d', { willReadFrequently: true });

      if (!ctx || !hiddenCtx) {
          animationRef.current = requestAnimationFrame(renderLoop);
          return;
      }

      // Determine processing resolution
      const charHeight = options.fontSize;
      const charWidth = charHeight * 0.6; // Approximation for monospace aspect ratio
      
      const cols = Math.floor(canvas.width / charWidth);
      const rows = Math.floor(canvas.height / charHeight);

      // Safety check for zero dimensions
      if (cols <= 0 || rows <= 0) {
        animationRef.current = requestAnimationFrame(renderLoop);
        return;
      }

      // Set hidden canvas size to the number of chars (cols x rows)
      if (hiddenCanvas.width !== cols || hiddenCanvas.height !== rows) {
        hiddenCanvas.width = cols;
        hiddenCanvas.height = rows;
        prevFrameRef.current = null; // Reset smoothing buffer on resize
      }

      // 1. Draw video/image to small hidden canvas
      if (uploadedImage) {
        hiddenCtx.drawImage(uploadedImage, 0, 0, cols, rows);
      } else if (video) {
        // We flip horizontally for a natural mirror effect
        hiddenCtx.save();
        hiddenCtx.translate(cols, 0);
        hiddenCtx.scale(-1, 1);
        hiddenCtx.drawImage(video, 0, 0, cols, rows);
        hiddenCtx.restore();
      }
      
      // 2. Get pixel data
      const frameData = hiddenCtx.getImageData(0, 0, cols, rows);
      const data = frameData.data;

      // --- TEMPORAL SMOOTHING START ---
      // Blend current frame with previous frame to reduce ASCII jitter
      const pixelCount = data.length;
      
      // Initialize buffer if needed
      if (!prevFrameRef.current || prevFrameRef.current.length !== pixelCount) {
        prevFrameRef.current = new Float32Array(pixelCount);
        for(let i=0; i<pixelCount; i++) prevFrameRef.current[i] = data[i];
      }

      const prev = prevFrameRef.current;
      // Smoothing factor: 0.0 = no smoothing, 0.9 = very slow trails. 
      // 0.75 provides a very smooth, liquid-like effect.
      const inertia = 0.75; 

      for (let i = 0; i < pixelCount; i++) {
        // Simple Low-pass filter
        // val = prev + (target - prev) * (1 - inertia)
        const target = data[i];
        const current = prev[i];
        const newValue = current + (target - current) * (1 - inertia);
        
        prev[i] = newValue;
        data[i] = newValue; // Update the view for rendering
      }
      // --- TEMPORAL SMOOTHING END ---

      // 3. Clear main canvas
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 4. Setup Font
      ctx.font = `${options.fontSize}px 'JetBrains Mono', monospace`;
      ctx.textBaseline = 'top';

      // 5. Build and Draw ASCII
      const contrastFactor = options.contrast;

      // First pass: Calculate raw brightness and find dynamic min/max bounds
      const pixelCount_coords = cols * rows;
      const rawBrightness = new Float32Array(pixelCount_coords);
      let minB = 255;
      let maxB = 0;

      for (let i = 0; i < pixelCount_coords; i++) {
        const offset = i * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const bValue = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        rawBrightness[i] = bValue;
        if (bValue < minB) minB = bValue;
        if (bValue > maxB) maxB = bValue;
      }

      const range = maxB - minB;
      const shouldNormalize = options.autoEnhance && range > 20;

      if (options.colorMode === 'color') {
          // Full Color Mode
          let fullText = "";
          for (let y = 0; y < rows; y++) {
            let rowText = "";
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                const offset = idx * 4;
                const r = data[offset];
                const g = data[offset + 1];
                const b = data[offset + 2];
                
                let char = "";
                let isEdge = false;

                if (options.edgeDetection && x < cols - 1 && y < rows - 1) {
                    const idx_r = y * cols + (x + 1);
                    const idx_d = (y + 1) * cols + x;
                    
                    const val = shouldNormalize ? ((rawBrightness[idx] - minB) / range) * 255 : rawBrightness[idx];
                    const val_r = shouldNormalize ? ((rawBrightness[idx_r] - minB) / range) * 255 : rawBrightness[idx_r];
                    const val_d = shouldNormalize ? ((rawBrightness[idx_d] - minB) / range) * 255 : rawBrightness[idx_d];
                    
                    const dx = val_r - val;
                    const dy = val_d - val;
                    const g_mag = Math.sqrt(dx * dx + dy * dy);
                    
                    if (g_mag > 40) { // Edge threshold
                        isEdge = true;
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        const normAngle = angle < 0 ? angle + 180 : angle;
                        
                        if (normAngle >= 67.5 && normAngle < 112.5) {
                            char = "-";
                        } else if (normAngle >= 112.5 && normAngle < 157.5) {
                            char = "/";
                        } else if (normAngle >= 22.5 && normAngle < 67.5) {
                            char = "\\";
                        } else {
                            char = "|";
                        }
                    }
                }

                if (!isEdge) {
                    let brightness = shouldNormalize 
                      ? ((rawBrightness[idx] - minB) / range) * 255 
                      : rawBrightness[idx];
                    
                    brightness = contrastFactor * (brightness - 128) + 128;
                    brightness *= options.brightness;
                    brightness = Math.max(0, Math.min(255, brightness));

                    char = getAsciiChar(brightness, options.density);
                }
                
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.fillText(char, x * charWidth, y * charHeight);
                rowText += char;
            }
            fullText += rowText + "\n";
          }
          lastAsciiTextRef.current = fullText;
      } else {
          // Monochromatic / Matrix Modes
          if (options.colorMode === 'matrix') ctx.fillStyle = '#00ff41'; // Matrix Green
          else if (options.colorMode === 'retro') ctx.fillStyle = '#ffb000'; // Amber
          else ctx.fillStyle = '#ffffff'; // BW

          let fullText = "";
          for (let y = 0; y < rows; y++) {
            let rowText = "";
            for (let x = 0; x < cols; x++) {
                const idx = y * cols + x;
                
                let char = "";
                let isEdge = false;

                if (options.edgeDetection && x < cols - 1 && y < rows - 1) {
                    const idx_r = y * cols + (x + 1);
                    const idx_d = (y + 1) * cols + x;
                    
                    const val = shouldNormalize ? ((rawBrightness[idx] - minB) / range) * 255 : rawBrightness[idx];
                    const val_r = shouldNormalize ? ((rawBrightness[idx_r] - minB) / range) * 255 : rawBrightness[idx_r];
                    const val_d = shouldNormalize ? ((rawBrightness[idx_d] - minB) / range) * 255 : rawBrightness[idx_d];
                    
                    const dx = val_r - val;
                    const dy = val_d - val;
                    const g_mag = Math.sqrt(dx * dx + dy * dy);
                    
                    if (g_mag > 40) {
                        isEdge = true;
                        const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                        const normAngle = angle < 0 ? angle + 180 : angle;
                        
                        if (normAngle >= 67.5 && normAngle < 112.5) {
                            char = "-";
                        } else if (normAngle >= 112.5 && normAngle < 157.5) {
                            char = "/";
                        } else if (normAngle >= 22.5 && normAngle < 67.5) {
                            char = "\\";
                        } else {
                            char = "|";
                        }
                    }
                }

                if (!isEdge) {
                    let brightness = shouldNormalize 
                      ? ((rawBrightness[idx] - minB) / range) * 255 
                      : rawBrightness[idx];
                    
                    brightness = contrastFactor * (brightness - 128) + 128;
                    brightness *= options.brightness;
                    brightness = Math.max(0, Math.min(255, brightness));

                    char = getAsciiChar(brightness, options.density);
                }

                rowText += char;
            }
            ctx.fillText(rowText, 0, y * charHeight);
            fullText += rowText + "\n";
          }
          lastAsciiTextRef.current = fullText;
      }

      animationRef.current = requestAnimationFrame(renderLoop);
    };

    animationRef.current = requestAnimationFrame(renderLoop);

    // Cleanup function to prevent zombie loops when options change
    return () => {
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
    };
  }, [options, uploadedImage]);



  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
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

  const handleCopyClick = () => {
    if (lastAsciiTextRef.current) {
      navigator.clipboard.writeText(lastAsciiTextRef.current);
      playButtonSound();
      
      // Cyberpunk transient visual notification (temporary glitch)
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = 'rgba(0, 255, 65, 0.4)';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.font = "24px 'Share Tech Mono', monospace";
          ctx.fillStyle = "#ffffff";
          ctx.textAlign = "center";
          ctx.fillText("DATA COPIED TO CLIPBOARD", canvas.width / 2, canvas.height / 2);
        }
      }
    }
  };

  const handleExportHtml = () => {
    if (!lastAsciiTextRef.current) return;
    
    playButtonSound();
    
    let colorStyle = "";
    if (options.colorMode === 'matrix') colorStyle = "color: #00ff41; text-shadow: 0 0 5px #00ff41;";
    else if (options.colorMode === 'retro') colorStyle = "color: #ffb000; text-shadow: 0 0 5px #ffb000;";
    else if (options.colorMode === 'bw') colorStyle = "color: #ffffff;";
    else {
      colorStyle = "color: #00ff41; text-shadow: 0 0 5px #00ff41;";
    }
    
    const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>CyberAscii Export</title>
    <style>
        body {
            background-color: #000000;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            overflow: auto;
        }
        pre {
            font-family: 'Courier New', Courier, monospace;
            font-size: 8px;
            line-height: 1.0;
            letter-spacing: 0.5px;
            ${colorStyle}
            white-space: pre;
        }
    </style>
</head>
<body>
    <pre>${lastAsciiTextRef.current}</pre>
</body>
</html>
    `;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `cyber_ascii_${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCaptureClick = () => {
    if (canvasRef.current) {
        playScanSound();
        const dataUrl = canvasRef.current.toDataURL('image/png');
        onCapture(dataUrl);
    }
  };

  const handleScreenshotClick = () => {
    if (canvasRef.current) {
      playScanSound();
      const dataUrl = canvasRef.current.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `cyber_ascii_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div 
      className="relative w-full h-full bg-black group"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
        {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-red-500 z-50">
                <p>{error}</p>
            </div>
        )}
        <video 
            ref={videoRef} 
            className="absolute top-0 left-0 opacity-0 pointer-events-none -z-10 w-1 h-1" 
            playsInline 
            autoPlay 
            muted 
        />
        <canvas ref={hiddenCanvasRef} className="hidden" />
        <canvas ref={canvasRef} className="block w-full h-full" />
        
        {/* Drag and Drop Hover overlay */}
        <div className="absolute inset-0 bg-green-500/10 border-2 border-dashed border-green-500/40 m-4 pointer-events-none rounded-lg opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300 z-30">
            <div className="text-center font-mono text-green-400 bg-black/90 p-6 border border-green-500/50 shadow-[0_0_15px_rgba(0,255,0,0.2)]">
                <Upload className="w-8 h-8 mx-auto mb-2 animate-bounce" />
                <p className="text-sm font-bold">DRAG & DROP IMAGE</p>
                <p className="text-[10px] text-green-600 mt-1">RELEASE TO PROCESS ASCII</p>
            </div>
        </div>

        {/* Floating Controls HUD Dock */}
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 flex items-center gap-4 p-3 bg-black/75 border border-green-500/30 rounded-full backdrop-blur-md shadow-[0_0_20px_rgba(0,255,0,0.15)] z-40 transition-all duration-300">
            {/* Copy ASCII Button */}
            <button 
                onClick={handleCopyClick}
                className="bg-black/40 hover:bg-green-900/60 text-green-400 border border-green-500/30 p-4 rounded-full transition-all active:scale-95 hover:scale-105"
                title="Copy ASCII to Clipboard"
            >
                <Copy className="w-5 h-5" />
            </button>

            {/* Scan & Analyze Button (Primary Core) */}
            <button 
                onClick={handleCaptureClick}
                className="bg-green-500/20 hover:bg-green-500/40 text-green-400 border border-green-500 p-5 rounded-full transition-all active:scale-95 group relative hover:shadow-[0_0_25px_rgba(0,255,0,0.5)]"
                title="Scan & Analyze Object"
            >
                <div className="absolute inset-0 rounded-full border border-green-500 opacity-50 animate-ping"></div>
                <ScanEye className="w-7 h-7" />
            </button>

            {/* Screenshot Button */}
            <button 
                onClick={handleScreenshotClick}
                className="bg-black/40 hover:bg-green-900/60 text-green-400 border border-green-500/30 p-4 rounded-full transition-all active:scale-95 hover:scale-105"
                title="Download PNG Snapshot"
            >
                <Camera className="w-5 h-5" />
            </button>

            {/* Export HTML Button */}
            <button 
                onClick={handleExportHtml}
                className="bg-black/40 hover:bg-green-900/60 text-green-400 border border-green-500/30 p-4 rounded-full transition-all active:scale-95 hover:scale-105"
                title="Download Stylized HTML"
            >
                <FileCode className="w-5 h-5" />
            </button>
        </div>
    </div>
  );
};