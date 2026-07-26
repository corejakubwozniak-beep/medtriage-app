import { useState, type FormEvent } from 'react';
import { analyzeSymptomsWithGemini } from './gemini';
import {
  Stethoscope,
  Activity,
  ClipboardList,
  ArrowRight,
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
  CheckCircle2,
  X,
  Zap,
  Upload,
  Trash2,
  Download,
  Clock,
} from 'lucide-react';

type AnalysisResult = {
  direction: string;
  directionNote: string;
  specialist: string;
  specialistNote: string;
  tests: string[];
  urgency: 'Planowy' | 'Standardowy' | 'Pilny';
};

// Nowy typ dla historii
type HistoryItem = {
  id: string;
  date: string;
  symptoms: string;
  hasImage: boolean;
  result: AnalysisResult;
};

const CARDIAC_RESULT: AnalysisResult = {
  direction: 'Kardiologia',
  directionNote:
    'Opisane objawy mogą wskazywać na krążeniowe podłoże dolegliwości. Zalecana konsultacja w kierunku chorób serca i naczyń.',
  specialist: 'Kardiolog',
  specialistNote:
    'Specjalista oceni ryzyko sercowo-naczyniowe i zleci odpowiedni panel diagnostyczny.',
  tests: [
    'EKG spoczynkowe (12 odprowadzeń)',
    'Echokardiografia serca',
    'Morfologia krwi + lipidogram',
    'Troponina wysokoczuła',
  ],
  urgency: 'Standardowy',
};

const GENERAL_RESULT: AnalysisResult = {
  direction: 'Diagnostyka ogólna',
  directionNote:
    'Opisane objawy nie wskazują jednoznacznie na konkretną dziedzinę. Zalecana szeroka diagnostyka wstępna u lekarza pierwszego kontaktu.',
  specialist: 'Lekarz rodzinny',
  specialistNote:
    'Lekarz pierwszego kontaktu zbierze wywiad, zleci badania wstępne i w razie potrzeby skieruje do specjalisty.',
  tests: [
    'Morfologia krwi',
    'CRP / OB',
    'Badanie ogólne moczu',
    'Glukoza na czczo',
  ],
  urgency: 'Planowy',
};

const URGENCY_STYLES: Record<AnalysisResult['urgency'], string> = {
  Planowy: 'bg-sage-100 text-sage-700 border-sage-200',
  Standardowy: 'bg-teal-50 text-teal-700 border-teal-200',
  Pilny: 'bg-sand-100 text-sand-500 border-sand-200',
};

type Facility = {
  name: string;
  address: string;
  earliestSlot: string;
  isFastest: boolean;
  doctor: string;
  rating: number;
};

const CARDIAC_FACILITIES: Facility[] = [
  {
    name: 'Klinika Kardiologiczna ProMed',
    address: 'ul. Kardiologiczna 12, Warszawa',
    earliestSlot: 'Dziś, godz. 16:30',
    isFastest: true,
    doctor: 'dr n. med. Jan Kowalski',
    rating: 4.9,
  },
  {
    name: 'Centrum Medyczne Diagnostyka+',
    address: 'al. Niepodległości 220, Warszawa',
    earliestSlot: 'Jutro, godz. 09:00',
    isFastest: false,
    doctor: 'dr Anna Wiśniewska',
    rating: 4.7,
  },
];

const GENERAL_FACILITIES: Facility[] = [
  {
    name: 'Centrum Medyczne Diagnostyka+',
    address: 'al. Niepodległości 220, Warszawa',
    earliestSlot: 'Dziś, godz. 17:15',
    isFastest: true,
    doctor: 'dr Piotr Nowak',
    rating: 4.8,
  },
  {
    name: 'Przychodnia Rodzinna Zdrowie',
    address: 'ul. Słoneczna 5, Warszawa',
    earliestSlot: 'Jutro, godz. 10:30',
    isFastest: false,
    doctor: 'dr Maria Lewandowska',
    rating: 4.6,
  },
];

function facilitiesForResult(result: AnalysisResult | null): Facility[] {
  if (!result) return [];
  return result.direction === 'Kardiologia' ? CARDIAC_FACILITIES : GENERAL_FACILITIES;
}

function App() {
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(CARDIAC_RESULT);
  const [bookedFacility, setBookedFacility] = useState<Facility | null>(null);

  const [imageFile, setImageFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Inicjalizacja historii z localStorage
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('medtriage_history');
    return saved ? JSON.parse(saved) : [];
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const resultStr = reader.result as string;
      const base64Data = resultStr.split(',')[1];

      setImageFile({
        base64: base64Data,
        mimeType: file.type,
      });
      setImagePreview(resultStr);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('medtriage_history');
  };

  const loadFromHistory = (item: HistoryItem) => {
    setSymptoms(item.symptoms);
    setResult(item.result);
    setImageFile(null);
    setImagePreview(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!symptoms.trim() && !imageFile) || loading) return;

    setLoading(true);
    setProgress(10);
    setResult(null);

    const interval = setInterval(() => {
      setProgress((prev) => (prev >= 90 ? 90 : prev + 5));
    }, 150);

    try {
      const rawAiResult = await analyzeSymptomsWithGemini(symptoms, imageFile);

      const mappedResult: AnalysisResult = {
        direction: rawAiResult.direction || 'Diagnostyka Ogólna',
        directionNote: rawAiResult.explanation || 'Przeanalizowano opisane objawy oraz załączone materiały.',
        specialist: rawAiResult.specialist || 'Lekarz Rodzinny',
        specialistNote: `Sugerowana konsultacja: ${rawAiResult.specialist || 'Lekarz Rodzinny'}.`,
        tests: rawAiResult.tests || rawAiResult.recommendedTests || ['Morfologia krwi', 'Badanie ogólne'],
        urgency: (['Planowy', 'Standardowy', 'Pilny'].includes(rawAiResult.priority)
          ? rawAiResult.priority
          : 'Standardowy') as AnalysisResult['urgency'],
      };

      setProgress(100);
      setResult(mappedResult);

      // Zapisywanie do historii i localStorage (max 10 elementów)
      const newItem: HistoryItem = {
        id: Date.now().toString(),
        date: new Date().toLocaleString(),
        symptoms: symptoms.trim() || 'Przeanalizowano wyłącznie zdjęcie',
        hasImage: !!imageFile,
        result: mappedResult,
      };
      
      const newHistory = [newItem, ...history].slice(0, 10);
      setHistory(newHistory);
      localStorage.setItem('medtriage_history', JSON.stringify(newHistory));

    } catch (error) {
      console.error('Błąd podczas analizy objawów:', error);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 print:px-0 print:py-0 print:max-w-none">
        
        {/* Header - Ukryty w PDF */}
        <header className="animate-fade-up print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-400 to-teal-500 text-white shadow-soft">
              <Stethoscope className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[1.7rem]">
                MedTriage
              </h1>
              <p className="text-sm font-medium text-ink-500">
                Inteligentny asystent triażowy AI
              </p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-600 text-balance">
            Wpisz swoje objawy lub załącz zdjęcie wyników badań / zmiany skórnej. Asystent zasugeruje kierunek diagnostyczny,
            rekomendowanego specjalistę oraz badania wstępne.
          </p>
        </header>

        {/* Disclaimer banner - Ukryty w PDF */}
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50/70 px-4 py-3.5 animate-fade-up print:hidden" style={{ animationDelay: '0.05s' }}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-500" />
          <p className="text-[0.82rem] leading-relaxed text-ink-700">
            Wynik ma charakter informacyjny. W przypadku nagłych lub nasilonych objawów
            skontaktuj się z numerem alarmowym 112 lub udaj się na SOR.
          </p>
        </div>

        {/* Form - Ukryty w PDF */}
        <section className="mt-7 animate-fade-up print:hidden" style={{ animationDelay: '0.1s' }}>
          <form
            onSubmit={handleSubmit}
            className="rounded-3xl border border-ink-100 bg-white/80 p-6 shadow-card backdrop-blur-sm sm:p-7"
          >
            <div className="flex items-center gap-2.5">
              <ClipboardList className="h-5 w-5 text-sage-500" />
              <h2 className="text-base font-semibold text-ink-900">
                Opisz swoje objawy lub dodaj zdjęcie
              </h2>
            </div>
            <p className="mt-1.5 text-sm text-ink-500">
              Wpisz dolegliwości lub załącz plik z wynikami badań / zdjęciem.
            </p>

            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={4}
              placeholder="np. ból w klatce piersiowej przy wysiłku,&#10;duszności,&#10;kołatanie serca"
              className="mt-4 w-full resize-none rounded-2xl border border-ink-200 bg-sage-50/40 px-4 py-3.5 text-[0.95rem] text-ink-900 placeholder:text-ink-400 transition-all duration-200 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-400/15"
            />

            {/* ZDJĘCIE */}
            <div className="mt-4">
              {!imagePreview ? (
                <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 bg-sage-50/30 px-4 py-3 text-xs font-semibold text-ink-600 transition-all duration-200 hover:border-sage-300 hover:bg-sage-50/80">
                  <Upload className="h-4 w-4 text-sage-600" />
                  <span>Dodaj zdjęcie wyników badań / wypisu / zmiany skórnej</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              ) : (
                <div className="relative flex items-center justify-between rounded-2xl border border-sage-200 bg-sage-50/70 p-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={imagePreview}
                      alt="Podgląd"
                      className="h-12 w-12 rounded-xl object-cover shadow-sm"
                    />
                    <span className="truncate text-xs font-semibold text-ink-800">
                      Zdjęcie dołączone do analizy AI
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-white hover:text-sand-500"
                    aria-label="Usuń zdjęcie"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            <div className="mt-5 flex flex-col-reverse items-center gap-3 sm:flex-row sm:justify-between">
              <span className="text-xs text-ink-400">
                {symptoms.trim() || imageFile
                  ? 'Gotowe do analizy z AI'
                  : 'Wpisz objawy lub załącz zdjęcie'}
              </span>
              <div className="w-full sm:w-auto">
                <button
                  type="submit"
                  disabled={(!symptoms.trim() && !imageFile) || loading}
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:from-sage-600 hover:to-teal-600 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-sage-400/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto"
                >
                  {loading && (
                    <span
                      className="absolute bottom-0 left-0 h-1 bg-white/70 transition-[width] duration-75 ease-linear"
                      style={{ width: `${progress}%` }}
                    />
                  )}
                  {loading ? (
                    <>
                      <Activity className="h-4 w-4 animate-pulse-soft" />
                      Analizuję (Vision AI)...
                    </>
                  ) : (
                    <>
                      Rozpocznij analizę
                      <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </section>

        {/* Result card */}
        <section className="mt-7 print:mt-0">
          {loading && (
            <div className="flex items-center justify-center gap-3 rounded-3xl border border-ink-100 bg-white/70 py-16 shadow-card animate-fade-in print:hidden">
              <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-sage-200 border-t-sage-500" />
              <span className="text-sm font-medium text-ink-500">
                Przygotowuję sugestię triażową z AI...
              </span>
            </div>
          )}

          {!loading && result && (
            <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white/85 shadow-card backdrop-blur-sm animate-fade-up print:border-none print:shadow-none print:bg-white print:rounded-none">
              
              {/* Sekcja widoczna TYLKO na wydruku PDF (ukryta na ekranie) */}
              <div className="hidden print:block mb-8 border-b border-ink-100 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <Stethoscope className="h-8 w-8 text-sage-600" />
                  <h1 className="text-2xl font-bold text-ink-900">Raport Triażowy pacjenta - MedTriage</h1>
                </div>
                <p className="text-sm text-ink-600"><strong>Data analizy:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                
                {(symptoms || imagePreview) && (
                  <div className="mt-6 p-4 bg-sage-50 rounded-xl">
                    <p className="text-sm font-bold text-ink-900 mb-1">Dane wejściowe przekazane do analizy:</p>
                    {symptoms && <p className="text-sm text-ink-800 whitespace-pre-wrap">{symptoms}</p>}
                    {imagePreview && <p className="text-sm text-ink-500 mt-2 italic">[Załączono plik graficzny z wynikami / zmianą]</p>}
                  </div>
                )}
              </div>

              {/* Card header */}
              <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-r from-sage-50 to-teal-50/60 px-6 py-5 sm:px-7 print:bg-none print:px-0">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-sage-600 print:text-ink-900" />
                  <h3 className="text-base font-semibold text-ink-900">
                    Wynik analizy triażowej AI
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold print:border-ink-200 print:text-ink-900 ${URGENCY_STYLES[result.urgency]}`}
                >
                  Priorytet: {result.urgency}
                </span>
              </div>

              <div className="grid gap-px bg-ink-100 sm:grid-cols-2 print:grid-cols-2 print:bg-ink-200 print:border-b print:border-ink-200">
                {/* Suggested direction */}
                <div className="bg-white p-6 sm:p-7 print:p-4">
                  <div className="flex items-center gap-2.5 text-sage-600 print:text-ink-500">
                    <Compass className="h-4.5 w-4.5" />
                    <span className="text-[0.72rem] font-semibold uppercase tracking-wider">
                      Sugerowany kierunek
                    </span>
                  </div>
                  <p className="mt-2.5 text-xl font-bold text-ink-900">
                    {result.direction}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {result.directionNote}
                  </p>
                </div>

                {/* Recommended specialist */}
                <div className="bg-white p-6 sm:p-7 print:p-4">
                  <div className="flex items-center gap-2.5 text-teal-600 print:text-ink-500">
                    <UserRound className="h-4.5 w-4.5" />
                    <span className="text-[0.72rem] font-semibold uppercase tracking-wider">
                      Rekomendowany specjalista
                    </span>
                  </div>
                  <p className="mt-2.5 text-xl font-bold text-ink-900">
                    {result.specialist}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-ink-600">
                    {result.specialistNote}
                  </p>
                </div>
              </div>

              {/* Recommended tests */}
              <div className="border-t border-ink-100 bg-white p-6 sm:p-7 print:border-none print:px-0">
                <div className="flex items-center gap-2.5 text-sand-500 print:text-ink-500">
                  <FlaskConical className="h-4.5 w-4.5" />
                  <span className="text-[0.72rem] font-semibold uppercase tracking-wider">
                    Zalecane badania wstępne
                  </span>
                </div>
                <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 print:grid-cols-1">
                  {result.tests.map((test) => (
                    <li
                      key={test}
                      className="group flex items-center gap-3 rounded-xl border border-ink-100 bg-sage-50/40 px-4 py-3 print:border-none print:bg-transparent print:p-1"
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600 print:bg-transparent print:w-4">
                        <ChevronRight className="h-3.5 w-3.5 print:hidden" />
                        <span className="hidden print:inline-block font-bold text-ink-900">•</span>
                      </span>
                      <span className="text-sm font-medium text-ink-800">
                        {test}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* PRZYCISK PDF (Ukryty na wydruku) */}
              <div className="border-t border-ink-100 bg-white p-6 sm:px-7 print:hidden flex justify-center">
                <button
                  onClick={() => window.print()}
                  className="group inline-flex items-center gap-2.5 rounded-2xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-ink-800 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-ink-900/20"
                >
                  <Download className="h-4.5 w-4.5 transition-transform group-hover:-translate-y-0.5" />
                  Pobierz raport dla lekarza (PDF)
                </button>
              </div>

              {/* Footer note */}
              <div className="border-t border-ink-100 bg-sage-50/50 px-6 py-4 sm:px-7 print:bg-white print:px-0 print:mt-10">
                <p className="flex items-start gap-2 text-[0.78rem] leading-relaxed text-ink-500">
                  <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                  Raport wygenerowany przez asystenta sztucznej inteligencji MedTriage na podstawie przekazanych danych. 
                  Dokument ma charakter informacyjny, wspomagający proces diagnostyczny i nie zastępuje profesjonalnej diagnozy lekarskiej.
                </p>
              </div>
            </div>
          )}
        </section>

        {/* Nearest available slots - Ukryte w PDF */}
        {!loading && result && (
          <section className="mt-7 animate-fade-up print:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <CalendarClock className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-semibold text-ink-900">
                Najbliższe wolne terminy w połączonych placówkach
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {facilitiesForResult(result).map((facility) => (
                <div
                  key={facility.name}
                  className="flex flex-col rounded-3xl border border-ink-100 bg-white/85 p-5 shadow-card backdrop-blur-sm transition-all duration-200 hover:border-sage-200 hover:shadow-card sm:p-6"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sage-100 text-sage-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[0.95rem] font-bold leading-snug text-ink-900">
                        {facility.name}
                      </h3>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-500">
                        <MapPin className="h-3.5 w-3.5 shrink-0" />
                        {facility.address}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                        facility.isFastest
                          ? 'border-sage-300 bg-sage-100 text-sage-700'
                          : 'border-ink-200 bg-ink-50 text-ink-600'
                      }`}
                    >
                      {facility.isFastest && <Zap className="h-3.5 w-3.5" />}
                      {facility.earliestSlot}
                    </span>
                    {facility.isFastest && (
                      <span className="inline-flex items-center rounded-full bg-sage-500 px-2.5 py-1 text-[0.68rem] font-bold uppercase tracking-wide text-white">
                        Najszybszy termin
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-2 rounded-2xl bg-sage-50/50 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-sage-600 shadow-soft">
                        <UserRound className="h-4 w-4" />
                      </div>
                      <div className="leading-tight">
                        <p className="text-sm font-semibold text-ink-900">
                          {facility.doctor}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-ink-500">
                          <Star className="h-3 w-3 fill-sand-400 text-sand-400" />
                          {facility.rating.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setBookedFacility(facility)}
                    className="group mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:from-sage-600 hover:to-teal-600 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-sage-400/25"
                  >
                    Szybka rezerwacja
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* SEKCJA HISTORII - Ukryta w PDF */}
        {history.length > 0 && (
          <section className="mt-12 animate-fade-up print:hidden">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <Clock className="h-5 w-5 text-ink-500" />
                <h2 className="text-base font-semibold text-ink-900">
                  Historia Twoich analiz
                </h2>
              </div>
              <button
                onClick={clearHistory}
                className="text-xs font-semibold text-ink-400 hover:text-sand-500 transition-colors"
              >
                Wyczyść historię
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-ink-100 bg-white/60 p-4 text-left shadow-sm transition-all hover:border-sage-200 hover:bg-white hover:shadow-card focus:outline-none"
                >
                  <div className="flex w-full items-center justify-between">
                    <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-ink-400">
                      {item.date}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold ${URGENCY_STYLES[item.result.urgency]}`}>
                      {item.result.urgency}
                    </span>
                  </div>
                  <p className="line-clamp-2 text-sm font-medium text-ink-900">
                    {item.symptoms}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-xs text-sage-600">
                    <Compass className="h-3.5 w-3.5" />
                    <span className="font-semibold">{item.result.direction}</span>
                    {item.hasImage && (
                      <span className="ml-auto inline-flex items-center gap-1 rounded bg-ink-100 px-1.5 py-0.5 text-[0.65rem] font-semibold text-ink-600">
                        <Upload className="h-3 w-3" />
                        Zdjęcie
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Booking confirmation modal */}
        {bookedFacility && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-5 backdrop-blur-sm animate-fade-in"
            onClick={() => setBookedFacility(null)}
          >
            <div
              className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-7 shadow-card animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setBookedFacility(null)}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                  <CheckCircle2 className="h-9 w-9" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink-900">
                  Rezerwacja potwierdzona!
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Wyniki badania zostaną automatycznie przesłane do analizy AI.
                </p>

                <div className="mt-5 w-full rounded-2xl border border-ink-100 bg-sage-50/50 px-4 py-3.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 shrink-0 text-sage-600" />
                    <p className="text-sm font-semibold text-ink-900">
                      {bookedFacility.name}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-teal-600" />
                    <p className="text-sm text-ink-700">
                      {bookedFacility.earliestSlot}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <UserRound className="h-4 w-4 shrink-0 text-ink-500" />
                    <p className="text-sm text-ink-700">
                      {bookedFacility.doctor}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setBookedFacility(null)}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:from-sage-600 hover:to-teal-600 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-sage-400/25"
                >
                  Gotowe
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer - Ukryty w PDF */}
        <footer className="mt-10 text-center print:hidden">
          <p className="text-xs text-ink-400">
            MedTriage · Asystent wsparcia diagnostycznego · Nie jest urządzeniem medycznym
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
