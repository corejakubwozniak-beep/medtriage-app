import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Lista modeli według priorytetu (od głównego do zapasowych)
const FALLBACK_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.6-flash',
  'gemini-3.1-pro'
];


// Funkcja próbująca wywołać model z opóźnieniem (Retry)
async function callWithRetry(modelName: string, parts: any[], retries = 2, delay = 1500): Promise<any> {
  const model = genAI.getGenerativeModel({ model: modelName });
  
  try {
    return await model.generateContent({ contents: [{ role: 'user', parts }] });
  } catch (error: any) {
    const isOverloaded = 
      error.message?.includes('503') || 
      error.status === 503 || 
      error.message?.includes('high demand');

    if (retries > 0 && isOverloaded) {
      console.warn(`[${modelName}] Przeciążony (503). Ponawiam za ${delay / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callWithRetry(modelName, parts, retries - 1, delay * 1.5);
    }
    throw error;
  }
}

const SYSTEM_PROMPT = `Jesteś zaawansowanym, rygorystycznym asystentem medycznym AI (MedTriage) służącym WYŁĄCZNIE do wstępnego triażu zdrowia LUDZKIEGO. Nie jesteś uniwersalnym asystentem.

ZASADY KRYTYCZNE (GUARDRAILS) – MUSISZ SIĘ DO NICH BEZWZGLĘDNIE STOSOWAĆ:
1. ODRZUCANIE ZAPYTAŃ NIEMEDYCZNYCH: Jeśli użytkownik pyta o przepisy kulinarne, programowanie, zwierzęta (np. koty, psy), wpisuje bezsensowny ciąg znaków, lub wgrywa zdjęcie przedmiotu/zwierzęcia/krajobrazu, MUSISZ natychmiast przerwać analizę. W takim przypadku zwróć DOKŁADNIE taki obiekt JSON i nic więcej:
{
  "direction": "Błąd analizy",
  "explanation": "Zapytanie nie ma charakteru medycznego lub nie dotyczy zdrowia ludzkiego. Proszę opisać rzeczywiste objawy chorobowe.",
  "specialist": "Brak",
  "priority": "Standardowy",
  "tests": []
}

2. STANY ZAGROŻENIA ŻYCIA (RED FLAGS): Jeśli objawy wskazują na stan nagły, zagrażający życiu (np. silny ból w klatce piersiowej, duszności, objawy udaru, nagły niedowład, silny krwotok, utrata przytomności), wartość "priority" MUSI wynosić "Pilny". W polu "direction" musisz wyraźnie zalecić pilny kontakt z numerem 112 lub udanie się na SOR.

3. REGUŁA ZDJĘĆ: Jeśli obraz nie przedstawia ludzkiej zmiany skórnej, wypisu ze szpitala, wyników badań laboratoryjnych lub widocznego problemu medycznego człowieka, zastosuj Zasadę nr 1.

FORMAT ODPOWIEDZI:
Masz obowiązek zawsze zwracać surowy format JSON (bez znaczników markdown \`\`\`json). Twoja odpowiedź musi zgadzać się z tym schematem:
{
  "direction": "string (np. Kardiologia lub 'Błąd analizy')",
  "explanation": "string (krótkie medyczne uzasadnienie)",
  "specialist": "string (np. Kardiolog)",
  "priority": "string (MUSI BYĆ TYLKO JEDNO Z: 'Planowy', 'Standardowy', 'Pilny')",
  "tests": ["string", "string"] (Tablica od 1 do 4 sugerowanych badań)
}`;


// Główna funkcja z automatycznym przełączaniem modelu w razie awarii (Fallback)
export async function analyzeSymptomsWithGemini(symptoms: string, imageFile?: { base64: string; mimeType: string } | null) {
  const parts: any[] = [];
  if (symptoms.trim()) {
    parts.push({ text: symptoms });
  }

  if (imageFile) {
    parts.push({
      inlineData: {
        data: imageFile.base64,
        mimeType: imageFile.mimeType,
      },
    });
  }

  parts.push({
    text: `Jesteś profesjonalnym systemem wsparcia decyzji medycznych (triaż AI). Przeanalizuj powyższe objawy lub załączone zdjęcie/wyniki i zwróć wynik WYŁĄCZNIE w formacie JSON (bez żadnego formatowania markdown typu \`\`\`json) o następującej strukturze:
    {
      "direction": "Kierunek diagnostyczny np. Kardiologia",
      "explanation": "Szczegółowe wyjaśnienie i zalecenia",
      "specialist": "Rekomendowany specjalista np. Kardiolog",
      "tests": ["Badanie 1", "Badanie 2"],
      "priority": "Standardowy lub Pilny"
    }`
  });

  // Próbujemy po kolei każdego modelu z listy
  let lastError = null;
  for (const modelName of FALLBACK_MODELS) {
    try {
      console.log(`Próba analizy przy użyciu modelu: ${modelName}`);
      const response = await callWithRetry(modelName, parts);
      const responseText = response.response.text();
      
      const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(cleanJsonText);
    } catch (error: any) {
      console.warn(`Model ${modelName} nie zadziałał. Przełączam na model zapasowy...`, error.message);
      lastError = error;
    }
  }

  // Jeśli żaden model nie zadziałał (skrajny przypadek)
  console.error('Wszystkie modele AI zawiodły:', lastError);
  throw new Error('Serwery AI są w tej chwili niedostępne. Spróbuj ponownie za minutę.');
}
