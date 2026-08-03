import { type FormEvent } from 'react';
import { AnalysisResult, Facility, HistoryItem } from '../types';
import { URGENCY_STYLES } from '../data';
import {
  ClipboardList,
  ArrowRight,
  Activity,
  Compass,
  UserRound,
  FlaskConical,
  ShieldCheck,
  Info,
  ChevronRight,
  Building2,
  CalendarClock,
  Star,
  MapPin,
  Upload,
  Trash2,
  Download,
  Clock,
  Stethoscope,
} from 'lucide-react';

interface TriageFormProps {
  patientPhone: string; // <--- Dodane
  setPatientPhone: (val: string) => void; // <--- Dodane
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
  patientPhone, // <--- Odbieramy
  setPatientPhone, // <--- Odbieramy
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
          <div className="flex items-center gap-2.5 mb-4">
            <ClipboardList className="h-5 w-5 text-sage-500" />
            <h2 className="text-base font-semibold text-ink-900">Opisz swoje objawy lub dodaj zdjęcie</h2>
          </div>
          
          {/* POPRAWNE MIEJSCE NA INPUT TELEFONU (Wewnątrz formularza) */}
          <div className="mb-4">
              <label className="block text-xs font-semibold text-ink-700 mb-1">Twój numer telefonu (opcjonalnie, do powiązania historii):</label>
              <input 
                  type="tel" 
                  value={patientPhone} 
                  onChange={(e) => setPatientPhone(e.target.value)} 
                  placeholder="np. 123 456 789" 
                  className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50" 
              />
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

      {/* Wynik analizy AI */}
      <section className="mt-7 print:mt-0">
        {loading && (
          <div className="flex items-center justify-center gap-3 rounded-3xl border border-ink-100 bg-white/70 py-16 shadow-card animate-fade-in print:hidden">
            <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-sage-200 border-t-sage-500" />
            <span className="text-sm font-medium text-ink-500">Przygotowuję sugestię triażową z AI...</span>
          </div>
        )}

        {!loading && result && (
          <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white/85 shadow-card backdrop-blur-sm animate-fade-up print:border-none print:shadow-none print:bg-white print:rounded-none">
            <div className="hidden print:block mb-8 border-b border-ink-100 pb-6">
              <div className="flex items-center gap-3 mb-4"><Stethoscope className="h-8 w-8 text-sage-600" /><h1 className="text-2xl font-bold text-ink-900">Raport Triażowy pacjenta - MedTriage</h1></div>
              <p className="text-sm text-ink-600"><strong>Data analizy:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
            </div>

            <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-r from-sage-50 to-teal-50/60 px-6 py-5 sm:px-7 print:bg-none print:px-0">
              <div className="flex items-center gap-2.5"><ShieldCheck className="h-5 w-5 text-sage-600 print:text-ink-900" /><h3 className="text-base font-semibold text-ink-900">Wynik analizy triażowej AI</h3></div>
              <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold print:border-ink-200 print:text-ink-900 ${URGENCY_STYLES[result.urgency]}`}>Priorytet: {result.urgency}</span>
            </div>

            <div className="grid gap-px bg-ink-100 sm:grid-cols-2 print:grid-cols-2 print:bg-ink-200 print:border-b print:border-ink-200">
              <div className="bg-white p-6 sm:p-7 print:p-4">
                <div className="flex items-center gap-2.5 text-sage-600 print:text-ink-500"><Compass className="h-4.5 w-4.5" /><span className="text-[0.72rem] font-semibold uppercase tracking-wider">Sugerowany kierunek</span></div>
                <p className="mt-2.5 text-xl font-bold text-ink-900">{result.direction}</p>
              </div>
              <div className="bg-white p-6 sm:p-7 print:p-4">
                <div className="flex items-center gap-2.5 text-teal-600 print:text-ink-500"><UserRound className="h-4.5 w-4.5" /><span className="text-[0.72rem] font-semibold uppercase tracking-wider">Rekomendowany specjalista</span></div>
                <p className="mt-2.5 text-xl font-bold text-ink-900">{result.specialist}</p>
              </div>
            </div>

            <div className="border-t border-ink-100 bg-white p-6 sm:p-7 print:border-none print:px-0">
              <div className="flex items-center gap-2.5 text-sand-500 print:text-ink-500"><FlaskConical className="h-4.5 w-4.5" /><span className="text-[0.72rem] font-semibold uppercase tracking-wider">Zalecane badania wstępne</span></div>
              <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 print:grid-cols-1">
                {result.tests.map((test) => (
                  <li key={test} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-sage-50/40 px-4 py-3 print:border-none print:bg-transparent print:p-1">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600 print:hidden"><ChevronRight className="h-3.5 w-3.5" /></span>
                    <span className="text-sm font-medium text-ink-800">{test}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-ink-100 bg-white p-6 sm:px-7 print:hidden flex justify-center">
              <button onClick={() => window.print()} className="group inline-flex items-center gap-2.5 rounded-2xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-ink-800 hover:shadow-card cursor-pointer">
                <Download className="h-4.5 w-4.5 transition-transform group-hover:-translate-y-0.5" /> Pobierz raport dla lekarza (PDF)
              </button>
            </div>
          </div>
        )}
      </section>

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
