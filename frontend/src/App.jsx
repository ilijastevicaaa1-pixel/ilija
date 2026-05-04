import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ProtectedRoute from "./components/ProtectedRoute";



// Auth
import LoginScreen from "./pages/LoginScreen";
import RegisterScreen from "./pages/RegisterScreen";
import SaasLogin from "./pages/SaasLogin";

// Dashboard & Core
import DashboardScreen from "./pages/DashboardScreen";
import DeadlinesScreen from "./pages/DeadlinesScreen";
import Rozpocet from "./pages/Rozpocet";
import WithBookkeeper from "./pages/WithBookkeeper";

// AI / Inteligentni sistemi
import AiBatchScreen from "./pages/AiBatchScreen";
import AiFakturaScreen from "./pages/AiFakturaScreen";

// Fakture
import AnnualReportScreen from "./pages/AnnualReportScreen";
import InputInvoiceScreen from "./pages/InputInvoiceScreen";
import OutputInvoiceScreen from "./pages/OutputInvoiceScreen";
import VatPeriodsScreen from "./pages/VatPeriodsScreen";

// Banka
import BankScreen from "./pages/BankScreen";

// Skladište
import ArtikliScreen from "./pages/ArtikliScreen";
import KarticaScreen from "./pages/KarticaScreen";
import PrijemkeScreen from "./pages/PrijemkeScreen";
import StanjeScreen from "./pages/StanjeScreen";
import VydajkeScreen from "./pages/VydajkeScreen";
import StockScreen from "./pages/StockScreen";
import WarehouseMenu from "./pages/WarehouseMenu";

// ERP / Dokumenti
import ContractsScreen from "./pages/ContractsScreen";
import InternalRecordsScreen from "./pages/InternalRecordsScreen";
import OffersScreen from "./pages/OffersScreen";
import TravelOrdersScreen from "./pages/TravelOrdersScreen";
import SalariesScreen from "./pages/SalariesScreen";
import ManualEntryScreen from "./screens/ManualEntryScreen.jsx";
import BankaEntry from "./screens/manual/BankaEntry.jsx";

function App() {
    return (
        <Router>
            <Routes>

                {/* Public routes */}
                <Route path="/" element={<LoginScreen />} />
                <Route path="/register" element={<RegisterScreen />} />
                <Route path="/saas-login" element={<SaasLogin />} />

                {/* Dashboard */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/deadlines"
                    element={
                        <ProtectedRoute>
                            <DeadlinesScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/rozpocet"
                    element={
                        <ProtectedRoute>
                            <Rozpocet />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/with-bookkeeper"
                    element={
                        <ProtectedRoute>
                            <WithBookkeeper />
                        </ProtectedRoute>
                    }
                />

                {/* AI */}
                <Route
                    path="/ai/batch"
                    element={
                        <ProtectedRoute>
                            <AiBatchScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/ai/faktura"
                    element={
                        <ProtectedRoute>
                            <AiFakturaScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Fakture */}
                <Route
                    path="/reports/annual"
                    element={
                        <ProtectedRoute>
                            <AnnualReportScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/invoices/input"
                    element={
                        <ProtectedRoute>
                            <InputInvoiceScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/invoices/output"
                    element={
                        <ProtectedRoute>
                            <OutputInvoiceScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/vat/periods"
                    element={
                        <ProtectedRoute>
                            <VatPeriodsScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Banka */}
                <Route
                    path="/bank"
                    element={
                        <ProtectedRoute>
                            <BankScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Skladište */}
                <Route
                    path="/warehouse"
                    element={
                        <ProtectedRoute>
                            <WarehouseMenu />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/artikli"
                    element={
                        <ProtectedRoute>
                            <ArtikliScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/kartica"
                    element={
                        <ProtectedRoute>
                            <KarticaScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/prijemke"
                    element={
                        <ProtectedRoute>
                            <PrijemkeScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/stanje"
                    element={
                        <ProtectedRoute>
                            <StanjeScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/vydajke"
                    element={
                        <ProtectedRoute>
                            <VydajkeScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/warehouse/stock"
                    element={
                        <ProtectedRoute>
                            <StockScreen />
                        </ProtectedRoute>
                    }
                />

                {/* ERP / Dokumenti */}
                <Route
                    path="/contracts"
                    element={
                        <ProtectedRoute>
                            <ContractsScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/internal-records"
                    element={
                        <ProtectedRoute>
                            <InternalRecordsScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/offers"
                    element={
                        <ProtectedRoute>
                            <OffersScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/travel-orders"
                    element={
                        <ProtectedRoute>
                            <TravelOrdersScreen />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/salaries"
                    element={
                        <ProtectedRoute>
                            <SalariesScreen />
                        </ProtectedRoute>
                    }
                />

                {/* Manual Entry */}
                <Route
                    path="/manual-entry"
                    element={
                        <ProtectedRoute>
                            <ManualEntryScreen />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/manual-entry/banka"
                    element={
                        <ProtectedRoute>
                            <BankaEntry />
                        </ProtectedRoute>
                    }
                />
                {/* Dodaj ostale sub-rute po potrebi: /pokladna, /faktura itd. */}

            </Routes>
        </Router>
    );
}

export default App;