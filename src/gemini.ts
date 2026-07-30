import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || '';
const genAI = new GoogleGenerativeAI(apiKey);

export async function analyzeSymptomsWithGemini(
  symptomsText: string,
  imageFile?: { base64: string; mimeType: string } | null
) {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-3.5-flash' });

    const prompt = `
Jesteś zaawansowanym asystentem triażowym w aplikacji medycznej MedTriage.
Przeanalizuj opisane objawy pacjenta oraz (jeśli zostało załączone) zdjęcie wyników badań, recepty lub zmiany na ciele.

Opis pacjenta: "${symptomsText || 'Brak opisu opisowego, przeanalizuj wyłącznie załączone zdjęcie.'}"

ZWRÓĆ ODPOWIEDŹ WYŁĄCZNIE W CZYSTYM FORMATZE JSON (bez znaczników markdown):
{
  "direction": "Kierunek diagnostyczny (np. Kardiologia, Dermatologia, Gastrologia)",
  "specialist": "Sugerowany specjalista (np. Dermatolog, Internista)",
  "recommendedTests": ["Badanie 1", "Badanie 2"],
  "tests": ["Badanie 1", "Badanie 2"],
  "priority": "Standardowy lub Pilny",
  "explanation": "Krótkie i zwięzłe wyjaśnienie dla pacjenta, uwzględniające zarówno tekst, jak i analizę ze zdjęcia."
}
`;

    // Składamy zapytanie: tekst + opcjonalnie obraz
    const contents: any[] = [prompt];

    if (imageFile) {
      contents.push({
        inlineData: {
          data: imageFile.base64,
          mimeType: imageFile.mimeType,
        },
      });
    }

    const result = await model.generateContent(contents);
    const responseText = result.response.text();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

    return JSON.parse(cleanJson);
  } catch (error) {
    console.error('Błąd podczas zapytania do Gemini API:', error);
    
    return {
      direction: 'Diagnostyka Ogólna',
      specialist: 'Lekarz Rodzinny',
      recommendedTests: ['Morfologia krwi', 'Badanie ogólne'],
      tests: ['Morfologia krwi', 'Badanie ogólne'],
      priority: 'Standardowy',
      explanation: 'Nie udało się przetworzyć zdjęcia lub zapytania. Sprawdź, czy zdjęcie jest czytelne.'
    };
  }
}
