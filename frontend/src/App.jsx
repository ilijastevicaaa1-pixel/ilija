import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ChatWindow from "./ChatWindow";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

import LoginScreen from './screens/LoginScreen.jsx';
import DashboardScreen from './screens/DashboardScreen.jsx';
import InputInvoiceScreen from './screens/InputInvoiceScreen.jsx';
import OutputInvoiceScreen from './screens/OutputInvoiceScreen.jsx';
import BankScreen from './screens/BankScreen.jsx';
import VatPeriodsScreen from './screens/VatPeriodsScreen.jsx';
import DeadlinesScreen from './screens/DeadlinesScreen.jsx';
import AnnualReportScreen from './screens/AnnualReportScreen.jsx';
import OffersScreen from './screens/OffersScreen.jsx';
import ContractsScreen from './screens/ContractsScreen.jsx';
import StockScreen from './screens/StockScreen.jsx';
import TravelOrdersScreen from './screens/TravelOrdersScreen.jsx';
import SalariesScreen from './screens/SalariesScreen.jsx';
import InternalRecordsScreen from './screens/InternalRecordsScreen.jsx';

import ArtikliScreen from './screens/skladiste/ArtikliScreen.jsx';
import StanjeScreen from './screens/skladiste/StanjeScreen.jsx';
import PrijemkeScreen from './screens/skladiste/PrijemkeScreen.jsx';
import VydajkeScreen from './screens/skladiste/VydajkeScreen.jsx';
import KarticaScreen from './screens/skladiste/KarticaScreen.jsx';

import AiBatchScreen from './screens/AiBatchScreen.jsx';
import AiFakturaScreen from './screens/AiFakturaScreen.jsx';

import BotChatScreen from './BotChatScreen.jsx';


// ---------------------------------------------------------
// WRAPPER KOJI PRIKAZUJE CHAT NA SVIM STRANICAMA OSIM LOGIN
// ---------------------------------------------------------
function AppWithChat() {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <>
      <div className="app-background" />
      <div className="app-overlay" />
      <div className="app-content">
        <Routes>
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/register" element={<Navigate to="/login" replace />} />
          <Route path="/dashboard" element={<ProtectedRoute><DashboardScreen /></ProtectedRoute>} />
          <Route path="/input-invoices" element={<ProtectedRoute><InputInvoiceScreen /></ProtectedRoute>} />
          <Route path="/output-invoices" element={<ProtectedRoute><OutputInvoiceScreen /></ProtectedRoute>} />
          <Route path="/bank" element={<ProtectedRoute><BankScreen /></ProtectedRoute>} />
          <Route path="/vat-periods" element={<ProtectedRoute><VatPeriodsScreen /></ProtectedRoute>} />
          <Route path="/deadlines" element={<ProtectedRoute><DeadlinesScreen /></ProtectedRoute>} />
          <Route path="/annual-report" element={<ProtectedRoute><AnnualReportScreen /></ProtectedRoute>} />
          <Route path="/offers" element={<ProtectedRoute><OffersScreen /></ProtectedRoute>} />
          <Route path="/contracts" element={<ProtectedRoute><ContractsScreen /></ProtectedRoute>} />
          <Route path="/stock" element={<ProtectedRoute><StockScreen /></ProtectedRoute>} />
          <Route path="/travel-orders" element={<ProtectedRoute><TravelOrdersScreen /></ProtectedRoute>} />
          <Route path="/salaries" element={<ProtectedRoute><SalariesScreen /></ProtectedRoute>} />
          <Route path="/internal-records" element={<ProtectedRoute><InternalRecordsScreen /></ProtectedRoute>} />
          <Route path="/artikli" element={<ProtectedRoute><ArtikliScreen /></ProtectedRoute>} />
          <Route path="/stanje" element={<ProtectedRoute><StanjeScreen /></ProtectedRoute>} />
          <Route path="/prijemke" element={<ProtectedRoute><PrijemkeScreen /></ProtectedRoute>} />
          <Route path="/vydajke" element={<ProtectedRoute><VydajkeScreen /></ProtectedRoute>} />
          <Route path="/kartica" element={<ProtectedRoute><KarticaScreen /></ProtectedRoute>} />
          <Route path="/skladiste/artikli" element={<ProtectedRoute><ArtikliScreen /></ProtectedRoute>} />
          <Route path="/skladiste/stanje" element={<ProtectedRoute><StanjeScreen /></ProtectedRoute>} />
          <Route path="/skladiste/prijemke" element={<ProtectedRoute><PrijemkeScreen /></ProtectedRoute>} />
          <Route path="/skladiste/vydajke" element={<ProtectedRoute><VydajkeScreen /></ProtectedRoute>} />
          <Route path="/skladiste/kartica/:itemId" element={<ProtectedRoute><KarticaScreen /></ProtectedRoute>} />
          <Route path="/ai-faktura" element={<ProtectedRoute><AiFakturaScreen /></ProtectedRoute>} />
          <Route path="/ai-batch" element={<ProtectedRoute><AiBatchScreen /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </div>
    </>
  );
}


// ---------------------------------------------------------
// GLAVNI APP WRAPPER
// ---------------------------------------------------------

function App() {
  const [openChat, setOpenChat] = useState(false);

  function AppWithRozpocetBtn() {
    const navigate = useNavigate();
    return <>
      {/* Floating chat dugme */}
      <div
        onClick={() => setOpenChat(true)}
        className="chat-launcher"
      >
        💬
      </div>

      {/* Novo dugme u gornjem desnom uglu */}
      <button
        className="rozpocet-btn"
        style={{ position: 'fixed', top: 24, right: 32, zIndex: 10001 }}
        onClick={() => navigate('/rozpocet')}
      >
        Rozpočet
      </button>

      {/* Chat prozor */}
      {openChat && (
        <ChatWindow onClose={() => setOpenChat(false)} />
      )}
      <AppWithChat />
    </>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/*" element={<AppWithRozpocetBtn />} />
        {/* Dinamički import Rozpocet stranice */}
        <Route path="/rozpocet" element={
          <React.Suspense fallback={<div>Učitavanje...</div>}>
            <Rozpocet />
          </React.Suspense>
        } />
      </Routes>
    </BrowserRouter>
  );
}


// Dinamički import Rozpocet stranice
const Rozpocet = React.lazy(() => import('./Rozpocet.jsx'));

export default App;


