# STABILIZACIJA APLIKACIJE — TODO

## Korak 1: Dashboard — prikaži SVE što backend vraća
- [ ] Dodati sekciju "Nedavne transakcije" (recentTransactions)
- [ ] Dodati sekciju "Nadolazeći rokovi" (upcomingDeadlines)
- [ ] Dodati sekciju "Nedavne fakture" (recentInvoices)

## Korak 2: App.jsx — registruj SVE postojeće ekrane
- [ ] Dodati importe za: RegisterScreen, BankScreen, InputInvoiceScreen, OutputInvoiceScreen, DeadlinesScreen, AnnualReportScreen, VatPeriodsScreen, AiFakturaScreen, AiBatchScreen, ArtikliScreen, PrijemkeScreen, VydajkeScreen, StanjeScreen, KarticaScreen
- [ ] Dodati rute u router sa ProtectedRoute

## Korak 3: Sinhronizuj Login/Register endpoint
- [ ] RegisterScreen: popraviti da koristi /api/auth/register (apiFetch) i ispravno čuva podatke
- [ ] AuthContext: dodati email, role, tenantId u state/localStorage

## Korak 4: Proveri API pozive u BankScreen, InvoiceScreen, DeadlinesScreen
- [ ] BankScreen: proveriti endpointe (upload je /api/upload/bank)
- [ ] InputInvoiceScreen: ukloniti nepostojeće /api/ledger/suggest
- [ ] OutputInvoiceScreen: popraviti endpoint za fakture

## Korak 5: Ukloni ili zameni prazne placeholder ekrane
- [ ] Ne registrovati u router: ContractsScreen, OffersScreen, InternalRecordsScreen, TravelOrdersScreen, SalariesScreen
- [ ] Ako su već uvezani negde, zameniti sadržaj sa "U izradi"
