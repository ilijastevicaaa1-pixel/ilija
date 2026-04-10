import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { useAuth } from './auth/AuthContext.jsx';
import ProtectedRoute from './auth/ProtectedRoute.jsx';

import LoadingSkeleton from "../components/LoadingSkeleton";
import ChatWindow from "./ChatWindow";
import BotChatScreen from './BotChatScreen.jsx';

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


// ---------------------------------------------------------
// WRAPPER ZA PRIJAVLJENE KORISNIKE
// ---------------------------------------------------------

function AppWithChat() {
  return (
    <>
      <div className="app-background" />
      <div className="app-overlay" />
      <div className="app-content">

        <BotChatScreen />

        <Routes>
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
          <Route path="/kartica/:itemId" element={<ProtectedRoute><KarticaScreen /></ProtectedRoute>} />

          <Route path="/ai-faktura" element={<ProtectedRoute><AiFakturaScreen /></ProtectedRoute>} />
          <Route path="/ai-batch" element={<ProtectedRoute><AiBatchScreen /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

      </div>
    </>
  );
}


// ---------------------------------------------------------
// GLAVNI APP
// ---------------------------------------------------------

function App() {
  const [initialized, setInitialized] = useState(false);
  const [openChat, setOpenChat] = useState(false);
  const { user, loading } = useAuth();

  // GLOBALNI LOADING
  useEffect(() => {
    setTimeout(() => setInitialized(true), 1200);
  }, []);

  if (!initialized || loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw',
        height: '100vh',
        background: '#fff',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <BrowserRouter>

      {/* Chat dugme samo za prijavljene */}
      {user && user.token && (
        <>
          <div
            onClick={() => setOpenChat(true)}
            className="chat-launcher"
          >
            💬
          </div>

          {openChat && (
            <ChatWindow onClose={() => setOpenChat(false)} />
          )}
        </>
      )}

      {/* Ako nije prijavljen → login */}
      {!user || !user.token ? (
        <Routes>
          <Route path="/" element={<LoginScreen />} />
          <Route path="/login" element={<LoginScreen />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      ) : (
        <AppWithChat />
      )}

    </BrowserRouter>
  );
}

export default App;


