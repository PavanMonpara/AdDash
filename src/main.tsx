/* eslint-disable react-hooks/rules-of-hooks */
import { createRoot } from 'react-dom/client';
import App from './App';
// import 'bootstrap/dist/css/bootstrap.min.css';
// import './assets/css/main.css';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import "./index.css";
import "./assets/css/main.css"
import GlobalLoader from './components/ui/GlobalLoader';

const queryClient = new QueryClient();

createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={queryClient}>
    <GlobalLoader />
    <App />
  </QueryClientProvider>,
);
