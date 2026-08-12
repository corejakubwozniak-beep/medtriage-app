import { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { Facility } from '../types';
import { Session } from '@supabase/supabase-js';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import MfaManager from '../MfaManager';

interface AdminDashboardProps {
  session: Session;
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
  const [isMfaVerified, setIsMfaVerified] = useState(false);
  const [adminFacilityId, setAdminFacilityId] = useState<number>(1);
  const [newDate, setNewDate] = useState('');
  const [newTime, setNewTime] = useState('');
  
  const queryClient = useQueryClient();

  const { data: bookedAppointments = [], isLoading } = useQuery({
    queryKey: ['bookedAppointments', session?.user?.id],
    queryFn: async () => {
      if (!session?.user?.id) return [];

      const { data: facilityDataArray, error: facError } = await supabase
        .from('facilities')
        .select('id')
        .eq('auth_user_id', session.user.id);

      if (facError || !facilityDataArray || facilityDataArray.length === 0) return [];
      const facilityData = facilityDataArray[0];

      // Zwróć uwagę na Join z tabelą patients_registry
      const { data, error } = await supabase
        .from('appointments')
        .select(`*, facilities(name, address), patients_registry(encrypted_contact_data)`)
        .eq('facility_id', facilityData.id)
        .eq('status', 'booked')
        .order('date', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!session?.user?.id && isMfaVerified,
  });

  useEffect(() => {
    if (!session || !isMfaVerified) return;

    fetchFacilities();
    const channel = supabase
      .channel('admin-live-queue')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'appointments' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['bookedAppointments'] });
          fetchFacilities();
          showToast('⚡ Zaktualizowano kolejkę pacjentów!', 'success');
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [session, isMfaVerified, queryClient, fetchFacilities, showToast]);

  const handleAddSlot = async () => {
    if (!newDate || !newTime) return showToast('Wypełnij datę i godzinę!', 'error');
    const { error } = await supabase.from('appointments').insert([{ facility_id: adminFacilityId, date: newDate, time: newTime, status: 'available' }]);
    if (error) showToast('Błąd dodawania: ' + error.message, 'error');
    else { showToast('Dodano termin!'); setNewDate(''); setNewTime(''); fetchFacilities(); }
  };

  const handleCancelSlot = async (appId: number) => {
    if (window.confirm('Anulować wizytę i zwolnić termin?')) {
      const { error } = await supabase.from('appointments').update({ 
          status: 'available', patient_uuid: null, triage_direction: null, urgency: null, triage_summary: null, preliminary_tests: null 
      }).eq('id', appId);
      if (!error) { showToast('Zwolniono termin.'); queryClient.invalidateQueries({ queryKey: ['bookedAppointments'] }); }
    }
  };

  // Zapora MFA
  if (!isMfaVerified) {
    return (
      <div className="mt-10 flex justify-center print:hidden">
        <MfaManager onSuccess={() => setIsMfaVerified(true)} />
      </div>
    );
  }

  // Funkcja rozszyfrowująca imię pacjenta (z Base64) do wyświetlenia w panelu
  const decodePatientName = (encryptedData?: string) => {
    if (!encryptedData) return 'Pacjent nieznany';
    try {
      return decodeURIComponent(atob(encryptedData)).split('|')[0];
    } catch {
      return 'Błąd odszyfrowania';
    }
  };

  return (
    <section className="mt-7 animate-fade-up print:hidden">
      <div className="rounded-3xl border border-sage-200 bg-white p-6 shadow-card relative">
        <button onClick={handleLogout} className="absolute top-6 right-6 text-xs font-semibold text-red-500 hover:text-red-700">Wyloguj się</button>
        <h2 className="text-lg font-bold text-ink-900 mb-2">Panel Zarządzania Placówki</h2>
        <p className="text-xs text-ink-500 mb-6">Jesteś zalogowany w trybie bezpiecznym. Kolejka aktualizuje się w czasie rzeczywistym.</p>

        <div className="rounded-2xl border border-ink-100 bg-sage-50/30 p-5 mb-8">
          <h3 className="text-sm font-bold text-ink-900 mb-3">📅 Dodaj nowy wolny termin</h3>
          <div className="space-y-4">
            <select value={adminFacilityId} onChange={(e) => setAdminFacilityId(Number(e.target.value))} className="w-full rounded-xl border border-ink-200 bg-white px-3 py-2 text-sm">
              {facilities.map((fac) => (<option key={fac.id} value={fac.id}>{fac.name}</option>))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="date" value={newDate} onChange={(e) => setNewDate(e.target.value)} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm" />
              <input type="time" value={newTime} onChange={(e) => setNewTime(e.target.value)} className="w-full rounded-xl border border-ink-200 px-3 py-2 text-sm" />
            </div>
            <button onClick={handleAddSlot} className="w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-bold text-white hover:opacity-90">Dodaj termin do bazy</button>
          </div>
        </div>

        <div className="mt-8 border-t border-ink-100 pt-8">
          <h3 className="text-lg font-bold text-ink-900 mb-4">🎛️ Patient Flow Center (Realtime)</h3>
          {isLoading ? <p className="text-sm text-ink-500">Ładowanie...</p> : (
            <div className="space-y-4">
              {bookedAppointments.map((app: any) => (
                <div key={app.id} className="relative overflow-hidden rounded-2xl border bg-white shadow-sm p-5 flex justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-teal-800 bg-teal-50 px-2 py-1 rounded-lg">📅 {app.date} {app.time.slice(0, 5)}</span>
                    <h4 className="text-base font-bold text-ink-900 mt-2">👤 {decodePatientName(app.patients_registry?.encrypted_contact_data)}</h4>
                    <p className="text-xs text-ink-600 mt-1">AI: {app.triage_direction} | {app.urgency}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button className="text-xs font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-xl">Powiadom (Resend)</button>
                    <button onClick={() => handleCancelSlot(app.id)} className="text-xs font-bold text-red-600 border border-red-200 px-4 py-2 rounded-xl">Zwolnij</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
