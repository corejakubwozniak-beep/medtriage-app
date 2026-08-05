import { supabase } from './supabase';

export async function analyzeSymptomsWithGemini(
  symptoms: string, 
  imageFile: { base64: string; mimeType: string } | null
) {
  try {
    // Odpytujemy naszą własną, bezpieczną funkcję serwerową (Edge Function)
    const { data, error } = await supabase.functions.invoke('analyze-symptoms', {
      body: { symptoms, imageFile }
    });

    if (error) {
      throw error;
    }

    return data; // Zwracamy czysty wynik z serwera

  } catch (error: any) {
    console.error('Błąd połączenia z serwerem AI:', error);
    return {
      error: true,
      direction: 'Błąd analizy',
      explanation: 'Wystąpił problem techniczny podczas łączenia z bezpiecznym serwerem. Spróbuj ponownie za chwilę.',
      specialist: 'Brak',
      priority: 'Standardowy',
      tests: [],
    };
  }
}
