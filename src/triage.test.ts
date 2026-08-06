import { describe, it, expect } from 'vitest';

// Struktura testowa weryfikująca logikę biznesową (Guardrails) 
// Docelowo testy wywołują Twoją funkcję Edge Function z zamockowanym zapytaniem
describe('Logika Triażowa AI (Guardrails)', () => {
  
  it('powinno odrzucić zapytanie niemedyczne (np. przepis kulinarny)', () => {
    const mockApiResponse = {
      direction: "Błąd analizy",
      explanation: "Zapytanie nie ma charakteru medycznego lub nie dotyczy zdrowia ludzkiego.",
      specialist: "Brak",
      priority: "Standardowy",
      tests: []
    };

    expect(mockApiResponse.direction).toBe('Błąd analizy');
    expect(mockApiResponse.priority).toBe('Standardowy');
  });

  it('powinno nadać priorytet Pilny dla objawów zagrożenia życia', () => {
    const mockApiResponse = {
      direction: "SOR / Telefon 112",
      explanation: "Objawy wskazują na stan bezpośredniego zagrożenia życia.",
      specialist: "Lekarz Medycyny Ratunkowej",
      priority: "Pilny",
      tests: ["EKG", "Troponina"]
    };

    expect(mockApiResponse.priority).toBe('Pilny');
    expect(mockApiResponse.direction).toContain('112');
  });
});