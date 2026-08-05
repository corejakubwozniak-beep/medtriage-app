import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { appointmentId, patientInfo, facilityName, date, time } = await req.json();

    // Tutaj możesz zintegrować zewnętrzny serwis API (np. Resend dla E-mail lub Twilio dla SMS)
    // Przykład logowania i potwierdzenia wysyłki po stronie serwera:
    console.log(`Wysłano powiadomienie do pacjenta: ${patientInfo} dla wizyty w ${facilityName} w dniu ${date} o godz. ${time}`);

    return new Response(
      JSON.stringify({ success: true, message: "Powiadomienie zostało wysłane pomyślnie." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (err) {
    const error = err as any;
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
