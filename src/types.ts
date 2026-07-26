export type AnalysisResult = {
  direction: string;
  directionNote: string;
  specialist: string;
  specialistNote: string;
  tests: string[];
  urgency: 'Planowy' | 'Standardowy' | 'Pilny';
};

export type HistoryItem = {
  id: string;
  date: string;
  symptoms: string;
  hasImage: boolean;
  result: AnalysisResult;
};

export type Facility = {
  name: string;
  address: string;
  earliestSlot: string;
  isFastest: boolean;
  doctor: string;
  rating: number;
};