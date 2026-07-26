import { AnalysisResult, Facility } from './types';

export const CARDIAC_RESULT: AnalysisResult = {
  direction: 'Kardiologia',
  directionNote:
    'Opisane objawy mogą wskazywać na krążeniowe podłoże dolegliwości. Zalecana konsultacja w kierunku chorób serca i naczyń.',
  specialist: 'Kardiolog',
  specialistNote:
    'Specjalista oceni ryzyko sercowo-naczyniowe i zleci odpowiedni panel diagnostyczny.',
  tests: [
    'EKG spoczynkowe (12 odprowadzeń)',
    'Echokardiografia serca',
    'Morfologia krwi + lipidogram',
    'Troponina wysokoczuła',
  ],
  urgency: 'Standardowy',
};

export const GENERAL_RESULT: AnalysisResult = {
  direction: 'Diagnostyka ogólna',
  directionNote:
    'Opisane objawy nie wskazują jednoznacznie na konkretną dziedzinę. Zalecana szeroka diagnostyka wstępna u lekarza pierwszego kontaktu.',
  specialist: 'Lekarz rodzinny',
  specialistNote:
    'Lekarz pierwszego kontaktu zbierze wywiad, zleci badania wstępne i w razie potrzeby skieruje do specjalisty.',
  tests: [
    'Morfologia krwi',
    'CRP / OB',
    'Badanie ogólne moczu',
    'Glukoza na czczo',
  ],
  urgency: 'Planowy',
};

export const URGENCY_STYLES: Record<AnalysisResult['urgency'], string> = {
  Planowy: 'bg-sage-100 text-sage-700 border-sage-200',
  Standardowy: 'bg-teal-50 text-teal-700 border-teal-200',
  Pilny: 'bg-sand-100 text-sand-500 border-sand-200',
};

export const CARDIAC_FACILITIES: Facility[] = [
  {
    name: 'Klinika Kardiologiczna ProMed',
    address: 'ul. Kardiologiczna 12, Warszawa',
    earliestSlot: 'Dziś, godz. 16:30',
    isFastest: true,
    doctor: 'dr n. med. Jan Kowalski',
    rating: 4.9,
  },
  {
    name: 'Centrum Medyczne Diagnostyka+',
    address: 'al. Niepodległości 220, Warszawa',
    earliestSlot: 'Jutro, godz. 09:00',
    isFastest: false,
    doctor: 'dr Anna Wiśniewska',
    rating: 4.7,
  },
];

export const GENERAL_FACILITIES: Facility[] = [
  {
    name: 'Centrum Medyczne Diagnostyka+',
    address: 'al. Niepodległości 220, Warszawa',
    earliestSlot: 'Dziś, godz. 17:15',
    isFastest: true,
    doctor: 'dr Piotr Nowak',
    rating: 4.8,
  },
  {
    name: 'Przychodnia Rodzinna Zdrowie',
    address: 'ul. Słoneczna 5, Warszawa',
    earliestSlot: 'Jutro, godz. 10:30',
    isFastest: false,
    doctor: 'dr Maria Lewandowska',
    rating: 4.6,
  },
];