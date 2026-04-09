import React, { useState, useEffect } from 'react';
import './Bookkeeper.css';
import avatarIdle from './assets/avatar_idle.svg';
import avatarThinking from './assets/avatar_thinking.svg';
import avatarSpeaking from './assets/avatar_speaking.svg';
import avatarHappy from './assets/avatar_happy.svg';
import avatarConfused from './assets/avatar_confused.svg';

const states = {
  idle: avatarIdle,
  thinking: avatarThinking,
  speaking: avatarSpeaking,
  happy: avatarHappy,
  confused: avatarConfused,
};

export default function Bookkeeper({ aiState = 'idle', message = '', onAnimationEnd }) {
  const [currentState, setCurrentState] = useState(aiState);
  const [showBubble, setShowBubble] = useState(false);
  const [bubbleMsg, setBubbleMsg] = useState('');

  useEffect(() => {
    setCurrentState(aiState);
  }, [aiState]);

  // Pokreni govor
  function speak(text) {
    if (!window.speechSynthesis) return;
    const u = new window.SpeechSynthesisUtterance(text);
    u.lang = 'sr-RS';
    window.speechSynthesis.speak(u);
  }

  // Klik na avatar
  function handleAvatarClick() {
    const msg = 'Zdravo, kako mogu da pomognem?';
    setBubbleMsg(msg);
    setShowBubble(true);
    speak(msg);
    setCurrentState('speaking');
    setTimeout(() => {
      setShowBubble(false);
      setCurrentState('idle');
    }, 2500);
  }

  return (
    <div className={`bookkeeper-container state-${currentState}`}>
      <img
        src={states[currentState] || avatarIdle}
        alt="Virtual Bookkeeper"
        className="bookkeeper-avatar"
        onAnimationEnd={onAnimationEnd}
        style={{ cursor: 'pointer' }}
        onClick={handleAvatarClick}
      />
      {showBubble && (
        <div className="bookkeeper-bubble">
          {bubbleMsg}
        </div>
      )}
    </div>
  );
}
