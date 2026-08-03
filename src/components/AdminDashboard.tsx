import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Building2 } from 'lucide-react';
import { Facility } from '../types';

interface AdminDashboardProps {
  session: any;
  handleLogout: () => void;
  facilities: Facility[];
  fetchFacilities: () => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export default function AdminDashboard({
  session,
  handleLogout,
  facilities,
  fetchFacilities,
  showToast,
}: AdminDashboardProps) {
  // Lokalne stany tylko dla panelu admina
  const [adminFacilityId, setAdminFacilityId] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  const [bookedAppointments, setBookedAppointments] = useState<any[]>([]);

  // Pobieranie wizyt przypisanych do zalogowanej placówki
  const fetchBookedAppointments = async () => {
    if (!session?.user?.id) return;

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
      .select(`*, facilities (name, address)`)
      .eq('facility_id', facilityData.id)
      .eq('status', 'booked')
      .order('date', { ascending: true });

    if (error) {
      console.error('Błąd pobierania zarezerwowanych wizyt:', error);
    } else if (data) {
      setBookedAppointments(data);
    }
  };

  // Ładowanie danych po otwarciu panelu
  useEffect(() => {
    if (session) {
      fetchBookedAppointments();
      fetchFacilities();
    }
  }, [session]);

  const handleAddSlot = async () => {
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
  };

  const handleCancelSlot = async (appId: string) => {
    if (window.confirm('Czy na pewno chcesz anulować wizytę i zwolnić termin dla innych pacjentów?')) {
      const { error } = await supabase
        .from('appointments')
        .update({ 
          status: 'available', 
          patient_info: null, 
          triage_direction: null, 
          urgency: null, 
          triage_summary: null, 
          preliminary_tests: null 
        })
        .eq('id', appId);
      
      if (!error) {
        showToast('Zwolniono termin pomyślnie.');
        fetchFacilities();
        fetchBookedAppointments();
      }
    }
  };

  return (
    <section className="mt-7 animate-fade-up print:hidden">
      <div className="rounded-3xl border border-sage-200 bg-white p-6 shadow-card sm:p-7 relative">
        <button 
          onClick={handleLogout}
          className="absolute top-6 right-6 text-xs font-semibold text-red-500 hover:text-red-700 cursor-pointer"
        >
          Wyloguj się
        </button>

        <h2 className="text-lg font-bold text-ink-900 mb-2">Panel Zarządzania Placówki</h2>
        <p className="text-xs text-ink-500 mb-6">
          Jesteś zalogowany. Możesz dodawać wolne terminy oraz zarządzać zarezerwowanymi wizytami pacjentów.
        </p>

        {/* Dodawanie terminów */}
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
              onClick={handleAddSlot}
              className="w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-sage-600 hover:to-teal-600 cursor-pointer transition-all"
            >
              Dodaj wolny termin do bazy
            </button>
          </div>
        </div>

        {/* Kolejka Triażowa */}
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
                        onClick={() => handleCancelSlot(app.id)}
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
  );
}
