import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

// Funkcja pomocnicza do automatycznego ponawiania w przypadku błędu 503 (przeciążenie)
async function callGeminiWithRetry(fn: () => Promise<any>, retries = 3, delay = 2000) {
  try {
    return await fn();
  } catch (error: any) {
    // Jeśli błąd to 503 lub "high demand" i mamy jeszcze próby
    const isOverloaded = 
      error.message?.includes('503') || 
      error.status === 503 || 
      error.message?.includes('high demand');

    if (retries > 0 && isOverloaded) {
      console.warn(`Model AI jest przeciążony (503). Ponawiam próbę za ${delay / 1000}s... (Pozostało prób: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 1.5); // zwiększamy odstęp z każdą próbą
    }
    throw error;
  }
}

export async function analyzeSymptomsWithGemini(symptoms: string, imageFile?: { base64: string; mimeType: string } | null) {
  const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

  // Przygotowanie danych wejściowych
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

  // Wywołanie zapytania z zabezpieczeniem Retry
  const response = await callGeminiWithRetry(async () => {
    const result = await model.generateContent({ contents: [{ role: 'user', parts }] });
    return result;
  });

  const responseText = response.response.text();
  
  // Czyszczenie i parsowanie JSON
  try {
    const cleanJsonText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanJsonText);
  } catch (e) {
    console.error('Błąd parsowania JSON z Gemini:', responseText);
    throw new Error('Nie udało się przetworzyć odpowiedzi AI.');
  }
}
  }
}
