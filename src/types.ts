export interface Organization {
  id: number;
  name: string;
  slug: string;
}

export interface Doctor {
  id: number;
  facility_id: number;
  full_name: string;
  specialty: string;
  rating: number;
  is_active: boolean;
}

export interface Facility {
  id: number;
  organization_id?: number;
  name: string;
  address: string;
  earliestSlot?: string;
  isFastest?: boolean;
  doctor?: string;
  rating: number;
  direction?: string;
  appointments?: Appointment[];
}

export interface Appointment {
  id: number;
  facility_id: number;
  doctor_id?: number;
  date: string;
  time: string;
  status: 'available' | 'booked';
  patient_info?: string | null;
  triage_direction?: string | null;
  urgency?: 'Pilny' | 'Standardowy' | 'Planowy';
  triage_summary?: string;
  preliminary_tests?: string[];
  facilities?: {
    name: string;
    address: string;
  };
  doctors?: {
    full_name: string;
    specialty: string;
  };
}

export interface AnalysisResult {
  direction: string;
  directionNote: string;
  specialist: string;
  specialistNote: string;
  tests: string[];
  urgency: 'Pilny' | 'Standardowy' | 'Planowy';
}

export interface HistoryItem {
  id: string;
  date: string;
  symptoms: string;
  hasImage: boolean;
  result: AnalysisResult;
}
