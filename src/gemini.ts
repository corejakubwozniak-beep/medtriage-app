import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
if (!apiKey) {
  console.error("Brak klucza VITE_GEMINI_API_KEY w pliku .env");
}

const genAI = new GoogleGenerativeAI(apiKey || '');

// Definicja Twoich modeli Gemini
const MODELS = {
  lite: 'gemini-3.5-flash-lite',
  flash: 'gemini-3.6-flash',
  pro: 'gemini-3.1-pro',
};

// Rygorystyczny System Prompt (Guardrails)
const SYSTEM_PROMPT = `Jesteś zaawansowanym, rygorystycznym asystentem medycznym AI (MedTriage) służącym WYŁĄCZNIE do wstępnego triażu zdrowia LUDZKIEGO. Nie jesteś uniwersalnym asystentem.

ZASADY KRYTYCZNE (GUARDRAILS) – MUSISZ SIĘ DO NICH BEZWZGLĘDNIE STOSOWAĆ:
1. ODRZUCANIE ZAPYTAŃ NIEMEDYCZNYCH: Jeśli użytkownik pyta o przepisy kulinarne, programowanie, zwierzęta (np. koty, psy), wpisuje bezsensowny ciąg znaków, lub wgrywa zdjęcie przedmiotu/zwierzęcia/krajobrazu, MUSISZ natychmiast przerwać analizę. W takim przypadku zwróć DOKŁADNIE taki obiekt JSON i nic więcej:
{
  "direction": "Błąd analizy",
  "explanation": "Zapytanie nie ma charakteru medycznego lub nie dotyczy zdrowia ludzkiego. Proszę opisać rzeczywiste objawy chorobowe lub wgrać poprawne wyniki badań.",
  "specialist": "Brak",
  "priority": "Standardowy",
  "tests": []
}

2. STANY ZAGROŻENIA ŻYCIA (RED FLAGS): Jeśli objawy wskazują na stan nagły, zagrażający życiu (np. silny ból w klatce piersiowej, duszności, objawy udaru, nagły niedowład, silny krwotok, utrata przytomności), wartość "priority" MUSI wynosić "Pilny". W polu "direction" musisz wyraźnie zalecić pilny kontakt z numerem 112 lub udanie się na SOR.

3. REGUŁA ZDJĘĆ: Jeśli obraz nie przedstawia ludzkiej zmiany skórnej, wypisu ze szpitala, wyników badań laboratoryjnych lub widocznego problemu medycznego człowieka, zastosuj Zasadę nr 1.

FORMAT ODPOWIEDZI:
Masz obowiązek zawsze zwracać surowy format JSON (bez znaczników markdown typu \`\`\`json). Odpowiedź musi zgadzać się z tym schematem:
{
  "direction": "string",
  "explanation": "string",
  "specialist": "string",
  "priority": "string (MUSI BYĆ: 'Planowy', 'Standardowy' lub 'Pilny')",
  "tests": ["string"]
}`;

export async function analyzeSymptomsWithGemini(
  symptoms: string, 
  imageFile: { base64: string; mimeType: string } | null
) {
  try {
    // --- INTELIGENTNY DOBÓR MODELU ---
    // Jeśli pacjent załączył zdjęcie, używamy potężniejszego modelu Pro.
    // Do samego tekstu używamy szybkiego modelu Flash.
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

    // Kuloodporne wyciąganie JSON-a za pomocą RegEx
    const match = responseText.match(/\{[\s\S]*\}/);
    
    if (!match) {
      throw new Error("Model AI nie zwrócił poprawnego formatu JSON.");
    }

    const aiResult = JSON.parse(match[0]);
    return aiResult;

  } catch (error: any) {
    console.error('Błąd podczas analizy Gemini API:', error);
    return {
      error: true,
      direction: 'Błąd analizy',
      explanation: 'Wystąpił problem techniczny podczas łączenia z silnikiem AI. Spróbuj ponownie za chwilę.',
      specialist: 'Brak',
      priority: 'Standardowy',
      tests: [],
    };
  }
}
