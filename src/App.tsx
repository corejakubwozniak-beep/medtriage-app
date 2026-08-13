import { useState, useEffect, type FormEvent } from 'react';
import {
  Stethoscope, Activity, ClipboardList, ArrowRight, Compass,
  UserRound, FlaskConical, ShieldCheck, Info, ChevronRight,
  Building2, CalendarClock, Star, MapPin, Zap
} from 'lucide-react';
import { Language, translations } from './i18n';
import { analyzeSymptomsWithGemini } from './gemini';
import { AnalysisResult, Facility } from './types';
import BookingModal from './components/BookingModal';
import AdminDashboard from './components/AdminDashboard';
import { supabase } from './supabase';
import { Session } from '@supabase/supabase-js';


const URGENCY_STYLES: Record<string, string> = {
  Planowy: 'bg-sage-100 text-sage-700 border-sage-200',
  Standardowy: 'bg-teal-50 text-teal-700 border-teal-200',
  Pilny: 'bg-sand-100 text-sand-500 border-sand-200',
};

function App() {
  // Stany aplikacji (Triaż i rezerwacja)
  const [symptoms, setSymptoms] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [bookedFacility, setBookedFacility] = useState<Facility | null>(null);
  const [lang, setLang] = useState<Language>('pl');
  const t = translations[lang];
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<any>(null);

  // Stany logowania i administracji
  const [session, setSession] = useState<Session | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);

  // Pobieranie placówek i terminów z Supabase
  const fetchFacilities = async () => {
    // 1. Pobierz placówki
    const { data: facData, error: facError } = await supabase
      .from('facilities')
      .select('*'); 
      
    if (facError || !facData) return;

    // 2. Pobierz wolne terminy dla tych placówek
    const { data: appData, error: appError } = await supabase
      .from('appointments')
      .select('*')
      .eq('status', 'available');

    if (!appError && appData) {
      // Połącz placówki z ich slotami w kodzie, pomijając błędy relacji SQL
      const combined = facData.map(fac => ({
        ...fac,
        appointments: appData.filter(app => app.facility_id === fac.id)
      }));
      setFacilities(combined);
    } else {
      setFacilities(facData);
    }
  };

  // Efekt uruchamiany na start aplikacji
  useEffect(() => {
    fetchFacilities();

    // Sprawdzanie i nasłuchiwanie sesji użytkownika
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Obsługa logowania administratora
  const handleAdminLogin = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert('Błąd logowania: ' + error.message);
  };

  // Obsługa wylogowywania
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAdminView(false);
  };

  // Obsługa analizy Gemini
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!symptoms.trim() || loading) return;
    
    setLoading(true);
    setResult(null);

    // Integracja z PRAWDZIWYM modelem Google Gemini
    const aiResponse = await analyzeSymptomsWithGemini(symptoms, null);
    
    setResult({
      direction: aiResponse.direction,
      directionNote: aiResponse.explanation,
      specialist: aiResponse.specialist,
      specialistNote: '',
      tests: aiResponse.tests,
      urgency: aiResponse.priority as any
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14">
        
        {/* Wielojęzyczny Header + Przełączniki */}
        <header className="animate-fade-up">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sage-400 to-teal-500 text-white">
                <Stethoscope className="h-6 w-6" strokeWidth={2.2} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-ink-900">{t.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsAdminView(!isAdminView)} 
                className="text-xs font-bold border border-ink-200 px-3 py-1.5 rounded-xl hover:bg-ink-50 cursor-pointer"
              >
                {isAdminView ? 'Widok Pacjenta' : '🔒 Panel Admina'}
              </button>
              <button onClick={() => setLang(lang === 'pl' ? 'en' : 'pl')} className="text-xs font-bold border border-ink-200 px-3 py-1.5 rounded-xl hover:bg-ink-50 cursor-pointer">
                {lang === 'pl' ? '🇬🇧 EN' : '🇵🇱 PL'}
              </button>
            </div>
          </div>
          {!isAdminView && <p className="max-w-2xl text-[0.95rem] leading-relaxed text-ink-600">{t.description}</p>}
        </header>

        {/* Widok: PANEL ADMINISTRATORA */}
        {isAdminView ? (
          session ? (
            <AdminDashboard 
              session={session} 
              handleLogout={handleLogout} 
              facilities={facilities} 
              fetchFacilities={fetchFacilities} 
              showToast={(msg) => alert(msg)} 
            />
          ) : (
            <div className="mt-10 p-6 bg-white rounded-3xl border border-ink-100 max-w-md mx-auto shadow-card animate-fade-up">
              <h2 className="text-lg font-bold mb-4 text-ink-900">Logowanie (Panel Administratora)</h2>
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <input 
                  type="email" 
                  placeholder="E-mail" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400"
                />
                <input 
                  type="password" 
                  placeholder="Hasło" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  className="w-full rounded-xl border border-ink-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400"
                />
                <button type="submit" className="w-full bg-ink-900 text-white py-2.5 rounded-xl text-sm font-bold hover:bg-ink-800 transition-colors cursor-pointer">
                  Zaloguj się
                </button>
              </form>
            </div>
          )
        ) : (
          /* Widok: PACJENT */
          <>
            {/* Triage Form */}
            <section className="mt-7 animate-fade-up">
              <form onSubmit={handleSubmit} className="rounded-3xl border border-ink-100 bg-white/80 p-6 shadow-card">
                <div className="flex items-center gap-2.5 mb-4">
                  <ClipboardList className="h-5 w-5 text-sage-500" />
                  <h2 className="text-base font-semibold text-ink-900">Opisz swoje objawy</h2>
                </div>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  rows={4}
                  placeholder={t.placeholder}
                  className="w-full resize-none rounded-2xl border border-ink-200 bg-sage-50/40 px-4 py-3.5 text-[0.95rem] text-ink-900 focus:ring-4 focus:ring-sage-400/15 outline-none"
                />
                <button type="submit" disabled={!symptoms.trim() || loading} className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-6 py-3.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 cursor-pointer">
                  {loading ? <Activity className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  {loading ? t.analyzing : t.analyzeBtn}
                </button>
              </form>
            </section>

            {/* AI Result */}
            {result && !loading && (
              <section className="mt-7 animate-fade-up">
                 <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white shadow-card">
                    <div className="flex items-center justify-between bg-gradient-to-r from-sage-50 to-teal-50 px-6 py-5">
                      <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-sage-600" /><h3 className="font-bold text-ink-900">Wynik AI</h3></div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${URGENCY_STYLES[result.urgency]}`}>{result.urgency}</span>
                    </div>
                    <div className="p-6">
                      <p className="text-sm font-bold text-ink-500">{t.specialist}</p>
                      <p className="text-xl font-bold text-ink-900 mb-4">{result.specialist}</p>
                      <p className="text-sm font-bold text-ink-500">{t.direction}</p>
                      <p className="text-ink-700 text-sm mb-4">{result.directionNote}</p>
                      <p className="text-sm font-bold text-ink-500 mb-2">{t.tests}</p>
                      <ul className="space-y-2">
                        {result.tests.map((test, i) => <li key={i} className="text-sm flex items-center gap-2"><ChevronRight className="h-4 w-4 text-sage-500"/> {test}</li>)}
                      </ul>
                    </div>
                 </div>
              </section>
            )}

            {/* Dynamiczna Lista dostępnych placówek z bazy (Zastępuje Mocki) */}
            {result && !loading && (
              <section className="mt-7 animate-fade-up">
                <h2 className="text-base font-semibold text-ink-900 mb-4 flex items-center gap-2">
                  <CalendarClock className="h-5 w-5 text-teal-600"/> Dostępne placówki i wolne terminy
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {facilities.map(fac => (
                    <div key={fac.id} className="border border-ink-100 rounded-3xl p-5 bg-white shadow-card">
                      <h3 className="font-bold text-ink-900">{fac.name}</h3>
                      <p className="text-xs text-ink-500 mb-3">{fac.address}</p>
                      
                      {/* Filtrujemy tylko wolne sloty */}
                      {fac.appointments && fac.appointments.filter(a => a.status === 'available').length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {fac.appointments.filter(a => a.status === 'available').map(slot => (
                            <button 
                              key={slot.id} 
                              onClick={() => { setSelectedSlot(slot); setBookedFacility(fac); }}
                              className="text-xs font-bold bg-sage-50 text-sage-700 border border-sage-200 px-3 py-2 rounded-xl hover:bg-sage-600 hover:text-white cursor-pointer"
                            >
                              📅 {slot.date} godz. {slot.time.slice(0, 5)}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-ink-400 italic">Brak wolnych terminów online</p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Modal Rezerwacji z poprawnie przypisanym, klikniętym terminem oraz polityką RODO */}
        {bookedFacility && selectedSlot && !isAdminView && (
          <BookingModal 
            bookedFacility={bookedFacility} 
            selectedSlot={selectedSlot}
            onClose={() => { setBookedFacility(null); setSelectedSlot(null); }} 
            result={result}
            showToast={(msg) => alert(msg)}
            fetchFacilities={fetchFacilities}
          />
        )}
      </div>
    </div>
  );
}

export default App;
