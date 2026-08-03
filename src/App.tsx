import { useState, useEffect, type FormEvent } from 'react';
import { analyzeSymptomsWithGemini } from './gemini';
import { supabase } from './supabase';
import { URGENCY_STYLES } from './data';
import { AnalysisResult, Facility, HistoryItem } from './types';
import AdminDashboard from './components/AdminDashboard'; // IMPORT NASZEGO NOWEGO KOMPONENTU
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
  Upload,
  Trash2,
  Download,
  Clock,
} from 'lucide-react';

let refreshPromise: Promise<any> | null = null;
async function lockedRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = supabase.auth.refreshSession().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

function App() {
  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const authEvent = event as string;
      if (authEvent === 'TOKEN_REFRESH_FAILED' || authEvent === 'SIGNED_OUT') {
        localStorage.clear();
        sessionStorage.clear();
        if (isMounted) setSession(null);
        return;
      }
      if (isMounted) {
        if (session?.user?.user_metadata?.role === 'admin') {
          setSession(session);
        } else {
          setSession(null);
        }
      }
    });

    lockedRefresh().then(({ data: { session } }) => {
      if (isMounted) {
        if (session?.user?.user_metadata?.role === 'admin') setSession(session);
        else setSession(null);
      }
    }).catch(() => {
      if (isMounted) setSession(null);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [bookedFacility, setBookedFacility] = useState<Facility | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [imageFile, setImageFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rodoAccepted, setRodoAccepted] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase.from('facilities').select(`*, appointments (id, date, time, status)`);
      if (error) { console.error(error); return; }
      if (data) {
        const mapped: Facility[] = data.map((item: any) => ({
          id: item.id,
          name: item.name,
          address: item.address,
          earliestSlot: item.earliest_slot,
          isFastest: item.is_fastest,
          doctor: item.doctor,
          rating: Number(item.rating),
          direction: item.direction,
          appointments: item.appointments?.filter((app: any) => app.status === 'available') || [],
        }));
        setFacilities(mapped);
      }
    } catch (error) { console.error(error); }
  };

  // Ładujemy placówki od razu po otwarciu aplikacji (dla pacjentów)
  useEffect(() => {
    fetchFacilities();
  }, []);

  useEffect(() => {
    const phone = patientPhone.trim();
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$/;

    if (phoneRegex.test(phone)) {
      async function fetchCloudHistory() {
        const { data, error } = await supabase.from('triage_history').select('*').eq('patient_phone', phone).order('created_at', { ascending: false }).limit(10);
        if (!error && data) {
          const mappedHistory: HistoryItem[] = data.map((item: any) => ({
            id: item.id.toString(),
            date: new Date(item.created_at).toLocaleString(),
            symptoms: item.symptoms,
            hasImage: item.has_image,
            result: { direction: item.direction, directionNote: 'Wczytano z historii chmurowej.', specialist: item.specialist, specialistNote: `Konsultacja: ${item.specialist}`, tests: item.tests || [], urgency: item.urgency }
          }));
          setHistory(mappedHistory);
        }
      }
      fetchCloudHistory();
    }
  }, [patientPhone]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      showToast('Błąd logowania: Nieprawidłowy email lub hasło.', 'error');
    } else {
      const userRole = data.session?.user?.user_metadata?.role;
      if (userRole === 'admin') {
        setSession(data.session);
        setEmail('');
        setPassword('');
        showToast('Zalogowano pomyślnie do panelu placówki!');
      } else {
        await supabase.auth.signOut();
        setSession(null);
        showToast('Brak uprawnień. To konto nie należy do personelu medycznego.', 'error');
      }
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast('Wylogowano pomyślnie.');
  };

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
      setImageFile({ base64: resultStr.split(',')[1], mimeType: file.type });
      setImagePreview(resultStr);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => { setImageFile(null); setImagePreview(null); };
  const clearHistory = () => { setHistory([]); localStorage.removeItem('medtriage_history'); showToast('Wyczyszczono historię analiz.'); };
  const loadFromHistory = (item: HistoryItem) => { setSymptoms(item.symptoms); setResult(item.result); removeImage(); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!symptoms.trim() && !imageFile) || loading) return;
    setLoading(true); setProgress(10); setResult(null);
    const interval = setInterval(() => setProgress((prev) => (prev >= 90 ? 90 : prev + 5)), 150);

    try {
      const rawAiResult = await analyzeSymptomsWithGemini(symptoms, imageFile);
      if (rawAiResult.error || rawAiResult.direction === 'Błąd analizy') throw new Error(rawAiResult.explanation || 'Błąd połączenia z modelem AI.');

      const mappedResult: AnalysisResult = {
        direction: rawAiResult.direction || 'Diagnostyka ogólna',
        directionNote: rawAiResult.explanation || 'Przeanalizowano objawy.',
        specialist: rawAiResult.specialist || 'Lekarz Rodzinny',
        specialistNote: `Sugerowana konsultacja: ${rawAiResult.specialist || 'Lekarz Rodzinny'}.`,
        tests: rawAiResult.tests || rawAiResult.recommendedTests || ['Morfologia krwi'],
        urgency: (['Planowy', 'Standardowy', 'Pilny'].includes(rawAiResult.priority) ? rawAiResult.priority : 'Standardowy') as AnalysisResult['urgency'],
      };

      setProgress(100); setResult(mappedResult);
      const phoneToUse = patientPhone.trim() || 'anonim';

      const { data: insertedData, error: dbError } = await supabase.from('triage_history').insert([{
        patient_phone: phoneToUse, symptoms: symptoms.trim() || 'Zdjęcie', direction: mappedResult.direction, specialist: mappedResult.specialist, urgency: mappedResult.urgency, tests: mappedResult.tests, has_image: !!imageFile
      }]).select().single();

      if (!dbError && insertedData) {
        const newItem: HistoryItem = { id: insertedData.id.toString(), date: new Date(insertedData.created_at).toLocaleString(), symptoms: insertedData.symptoms, hasImage: insertedData.has_image, result: mappedResult };
        setHistory((prev) => [newItem, ...prev].slice(0, 10));
      }
      showToast('Analiza zakończona!');
    } catch (error: any) {
      showToast(error.message || 'Wystąpił błąd AI.', 'error');
    } finally {
      clearInterval(interval); setLoading(false);
    }
  };

  return (
    <div className="min-h-screen print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 print:px-0 print:py-0 print:max-w-none">
        
        <button onClick={() => setIsAdminView(!isAdminView)} className="text-xs text-ink-400 hover:text-sage-600 transition-colors mt-2 cursor-pointer font-medium">
          {isAdminView ? '← Powrót do widoku pacjenta' : '🔒 Panel dla placówek medycznych'}
        </button>

        <header className="animate-fade-up print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-400 to-teal-500 text-white shadow-soft">
              <Stethoscope className="h-6 w-6" strokeWidth={2.2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900 sm:text-[1.7rem]">MedTriage</h1>
              <p className="text-sm font-medium text-ink-500">Inteligentny asystent triażowy AI</p>
            </div>
          </div>
          <p className="mt-5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-600 text-balance">
            Wpisz swoje objawy lub załącz zdjęcie wyników badań / zmiany skórnej. Asystent zasugeruje kierunek diagnostyczny, rekomendowanego specjalistę oraz badania wstępne.
          </p>
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50/70 px-4 py-3.5 animate-fade-up print:hidden" style={{ animationDelay: '0.05s' }}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-500" />
          <p className="text-[0.82rem] leading-relaxed text-ink-700">Wynik ma charakter informacyjny. W przypadku nagłych lub nasilonych objawów skontaktuj się z numerem alarmowym 112 lub udaj się na SOR.</p>
        </div>

        {isAdminView && (
          !session ? (
            <section className="mt-7 animate-fade-up max-w-sm mx-auto print:hidden">
              <form onSubmit={handleLogin} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-7">
                <div className="flex flex-col items-center mb-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600 mb-3">
                    <Building2 className="h-6 w-6" />
                  </div>
                  <h2 className="text-lg font-bold text-ink-900">Logowanie dla placówek</h2>
                  <p className="text-xs text-ink-500 text-center mt-1">Zaloguj się, aby zarządzać grafikiem wizyt.</p>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Adres e-mail</label>
                    <input type="email" value={email} autoComplete="email" onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50" required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Hasło</label>
                    <input type="password" value={password} autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50" required />
                  </div>
                  <button type="submit" className="w-full mt-2 rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-ink-700 hover:to-ink-800 cursor-pointer transition-all">Zaloguj się</button>
                </div>
              </form>
            </section>
          ) : (
            <AdminDashboard 
              session={session} 
              handleLogout={handleLogout} 
              facilities={facilities} 
              fetchFacilities={fetchFacilities} 
              showToast={showToast} 
            />
          )
        )}

        <section className="mt-7 animate-fade-up print:hidden" style={{ animationDelay: '0.1s' }}>
          <form onSubmit={handleSubmit} className="rounded-3xl border border-ink-100 bg-white/80 p-6 shadow-card backdrop-blur-sm sm:p-7">
            <div className="flex items-center gap-2.5">
              <ClipboardList className="h-5 w-5 text-sage-500" />
              <h2 className="text-base font-semibold text-ink-900">Opisz swoje objawy lub dodaj zdjęcie</h2>
            </div>
            <textarea value={symptoms} onChange={(e) => setSymptoms(e.target.value)} rows={4} placeholder="np. ból w klatce piersiowej przy wysiłku..." className="mt-4 w-full resize-none rounded-2xl border border-ink-200 bg-sage-50/40 px-4 py-3.5 text-[0.95rem] text-ink-900 focus:border-sage-400 focus:outline-none focus:ring-4 focus:ring-sage-400/15" />
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

        {/* Modal rezerwacji wizyty */}
        {bookedFacility && selectedSlot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-5 backdrop-blur-sm animate-fade-in print:hidden" onClick={() => { setBookedFacility(null); setSelectedSlot(null); }}>
            <div className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-7 shadow-card animate-fade-up" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setBookedFacility(null); setSelectedSlot(null); }} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 cursor-pointer"><X className="h-5 w-5" /></button>
              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600"><CheckCircle2 className="h-9 w-9" strokeWidth={2} /></div>
                <h3 className="mt-5 text-xl font-bold text-ink-900">Rezerwacja wizyty</h3>
                <p className="mt-2 text-sm text-ink-600">Wypełnij dane, aby potwierdzić termin.</p>

                <div className="mt-5 w-full space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Imię i nazwisko</label>
                    <input type="text" value={patientName} onChange={(e) => setPatientName(e.target.value)} placeholder="np. Jan Kowalski" className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Numer telefonu</label>
                    <input type="tel" value={patientPhone} onChange={(e) => setPatientPhone(e.target.value)} placeholder="np. 123 456 789" className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm" />
                  </div>
                  <div className="mt-3 flex items-start gap-2.5 pt-2">
                    <input type="checkbox" id="rodoCheckbox" checked={rodoAccepted} onChange={(e) => setRodoAccepted(e.target.checked)} className="mt-1 h-4 w-4 rounded border-ink-300 text-sage-600 cursor-pointer" />
                    <label htmlFor="rodoCheckbox" className="text-[0.75rem] text-ink-600 cursor-pointer">Wyrażam zgodę na przetwarzanie moich danych (zgodnie z RODO).</label>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!patientName.trim() || !rodoAccepted) { showToast('Uzupełnij dane i RODO', 'error'); return; }
                    const { data: updatedSlots, error } = await supabase.from('appointments').update({ 
                      status: 'booked', patient_info: `${patientName}, Tel: ${patientPhone}`, triage_direction: result?.specialist, urgency: result?.urgency, preliminary_tests: result?.tests 
                    }).eq('id', selectedSlot.id).eq('status', 'available').select();

                    if (error || !updatedSlots?.length) {
                      showToast('Błąd rezerwacji (termin zajęty?)', 'error');
                    } else {
                      showToast('Wizyta zarezerwowana!');
                      setBookedFacility(null); setSelectedSlot(null); setPatientName(''); setPatientPhone(''); setRodoAccepted(false); fetchFacilities();
                    }
                  }}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-sage-600 hover:to-teal-600 cursor-pointer"
                >
                  Potwierdź rezerwację
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-card border backdrop-blur-md ${toast.type === 'success' ? 'bg-sage-900/90 border-sage-700 text-white' : 'bg-red-900/90 border-red-700 text-white'}`}>
              <span className="text-base">{toast.type === 'success' ? '✅' : '⚠️'}</span><p className="text-xs font-semibold tracking-wide">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
