
import React, { useRef, useState, useCallback } from 'react';
import { Camera, X, Loader2, Sparkles, Check } from 'lucide-react';
import { analyzeReceipt } from '../services/gemini';
import { Category } from '../types';

interface ReceiptScannerProps {
  onDetected: (data: { description: string; amount: number; category: Category }) => void;
  onClose: () => void;
}

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onDetected, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: false 
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      alert("Impossibile accedere alla fotocamera.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCameraActive(false);
  }, [stream]);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    // Set canvas size to match video
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context.drawImage(videoRef.current, 0, 0);

    const base64Image = canvasRef.current.toDataURL('image/jpeg', 0.8);
    
    setAnalyzing(true);
    stopCamera();

    const result = await analyzeReceipt(base64Image);
    
    if (result) {
      onDetected(result);
    } else {
      alert("Non ho potuto analizzare lo scontrino. Riprova con una foto più nitida.");
      onClose();
    }
    setAnalyzing(false);
  };

  return (
    <div className="fixed inset-0 bg-black z-[60] flex flex-col">
      <div className="p-4 flex justify-between items-center text-white">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="text-emerald-400" size={20} />
          Scansiona Scontrino
        </h3>
        <button onClick={() => { stopCamera(); onClose(); }} className="p-2 hover:bg-white/10 rounded-full">
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 relative bg-black overflow-hidden flex items-center justify-center">
        {!isCameraActive && !analyzing && (
          <button 
            onClick={startCamera}
            className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-lg"
          >
            <Camera /> Attiva Fotocamera
          </button>
        )}

        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          className={`w-full h-full object-cover ${isCameraActive ? 'block' : 'hidden'}`}
        />
        
        <canvas ref={canvasRef} className="hidden" />

        {analyzing && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center text-white p-8 text-center">
            <div className="relative mb-6">
              <Loader2 size={64} className="text-emerald-400 animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="text-emerald-300" size={24} />
              </div>
            </div>
            <h4 className="text-xl font-bold mb-2">Analisi in corso...</h4>
            <p className="text-emerald-100/70 text-sm">Gemini sta leggendo i dettagli dello scontrino per te.</p>
          </div>
        )}

        {isCameraActive && (
          <div className="absolute inset-x-0 bottom-12 flex justify-center px-4">
             <button 
               onClick={captureAndAnalyze}
               className="w-20 h-20 bg-white rounded-full border-8 border-emerald-500/30 flex items-center justify-center active:scale-90 transition-transform shadow-2xl"
             >
               <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center text-white">
                 <Check size={32} />
               </div>
             </button>
          </div>
        )}

        {/* Framing Overlay */}
        {isCameraActive && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-8">
            <div className="w-full max-w-sm aspect-[3/4] border-2 border-dashed border-white/50 rounded-2xl relative">
               <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-2xl"></div>
               <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-2xl"></div>
               <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-2xl"></div>
               <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-2xl"></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
