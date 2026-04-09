@echo off
set NODE_ENV=development

echo Pokrecem backend...
start cmd /k "cd backend && npm start"

echo Pokrecem frontend dev server...
start cmd /k "cd frontend && npm run dev"

echo Cekam da se serveri pokrenu...
timeout /t 5 >nul

echo Otvaram aplikaciju...
start http://localhost:5173

echo Gotovo.
pause