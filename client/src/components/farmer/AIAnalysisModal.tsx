'use client';

import React from 'react';
import { X, Brain, Upload, Camera, Target, AlertCircle, ChevronDown, ChevronUp, Award, DollarSign } from 'lucide-react';

interface AIAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: () => Promise<void>;
  onCreateListing: () => void;
  photo: File | null;
  photoPreview: string | null;
  analysisResult: any;
  isAnalyzing: boolean;
  error: string | null;
  expandedSections: Record<string, boolean>;
  onToggleSection: (key: string) => void;
  onPhotoSelect: (file: File) => void;
  location: { woreda: string; kebele: string };
  onLocationChange: (location: { woreda: string; kebele: string }) => void;
}

export default function AIAnalysisModal({
  isOpen,
  onClose,
  onAnalyze,
  onCreateListing,
  photo,
  photoPreview,
  analysisResult,
  isAnalyzing,
  error,
  expandedSections,
  onToggleSection,
  onPhotoSelect,
  location,
  onLocationChange,
}: AIAnalysisModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-coffee-200 relative animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-5 right-5 p-2 rounded-full hover:bg-coffee-100 text-coffee-500 transition-colors">
          <X className="w-5 h-5" />
        </button>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-forest-500 to-emerald-600 flex items-center justify-center">
              <Brain className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-coffee-950">AI Coffee Bean Quality Analysis</h3>
              <p className="text-xs text-coffee-600">Upload a photo of your coffee beans for instant ECX grading, defect detection, and fair price estimation</p>
            </div>
          </div>
          {!analysisResult && <UploadSection photo={photo} photoPreview={photoPreview} isAnalyzing={isAnalyzing} error={error} onPhotoSelect={onPhotoSelect} onAnalyze={onAnalyze} onClose={onClose} location={location} onLocationChange={onLocationChange} />}
          {analysisResult && <ResultsSection analysisResult={analysisResult} expandedSections={expandedSections} onToggleSection={onToggleSection} onClose={onClose} onCreateListing={onCreateListing} />}
        </div>
      </div>
    </div>
  );
}

function UploadSection({ photo, photoPreview, isAnalyzing, error, onPhotoSelect, onAnalyze, onClose, location, onLocationChange }: any) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 rounded-2xl border border-coffee-200 bg-white p-4">
        <label className="text-xs font-bold text-coffee-700">Woreda<input value={location.woreda} onChange={(event) => onLocationChange({ ...location, woreda: event.target.value })} className="mt-1 w-full rounded-xl border border-coffee-200 px-3 py-2.5 font-medium outline-none focus:border-forest-500" /></label>
        <label className="text-xs font-bold text-coffee-700">Kebele<input value={location.kebele} onChange={(event) => onLocationChange({ ...location, kebele: event.target.value })} className="mt-1 w-full rounded-xl border border-coffee-200 px-3 py-2.5 font-medium outline-none focus:border-forest-500" /></label>
      </div>
      <div className="p-4 rounded-2xl bg-coffee-50 border-2 border-dashed border-coffee-300 text-center">
        <Upload className="w-10 h-10 text-coffee-400 mx-auto mb-3" />
        <p className="text-coffee-800 font-medium mb-1">Drop your coffee bean photo here</p>
        <p className="text-xs text-coffee-500">or click to browse</p>
        <input type="file" accept="image/*" capture="environment" onChange={(e) => { const file = e.target.files?.[0]; if (file) onPhotoSelect(file); }} className="hidden" id="ai-photo-upload" />
        <button type="button" onClick={() => document.getElementById('ai-photo-upload')?.click()} disabled={isAnalyzing} className="mt-3 px-6 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-semibold text-xs transition-colors disabled:opacity-50">
          {isAnalyzing ? 'Analyzing...' : 'Choose Photo'}
        </button>
      </div>
      {photoPreview && <div className="relative"><img src={photoPreview} alt="Coffee beans preview" className="w-full max-h-64 object-cover rounded-xl border border-coffee-200" /><div className="absolute bottom-3 right-3 flex gap-2"><button onClick={onClose} className="p-2 rounded-full bg-red-500 text-white hover:bg-red-600 transition-colors shadow"><X className="w-4 h-4" /></button></div></div>}
      {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2"><AlertCircle className="w-4 h-4" /><span>{error}</span></div>}
      {photo && !isAnalyzing && <button onClick={onAnalyze} className="w-full py-3 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow"><Brain className="w-5 h-5" /> Analyze Coffee Beans</button>}
      <div className="p-3 rounded-xl bg-gold-50 border border-gold-200 text-gold-900 text-[11px] space-y-1">
        <div className="flex items-center gap-1.5 font-semibold"><Target className="w-3.5 h-3.5" /><span>Photo Tips for Best Results:</span></div>
        <ul className="ml-5 space-y-1 list-disc text-xs"><li>Spread beans evenly on a flat, light-colored surface</li><li>Use natural daylight or bright, even lighting</li><li>Capture close-up (15-30cm) showing individual beans</li><li>Avoid shadows, glare, or blurry images</li><li>Include both whole and defective beans if possible</li></ul>
      </div>
    </div>
  );
}

function ResultsSection({ analysisResult, expandedSections, onToggleSection, onClose, onCreateListing }: any) {
  const sections = [
    { key: 'quality', label: 'Quality Metrics', icon: Award },
    { key: 'defects', label: 'Defect Analysis', icon: AlertCircle },
    { key: 'pricing', label: 'Price & Market', icon: DollarSign },
    { key: 'tips', label: 'Sorting & Farming Tips', icon: Target },
  ];

  return (
    <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="p-5 rounded-2xl bg-gradient-to-r from-forest-600 to-emerald-700 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className={`mb-2 inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide ${analysisResult.is_fallback ? 'bg-amber-100 text-amber-900' : 'bg-white/20 text-white'}`}>
              {analysisResult.is_fallback ? 'Fallback estimate' : `AI result · ${analysisResult.provider || 'provider unreported'}`}
            </div>
            <div className="flex items-center gap-2 text-xs text-forest-100 mb-1"><Target className="w-3.5 h-3.5" /><span>ECX Grade Estimate</span></div>
            <div className="text-3xl font-extrabold tracking-tight">{analysisResult.grade_tier || 'Natural G4'}</div>
            <div className="text-xs text-forest-100 mt-1">{analysisResult.processing_type || 'Natural'} • Defect Rate: {analysisResult.defect_percentage || '~20'}%</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-forest-100">Fair Price Range</div>
            <div className="text-xl font-black">{analysisResult.estimated_price_min_etb || 48} – {analysisResult.estimated_price_max_etb || 59} ETB/kg</div>
            <div className="text-xs text-forest-100 mt-1">Confidence: <span className="capitalize">{analysisResult.confidence || 'medium'}</span></div>
          </div>
        </div>
      </div>
      {analysisResult.location && <div className="rounded-xl border border-coffee-200 bg-coffee-50 px-4 py-3 text-xs text-coffee-700"><strong>Analysis origin:</strong> {analysisResult.location.woreda}, {analysisResult.location.kebele} · {analysisResult.location.zone}, {analysisResult.location.region}</div>}
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.key} className="border border-coffee-200 rounded-2xl overflow-hidden">
            <button onClick={() => onToggleSection(section.key)} className="w-full px-4 py-3 bg-coffee-50 flex items-center justify-between gap-2 hover:bg-coffee-100 transition-colors">
              <div className="flex items-center gap-2"><section.icon className="w-5 h-5 text-forest-600" /><span className="font-semibold text-coffee-900 text-sm">{section.label}</span></div>
              <span className="text-forest-600">{expandedSections[section.key] ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</span>
            </button>
            {expandedSections[section.key] && <div className="p-4 border-t border-coffee-200 bg-white space-y-3 text-xs">{renderSectionContent(section.key, analysisResult)}</div>}
          </div>
        ))}
        <div className="pt-4 border-t border-coffee-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-coffee-300 text-coffee-800 font-semibold hover:bg-coffee-50 transition-colors"><Camera className="w-4 h-4 inline mr-1" /> Analyze Another Photo</button>
          <button onClick={onCreateListing} className="flex-1 py-2.5 rounded-xl bg-gold-500 hover:bg-gold-400 text-coffee-950 font-bold tracking-wide shadow transition-colors flex items-center justify-center gap-2"><Camera className="w-4 h-4" /> Create Listing with This Grade</button>
        </div>
      </div>
    </div>
  );
}

function renderSectionContent(key: string, analysisResult: any) {
  switch (key) {
    case 'quality':
      return (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-forest-50 border border-forest-200"><div className="text-[10px] text-forest-600">Color Quality</div><div className="font-bold text-forest-900 capitalize">{analysisResult.color_quality || 'fair'}</div></div>
          <div className="p-3 rounded-xl bg-forest-50 border border-forest-200"><div className="text-[10px] text-forest-600">Uniformity Score</div><div className="font-bold text-forest-900">{analysisResult.uniformity_score || 5}/10</div></div>
          <div className="p-3 rounded-xl bg-forest-50 border border-forest-200"><div className="text-[10px] text-forest-600">Moisture Level</div><div className="font-bold text-forest-900 capitalize">{analysisResult.moisture_level || 'unknown'}</div></div>
          <div className="p-3 rounded-xl bg-forest-50 border border-forest-200"><div className="text-[10px] text-forest-600">Grade Number</div><div className="font-bold text-forest-900">G{analysisResult.grade_number || 4}</div></div>
        </div>
      );
    case 'defects':
      const defectsDetail = analysisResult.defects_detail as Record<string, number> | undefined;
      return (
        <div className="space-y-2">
          <p className="text-coffee-800">{analysisResult.defects_summary || 'Mixed defects detected. See sorting tips below.'}</p>
          {defectsDetail && <ul className="space-y-1 ml-4 list-disc text-coffee-700">{Object.entries(defectsDetail).map(([defect, count]) => <li key={defect} className="flex justify-between"><span className="capitalize">{defect.replace(/_/g, ' ')}</span><span className="font-semibold text-coffee-900">{count}%</span></li>)}</ul>}
        </div>
      );
    case 'pricing':
      return (
        <div className="space-y-3">
          <div className="p-3 rounded-xl bg-gold-50 border border-gold-200"><div className="flex justify-between text-sm"><span className="text-gold-800">Your Asking Price</span><span className="font-bold text-gold-900">{analysisResult.estimated_price_min_etb || 48}–{analysisResult.estimated_price_max_etb || 59} ETB/kg</span></div><div className="flex justify-between text-sm mt-1"><span className="text-coffee-600">ECX Floor (Grade)</span><span className="font-semibold text-coffee-900">{analysisResult.grade_tier || 'Natural G4'}</span></div></div>
          <div className="grid grid-cols-2 gap-3"><div className="p-3 rounded-xl bg-coffee-50 border border-coffee-200"><div className="text-[10px] text-coffee-500">Min Fair Price</div><div className="font-bold text-forest-700">{analysisResult.estimated_price_min_etb || 48} ETB/kg</div></div><div className="p-3 rounded-xl bg-coffee-50 border border-coffee-200"><div className="text-[10px] text-coffee-500">Max Fair Price</div><div className="font-bold text-forest-700">{analysisResult.estimated_price_max_etb || 59} ETB/kg</div></div></div>
          <p className="text-[10px] text-coffee-500 text-center">Based on Jimma ECX reference prices for {analysisResult.processing_type || 'Natural'} {analysisResult.grade_tier || 'G4'}</p>
        </div>
      );
    case 'tips':
      const oromoTips = analysisResult.tips_oromo?.map((tip: string, i: number) => <li key={i}>{tip}</li>) || [
        <li key="om1">Buna idileetti fincaanii wal hin qabneetti hidha.</li>,
        <li key="om2">Buna gurracha, tokkichi, fi kan qorichiwaan hidha.</li>
      ];
      const amharicTips = analysisResult.tips_amharic?.map((tip: string, i: number) => <li key={i}>{tip}</li>) || [
        <li key="am1">ቡናውን በቀለም እና መጠን ያስተካክሉ።</li>,
        <li key="am2">ጥሩ፣ ቆጣቢ እና የአስተሳሰብ ተጠቃሚ ቡና ውጭ ያድርጉ።</li>
      ];
      return (
        <div className="space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-coffee-600 mb-2">
              <span className="w-5 h-5 rounded-full bg-gold-500 text-white flex items-center justify-center text-[9px]">EN</span>
              <span>English</span>
            </div>
            <p className="text-coffee-800 leading-relaxed">{analysisResult.sorting_advice_english || analysisResult.summary_english || 'Sort beans by color and size. Remove black, broken, and insect-damaged beans before sale.'}</p>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-coffee-600 mb-2">
              <span className="w-5 h-5 rounded-full bg-forest-500 text-white flex items-center justify-center text-[9px]">OM</span>
              <span>Afaan Oromoo</span>
            </div>
            <ul className="space-y-1 ml-4 list-disc text-coffee-800 text-sm">{oromoTips}</ul>
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-coffee-600 mb-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 text-white flex items-center justify-center text-[9px]">AM</span>
              <span>አማርኛ</span>
            </div>
            <ul className="space-y-1 ml-4 list-disc text-coffee-800 text-sm">{amharicTips}</ul>
          </div>
        </div>
      );
    default:
      return null;
  }
}
