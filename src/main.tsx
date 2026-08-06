import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App.tsx';
import './index.css';

// 1. Inicjalizacja Sentry (Observability - łapanie błędów z produkcji)
Sentry.init({
  dsn: "TUTAJ_WKLEJ_SWOJ_DSN_Z_SENTRY", // Otrzymasz go po założeniu darmowego konta na sentry.io
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// 2. Inicjalizacja TanStack Query (Inteligentne zarządzanie zapytaniami)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1, // W razie błędu sieci, system spróbuje ponowić zapytanie 1 raz
      refetchOnWindowFocus: true, // Odświeża dane, gdy administrator wraca na kartę przeglądarki
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
