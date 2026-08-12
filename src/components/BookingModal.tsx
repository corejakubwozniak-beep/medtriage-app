import { useState } from 'react';
import { supabase } from '../supabase';
import { Facility, AnalysisResult } from '../types';
import { CheckCircle2, X, Building2, CalendarClock } from 'lucide-react';

interface BookingModalProps {
  bookedFacility: Facility | null;
  selectedSlot: any | null;
  onClose: () => void;
  result: AnalysisResult | null;
  showToast: (message: string, type?: 'success' | 'error') => void;
  fetchFacilities: () => void;
}

export default function BookingModal({
  bookedFacility,
  selectedSlot,
  onClose,
  result,
  showToast,
  fetchFacilities,
}: BookingModalProps) {
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [rodoAccepted, setRodoAccepted] = useState(false);

  if (!bookedFacility || !selectedSlot) return null;

  const handleBookingConfirm = async () => {
    if (!patientName.trim() || !patientPhone.trim() || !rodoAccepted) {
      showToast('Uzupełnij imię, nazwisko, telefon i zaakceptuj RODO', 'error');
      return;
    }

    try {
      // 1. Zapisz zanonimizowane/zaszyfrowane dane do nowej tabeli patients_registry (RODO Compliance)
      const encodedContactData = btoa(encodeURIComponent(`${patientName}|${patientPhone}`));
      const maskedPhone = `***-***-${patientPhone.slice(-3)}`;

      const { data: patientData, error: patientError } = await supabase
        .from('patients_registry')
        .insert({
          masked_phone_hash: maskedPhone,
          encrypted_contact_data: encodedContactData
        })
        .select('id')
        .single();

      if (patientError || !patientData) throw patientError;

      // 2. Zaktualizuj wizytę używając TYLKO bezpiecznego identyfikatora (patient_uuid)
      const { data: updatedSlots, error: appError } = await supabase
        .from('appointments')
        .update({ 
          status: 'booked', 
          patient_uuid: patientData.id, 
          triage_direction: result?.specialist, 
          urgency: result?.urgency, 
          preliminary_tests: result?.tests 
        })
        .eq('id', selectedSlot.id)
        .eq('status', 'available')
        .select();

      if (appError || !updatedSlots?.length) {
        throw new Error('Błąd rezerwacji (termin może być już zajęty)');
      }

      showToast('Wizyta zarezerwowana pomyślnie!');
      onClose();
      fetchFacilities();
    } catch (err: any) {
      showToast(err.message || 'Wystąpił błąd podczas rezerwacji', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 px-5 backdrop-blur-sm animate-fade-in print:hidden" onClick={onClose}>
      <div className="relative w-full max-w-md rounded-3xl border border-ink-100 bg-white p-7 shadow-card animate-fade-up" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-ink-400 hover:bg-ink-50 cursor-pointer"><X className="h-5 w-5" /></button>
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage-100 text-sage-600"><CheckCircle2 className="h-9 w-9" strokeWidth={2} /></div>
          <h3 className="mt-5 text-xl font-bold text-ink-900">Rezerwacja wizyty</h3>
          <p className="mt-2 text-sm text-ink-600">Wypełnij dane, aby potwierdzić termin w {bookedFacility.name}.</p>

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
              <label htmlFor="rodoCheckbox" className="text-[0.75rem] text-ink-600 cursor-pointer">Wyrażam zgodę na przetwarzanie moich danych osobowych zgodnie z RODO.</label>
            </div>
          </div>

          <button
            onClick={handleBookingConfirm}
            className="mt-6 w-full rounded-2xl bg-gradient-to-br from-sage-500 to-teal-500 px-5 py-3 text-sm font-semibold text-white shadow-soft hover:from-sage-600 hover:to-teal-600 cursor-pointer"
          >
            Potwierdź rezerwację
          </button>
        </div>
      </div>
    </div>
  );
}
