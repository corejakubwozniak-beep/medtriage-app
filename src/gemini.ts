import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeSymptomsWithGemini(symptomsText: string) {
  // Testowy log, aby zobaczyć w konsoli czy klucz się wczytał
  console.log("Czy klucz API został wczytany?", apiKey ? "TAK" : "NIE (pusty!)");

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `
Jesteś asystentem triażowym w aplikacji medycznej MedTriage.
Przeanalizuj opisane objawy pacjenta: "${symptomsText}"

ZWRÓĆ ODPOWIEDŹ WYŁĄCZNIE W CZYSTYM FORMATZE JSON (bez znaczników markdown):
{
  "direction": "Kierunek diagnostyczny (np. Kardiologia)",
  "specialist": "Sugerowany specjalista (np. Kardiolog)",
  "recommendedTests": ["Badanie 1", "Badanie 2"],
  "tests": ["Badanie 1", "Badanie 2"],
  "priority": "Standardowy",
  "explanation": "Krótkie wyjaśnienie dla pacjenta."
}
`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Błąd podczas zapytania do Gemini API:', error);
    
    // Zwracamy bezpieczny obiekt awaryjny, ze wszystkimi polami i tablicami
    return {
      direction: 'Diagnostyka Ogólna',
      specialist: 'Lekarz Rodzinny',
      recommendedTests: ['Morfologia krwi', 'Badanie moczu'],
      tests: ['Morfologia krwi', 'Badanie moczu'],
      priority: 'Standardowy',
      explanation: 'Nie udało się połączyć z API. Sprawdź poprawność klucza w pliku .env.'
    };
  }
}