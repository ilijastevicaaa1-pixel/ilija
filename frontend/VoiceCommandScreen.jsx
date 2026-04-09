
import React, { useState, useRef, useEffect } from 'react';
import { apiFetch } from './src/api.js';

// Backend TTS funkcija (isti flow kao DashboardScreen)
async function speak(text, onStart, onEnd) {
  console.log('[TTS] Pozivam speak sa tekstom:', text);
  if (onStart) onStart();
  if (!window.speechSynthesis) {
    if (onEnd) onEnd();
    return;
  }
  const utterance = new window.SpeechSynthesisUtterance(text);
  utterance.lang = 'sr-RS';
  utterance.onend = () => { if (onEnd) onEnd(); };
  window.speechSynthesis.speak(utterance);
}


function VoiceCommandScreen() {
    const [aiReply, setAiReply] = useState(''); // za prikaz AI odgovora
  // --- Automatsko paljenje mikrofona na mount (ako nije već pozvano iz TTS) ---
  // Uklonjeno automatsko pokretanje snimanja na mount

  // ----------------------
  //  STATE
  // ----------------------
  const [error, setError] = useState('');
  const [ttsActive, setTtsActive] = useState(false);
  const [micLevel, setMicLevel] = useState(0);
  const [recording, setRecording] = useState(false);
  const [micError, setMicError] = useState('');
  const [audioSize, setAudioSize] = useState(null); // za prikaz veličine snimka
  const [recognizedText, setRecognizedText] = useState(''); // za prikaz prepoznatog teksta
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);



  // (Uklonjen automatski TTS pozdrav na mount)


  // --- SLANJE AUDIO SNIMKA BACKENDU I AI ODGOVOR ---
  // --- MAPA: AI action -> { method, path } ---
  const AI_ACTION_MAP = {
    kreiraj_fakturu: { method: 'POST', path: '/api/fakture' },
    kreiraj_izlaznu_fakturu: { method: 'POST', path: '/api/izlazne-fakture' },
    dodaj_banku: { method: 'POST', path: '/api/banka' },
    generisi_godisnji_izvestaj: { method: 'POST', path: '/api/godisnji-izvestaji/generisi' },
    generisi_pdv_period: { method: 'POST', path: '/api/pdv-periodi/generisi' },
    // Prikaz podataka (GET)
    prikazi_fakture: { method: 'GET', path: '/api/fakture' },
    prikazi_izlazne_fakture: { method: 'GET', path: '/api/izlazne-fakture' },
    prikazi_banku: { method: 'GET', path: '/api/banka' },
    prikazi_godisnje_izvestaje: { method: 'GET', path: '/api/godisnji-izvestaji' },
    prikazi_pdv_periode: { method: 'GET', path: '/api/pdv-periodi' },
    prikazi_dashboard: { method: 'GET', path: '/api/dashboard' },
    prikazi_kpi: { method: 'GET', path: '/api/kpi' },
    prikazi_trendove: { method: 'GET', path: '/api/trends' },
    prikazi_analitiku: { method: 'GET', path: '/api/statistics/expenses' },
    // Dodaj još po potrebi
  };

  // --- Prikaz rezultata AI akcije ---
  const [actionResult, setActionResult] = useState(null);

  async function sendAudioToBackend(audioBlob) {
    console.log('[DEBUG] Slanje audio backendu, veličina:', audioBlob.size);
    setActionResult(null);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    try {
      const response = await fetch('http://localhost:3001/api/voice-command', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) {
        setError('Greška: Backend nije odgovorio (' + response.status + ')');
        setRecognizedText('');
        return;
      }
      const data = await response.json();
      console.log('[DEBUG] Backend AI odgovor:', data);
      // Prikaz prepoznatog teksta i AI odgovora kao u tekstualnom chatu
      if (data && data.recognizedText) {
        setRecognizedText(data.recognizedText);
        // Specijalni odgovor za 'banka' kao u tekstualnom chatu
        if (data.recognizedText.trim().toLowerCase() === 'banka') {
          setAiReply('Dobro došli u virtuelnu banku, kako mogu da vam pomognem?');
          speak(
            'Dobro došli u virtuelnu banku, kako mogu da vam pomognem?',
            () => setTtsActive(true),
            () => {
              setTtsActive(false);
              startRecording();
            }
          );
          return;
        }
      } else {
        setRecognizedText('');
      }
      if (data && data.answer) {
        setAiReply(data.answer);
      } else {
        setAiReply('');
      }

      // --- AI ACTION DISPATCHER ---
      if (data && data.extracted && typeof data.extracted === 'object' && data.extracted.action) {
        const action = data.extracted.action;
        const mapping = AI_ACTION_MAP[action];
        if (mapping) {
          // Pripremi payload bez polja 'action'
          const payload = { ...data.extracted };
          delete payload.action;
          try {
            const res = await apiFetch(mapping.path, {
              method: mapping.method,
              body: JSON.stringify(payload)
            });
            setActionResult(res);
            // Prikaži rezultat i pročitaj ga
            if (res && res.success) {
              speak('Akcija uspešno izvršena.', () => setTtsActive(true), () => setTtsActive(false));
            } else if (res && res.error) {
              speak('Greška: ' + res.error, () => setTtsActive(true), () => setTtsActive(false));
            }
          } catch (err) {
            setActionResult({ error: err.message });
            speak('Greška pri izvršavanju akcije.', () => setTtsActive(true), () => setTtsActive(false));
          }
        }
      }

      speak(
        data.answer,
        () => setTtsActive(true),
        () => {
          setTtsActive(false);
          // Uklonjeno automatsko ponovno slušanje
        }
      );
    } catch (err) {
      setError('Greška u slanju audio snimka: ' + err.message);
      setRecognizedText('');
      setActionResult({ error: err.message });
      console.error('Greška u slanju audio snimka:', err);
    }
  }

  // ----------------------
  //  START RECORDING
  // ----------------------
  const startRecording = async () => {
    setError('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!stream) {
        setError('Mikrofon nije dostupan.');
        return;
      }

      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      const gainNode = audioContext.createGain();
      gainNode.gain.value = 2.0;

      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      source.connect(gainNode);
      gainNode.connect(analyser);

      const destination = audioContext.createMediaStreamDestination();
      gainNode.connect(destination);

      const processedStream = destination.stream;

      let mimeType = '';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) mimeType = 'audio/webm;codecs=opus';
      else if (MediaRecorder.isTypeSupported('audio/webm')) mimeType = 'audio/webm';
      else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) mimeType = 'audio/ogg;codecs=opus';

      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(processedStream, { mimeType });

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('[DEBUG] Snimanje završeno, veličina audio:', audioBlob.size);
        setAudioSize(audioBlob.size);
        if (audioBlob.size === 0) {
          setError('Nema zvuka.');
          return;
        }
        if (audioContextRef.current) audioContextRef.current.close();
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        setMicLevel(0);
        console.log('[DEBUG] Pozivam sendAudioToBackend');
        sendAudioToBackend(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      console.log('[DEBUG] mediaRecorder state nakon start:', mediaRecorder.state);
      setRecording(true);

      // Automatski zaustavi snimanje nakon 3 sekunde
      console.log('[DEBUG] setTimeout za stop postavljen');
      setTimeout(() => {
        if (mediaRecorderRef.current) {
          console.log('[DEBUG] Timeout callback, state:', mediaRecorderRef.current.state);
        }
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
          console.log('[DEBUG] Automatski stop snimanja posle 3s');
          mediaRecorderRef.current.stop();
        }
      }, 3000);

    } catch {
      setError('Nije moguće pristupiti mikrofonu.');
    }
  };

  // ----------------------
  //  STOP RECORDING
  // ----------------------
  const stopRecording = () => {
    console.log('[DEBUG] stopRecording pozvan');
    if (mediaRecorderRef.current) mediaRecorderRef.current.stop();
    setRecording(false);

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setMicLevel(0);
  };


  // --- UI ---
  return (
    <div>
      <div style={{ margin: 40 }}>
        <span
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            background: ttsActive ? '#43a047' : '#eee',
            color: ttsActive ? 'white' : '#888',
            borderRadius: 8,
            fontWeight: 'bold',
            fontSize: 18,
            transition: 'background 0.3s, color 0.3s'
          }}
        >
          {ttsActive
            ? '🎤 TTS AKTIVAN — Asistentkinja govori...'
            : 'TTS je spreman'}
        </span>
        {audioSize !== null && (
          <div style={{ color: '#333', marginTop: 12, fontSize: 15 }}>
            Veličina poslednjeg snimka: <b>{audioSize}</b> bajtova
          </div>
        )}
      </div>
      {/* Prikaz prepoznatog teksta i AI odgovora kao u tekstualnom chatu */}
      <div style={{ maxWidth: 600, margin: '0 auto', fontFamily: 'sans-serif', marginBottom: 24 }}>
        <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, minHeight: 80, marginBottom: 8 }}>
          <div style={{ marginBottom: 8 }}>
            <span style={{ background: '#1976d2', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>STT</span>
            <b>Prepoznat tekst:</b> {recognizedText ? recognizedText : <i style={{ color: '#888' }}>Nije prepoznat govor</i>}
          </div>
          <div>
            <span style={{ background: '#43a047', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>AI</span>
            <b>AI odgovor:</b> {aiReply ? aiReply : <i style={{ color: '#888' }}>Nema odgovora</i>}
          </div>
        </div>
      </div>
      <div style={{ marginTop: 40 }}>
        <button
          onClick={recording ? stopRecording : startRecording}
          style={{
            background: recording ? '#d32f2f' : '#1976d2',
            color: 'white',
            border: 'none',
            borderRadius: 4,
            padding: '12px 32px',
            fontWeight: 'bold',
            fontSize: 18,
            position: 'relative'
          }}
        >
          {recording ? 'Zaustavi snimanje' : 'Započni snimanje'}
          {recording && (
            <span
              style={{
                marginLeft: 12,
                display: 'inline-block',
                width: 12,
                height: 12,
                background: '#ff5252',
                borderRadius: '50%',
                verticalAlign: 'middle',
                animation: 'pulse 1s infinite'
              }}
            />
          )}
        </button>
        {micError && <div style={{ color: 'red', marginTop: 16 }}>{micError}</div>}
        {error && <div style={{ color: 'red', marginTop: 16 }}>{error}</div>}
        {actionResult && (
          <div style={{ marginTop: 24, background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 8, padding: 16 }}>
            <b>Rezultat AI akcije:</b>
            <pre style={{ fontSize: 14, marginTop: 8 }}>{JSON.stringify(actionResult, null, 2)}</pre>
          </div>
        )}
      </div>
    </div>
  );

  // (uklonjen dupli return)
}

export default VoiceCommandScreen;



