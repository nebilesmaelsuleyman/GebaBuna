'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  Sparkles,
  Camera,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Award,
  DollarSign,
  Coffee,
  Languages,
} from 'lucide-react';
import { api, AiGradingError } from '../../services/api';
import { startWavRecording, ActiveRecorder } from '../../utils/audioRecorder';
import ManualGradeForm from './ManualGradeForm';
import { FallbackTag, GradedByBadge, isFallbackField, midpointPrice, PriceRangeEditor } from './GradingDisplay';

type VoiceLang = 'om' | 'am';

interface VoiceListingAssistantProps {
  isOpen: boolean;
  onClose: () => void;
  onListingCreated: (newListing: any) => void;
  profileLocation?: { woreda?: string; kebele?: string };
}

export default function VoiceListingAssistant({
  isOpen,
  onClose,
  onListingCreated,
  profileLocation,
}: VoiceListingAssistantProps) {
  const [lang, setLang] = useState<VoiceLang>('om');
  const [selectedVoice, setSelectedVoice] = useState<string>('om-bikila');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [audioError, setAudioError] = useState<string | null>(null);

  // Sync default voice when language changes
  useEffect(() => {
    if (lang === 'om') {
      setSelectedVoice('om-bikila');
    } else {
      setSelectedVoice('am-amanuel');
    }
  }, [lang]);

  useEffect(() => {
    if (profileLocation?.woreda) setWoreda(profileLocation.woreda);
    if (profileLocation?.kebele) setKebele(profileLocation.kebele);
  }, [profileLocation?.woreda, profileLocation?.kebele]);

  // Listing state accumulated through voice
  const [quantityKg, setQuantityKg] = useState<number | null>(null);
  const [askingPrice, setAskingPrice] = useState<number | null>(null);
  const [beanPhoto, setBeanPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [gradingResult, setGradingResult] = useState<any | null>(null);
  const [manualGrading, setManualGrading] = useState<{ title: string; message: string; photoUrl?: string } | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string>('');
  const [woreda, setWoreda] = useState(profileLocation?.woreda || 'Mana');
  const [kebele, setKebele] = useState(profileLocation?.kebele || 'Kenteri');

  const photoRunRef = useRef(0);

  // Audio recording refs
  const activeRecorderRef = useRef<ActiveRecorder | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Localization prompts
  const questions: Record<number, Record<VoiceLang, { text: string; subtext: string }>> = {
    1: {
      om: {
        text: 'Buna kiiloo meeqa gurguruu barbaaddu?',
        subtext: 'Maaloo kiiloo meeqa akka qabdan dubbadhaa (fkn: "Kiiloo 500" ykn "Dhibba shan")',
      },
      am: {
        text: 'ስንት ኪሎ ቡና መሸጥ ይፈልጋሉ?',
        subtext: 'እባክዎ ምን ያህል ኪሎ ቡና እንዳለዎት ይናገሩ (ለምሳሌ፦ "500 ኪሎ" ወይም "አምስት መቶ")',
      },
    },
    2: {
      om: {
        text: 'Kiiloo tokko gatii meeqaan gurgurtaa?',
        subtext: 'Gatii kiiloo tokkoof barbaaddan qarshiin dubbadhaa (fkn: "Qarshii kuma tokko")',
      },
      am: {
        text: 'የአንዱን ኪሎ ዋጋ በስንት ብር መሸጥ ይፈልጋሉ?',
        subtext: 'ለአንድ ኪሎ የሚፈልጉትን ዋጋ በብር ይናገሩ (ለምሳሌ፦ "1000 ብር")',
      },
    },
    3: {
      om: {
        text: 'Amma suuraa buna keessanii kaasaa ergaa.',
        subtext: 'AI qulqullina bunaa fi ECX Grade akka beekuuf suuraa ifaa kaasaa.',
      },
      am: {
        text: 'አሁን የቡና ፍሬዎን ፎቶ አንስተው ይላኩ።',
        subtext: 'AI የቡናውን ጥራት እና የኢ.ሲ.ኤክስ ደረጃ እንዲመረምር ግልጽ ፎቶ ይላኩ።',
      },
    },
    4: {
      om: {
        text: 'Odeeffannoo keessan mirkaneessaa gurguraa!',
        subtext: 'Sagaleen qopheessineerra. Gurguruuf as tuqaa.',
      },
      am: {
        text: 'መረጃዎን አረጋግጠው ወደ ገበያ ያቅርቡ!',
        subtext: 'በድምጽዎ ተዘጋጅቷል። ለመሸጥ አረንጓዴውን ይጫኑ።',
      },
    },
  };

  // Speak the question whenever step or language changes
  useEffect(() => {
    if (isOpen) {
      speakCurrentPrompt();
    }
  }, [currentStep, lang, isOpen]);

  const speakCurrentPrompt = async () => {
    const promptText = questions[currentStep]?.[lang]?.text;
    if (!promptText) return;

    setIsPlayingAudio(true);
    setAudioError(null);

    try {
      // Call Addis AI Voice synthesis with official voices (om-bikila / am-amanuel)
      const response = await api.synthesizeVoice(promptText, lang, selectedVoice);
      if (response?.audioBase64 || response?.audioUrl) {
        if (!audioPlayerRef.current) {
          audioPlayerRef.current = new Audio();
        }
        audioPlayerRef.current.src =
          response.audioUrl ||
          `data:${response.contentType || 'audio/mpeg'};base64,${response.audioBase64}`;
        audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
        audioPlayerRef.current.onerror = (e) => {
          console.warn('[VoiceAssistant] Audio playback error:', e);
          setIsPlayingAudio(false);
        };
        await audioPlayerRef.current.play();
        return;
      }
    } catch (err) {
      console.warn('[VoiceAssistant] Addis AI TTS failed:', err);
    }

    setIsPlayingAudio(false);
  };

  const stopAudio = () => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
    }
    setIsPlayingAudio(false);
  };

  // Recording audio (16kHz PCM WAV)
  const startRecording = async () => {
    stopAudio();
    setAudioError(null);

    try {
      activeRecorderRef.current = await startWavRecording();
      setIsRecording(true);
    } catch (err: any) {
      console.error('Microphone start error:', err);
      setAudioError(
        lang === 'om'
          ? 'Mikiroofoonii banuu hin dandeenye. Maaloo heyyama kennaa.'
          : 'ማይክሮፎኑን መክፈት አልተቻለም። እባክዎ ፈቃድ ይስጡ።'
      );
      setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (activeRecorderRef.current && isRecording) {
      setIsRecording(false);
      try {
        const wavBlob = await activeRecorderRef.current.stop();
        activeRecorderRef.current = null;
        await handleAudioProcess(wavBlob);
      } catch (err: any) {
        console.error('Stop recording error:', err);
        setIsProcessing(false);
      }
    }
  };

  const handleAudioProcess = async (blob: Blob) => {
    setIsProcessing(true);
    setAudioError(null);

    try {
      // 1. Transcribe via Addis AI Scribe & extract exact number
      const data = await api.transcribeVoice({
        audioBlob: blob,
        language: lang,
      });

      const transcript = (data.text || '').trim();
      setLastTranscript(transcript);
      const extracted = data.extractedValue;

      if (currentStep === 1) {
        if (extracted && extracted > 0) {
          setQuantityKg(extracted);
          setAudioError(null);
        } else {
          setAudioError(
            lang === 'om'
              ? `Dhageenye: "${transcript || 'Sagaleen hin qulqulloofne'}". Lakkoofsa kiiloo hin arganne. Maaloo irra deebi'aa dubbadhaa (fkn: "Dhibba tokko" ykn "100").`
              : `የተሰማው፦ "${transcript || 'ድምጽ አልተሰማም'}". የኪሎ ቁጥር አልተገኘም። እባክዎ በድጋሚ ይናገሩ (ለምሳሌ፦ "መቶ" ወይም "100")።`
          );
        }
      } else if (currentStep === 2) {
        if (extracted && extracted > 0) {
          setAskingPrice(extracted);
          setAudioError(null);
        } else {
          setAudioError(
            lang === 'om'
              ? `Dhageenye: "${transcript || 'Sagaleen hin qulqulloofne'}". Gatii qarshii hin arganne. Maaloo irra deebi'aa dubbadhaa (fkn: "Qarshii kuma tokko").`
              : `የተሰማው፦ "${transcript || 'ድምጽ አልተሰማም'}". የዋጋ ቁጥር አልተገኘም። እባክዎ በድጋሚ ይናገሩ (ለምሳሌ፦ "1000 ብር")።`
          );
        }
      }
    } catch (err: any) {
      console.error('Audio processing failed:', err);
      setAudioError(
        lang === 'om'
          ? 'Sagalee erguun hin danda\'amne. Maaloo irra deebi\'aa yaalaa ykn lakkoofsa asitti filadhaa.'
          : 'ድምጹን ማስተላለፍ አልተቻለም። እባክዎ በድጋሚ ይሞክሩ ወይም ከታች ይምረጡ።'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Photo grading
  const handlePhotoUpload = async (file: File) => {
    setBeanPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
    const run = ++photoRunRef.current;
    setIsProcessing(true);
    setAudioError(null);

    try {
      const res = await api.analyzeCoffeePhoto(file, { woreda, kebele });
      if (run !== photoRunRef.current) return;
      setManualGrading(null);
      setGradingResult({ ...res.analysis, location: res.location, photoUrl: res.photoUrl });
      if (!askingPrice) setAskingPrice(midpointPrice(res.analysis?.estimated_price_min_etb, res.analysis?.estimated_price_max_etb, 0) || null);
      setCurrentStep(4);
    } catch (err: any) {
      if (run !== photoRunRef.current) return;
      setManualGrading({
        title: err instanceof AiGradingError ? err.title : 'AI is not responding right now',
        message: err.message || 'AI grading is unavailable right now. Enter the grade and price yourself.',
        photoUrl: err instanceof AiGradingError ? err.photoUrl : undefined,
      });
    } finally {
      if (run === photoRunRef.current) setIsProcessing(false);
    }
  };

  // Final publish listing
  const handleConfirmPublish = async () => {
    setIsProcessing(true);
    try {
      const aiGrade = gradingResult?.grade_tier || 'Washed G2';
      const gradeNumber = aiGrade.match(/G([1-5])/i)?.[1] || '2';
      const manual = gradingResult?.provider === 'manual' || gradingResult?.provider === 'sample';
      const payload = {
        coffeeType: `${lang === 'om' ? 'Buna Filatamaa' : 'ምርጥ የቡና ምርት'} - ${aiGrade}`,
        grade: aiGrade.toLowerCase().includes('specialty') ? 'Specialty' : `Grade ${gradeNumber}`,
        processing: (gradingResult?.processing_type?.toLowerCase() || 'washed') as any,
        quantityKg: quantityKg || 500,
        askingPricePerKg: askingPrice || 1150,
        harvestDate: 'November 2026',
        woreda,
        kebele,
        description: manual
          ? 'Grade and price entered by the farmer (AI grader was unavailable).'
          : 'Listed with AI-assisted coffee quality analysis.',
        aiEstimatedGrade: manual ? '' : aiGrade,
        aiConfidence: manual ? '' : gradingResult?.confidence || '',
        aiDefectsSummary: manual ? '' : gradingResult?.defects_summary || gradingResult?.sorting_advice_english || '',
        photos: gradingResult?.photoUrl ? [gradingResult.photoUrl] : [],
      };

      const res = await api.createListing(payload);
      onListingCreated(res.listing);
      onClose();
    } catch (err: any) {
      setAudioError(
        err?.status === 401 || err?.status === 403
          ? 'Sign in as a farmer to publish this listing.'
          : err.message || 'The listing could not be saved.'
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] overflow-y-auto p-5 sm:p-7 shadow-2xl border border-coffee-200 relative animate-in fade-in zoom-in-95">
        {/* Close Button */}
        <button
          onClick={() => {
            stopAudio();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-coffee-100 text-coffee-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="mb-5 flex flex-col gap-4 pr-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-500 to-amber-600 flex items-center justify-center text-white shadow-md">
              <Mic className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-coffee-950 flex items-center gap-2">
                {lang === 'om' ? 'Gargaaraa Sagalee Bunaa' : 'የድምጽ ቡና ረዳት'}
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-forest-100 text-forest-800 font-bold border border-forest-300">
                  Addis AI
                </span>
              </h3>
              <p className="text-xs text-coffee-600">
                {lang === 'om' ? 'Sagaleedhaan salphaatti gurguri' : 'በድምጽዎ ብቻ በቀላሉ ይሽጡ'}
              </p>
            </div>
          </div>

          {/* Language Switcher */}
          <div className="flex items-center bg-coffee-100 p-1 rounded-xl">
            <button
              onClick={() => {
                stopAudio();
                setLang('om');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'om'
                  ? 'bg-coffee-900 text-white shadow-sm'
                  : 'text-coffee-700 hover:text-coffee-950'
              }`}
            >
              Afaan Oromoo
            </button>
            <button
              onClick={() => {
                stopAudio();
                setLang('am');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                lang === 'am'
                  ? 'bg-coffee-900 text-white shadow-sm'
                  : 'text-coffee-700 hover:text-coffee-950'
              }`}
            >
              አማርኛ
            </button>
          </div>
        </div>

        {/* Agent Voice Selector Bar */}
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-coffee-50 border border-coffee-200 mb-4 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-coffee-800">
            <Volume2 className="w-4 h-4 text-gold-600" />
            <span>{lang === 'om' ? 'Sagalee Eenyuu (Agent Voice):' : 'የአስረጂ ድምጽ (Agent Voice):'}</span>
          </div>
          <select
            value={selectedVoice}
            onChange={(e) => {
              stopAudio();
              setSelectedVoice(e.target.value);
            }}
            className="text-xs font-extrabold bg-white border border-coffee-300 rounded-lg px-2.5 py-1 text-coffee-950 focus:outline-none focus:ring-2 focus:ring-gold-500 shadow-sm"
          >
            {lang === 'om' ? (
              <>
                <option value="om-bikila">🎙️ Bikila (Male • Clear & Authoritative)</option>
                <option value="om-ayyaantuu">🎙️ Ayyaantuu (Female • News Anchor)</option>
                <option value="om-leensaa">🎙️ Leensaa (Female • Conversational)</option>
              </>
            ) : (
              <>
                <option value="am-amanuel">🎙️ Amanuel (Male • Calm & Narrative)</option>
                <option value="am-hamen">🎙️ Hamen (Female • Conversational)</option>
                <option value="am-yohannes">🎙️ Yohannes (Male • Deep Voice)</option>
              </>
            )}
          </select>
        </div>

        {/* Step Progress Indicators */}
        <div className="grid grid-cols-4 gap-2 mb-6">
          {[
            { step: 1, label: lang === 'om' ? 'Kiiloo' : 'ኪሎ', icon: Coffee },
            { step: 2, label: lang === 'om' ? 'Gatii' : 'ዋጋ', icon: DollarSign },
            { step: 3, label: lang === 'om' ? 'Suuraa' : 'ፎቶ', icon: Camera },
            { step: 4, label: lang === 'om' ? 'Gurguri' : 'መሸጥ', icon: Award },
          ].map((item) => {
            const Icon = item.icon;
            const isDone = currentStep > item.step;
            const isCurrent = currentStep === item.step;
            return (
              <div
                key={item.step}
                className={`flex flex-col items-center p-2 rounded-xl border text-center transition-all ${
                  isDone
                    ? 'bg-forest-50 border-forest-300 text-forest-800'
                    : isCurrent
                    ? 'bg-gold-50 border-gold-400 text-gold-950 shadow-sm'
                    : 'bg-coffee-50 border-coffee-200 text-coffee-400'
                }`}
              >
                <div className="flex items-center gap-1 mb-1">
                  <Icon className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-bold">{item.label}</span>
                </div>
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-forest-600" />
                ) : (
                  <span className="text-[10px] font-extrabold">{item.step}</span>
                )}
              </div>
            );
          })}
        </div>

        {/* Current Spoken Question Box */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-coffee-900 to-coffee-950 text-white shadow-lg mb-6 relative overflow-hidden">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-gold-400">
                {lang === 'om' ? `Tarkaanfii ${currentStep}ffaa` : `ደረጃ ${currentStep}`}
              </span>
              <h4 className="text-base sm:text-lg font-extrabold leading-snug">
                {questions[currentStep]?.[lang]?.text}
              </h4>
              <p className="text-xs text-coffee-200">
                {questions[currentStep]?.[lang]?.subtext}
              </p>
            </div>

            <button
              onClick={speakCurrentPrompt}
              disabled={isPlayingAudio}
              className={`p-3 rounded-2xl transition-all shadow-md ${
                isPlayingAudio
                  ? 'bg-gold-500 text-coffee-950 animate-bounce'
                  : 'bg-coffee-800 text-gold-400 hover:bg-coffee-700'
              }`}
              title="Hear voice prompt"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Step 1 & 2: Voice Input / Microphone Button */}
        {(currentStep === 1 || currentStep === 2) && (
          <div className="space-y-6 text-center py-4">
            <div className="flex flex-col items-center justify-center">
              <button
                type="button"
                onPointerDown={(event) => { event.preventDefault(); void startRecording(); }}
                onPointerUp={() => { void stopRecording(); }}
                onPointerCancel={() => { void stopRecording(); }}
                disabled={isProcessing}
                className={`relative w-28 h-28 sm:w-32 sm:h-32 rounded-full flex flex-col items-center justify-center transition-all shadow-2xl active:scale-95 ${
                  isRecording
                    ? 'bg-red-600 text-white ring-8 ring-red-200 animate-pulse'
                    : isProcessing
                    ? 'bg-coffee-300 text-coffee-600 cursor-wait'
                    : 'bg-gradient-to-tr from-gold-500 to-amber-500 text-coffee-950 hover:brightness-105 shadow-gold-500/40 ring-4 ring-gold-200'
                }`}
              >
                {isRecording ? (
                  <>
                    <Mic className="w-10 h-10 animate-bounce" />
                    <span className="text-[10px] font-extrabold uppercase mt-1">
                      {lang === 'om' ? 'Gadhiisaa' : 'ልቀቁት'}
                    </span>
                  </>
                ) : isProcessing ? (
                  <>
                    <RefreshCw className="w-8 h-8 animate-spin" />
                    <span className="text-[10px] font-bold mt-1">
                      {lang === 'om' ? 'Qopheessaa...' : 'እያዘጋጀ ነው...'}
                    </span>
                  </>
                ) : (
                  <>
                    <Mic className="w-10 h-10" />
                    <span className="text-[10px] font-black uppercase mt-1">
                      {lang === 'om' ? 'Qabadhaa Dubbadhaa' : 'ተጭነው ይናገሩ'}
                    </span>
                  </>
                )}
              </button>
              <p className="text-xs text-coffee-500 mt-3 font-medium">
                {isRecording
                  ? lang === 'om'
                    ? 'Dhaggeeffachaa jirra... Yeroo xumurtan gadhiisaa'
                    : 'እያዳመጥን ነው... ሲጨርሱ ይልቀቁት'
                  : lang === 'om'
                  ? 'Qabaa dubbadhaa (Hold & Speak)'
                  : 'ተጭነው ይናገሩ (Hold & Speak)'}
              </p>
            </div>

            {/* Live Heard Transcript & Detected Value Confirmation */}
            {lastTranscript && (
              <div className="p-3 rounded-xl bg-coffee-50 border border-coffee-200 text-xs text-coffee-800">
                <span className="font-bold text-coffee-600 block mb-0.5">
                  {lang === 'om' ? '🎙️ Sagalee Dhagayame (Heard):' : '🎙️ የተሰማው ቃል፦'}
                </span>
                <span className="font-black text-sm text-coffee-950">"{lastTranscript}"</span>
              </div>
            )}

            {/* Audio Feedback / Error Alert */}
            {audioError && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0" />
                <span>{audioError}</span>
              </div>
            )}

            {/* Step 1 Extracted Card */}
            {currentStep === 1 && quantityKg !== null && quantityKg > 0 && (
              <div className="p-4 rounded-2xl bg-forest-50 border-2 border-forest-400 text-center space-y-3 animate-in zoom-in-95">
                <div className="text-xs font-bold text-forest-800">
                  {lang === 'om' ? '✓ Baay’ina Kiiloo Mirkanaa’e:' : '✓ የተገኘው የኪሎ መጠን፦'}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    value={quantityKg}
                    onChange={(e) => setQuantityKg(Number(e.target.value))}
                    className="w-32 text-center text-3xl font-black bg-white border-2 border-forest-500 rounded-xl py-1 text-forest-900 shadow-inner"
                  />
                  <span className="text-xl font-black text-forest-900">KG</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="w-full py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'om' ? 'Mirkaneessi & Gatii Dubbadhu (Confirm)' : 'አረጋግጥና ዋጋ ተናገር (Confirm)'}</span>
                </button>
              </div>
            )}

            {/* Step 2 Extracted Card */}
            {currentStep === 2 && askingPrice !== null && askingPrice > 0 && (
              <div className="p-4 rounded-2xl bg-forest-50 border-2 border-forest-400 text-center space-y-3 animate-in zoom-in-95">
                <div className="text-xs font-bold text-forest-800">
                  {lang === 'om' ? '✓ Gatii Kiiloo Tokkoo Mirkanaa’e:' : '✓ የተገኘው የአንድ ኪሎ ዋጋ፦'}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <input
                    type="number"
                    value={askingPrice}
                    onChange={(e) => setAskingPrice(Number(e.target.value))}
                    className="w-32 text-center text-3xl font-black bg-white border-2 border-forest-500 rounded-xl py-1 text-forest-900 shadow-inner"
                  />
                  <span className="text-xl font-black text-forest-900">ETB / kg</span>
                </div>
                <button
                  type="button"
                  onClick={() => setCurrentStep(3)}
                  className="w-full py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 text-white font-black text-xs shadow-md flex items-center justify-center gap-1.5 transition-transform active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{lang === 'om' ? 'Mirkaneessi & Suuraa Kaasi (Confirm & Take Photo)' : 'አረጋግጥና ፎቶ አንሳ (Confirm)'}</span>
                </button>
              </div>
            )}

            {/* Quick Demo Fallback Pills (Ensures 100% demo success on stage) */}
            <div className="pt-2 border-t border-coffee-100">
              <p className="text-[11px] text-coffee-400 mb-2 font-semibold">
                {lang === 'om' ? 'Fakkeenya salphaa filadhaa (Quick Demo):' : 'ፈጣን ምሳሌ (Quick Demo):'}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {currentStep === 1 ? (
                  <>
                    <button
                      onClick={() => {
                        setQuantityKg(100);
                        setLastTranscript(lang === 'om' ? 'Dhibba tokko' : 'መቶ ኪሎ');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      100 KG (Dhibba Tokko)
                    </button>
                    <button
                      onClick={() => {
                        setQuantityKg(200);
                        setLastTranscript(lang === 'om' ? 'Dhibba lama' : 'ሁለት መቶ ኪሎ');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      200 KG (Dhibba Lama)
                    </button>
                    <button
                      onClick={() => {
                        setQuantityKg(500);
                        setLastTranscript(lang === 'om' ? 'Dhibba shan' : 'አምስት መቶ ኪሎ');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      500 KG (Dhibba Shan)
                    </button>
                    <button
                      onClick={() => {
                        setQuantityKg(1000);
                        setLastTranscript(lang === 'om' ? 'Kuma tokko' : 'አንድ ሺህ ኪሎ');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      1,000 KG (Kuma Tokko)
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setAskingPrice(1000);
                        setLastTranscript(lang === 'om' ? 'Qarshii dhibba afur' : 'አራት መቶ ብር');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      1,000 ETB (Kuma Tokko)
                    </button>
                    <button
                      onClick={() => {
                        setAskingPrice(1150);
                        setLastTranscript(lang === 'om' ? 'Qarshii dhibba afurii fi shantama' : 'አራት መቶ ሃምሳ ብር');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      1,150 ETB / kg
                    </button>
                    <button
                      onClick={() => {
                        setAskingPrice(500);
                        setLastTranscript(lang === 'om' ? 'Qarshii dhibba shan' : 'አምስት መቶ ብር');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-coffee-50 hover:bg-gold-100 border border-coffee-200 text-xs font-bold text-coffee-800"
                    >
                      500 ETB (Dhibba Shan)
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Photo Upload & AI Quality Grading */}
        {currentStep === 3 && manualGrading && (
          <div className="space-y-4 py-2">
            {photoPreview && <img src={photoPreview} alt="Coffee beans preview" className="w-full max-h-40 object-cover rounded-xl border border-coffee-200" />}
            <ManualGradeForm
              title={manualGrading.title}
              message={manualGrading.message}
              photoUrl={manualGrading.photoUrl}
              initialPrice={askingPrice || undefined}
              submitLabel={lang === 'om' ? 'Itti fufi (Continue)' : 'ቀጥል (Continue)'}
              retrying={isProcessing}
              onRetry={beanPhoto ? () => handlePhotoUpload(beanPhoto) : undefined}
              onSubmit={(result) => {
                setGradingResult(result);
                setAskingPrice(result.asking_price_etb);
                setManualGrading(null);
                setCurrentStep(4);
              }}
            />
          </div>
        )}

        {currentStep === 3 && !manualGrading && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3 rounded-2xl border border-coffee-200 bg-white p-4">
              <label className="text-xs font-bold text-coffee-700">Woreda<input value={woreda} onChange={(event) => setWoreda(event.target.value)} required className="mt-1 w-full rounded-xl border border-coffee-200 px-3 py-2.5 font-medium outline-none focus:border-forest-500" placeholder="Mana" /></label>
              <label className="text-xs font-bold text-coffee-700">Kebele<input value={kebele} onChange={(event) => setKebele(event.target.value)} required className="mt-1 w-full rounded-xl border border-coffee-200 px-3 py-2.5 font-medium outline-none focus:border-forest-500" placeholder="Kenteri" /></label>
            </div>
            <div className="p-6 rounded-2xl bg-coffee-50 border-2 border-dashed border-coffee-300 text-center">
              <Camera className="w-12 h-12 text-forest-600 mx-auto mb-3" />
              <p className="text-coffee-950 font-extrabold text-sm mb-1">
                {lang === 'om' ? 'Suuraa Bunaa Kaasaa' : 'የቡና ፍሬዎን ፎቶ አንሱ'}
              </p>
              <p className="text-xs text-coffee-500 mb-4">
                {lang === 'om'
                  ? 'ECX Grade fi qulqullina buna keessanii beekuuf'
                  : 'የኢ.ሲ.ኤክስ ደረጃውን እና ጥራቱን ለማረጋገጥ'}
              </p>

              <input
                type="file"
                accept="image/*"
                capture="environment"
                id="voice-camera-input"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handlePhotoUpload(f);
                }}
              />

              <button
                type="button"
                onClick={() => document.getElementById('voice-camera-input')?.click()}
                disabled={isProcessing}
                className="px-6 py-3 rounded-2xl bg-forest-600 hover:bg-forest-500 text-white font-extrabold text-xs shadow-lg flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95"
              >
                <Camera className="w-4 h-4" />
                <span>
                  {isProcessing
                    ? lang === 'om'
                      ? 'Qorachaa jira...'
                      : 'እየመረመረ ነው...'
                    : lang === 'om'
                    ? 'Suuraa Kaasi / Filadhu'
                    : 'ፎቶ አንሳ / ምረጥ'}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                photoRunRef.current++;
                setIsProcessing(false);
                setManualGrading({
                  title: lang === 'om' ? 'Grade harkaan galchi' : 'ደረጃ በእጅ ያስገቡ',
                  message: isProcessing
                    ? 'You stopped waiting for the AI. Choose the ECX grade and your asking price below.'
                    : 'Choose the ECX grade and your asking price below.',
                });
              }}
              className="w-full py-2.5 rounded-xl border border-coffee-300 text-coffee-800 font-semibold text-xs hover:bg-coffee-50 transition-colors"
            >
              {lang === 'om' ? 'Grade fi gatii harkaan galchi (without AI)' : 'ደረጃና ዋጋ በእጅ አስገባ (without AI)'}
            </button>

            {/* Quick Demo Sample Photo Button */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setGradingResult({
                    grade_tier: 'Washed G2',
                    processing_type: 'Washed',
                    estimated_price_min_etb: 965,
                    estimated_price_max_etb: 1130,
                    provider: 'sample',
                  });
                  if (!askingPrice) setAskingPrice(midpointPrice(965, 1130, 0));
                  setCurrentStep(4);
                }}
                className="text-xs text-forest-700 hover:underline font-bold"
              >
                {lang === 'om'
                  ? '⚡ Fakkeenya Buna Grade 2 Fayyadamaa (Quick Sample)'
                  : '⚡ የምርጥ ቡና ናሙና ተጠቀም (Quick Sample)'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Final Summary & One-Tap Publish */}
        {currentStep === 4 && (
          <div className="space-y-4 py-2 animate-in fade-in">
            {/* AI Grading Card */}
            <GradedByBadge result={gradingResult} />
            <div className="p-4 rounded-2xl bg-gradient-to-br from-forest-600 to-emerald-800 text-white shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wider font-bold text-forest-200">
                  {gradingResult?.provider === 'manual'
                    ? lang === 'om' ? 'Grade harkaan galchame' : 'በእጅ የገባ ደረጃ'
                    : lang === 'om' ? 'Qulqullina AI Mirkanaa’e' : 'በአይ የተረጋገጠ የቡና ጥራት'}
                </span>
                {gradingResult?.provider !== 'manual' && (
                  <span className="px-2 py-0.5 rounded-full bg-white/20 text-white text-[11px] font-black">
                    Confidence: {isFallbackField(gradingResult, 'confidence') ? '—' : gradingResult?.confidence}
                    <FallbackTag show={isFallbackField(gradingResult, 'confidence')} />
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between">
                <div>
                  <h4 className="text-2xl font-black">{gradingResult?.grade_tier || '—'}<FallbackTag show={isFallbackField(gradingResult, 'grade_tier')} /></h4>
                  <p className="text-xs text-forest-100">
                    {gradingResult?.processing_type || '—'}
                    {gradingResult?.provider !== 'manual' && (
                      <> • Defect: {isFallbackField(gradingResult, 'defect_percentage') ? '—' : `${gradingResult?.defect_percentage}%`}<FallbackTag show={isFallbackField(gradingResult, 'defect_percentage')} /></>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-forest-200 block">ECX price range</span>
                  <span className="text-lg font-black text-gold-300">
                    {gradingResult?.estimated_price_min_etb && gradingResult?.estimated_price_max_etb
                      ? `${gradingResult.estimated_price_min_etb.toLocaleString()} - ${gradingResult.estimated_price_max_etb.toLocaleString()} ETB`
                      : '—'}
                  </span>
                </div>
              </div>
            </div>

            <PriceRangeEditor
              min={gradingResult?.estimated_price_min_etb}
              max={gradingResult?.estimated_price_max_etb}
              value={askingPrice || 0}
              onChange={setAskingPrice}
              gradeLabel={gradingResult?.grade_tier}
            />

            {/* Farmer Transaction Card */}
            <div className="p-4 rounded-2xl bg-coffee-50 border border-coffee-200 space-y-3">
              <div className="flex justify-between items-center text-xs"><span className="text-coffee-600 font-medium">Origin:</span><span className="font-bold text-coffee-950">{woreda}, {kebele}</span></div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-coffee-600 font-medium">
                  {lang === 'om' ? 'Baay’ina (Quantity):' : 'ብዛት (ኪሎ)፦'}
                </span>
                <span className="font-extrabold text-coffee-950 text-sm">
                  {quantityKg?.toLocaleString()} KG
                </span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-coffee-600 font-medium">
                  {lang === 'om' ? 'Gatii Gaafattan (Price/kg):' : 'የሚሸጥበት ዋጋ፦'}
                </span>
                <span className="font-extrabold text-forest-700 text-sm">
                  {askingPrice} ETB / kg
                </span>
              </div>

              <div className="border-t border-coffee-200 pt-2 flex justify-between items-center">
                <span className="text-xs font-bold text-coffee-800">
                  {lang === 'om' ? 'Gatii Waliigalaa (Total):' : 'ጠቅላላ ዋጋ፦'}
                </span>
                <span className="text-lg font-black text-gold-600">
                  {((quantityKg || 0) * (askingPrice || 0)).toLocaleString()} ETB
                </span>
              </div>
            </div>

            {/* Final Publish Button */}
            <button
              type="button"
              onClick={handleConfirmPublish}
              disabled={isProcessing}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-forest-600 to-emerald-600 hover:from-forest-500 hover:to-emerald-500 text-white font-black text-base shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-95"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>
                {isProcessing
                  ? lang === 'om'
                    ? 'Gurguraa jira...'
                    : 'እየለጠፈ ነው...'
                  : lang === 'om'
                  ? 'Mirkaneessi Gurguri (Publish Listing)'
                  : 'አረጋግጠህ ለጥፍ (Publish Listing)'}
              </span>
            </button>
          </div>
        )}

        {/* Reset / Start Over link */}
        <div className="mt-4 pt-3 border-t border-coffee-100 flex items-center justify-between text-xs text-coffee-500">
          <button
            onClick={() => {
              stopAudio();
              setCurrentStep(1);
              setQuantityKg(null);
              setAskingPrice(null);
              setBeanPhoto(null);
              setGradingResult(null);
              setManualGrading(null);
              photoRunRef.current++;
              setIsProcessing(false);
            }}
            className="hover:text-coffee-900 flex items-center gap-1 font-semibold"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{lang === 'om' ? 'Irra deebi’i jalqabi' : 'እንደገና ጀምር'}</span>
          </button>

          <span className="text-[11px] text-coffee-400">
            Powered by Addis AI & Gemini Vision
          </span>
        </div>
      </div>
    </div>
  );
}
