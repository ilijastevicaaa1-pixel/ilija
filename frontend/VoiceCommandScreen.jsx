
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
  import { STATE_ACTIONS, getNextQuestion } from './utils/stateActions.js';

  // State machine state
  const [conversationState, setConversationState] = useState({ action: null, step: 0, data: {}, sessionId: Date.now() });
  const [nextQuestion, setNextQuestion] = useState('');

  // Load/save state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(`voiceState_${conversationState.sessionId}`);
    if (saved) setConversationState(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem(`voiceState_${conversationState.sessionId}`, JSON.stringify(conversationState));
  }, [conversationState]);

  // Reset state machine
  const resetStateMachine = () => {
    setConversationState({ action: null, step: 0, data: {}, sessionId: Date.now() });
    setNextQuestion('');
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

      // --- STATE MACHINE DISPATCHER ---
      // Update state sa novim input-om
      const newData = { ...conversationState.data, [data.stepField || 'input']: recognizedText };
      let newState = { ...conversationState, data: newData };

      if (data.intent === 'start_action' && STATE_ACTIONS[data.action]) {
        newState = { action: data.action, step: 0, data: {}, sessionId: conversationState.sessionId };
        const q = getNextQuestion(data.action, 0, {});
        setNextQuestion(q);
        speak(q || 'Šta želite da uradim?', () => setTtsActive(true), () => setTtsActive(false));
        return;
      }

      if (conversationState.action && newState.step < STATE_ACTIONS[conversationState.action]?.steps.length) {
        const currentStep = newState.step;
        const config = STATE_ACTIONS[conversationState.action];
        const stepField = config.steps[currentStep];
        newData[stepField] = recognizedText;

        if (config.validate?.(newData)) {
          // Sve prikupljeno → EXECUTE
          try {
            const res = await apiFetch(config.endpoint.path, {
              method: config.endpoint.method,
              body: JSON.stringify(newData)
            });
            setActionResult(res);
            speak(res.success ? 'Uspešno izvršeno!' : ('Greška: ' + (res.error || 'Nepoznato')),
              () => setTtsActive(true), () => {
                setTtsActive(false);
                resetStateMachine();
              });
          } catch (err) {
            setActionResult({ error: err.message });
            speak('Greška pri izvršavanju.', () => setTtsActive(true), () => setTtsActive(false));
          }
        } else {
          // Sledeće pitanje
          const nextQ = getNextQuestion(conversationState.action, currentStep + 1, newData);
          newState.step = currentStep + 1;
          setNextQuestion(nextQ);
          setConversationState(newState);
          speak(nextQ, () => setTtsActive(true), () => setTtsActive(false));
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
            <span style={{ background: '#1976d2', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>🎤 GOVOR</span>
            <b>{recognizedText || 'Nije prepoznato...'}</b>
          </div>
          {conversationState.action && (
            <div style={{ background: '#e3f2fd', padding: 12, borderRadius: 4, marginBottom: 8 }}>
              <b>🤖 STATE: {conversationState.action} (korak {conversationState.step + 1}/{STATE_ACTIONS[conversationState.action]?.steps.length})</b>
              <br />{nextQuestion && <i>{nextQuestion}</i>}
              <pre style={{ fontSize: 12, marginTop: 4 }}>{JSON.stringify(conversationState.data, null, 2)}</pre>
              <button onClick={resetStateMachine} style={{ marginTop: 4, padding: '4px 8px', fontSize: 12 }}>Reset</button>
            </div>
          )}
          <div>
            <span style={{ background: '#43a047', color: 'white', borderRadius: 4, padding: '2px 8px', fontWeight: 'bold', marginRight: 8 }}>🤖 AI</span>
            <b>{aiReply || 'Čeka input...'}</b>
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



