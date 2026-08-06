import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  // Obsługa CORS dla przeglądarki
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Pobranie danych wizyty z naszego frontendu (AdminDashboard.tsx)
    const { appointmentId, patientInfo, facilityName, date, time } = await req.json();

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) throw new Error("Brak klucza API do wysyłki e-mail (Resend).");

    // Zdefiniowanie treści powiadomienia wysyłanego do pacjenta
    const emailHtml = `
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>Potwierdzenie Twojej wizyty - MedTriage</h2>
        <p>Witaj, <strong>${patientInfo}</strong>!</p>
        <p>Twoja wizyta w placówce <strong>${facilityName}</strong> została oficjalnie potwierdzona przez pracownika rejestracji.</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 8px; margin-top: 15px;">
          <p>📅 <strong>Data:</strong> ${date}</p>
          <p>⏰ <strong>Godzina:</strong> ${time}</p>
        </div>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">
          To jest wiadomość wygenerowana automatycznie przez system wsparcia medycznego MedTriage.
        </p>
      </div>
    `;

    // Komunikacja HTTP z dostawcą zewnętrznym (Resend API)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'MedTriage System <powiadomienia@twoja-domena.pl>', // Musi to być zweryfikowana domena
        to: ['core.jakubwozniak@gmail.com'], // Docelowo ten adres przyjdzie razem z patientInfo z bazy
        subject: `Potwierdzenie wizyty na dzień ${date}`,
        html: emailHtml
      })
    });

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Błąd dostawcy komunikacji: ${JSON.stringify(errorData)}`);
    }

    return new Response(
      JSON.stringify({ success: true, message: "Powiadomienie zostało pomyślnie wysłane." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const error = err as any;
    console.error("Błąd wysyłania komunikatu:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
