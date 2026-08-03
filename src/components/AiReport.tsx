import { AnalysisResult } from '../types';
import { URGENCY_STYLES } from '../data';
import {
  Stethoscope,
  Compass,
  UserRound,
  FlaskConical,
  ShieldCheck,
  ChevronRight,
  Download,
} from 'lucide-react';

interface AiReportProps {
  loading: boolean;
  result: AnalysisResult | null;
}

export default function AiReport({ loading, result }: AiReportProps) {
  return (
    <section className="mt-7 print:mt-0">
      {loading && (
        <div className="flex items-center justify-center gap-3 rounded-3xl border border-ink-100 bg-white/70 py-16 shadow-card animate-fade-in print:hidden">
          <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-sage-200 border-t-sage-500" />
          <span className="text-sm font-medium text-ink-500">Przygotowuję sugestię triażową z AI...</span>
        </div>
      )}

      {!loading && result && (
        <div className="overflow-hidden rounded-3xl border border-ink-100 bg-white/85 shadow-card backdrop-blur-sm animate-fade-up print:border-none print:shadow-none print:bg-white print:rounded-none">
          <div className="hidden print:block mb-8 border-b border-ink-100 pb-6">
            <div className="flex items-center gap-3 mb-4">
              <Stethoscope className="h-8 w-8 text-sage-600" />
              <h1 className="text-2xl font-bold text-ink-900">Raport Triażowy pacjenta - MedTriage</h1>
            </div>
            <p className="text-sm text-ink-600"><strong>Data analizy:</strong> {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
          </div>

          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-gradient-to-r from-sage-50 to-teal-50/60 px-6 py-5 sm:px-7 print:bg-none print:px-0">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-5 w-5 text-sage-600 print:text-ink-900" />
              <h3 className="text-base font-semibold text-ink-900">Wynik analizy triażowej AI</h3>
            </div>
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold print:border-ink-200 print:text-ink-900 ${URGENCY_STYLES[result.urgency]}`}>
              Priorytet: {result.urgency}
            </span>
          </div>

          <div className="grid gap-px bg-ink-100 sm:grid-cols-2 print:grid-cols-2 print:bg-ink-200 print:border-b print:border-ink-200">
            <div className="bg-white p-6 sm:p-7 print:p-4">
              <div className="flex items-center gap-2.5 text-sage-600 print:text-ink-500">
                <Compass className="h-4.5 w-4.5" />
                <span className="text-[0.72rem] font-semibold uppercase tracking-wider">Sugerowany kierunek</span>
              </div>
              <p className="mt-2.5 text-xl font-bold text-ink-900">{result.direction}</p>
            </div>
            <div className="bg-white p-6 sm:p-7 print:p-4">
              <div className="flex items-center gap-2.5 text-teal-600 print:text-ink-500">
                <UserRound className="h-4.5 w-4.5" />
                <span className="text-[0.72rem] font-semibold uppercase tracking-wider">Rekomendowany specjalista</span>
              </div>
              <p className="mt-2.5 text-xl font-bold text-ink-900">{result.specialist}</p>
            </div>
          </div>

          <div className="border-t border-ink-100 bg-white p-6 sm:p-7 print:border-none print:px-0">
            <div className="flex items-center gap-2.5 text-sand-500 print:text-ink-500">
              <FlaskConical className="h-4.5 w-4.5" />
              <span className="text-[0.72rem] font-semibold uppercase tracking-wider">Zalecane badania wstępne</span>
            </div>
            <ul className="mt-3.5 grid gap-2.5 sm:grid-cols-2 print:grid-cols-1">
              {result.tests.map((test) => (
                <li key={test} className="flex items-center gap-3 rounded-xl border border-ink-100 bg-sage-50/40 px-4 py-3 print:border-none print:bg-transparent print:p-1">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sage-100 text-sage-600 print:hidden">
                    <ChevronRight className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-sm font-medium text-ink-800">{test}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-t border-ink-100 bg-white p-6 sm:px-7 print:hidden flex justify-center">
            <button onClick={() => window.print()} className="group inline-flex items-center gap-2.5 rounded-2xl bg-ink-900 px-6 py-3 text-sm font-semibold text-white shadow-soft transition-all duration-200 hover:bg-ink-800 hover:shadow-card cursor-pointer">
              <Download className="h-4.5 w-4.5 transition-transform group-hover:-translate-y-0.5" /> Pobierz raport dla lekarza (PDF)
            </button>
          </div>
        </div>
      )}
    </section>
  );
}