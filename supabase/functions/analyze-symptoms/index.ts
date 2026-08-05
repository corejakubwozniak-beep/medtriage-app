// @ts-ignore - Ignorujemy ostrzeżenie VS Code (edytor szuka Node.js, a to jest Deno)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MODELS = {
  lite: 'gemini-3.5-flash-lite',
  flash: 'gemini-3.6-flash',
  pro: 'gemini-3.1-pro',
};

const SYSTEM_PROMPT = `Jesteś zaawansowanym, rygorystycznym asystentem medycznym AI (MedTriage) służącym WYŁĄCZNIE do wstępnego triażu zdrowia LUDZKIEGO. Nie jesteś uniwersalnym asystentem.

ZASADY KRYTYCZNE (GUARDRAILS) – MUSISZ SIĘ DO NICH BEZWZGLĘDNIE STOSOWAĆ:
1. ODRZUCANIE ZAPYTAŃ NIEMEDYCZNYCH: Jeśli użytkownik pyta o przepisy kulinarne, programowanie, zwierzęta, wpisuje bezsensowny ciąg znaków, lub wgrywa zdjęcie przedmiotu, MUSISZ natychmiast przerwać analizę i zwrócić Błąd analizy.
2. STANY ZAGROŻENIA ŻYCIA (RED FLAGS): Jeśli objawy wskazują na stan nagły, zagrażający życiu, wartość "priority" MUSI wynosić "Pilny", a kierunek musi zawierać zalecenie SOR / 112.
3. REGUŁA ZDJĘĆ: Obraz musi przedstawiać ludzki problem medyczny.

FORMAT ODPOWIEDZI:
Masz obowiązek zawsze zwracać surowy format JSON (bez znaczników markdown). Schemat:
{
  "direction": "string",
  "explanation": "string",
  "specialist": "string",
  "priority": "string (MUSI BYĆ: 'Planowy', 'Standardowy' lub 'Pilny')",
  "tests": ["string"]
}`;

// NAPRAWA: Zdefiniowaliśmy typ (req: Request)
serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { symptoms, imageFile } = await req.json();

    const apiKey = Deno.env.get('GEMINI_API_KEY');
    if (!apiKey) {
      throw new Error("Brak klucza GEMINI_API_KEY w konfiguracji serwera.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const chosenModelName = imageFile ? MODELS.pro : MODELS.flash;
    const model = genAI.getGenerativeModel({ model: chosenModelName });

    const finalPrompt = `${SYSTEM_PROMPT}\n\nOto dane od pacjenta do analizy:\nObjawy opisane przez pacjenta: "${symptoms || 'Brak opisu tekstowego, załączono tylko zdjęcie.'}"`;

    const promptData: any[] = [finalPrompt];

    if (imageFile) {
      promptData.push({
        inlineData: {
          data: imageFile.base64,
          mimeType: imageFile.mimeType,
        },
      });
    }

    const result = await model.generateContent(promptData);
    const responseText = result.response.text();

    const match = responseText.match(/\{[\s\S]*\}/);
    if (!match) {
      throw new Error("Model AI nie zwrócił poprawnego formatu JSON.");
    }

    const aiResult = JSON.parse(match[0]);

    return new Response(JSON.stringify(aiResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  // NAPRAWA: Poprawny blok catch dla TypeScript
  } catch (err) {
    const error = err as any;
    console.error('Błąd w Edge Function:', error.message);
    
    return new Response(
      JSON.stringify({
        error: true,
        direction: 'Błąd analizy',
        explanation: 'Wystąpił problem techniczny po stronie serwera AI. Spróbuj ponownie za chwilę.',
        specialist: 'Brak',
        priority: 'Standardowy',
        tests: [],
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
        status: 500 
      }
    );
  }
});
