import { useState, useEffect, type FormEvent } from 'react';
import { analyzeSymptomsWithGemini } from './gemini';
import { supabase } from './supabase';
import { AnalysisResult, Facility, HistoryItem } from './types';
import AdminDashboard from './components/AdminDashboard';
import TriageForm from './components/TriageForm';
import BookingModal from './components/BookingModal';
import { Stethoscope, Building2, Info } from 'lucide-react';

let refreshPromise: Promise<any> | null = null;
async function lockedRefresh() {
  if (refreshPromise) return refreshPromise;
  refreshPromise = supabase.auth.refreshSession().finally(() => { refreshPromise = null; });
  return refreshPromise;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [isAdminView, setIsAdminView] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [bookedFacility, setBookedFacility] = useState<Facility | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<any | null>(null);
  const [imageFile, setImageFile] = useState<{ base64: string; mimeType: string } | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    const saved = localStorage.getItem('medtriage_history');
    return saved ? JSON.parse(saved) : [];
  });

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchFacilities = async () => {
    const { data } = await supabase.from('facilities').select(`*, appointments (id, date, time, status)`);
    if (data) {
      setFacilities(data.map((item: any) => ({
        id: item.id, name: item.name, address: item.address, earliestSlot: item.earliest_slot, isFastest: item.is_fastest, doctor: item.doctor, rating: Number(item.rating), direction: item.direction,
        appointments: item.appointments?.filter((app: any) => app.status === 'available') || [],
      })));
    }
  };

  useEffect(() => { fetchFacilities(); }, []);

  useEffect(() => {
    let isMounted = true;
    supabase.auth.onAuthStateChange((_, session) => {
      if (isMounted) setSession(session?.user?.user_metadata?.role === 'admin' ? session : null);
    });
    lockedRefresh().then(({ data: { session } }) => {
      if (isMounted) setSession(session?.user?.user_metadata?.role === 'admin' ? session : null);
    }).catch(() => { if (isMounted) setSession(null); });
    return () => { isMounted = false; };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || data.session?.user?.user_metadata?.role !== 'admin') {
      await supabase.auth.signOut();
      setSession(null);
      showToast('Błąd logowania lub brak uprawnień administratora.', 'error');
    } else {
      setSession(data.session);
      setEmail(''); setPassword('');
      showToast('Zalogowano pomyślnie!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast('Wylogowano pomyślnie.');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!symptoms.trim() && !imageFile) || loading) return;
    setLoading(true); setProgress(10); setResult(null);
    const interval = setInterval(() => setProgress((prev) => (prev >= 90 ? 90 : prev + 5)), 150);

    try {
      const rawAiResult = await analyzeSymptomsWithGemini(symptoms, imageFile);
      if (rawAiResult.error || rawAiResult.direction === 'Błąd analizy') throw new Error(rawAiResult.explanation || 'Błąd AI.');

      const mappedResult: AnalysisResult = {
        direction: rawAiResult.direction || 'Diagnostyka ogólna',
        directionNote: rawAiResult.explanation || 'Opis analizy.',
        specialist: rawAiResult.specialist || 'Lekarz Rodzinny',
        specialistNote: `Konsultacja: ${rawAiResult.specialist || 'Lekarz Rodzinny'}.`,
        tests: rawAiResult.tests || rawAiResult.recommendedTests || ['Morfologia krwi'],
        urgency: (['Planowy', 'Standardowy', 'Pilny'].includes(rawAiResult.priority) ? rawAiResult.priority : 'Standardowy') as AnalysisResult['urgency'],
      };

      setProgress(100); setResult(mappedResult);
      const { data: insertedData } = await supabase.from('triage_history').insert([{
        patient_phone: 'anonim', symptoms: symptoms.trim() || 'Zdjęcie', direction: mappedResult.direction, specialist: mappedResult.specialist, urgency: mappedResult.urgency, tests: mappedResult.tests, has_image: !!imageFile
      }]).select().single();

      if (insertedData) {
        setHistory((prev) => [{ id: insertedData.id.toString(), date: new Date(insertedData.created_at).toLocaleString(), symptoms: insertedData.symptoms, hasImage: insertedData.has_image, result: mappedResult }, ...prev].slice(0, 10));
      }
      showToast('Analiza zakończona pomyślnie!');
    } catch (error: any) {
      showToast(error.message || 'Wystąpił błąd.', 'error');
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

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50/70 px-4 py-3.5 animate-fade-up print:hidden">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-500" />
          <p className="text-[0.82rem] leading-relaxed text-ink-700">Wynik ma charakter informacyjny. W nagłych wypadkach zadzwoń pod numer 112 lub udaj się na SOR.</p>
        </div>

        {isAdminView && (!session ? (
          <section className="mt-7 animate-fade-up max-w-sm mx-auto print:hidden">
            <form onSubmit={handleLogin} className="rounded-3xl border border-ink-100 bg-white p-6 shadow-card sm:p-7">
              <div className="flex flex-col items-center mb-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-sage-100 text-sage-600 mb-3"><Building2 className="h-6 w-6" /></div>
                <h2 className="text-lg font-bold text-ink-900">Logowanie dla placówek</h2>
              </div>
              <div className="space-y-4">
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Adres e-mail" className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm" required />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Hasło" className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm" required />
                <button type="submit" className="w-full rounded-2xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-soft cursor-pointer">Zaloguj się</button>
              </div>
            </form>
          </section>
        ) : (
          <AdminDashboard session={session} handleLogout={handleLogout} facilities={facilities} fetchFacilities={fetchFacilities} showToast={showToast} />
        ))}

        {!isAdminView && (
          <TriageForm 
            symptoms={symptoms} setSymptoms={setSymptoms}
            imageFile={imageFile} imagePreview={imagePreview}
            handleImageChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onloadend = () => {
                setImageFile({ base64: (reader.result as string).split(',')[1], mimeType: file.type });
                setImagePreview(reader.result as string);
              };
              reader.readAsDataURL(file);
            }}
            removeImage={() => { setImageFile(null); setImagePreview(null); }}
            handleSubmit={handleSubmit} loading={loading} progress={progress} result={result}
            facilities={facilities} setSelectedSlot={setSelectedSlot} setBookedFacility={setBookedFacility}
            history={history} loadFromHistory={(item) => { setSymptoms(item.symptoms); setResult(item.result); setImageFile(null); setImagePreview(null); }}
            clearHistory={() => { setHistory([]); localStorage.removeItem('medtriage_history'); showToast('Wyczyszczono historię.'); }}
          />
        )}

        <BookingModal bookedFacility={bookedFacility} selectedSlot={selectedSlot} onClose={() => { setBookedFacility(null); setSelectedSlot(null); }} result={result} showToast={showToast} fetchFacilities={fetchFacilities} />

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-card border backdrop-blur-md ${toast.type === 'success' ? 'bg-sage-900/90 text-white' : 'bg-red-900/90 text-white'}`}>
              <span>{toast.type === 'success' ? '✅' : '⚠️'}</span><p className="text-xs font-semibold">{toast.message}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
