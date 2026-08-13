import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import { QRCodeSVG } from 'qrcode.react';
import { ShieldCheck, Lock, ArrowRight } from 'lucide-react';

interface MfaManagerProps {
  onSuccess: () => void;
}

export default function MfaManager({ onSuccess }: MfaManagerProps) {
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string>('');
  const [verifyCode, setVerifyCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const checkMfaStatus = async () => {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return;

  if (data.currentLevel === 'aal2') {
    onSuccess();
    return;
  }

  // Pobieramy listę istniejących czynników MFA
  const { data: factors, error: factorsError } = await supabase.auth.mfa.listFactors();
  if (factorsError) return;
  const totpFactor = factors?.totp[0];

  if (totpFactor) {
      // Jeśli czynnik już istnieje, NIE wywołujemy enroll, tylko pobieramy jego ID do weryfikacji
      setFactorId(totpFactor.id);
      setIsEnrolling(false); // Przechodzimy bezpośrednio do wpisania 6-cyfrowego kodu
    } else {
      // Jeśli nie ma żadnego czynnika, dopiero wtedy uruchamiamy rejestrację (generowanie QR)
      setIsEnrolling(true);
      startEnrollment();
    }
  };

  const startEnrollment = async () => {
    // Używamy unikalnej nazwy z timestampem, aby unikać konfliktu nazw
    const { data, error } = await supabase.auth.mfa.enroll({ 
      factorType: 'totp',
      friendlyName: `MedTriage Admin (${Date.now()})` 
    });
    
    if (error) {
      setErrorMsg('Błąd generowania MFA: ' + error.message);
      return;
    }
    setFactorId(data.id);
    setQrCode(data.totp.qr_code);
  };

  const handleVerify = async () => {
    setErrorMsg('');
    try {
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;

      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challengeData.id,
        code: verifyCode,
      });

      if (error) throw error;
      onSuccess();
    } catch (err: any) {
      setErrorMsg('Nieprawidłowy kod. Spróbuj ponownie.');
    }
  };

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-ink-100 bg-white p-8 shadow-card text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sand-100 text-sand-600 mb-4">
        {isEnrolling ? <ShieldCheck className="h-8 w-8" /> : <Lock className="h-8 w-8" />}
      </div>
      <h2 className="text-xl font-bold text-ink-900 mb-2">
        {isEnrolling ? 'Zabezpiecz swoje konto (MFA)' : 'Weryfikacja dwuetapowa'}
      </h2>
      <p className="text-sm text-ink-500 mb-6 max-w-sm">
        {isEnrolling 
          ? 'Zeskanuj poniższy kod QR w aplikacji Google Authenticator, aby uzyskać dostęp.' 
          : 'Wpisz 6-cyfrowy kod ze swojej aplikacji uwierzytelniającej.'}
      </p>

      {isEnrolling && qrCode && (
        <div className="mb-6 rounded-2xl bg-white p-4 shadow-sm border border-ink-100 flex flex-col items-center">
          {qrCode.startsWith('data:image') ? (
            // Jeśli Supabase zwraca gotowy obrazek/SVG jako Data URL
            <img src={qrCode} alt="QR Code MFA" className="w-[180px] h-[180px]" />
          ) : (
            // Jeśli zwraca standardowy tekst konfiguracyjny OTPAuth
            <QRCodeSVG value={qrCode} size={180} level="L" />
          )}
        </div>
      )}

      <div className="w-full max-w-xs space-y-4">
        <input
          type="text"
          maxLength={6}
          placeholder="np. 123456"
          value={verifyCode}
          onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
          className="w-full text-center tracking-[0.5em] text-lg rounded-xl border border-ink-200 bg-sage-50/40 px-4 py-3 text-ink-900 focus:outline-none focus:ring-4 focus:ring-sage-400/15"
        />
        {errorMsg && <p className="text-xs font-semibold text-red-500">{errorMsg}</p>}
        <button
          onClick={handleVerify}
          disabled={verifyCode.length !== 6}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-ink-900 px-5 py-3 text-sm font-semibold text-white transition-all hover:bg-ink-800 disabled:opacity-50"
        >
          Zweryfikuj kod <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
