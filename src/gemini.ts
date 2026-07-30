import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Lista modeli według priorytetu (od głównego do zapasowych)
const FALLBACK_MODELS = [
  'gemini-2.5-flash',
  'gemini-1.5-flash',
  'gemini-2.5-pro'
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
