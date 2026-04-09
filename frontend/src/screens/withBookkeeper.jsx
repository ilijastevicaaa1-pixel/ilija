import React, { useState, useRef } from 'react';
import AssistantContainer from '../components/VirtualBookkeeper/AssistantContainer';

/**
 * HOC koji prikazuje VirtualBookkeeper na ekranu i prosleđuje mu AI stanje i poruku
 * @param {*} WrappedComponent
 */
export default function withBookkeeper(WrappedComponent) {
  return function WithBookkeeperWrapper(props) {
    // Stanja lika
    const [aiState, setAiState] = useState('idle');
    const [aiMessage, setAiMessage] = useState('');
    const animationTimeout = useRef();

    // Poziva se kada AI šalje odgovor
    function showAIMessage(message, state = 'speaking', duration = 2500) {
      setAiState(state);
      setAiMessage(message);
      clearTimeout(animationTimeout.current);
      animationTimeout.current = setTimeout(() => {
        setAiState('idle');
        setAiMessage('');
      }, duration);
    }

    // Poziva se kada AI "razmišlja"
    function setThinking() {
      setAiState('thinking');
      setAiMessage('');
    }

    // Poziva se kada je AI srećan
    function setHappy(message) {
      setAiState('happy');
      setAiMessage(message || 'Super!');
      clearTimeout(animationTimeout.current);
      animationTimeout.current = setTimeout(() => {
        setAiState('idle');
        setAiMessage('');
      }, 1800);
    }

    // Poziva se kada je AI zbunjen
    function setConfused(message) {
      setAiState('confused');
      setAiMessage(message || 'Možete li pojasniti?');
      clearTimeout(animationTimeout.current);
      animationTimeout.current = setTimeout(() => {
        setAiState('idle');
        setAiMessage('');
      }, 1800);
    }

    return (
      <>
        <AssistantContainer aiState={aiState} message={aiMessage} />
        <WrappedComponent
          {...props}
          showAIMessage={showAIMessage}
          setThinking={setThinking}
          setHappy={setHappy}
          setConfused={setConfused}
        />
      </>
    );
  };
}
