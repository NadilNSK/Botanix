"use client";
import { useState } from 'react';
import { UploadCloud, Leaf, Droplets, Sun, AlertTriangle, Loader2 } from 'lucide-react';

interface PlantResult {
  scientificName?: string;
  matchProbability?: string;
  commonName?: string;
  description?: string;
  wateringSchedule?: string;
  sunlightRequirements?: string;
  toxicityWarning?: string;
  error?: string;
}

export default function PlantIdentifier() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PlantResult | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setResult(null);
    }
  };

  const identifyPlant = async () => {
    if (!image) return;
    setLoading(true);
    setResult(null);
    
    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await fetch('/api/identify', { method: 'POST', body: formData });
      const data = await res.json();
      setResult(data);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : 'Network request failed.';
      setResult({ error: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-green-50 to-teal-100 p-6 flex flex-col items-center">
      <div className="max-w-xl w-full mt-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500 rounded-full shadow-lg mb-4">
            <Leaf className="text-white w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Identify Any Plant</h1>
          <p className="text-gray-500 mt-2 font-medium">Upload a photo to get accurate IDs and care guides.</p>
        </div>

        <div className="bg-white/70 backdrop-blur-xl rounded-[2rem] shadow-xl p-6 border border-white/50 mb-8">
          {!preview ? (
            <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-emerald-300 border-dashed rounded-3xl cursor-pointer bg-emerald-50/50 hover:bg-emerald-50 transition">
              <UploadCloud className="w-12 h-12 text-emerald-500 mb-3" />
              <span className="text-gray-700 font-semibold">Tap to upload a photo</span>
              <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </label>
          ) : (
            <div className="relative h-64 rounded-3xl overflow-hidden mb-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Upload preview" className="w-full h-full object-cover" />
              <button 
                onClick={() => {
                  setPreview(null);
                  setImage(null);
                }} 
                className="absolute top-4 right-4 bg-white/90 px-4 py-2 rounded-full text-sm font-bold text-gray-700 shadow hover:bg-white"
              >
                Clear
              </button>
            </div>
          )}

          <button 
            onClick={identifyPlant} 
            disabled={!preview || loading}
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl flex justify-center items-center gap-2 hover:bg-gray-800 disabled:opacity-50 transition"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Leaf className="w-5 h-5" />}
            {loading ? 'Analyzing Botanical Data...' : 'Identify Plant'}
          </button>
        </div>

        {/* Dynamic Error Box */}
        {result?.error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-2xl mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0" />
              <div>
                <h3 className="text-red-800 font-bold text-lg">Identification Failed</h3>
                <p className="text-red-700 mt-1 text-sm font-mono bg-red-100/50 p-2 rounded">{result.error}</p>
                <p className="text-red-600 mt-3 text-sm italic">
                  Note: If the error mentions missing API keys, click into your Antigravity IDE terminal, press <b>Ctrl + C</b> to stop the server, and run <b>npm run dev</b> again.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && !result.error && (
          <div className="bg-white rounded-[2rem] shadow-xl p-8 border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="mb-6">
              <h2 className="text-3xl font-bold text-gray-900">{result.commonName}</h2>
              <p className="text-emerald-600 font-medium italic mt-1">{result.scientificName} • {result.matchProbability}% Match</p>
            </div>
            <p className="text-gray-600 leading-relaxed mb-6">{result.description}</p>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-2xl">
                <Droplets className="w-6 h-6 text-blue-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Watering</h4>
                  <p className="text-gray-600 text-sm mt-1">{result.wateringSchedule}</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 bg-amber-50/50 rounded-2xl">
                <Sun className="w-6 h-6 text-amber-500 flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-bold text-gray-900">Sunlight</h4>
                  <p className="text-gray-600 text-sm mt-1">{result.sunlightRequirements}</p>
                </div>
              </div>
              {result.toxicityWarning && (
                <div className="flex items-start gap-4 p-4 bg-red-50 rounded-2xl">
                  <AlertTriangle className="w-6 h-6 text-red-500 flex-shrink-0 mt-1" />
                  <div>
                    <h4 className="font-bold text-red-900">Toxicity Warning</h4>
                    <p className="text-red-700 text-sm mt-1">{result.toxicityWarning}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
