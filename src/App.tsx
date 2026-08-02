import { useState, useEffect, type FormEvent } from 'react';
import { analyzeSymptomsWithGemini } from './gemini';
import { supabase } from './supabase';
import { URGENCY_STYLES } from './data';
import { AnalysisResult, Facility, HistoryItem } from './types';
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

function App() {
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isAdminView, setIsAdminView] = useState(false);
  const [adminFacilityId, setAdminFacilityId] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
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

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };
  
  const [facilities, setFacilities] = useState<Facility[]>([]);

  const fetchFacilities = async () => {
    try {
      const { data, error } = await supabase
        .from('facilities')
        .select(`
          *,
          appointments (
            id,
            date,
            time,
            status
          )
        `);

      if (error) {
        console.error('Błąd pobierania placówek z Supabase:', error);
        return;
      }

      if (data && data.length > 0) {
        const mapped: Facility[] = data.map((item: any) => {
          const availableAppointments = item.appointments?.filter(
            (app: any) => app.status === 'available'
          ) || [];

          return {
            id: item.id,
            name: item.name,
            address: item.address,
            earliestSlot: item.earliest_slot,
            isFastest: item.is_fastest,
            doctor: item.doctor,
            rating: Number(item.rating),
            direction: item.direction,
            appointments: availableAppointments,
          };
        });
        
        setFacilities(mapped);
      }
    } catch (error) {
      console.error('Nie udało się połączyć z Supabase:', error);
    }
  };

 const fetchBookedAppointments = async () => {
    if (!session?.user?.id) return;

    // Pobieramy placówkę jako tablicę, co całkowicie eliminuje błąd 406
    const { data: facilityDataArray, error: facError } = await supabase
      .from('facilities')
      .select('id')
      .eq('auth_user_id', session.user.id);

    if (facError || !facilityDataArray || facilityDataArray.length === 0) {
      setBookedAppointments([]);
      return;
    }

    const facilityData = facilityDataArray[0];

    const { data, error } = await supabase
      .from('appointments')
      .select(`
        *,
        facilities (
          name,
          address
        )
      `)
      .eq('facility_id', facilityData.id)
      .eq('status', 'booked')
      .order('date', { ascending: true });

    if (error) {
      console.error('Błąd pobierania zarezerwowanych wizyt dla placówki:', error);
    } else if (data) {
      setBookedAppointments(data);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && isAdminView) {
      fetchBookedAppointments();
      fetchFacilities();
    }
  }, [session, isAdminView]);

  useEffect(() => {
    const phone = patientPhone.trim();
    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$/;

    if (phoneRegex.test(phone)) {
      async function fetchCloudHistory() {
        const { data, error } = await supabase
          .from('triage_history')
          .select('*')
          .eq('patient_phone', phone)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!error && data) {
          const mappedHistory: HistoryItem[] = data.map((item: any) => ({
            id: item.id.toString(),
            date: new Date(item.created_at).toLocaleString(),
            symptoms: item.symptoms,
            hasImage: item.has_image,
            result: {
              direction: item.direction,
              directionNote: 'Wczytano z historii chmurowej.',
              specialist: item.specialist,
              specialistNote: `Konsultacja: ${item.specialist}`,
              tests: item.tests || [],
              urgency: item.urgency
            }
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
      setSession(data.session);
      setEmail('');
      setPassword('');
      showToast('Zalogowano pomyślnie do panelu placówki!');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    showToast('Wylogowano pomyślnie.');
  };

  const currentFacilities = facilities;

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
    showToast('Wyczyszczono historię analiz.');
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

      if (
        rawAiResult.error ||
        rawAiResult.explanation?.includes('Nie udało się') ||
        rawAiResult.direction === 'Błąd analizy'
      ) {
        throw new Error(
          rawAiResult.explanation ||
            'Nie udało się połączyć z modelem AI. Sprawdź klucz API Gemini.'
        );
      }

      const mappedResult: AnalysisResult = {
        direction: rawAiResult.direction || 'Diagnostyka ogólna',
        directionNote:
          rawAiResult.explanation ||
          'Przeanalizowano opisane objawy oraz załączone materiały.',
        specialist: rawAiResult.specialist || 'Lekarz Rodzinny',
        specialistNote: `Sugerowana konsultacja: ${rawAiResult.specialist || 'Lekarz Rodzinny'}.`,
        tests:
          rawAiResult.tests ||
          rawAiResult.recommendedTests || [
            'Morfologia krwi',
            'Badanie ogólne',
          ],
        urgency: (['Planowy', 'Standardowy', 'Pilny'].includes(rawAiResult.priority)
          ? rawAiResult.priority
          : 'Standardowy') as AnalysisResult['urgency'],
      };

      setProgress(100);
      setResult(mappedResult);

      const phoneToUse = patientPhone.trim() || 'anonim';

      const { data: insertedData, error: dbError } = await supabase
        .from('triage_history')
        .insert([
          {
            patient_phone: phoneToUse,
            symptoms: symptoms.trim() || 'Przeanalizowano wyłącznie zdjęcie',
            direction: mappedResult.direction,
            specialist: mappedResult.specialist,
            urgency: mappedResult.urgency,
            tests: mappedResult.tests,
            has_image: !!imageFile,
          },
        ])
        .select()
        .single();

      if (!dbError && insertedData) {
        const newItem: HistoryItem = {
          id: insertedData.id.toString(),
          date: new Date(insertedData.created_at).toLocaleString(),
          symptoms: insertedData.symptoms,
          hasImage: insertedData.has_image,
          result: {
            direction: insertedData.direction,
            directionNote: mappedResult.directionNote,
            specialist: insertedData.specialist,
            specialistNote: mappedResult.specialistNote,
            tests: insertedData.tests || [],
            urgency: insertedData.urgency,
          },
        };
        setHistory((prev) => [newItem, ...prev].slice(0, 10));
      }

      showToast('Analiza AI została ukończona i zapisana w chmurze!');
    } catch (error: any) {
      console.error('Błąd podczas analizy objawów:', error);
      showToast(
        error.message || 'Wystąpił błąd podczas analizy AI. Spróbuj ponownie.',
        'error'
      );
      setResult(null);
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen print:bg-white print:py-0">
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-14 print:px-0 print:py-0 print:max-w-none">
        
        <button 
          onClick={() => setIsAdminView(!isAdminView)}
          className="text-xs text-ink-400 hover:text-sage-600 transition-colors mt-2 cursor-pointer font-medium"
        >
          {isAdminView ? '← Powrót do widoku pacjenta' : '🔒 Panel dla placówek medycznych'}
        </button>

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

        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-sand-200 bg-sand-50/70 px-4 py-3.5 animate-fade-up print:hidden" style={{ animationDelay: '0.05s' }}>
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-sand-500" />
          <p className="text-[0.82rem] leading-relaxed text-ink-700">
            Wynik ma charakter informacyjny. W przypadku nagłych lub nasilonych objawów
            skontaktuj się z numerem alarmowym 112 lub udaj się na SOR.
          </p>
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
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Hasło</label>
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full mt-2 rounded-2xl bg-gradient-to-br from-ink-800 to-ink-900 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-ink-700 hover:to-ink-800 cursor-pointer transition-all"
                  >
                    Zaloguj się
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="mt-7 animate-fade-up print:hidden">
              <div className="rounded-3xl border border-sage-200 bg-white p-6 shadow-card sm:p-7 relative">
                <button 
                  onClick={handleLogout}
                  className="absolute top-6 right-6 text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
                >
                  Wyloguj się
                </button>

                <h2 className="text-lg font-bold text-ink-900 mb-2">Panel Zarządzania Placówki</h2>
                <p className="text-xs text-ink-500 mb-6">Jesteś zalogowany. Możesz dodawać wolne terminy oraz zarządzać zarezerwowanymi wizytami pacjentów.</p>

                <div className="rounded-2xl border border-ink-100 bg-sage-50/30 p-5 mb-8">
                  <h3 className="text-sm font-bold text-ink-900 mb-3">📅 Dodaj nowy wolny termin</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-ink-700 mb-1">Wybierz placówkę:</label>
                      <select 
                        value={adminFacilityId} 
                        onChange={(e) => setAdminFacilityId(Number(e.target.value))}
                        className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
                      >
                        {facilities.map((fac) => (
                          <option key={fac.id} value={fac.id}>{fac.name} ({fac.address})</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-ink-700 mb-1">Data:</label>
                        <input 
                          type="date" 
                          value={newDate} 
                          onChange={(e) => setNewDate(e.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-ink-700 mb-1">Godzina:</label>
                        <input 
                          type="time" 
                          value={newTime} 
                          onChange={(e) => setNewTime(e.target.value)}
                          className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900"
                        />
                      </div>
                    </div>

                    <button
                      onClick={async () => {
                        if (!newDate || !newTime) {
                          showToast('Wypełnij datę i godzinę!', 'error');
                          return;
                        }
                        
                        const { error } = await supabase.from('appointments').insert([
                          { facility_id: adminFacilityId, date: newDate, time: newTime, status: 'available' }
                        ]);

                        if (error) {
                          showToast('Błąd dodawania terminu: ' + error.message, 'error');
                        } else {
                          showToast('Termin został pomyślnie dodany do bazy!');
                          setNewDate('');
                          setNewTime('');
                          fetchFacilities();
                        }
                      }}
                      className="w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-sage-600 hover:to-teal-600 cursor-pointer transition-all"
                    >
                      Dodaj wolny termin do bazy
                    </button>
                  </div>
                </div>

                <div className="mt-8 border-t border-ink-100 pt-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                    <div>
                      <h3 className="text-lg font-bold text-ink-900">🎛️ Patient Flow Center (Kolejka Triażowa)</h3>
                      <p className="text-xs text-ink-500 mt-1">Zarządzaj przepływem pacjentów na podstawie zaleceń sztucznej inteligencji.</p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <span className="inline-flex items-center rounded-xl bg-red-50 px-3 py-1 text-xs font-bold text-red-700 border border-red-100">
                        🔴 Pilne: {bookedAppointments.filter((a: any) => a.urgency === 'Pilny').length}
                      </span>
                      <span className="inline-flex items-center rounded-xl bg-ink-50 px-3 py-1 text-xs font-bold text-ink-700 border border-ink-200">
                        Wszystkie: {bookedAppointments.length}
                      </span>
                    </div>
                  </div>

                  {bookedAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {bookedAppointments.map((app: any) => (
                        <div key={app.id} className={`relative overflow-hidden rounded-2xl border bg-white shadow-sm transition-all hover:shadow-card ${app.urgency === 'Pilny' ? 'border-red-200' : 'border-ink-100'}`}>
                          {/* Kolorowy pasek priorytetu */}
                          <div className={`absolute left-0 top-0 h-full w-1.5 ${app.urgency === 'Pilny' ? 'bg-red-500' : app.urgency === 'Standardowy' ? 'bg-amber-400' : 'bg-teal-500'}`} />
                          
                          <div className="p-5 pl-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-100">
                                  📅 {app.date} godz. {app.time.slice(0, 5)}
                                </span>
                                <span className={`text-[0.65rem] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${app.urgency === 'Pilny' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-sand-50 text-sand-700 border-sand-200'}`}>
                                  {app.urgency || 'Standardowy'}
                                </span>
                              </div>
                              
                              <h4 className="text-base font-bold text-ink-900 mb-1">
                                👤 {app.patient_info || 'Pacjent nieznany'}
                              </h4>
                              
                              <div className="mt-3 bg-sage-50/50 rounded-xl p-3 border border-sage-100">
                                <p className="text-xs font-semibold text-sage-800 mb-1">🩺 Wstępny kierunek AI: {app.triage_direction}</p>
                                <p className="text-xs text-ink-600 leading-relaxed">{app.triage_summary || 'Brak dodatkowego opisu'}</p>
                                
                                {app.preliminary_tests && app.preliminary_tests.length > 0 && (
                                  <div className="mt-2 pt-2 border-t border-sage-200/50">
                                    <p className="text-[0.65rem] font-bold text-ink-400 uppercase tracking-wider mb-1">Zalecane badania przed wizytą:</p>
                                    <p className="text-xs text-ink-700">{Array.isArray(app.preliminary_tests) ? app.preliminary_tests.join(', ') : app.preliminary_tests}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col gap-2 shrink-0 sm:w-48">
                              <button
                                onClick={() => showToast('Powiadomienie z przypomnieniem o badaniach zostało wysłane do pacjenta (Symulacja).')}
                                className="w-full text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 px-4 py-2.5 rounded-xl border border-teal-200 transition-colors cursor-pointer"
                              >
                                Zatwierdź i Powiadom
                              </button>
                              <button
                                onClick={async () => {
                                  if (confirm('Czy na pewno chcesz anulować wizytę i zwolnić termin dla innych pacjentów?')) {
                                    const { error } = await supabase
                                      .from('appointments')
                                      .update({ status: 'available', patient_info: null, triage_direction: null, urgency: null, triage_summary: null, preliminary_tests: null })
                                      .eq('id', app.id);
                                    
                                    if (!error) {
                                      showToast('Zwolniono termin pomyślnie.');
                                      fetchFacilities();
                                      fetchBookedAppointments();
                                    }
                                  }
                                }}
                                className="w-full text-xs font-semibold text-red-600 bg-white hover:bg-red-50 px-4 py-2.5 rounded-xl border border-red-200 transition-colors cursor-pointer"
                              >
                                Anuluj / Zwolnij slot
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 px-4 bg-sage-50/40 rounded-2xl border border-ink-100 border-dashed">
                      <span className="text-2xl mb-2">🌿</span>
                      <p className="text-sm font-semibold text-ink-700">Kolejka triażowa jest pusta.</p>
                      <p className="text-xs text-ink-500 text-center max-w-xs mt-1">Brak nowych wizyt. Odpocznij chwilę lub dodaj nowe wolne terminy do grafiku.</p>
                    </div>
                  )}
                </div>

              </div>
            </section>
          )
        )}

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
                    className="flex h-8 w-8 items-center justify-center rounded-xl text-ink-400 transition-colors hover:bg-white hover:text-sand-500 cursor-pointer"
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
                  className="group relative inline-flex w-full items-center justify-center gap-2 overflow-hidden rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-6 py-3.5 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:from-sage-600 hover:to-teal-600 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-sage-400/25 disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none sm:w-auto cursor-pointer"
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

        {/* Wynik analizy AI */}
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

              <div className="border-t border-ink-100 bg-white p-6 sm:px-7 print:hidden flex justify-center">
                <button
                  onClick={() => window.print()}
                  className="group inline-flex items-center gap-2.5 rounded-2xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-ink-800 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-ink-900/20 cursor-pointer"
                >
                  <Download className="h-4.5 w-4.5 transition-transform group-hover:-translate-y-0.5" />
                  Pobierz raport dla lekarza (PDF)
                </button>
              </div>

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

        {/* Lista dostępnych placówek z bazy Supabase */}
        {!loading && result && (
          <section className="mt-7 animate-fade-up print:hidden">
            <div className="mb-4 flex items-center gap-2.5">
              <CalendarClock className="h-5 w-5 text-teal-600" />
              <h2 className="text-base font-semibold text-ink-900">
                Dostępne placówki i wolne terminy (Zielonki / Kraków)
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {currentFacilities.map((facility) => (
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

                  <div className="mt-4">
                    <p className="text-xs font-semibold text-ink-500 mb-2 uppercase tracking-wider">Wybierz termin wizyty:</p>
                    {facility.appointments && facility.appointments.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {facility.appointments.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setBookedFacility(facility);
                            }}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-sage-300 bg-sage-50 px-3 py-2 text-xs font-semibold text-sage-700 transition-all hover:bg-sage-600 hover:text-white hover:border-sage-600 shadow-sm cursor-pointer"
                          >
                            <span>📅 {slot.date}</span>
                            <span className="font-bold">godz. {slot.time.slice(0, 5)}</span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-ink-400 italic">Brak wolnych terminów online w tej placówce</p>
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
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Sekcja historii analiz */}
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
                className="text-xs font-semibold text-ink-400 hover:text-sand-500 transition-colors cursor-pointer"
              >
                Wyczyść historię
              </button>
            </div>
            
            <div className="grid gap-3 sm:grid-cols-2">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => loadFromHistory(item)}
                  className="flex flex-col items-start gap-2 rounded-2xl border border-ink-100 bg-white/60 p-4 text-left shadow-sm transition-all hover:border-sage-200 hover:bg-white hover:shadow-card focus:outline-none cursor-pointer"
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

        {/* Modal rezerwacji wizyty */}
        {bookedFacility && selectedSlot && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-5 backdrop-blur-sm animate-fade-in print:hidden"
            onClick={() => {
              setBookedFacility(null);
              setSelectedSlot(null);
            }}
          >
            <div
              className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-7 shadow-card animate-fade-up"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => {
                  setBookedFacility(null);
                  setSelectedSlot(null);
                }}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-400 transition-colors hover:bg-ink-50 hover:text-ink-700 cursor-pointer"
                aria-label="Zamknij"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600">
                  <CheckCircle2 className="h-9 w-9" strokeWidth={2} />
                </div>
                <h3 className="mt-5 text-xl font-bold text-ink-900">
                  Rezerwacja wizyty
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-600">
                  Wypełnij dane, aby potwierdzić termin. Wyniki diagnozy AI zostaną automatycznie przekazane do lekarza.
                </p>

                {result?.urgency === 'Pilny' && (
                  <div className="mt-4 w-full rounded-2xl bg-red-50 border border-red-200 p-4 text-left">
                    <p className="text-xs font-bold text-red-700 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚠️</span> Wysoki priorytet objawów (Stan Pilny)
                    </p>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      AI wykryło objawy wymagające pilnej uwagi. Jeśli stan zdrowia gwałtownie się pogarsza, nie czekaj na wizytę – zadzwoń pod numer alarmowy <strong>112</strong> lub udaj się na najbliższy SOR.
                    </p>
                  </div>
                )}

                <div className="mt-5 w-full rounded-2xl border border-ink-100 bg-sage-50/50 px-4 py-3.5 text-left">
                  <div className="flex items-center gap-2.5">
                    <Building2 className="h-4 w-4 shrink-0 text-sage-600" />
                    <p className="text-sm font-semibold text-ink-900">
                      {bookedFacility.name}
                    </p>
                  </div>
                  <div className="mt-2 flex items-center gap-2.5">
                    <CalendarClock className="h-4 w-4 shrink-0 text-teal-600" />
                    <p className="text-sm font-semibold text-teal-800">
                      📅 {selectedSlot.date} o godz. {selectedSlot.time.slice(0, 5)}
                    </p>
                  </div>
                </div>

                <div className="mt-5 w-full space-y-3 text-left">
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Imię i nazwisko</label>
                    <input 
                      type="text" 
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      placeholder="np. Jan Kowalski"
                      className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink-700 mb-1">Numer telefonu</label>
                    <input 
                      type="tel" 
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      placeholder="np. 123 456 789"
                      className="w-full rounded-xl border border-ink-200 bg-white px-4 py-2.5 text-sm text-ink-900 focus:outline-none focus:ring-2 focus:ring-sage-400/50"
                    />
                  </div>

                  <div className="mt-3 flex items-start gap-2.5 pt-2">
                    <input 
                      type="checkbox" 
                      id="rodoCheckbox"
                      checked={rodoAccepted}
                      onChange={(e) => setRodoAccepted(e.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-ink-300 text-sage-600 focus:ring-sage-400 cursor-pointer"
                    />
                    <label htmlFor="rodoCheckbox" className="text-[0.75rem] leading-relaxed text-ink-600 cursor-pointer">
                      Wyrażam zgodę na przetwarzanie moich danych osobowych oraz informacji o stanie zdrowia w celu rezerwacji wizyty i przekazania wyników triażu do wybranej placówki medycznej (zgodnie z RODO).
                    </label>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    if (!patientName.trim()) {
                      showToast('Proszę podać imię i nazwisko pacjenta.', 'error');
                      return;
                    }

                    const phoneRegex = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{3,6}$/;
                    if (!phoneRegex.test(patientPhone.trim())) {
                      showToast('Wpisz poprawny numer telefonu (np. 123456789).', 'error');
                      return;
                    }

                    if (!rodoAccepted) {
                      showToast('Musisz zaakceptować zgody RODO, aby kontynuować.', 'error');
                      return;
                    }

                    if (selectedSlot) {
                      const patientData = `Pacjent: ${patientName}, Tel: ${patientPhone}`;
                      
                      // KLUCZOWA POPRAWKA - Zapisywanie pełnych danych z AI
                      const { data: updatedSlots, error } = await supabase
                        .from('appointments')
                        .update({ 
                          status: 'booked',
                          patient_info: patientData,
                          triage_direction: result ? result.specialist : 'Ogólna diagnostyka',
                          urgency: result ? result.urgency : 'Standardowy',
                          triage_summary: result ? result.directionNote : 'Brak dodatkowego opisu',
                          preliminary_tests: result ? result.tests : []
                        })
                        .eq('id', selectedSlot.id)
                        .eq('status', 'available')
                        .select();

                      if (error) {
                        showToast('Błąd podczas rezerwacji: ' + error.message, 'error');
                        return;
                      }

                      if (!updatedSlots || updatedSlots.length === 0) {
                        showToast('Przykro nam, ale ten termin został właśnie zajęty przez inną osobę!', 'error');
                        setBookedFacility(null);
                        setSelectedSlot(null);
                        fetchFacilities();
                        return;
                      }

                      showToast('Wizyta została pomyślnie zarezerwowana!');

                      supabase.functions.invoke('send-booking-notification', {
                        body: {
                          patientName: patientName.trim(),
                          patientPhone: patientPhone.trim(),
                          date: selectedSlot.date,
                          time: selectedSlot.time.slice(0, 5),
                          facilityName: bookedFacility.name,
                          triageInfo: result ? `${result.direction} (Priorytet: ${result.urgency})` : 'Diagnostyka ogólna'
                        }
                      }).catch((err) => {
                        console.error('Błąd wysyłki powiadomienia w tle:', err);
                      });
                      
                      setBookedFacility(null);
                      setSelectedSlot(null);
                      setPatientName('');
                      setPatientPhone('');
                      setRodoAccepted(false);
                      fetchFacilities();
                    }
                  }}
                  className="mt-6 w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:from-sage-600 hover:to-teal-600 hover:shadow-card focus:outline-none focus:ring-4 focus:ring-sage-400/25 cursor-pointer"
                >
                  Potwierdź rezerwację
                </button>
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed bottom-6 right-6 z-50 animate-fade-up">
            <div className={`flex items-center gap-3 rounded-2xl px-4 py-3.5 shadow-card border backdrop-blur-md ${
              toast.type === 'success' 
                ? 'bg-sage-900/90 border-sage-700 text-white' 
                : 'bg-red-900/90 border-red-700 text-white'
            }`}>
              <span className="text-base">
                {toast.type === 'success' ? '✅' : '⚠️'}
              </span>
              <p className="text-xs font-semibold tracking-wide">
                {toast.message}
              </p>
            </div>
          </div>
        )}

        <footer className="mt-10 text-center print:hidden">
          <p className="text-xs text-ink-400">
            MedTriage · System wspomagający organizację przepływu pacjentów (CDSS) · Nie stanowi wyrobu medycznego.
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
