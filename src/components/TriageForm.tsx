import { type FormEvent } from 'react';
import { Facility, HistoryItem, AnalysisResult } from '../types';
import { URGENCY_STYLES } from '../data';
import AiReport from './AiReport';
import {
  ClipboardList,
  ArrowRight,
  Activity,
  Building2,
  CalendarClock,
  MapPin,
  Upload,
  Trash2,
  Clock,
} from 'lucide-react';

interface TriageFormProps {
  symptoms: string;
  setSymptoms: (val: string) => void;
  imageFile: { base64: string; mimeType: string } | null;
  imagePreview: string | null;
  handleImageChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: () => void;
  handleSubmit: (e: FormEvent) => void;
  loading: boolean;
  progress: number;
  result: AnalysisResult | null;
  facilities: Facility[];
  setSelectedSlot: (slot: any) => void;
  setBookedFacility: (facility: Facility) => void;
  history: HistoryItem[];
  loadFromHistory: (item: HistoryItem) => void;
  clearHistory: () => void;
}

export default function TriageForm({
  symptoms,
  setSymptoms,
  imageFile,
  imagePreview,
  handleImageChange,
  removeImage,
  handleSubmit,
  loading,
  progress,
  result,
  facilities,
  setSelectedSlot,
  setBookedFacility,
  history,
  loadFromHistory,
  clearHistory,
}: TriageFormProps) {
  return (
    <>
      <section className="mt-7 animate-fade-up print:hidden" style={{ animationDelay: '0.1s' }}>
        <form onSubmit={handleSubmit} className="rounded-3xl border border-ink-100 bg-white/80 p-6 shadow-card backdrop-blur-sm sm:p-7">
          <div className="flex items-center gap-2.5">
            <ClipboardList className="h-5 w-5 text-sage-500" />
            <h2 className="text-base font-semibold text-ink-900">Opisz swoje objawy lub dodaj zdjęcie</h2>
          </div>
          <textarea 
            value={symptoms} 
            onChange={(e) => setSymptoms(e.target.value)} 
            rows={4} 
            placeholder="np. ból w klatce piersiowej przy wysiłku..." 
            className="mt-4 w-full resize-none rounded-2xl border border-ink-200 bg-sage-50/40 px-4 py-3.5 text-[0.95rem] text-ink-900 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-400/15" 
          />
          <div className="mt-4">
            {!imagePreview ? (
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-sage-50/30 px-4 py-3 text-xs font-semibold text-ink-600 hover:bg-sage-50/80">
                <Upload className="h-4 w-4 text-sage-600" />
                <span>Dodaj zdjęcie wyników badań / wypisu / zmiany skórnej</span>
                <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
              </label>
            ) : (
              <div className="relative flex items-center justify-between rounded-2xl border border-sage-200 bg-sage-50/70 p-3">
                <div className="flex items-center gap-3 overflow-hidden">
                  <img src={imagePreview} alt="Podgląd" className="h-12 w-12 rounded-xl object-cover shadow-sm" />
                  <span className="truncate text-xs font-semibold text-ink-800">Zdjęcie dołączone do analizy AI</span>
                </div>
                <button type="button" onClick={removeImage} className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-400 hover:bg-white hover:text-sand-500 cursor-pointer"><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
          <div className="mt-5 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
            <span className="text-xs text-ink-400">{symptoms.trim() || imageFile ? 'Gotowe do analizy' : 'Wpisz objawy lub załącz zdjęcie'}</span>
            <button type="submit" disabled={(!symptoms.trim() && !imageFile) || loading} className="group relative inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-6 py-3.5 text-sm font-semibold text-white shadow-soft hover:from-sage-600 hover:to-teal-600 disabled:opacity-50 sm:w-auto cursor-pointer">
              {loading && <span className="absolute bottom-0 left-0 h-1 bg-white/70 transition-[width] duration-75" style={{ width: `${progress}%` }} />}
              {loading ? <><Activity className="h-4 w-4 animate-pulse-soft" />Analizuję (Vision AI)...</> : <><ArrowRight className="h-4 w-4" />Rozpocznij analizę</>}
            </button>
          </div>
        </form>
      </section>

      {/* Wywołanie nowego komponentu raportu AI */}
      <AiReport loading={loading} result={result} />

      {/* Lista dostępnych placówek */}
      {!loading && result && (
        <section className="mt-7 animate-fade-up print:hidden">
          <div className="mb-4 flex items-center gap-2.5">
            <CalendarClock className="h-5 w-5 text-teal-600" />
            <h2 className="text-base font-semibold text-ink-900">Dostępne placówki i wolne terminy</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {facilities.map((facility) => (
              <div key={facility.name} className="flex flex-col rounded-3xl border border-ink-100 bg-white/85 p-5 shadow-card backdrop-blur-sm transition-all duration-200 hover:border-sage-200 hover:shadow-card sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-600"><Building2 className="h-5 w-5" /></div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-[0.95rem] font-bold leading-snug text-ink-900">{facility.name}</h3>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500"><MapPin className="h-3.5 w-3.5 shrink-0" />{facility.address}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <p className="text-xs font-semibold text-ink-500 mb-2 uppercase tracking-wider">Wybierz termin wizyty:</p>
                  {facility.appointments && facility.appointments.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {facility.appointments.map((slot) => (
                        <button key={slot.id} onClick={() => { setSelectedSlot(slot); setBookedFacility(facility); }} className="inline-flex items-center gap-1.5 rounded-xl border border-sage-300 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-700 transition-all hover:bg-sage-600 hover:text-white cursor-pointer">
                          <span>📅 {slot.date}</span><span className="font-bold">godz. {slot.time.slice(0, 5)}</span>
                        </button>
                      ))}
                    </div>
                  ) : <p className="text-xs text-ink-400 italic">Brak wolnych terminów online</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Sekcja historii analiz */}
      {history.length > 0 && (
        <section className="mt-12 animate-fade-up print:hidden">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2.5"><Clock className="h-5 w-5 text-ink-500" /><h2 className="text-base font-semibold text-ink-900">Historia Twoich analiz</h2></div>
            <button onClick={clearHistory} className="text-xs font-semibold text-ink-400 hover:text-sand-500 cursor-pointer">Wyczyść historię</button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {history.map((item) => (
              <button key={item.id} onClick={() => loadFromHistory(item)} className="flex flex-col items-start gap-2 rounded-2xl border border-ink-100 bg-white/60 p-4 text-left shadow-sm transition-all hover:border-sage-200 hover:bg-white cursor-pointer">
                <div className="flex w-full items-center justify-between">
                  <span className="text-[0.7rem] font-semibold text-ink-400">{item.date}</span>
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${URGENCY_STYLES[item.result.urgency]}`}>{item.result.urgency}</span>
                </div>
                <p className="line-clamp-2 text-sm font-medium text-ink-900">{item.symptoms}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
