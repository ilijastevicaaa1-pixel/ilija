import React, { useState, useEffect } from 'react';
import './Assistant.css';

export default function Assistant({ message = '', scene = 'office' }) {
  const [state, setState] = useState('idle');

  useEffect(() => {
    if (!message) return;

    if (message === 'typing...') {
      setState('thinking');
      return;
    }

    setState('speaking');
    const t = setTimeout(() => setState('idle'), 2000);
    return () => clearTimeout(t);
  }, [message]);

  const scenes = {
    office: '/assistant/scenes/office.jpg',
    bank: '/assistant/scenes/bank.jpg',
    desk: '/assistant/scenes/desk.jpg',
    entrance: '/assistant/scenes/entrance.jpg',
    globe: '/assistant/scenes/globe.jpg',
  };

  return (
    <div className="assistant-container">
      <div
        className="assistant-image"
        style={{
          backgroundImage: `url(${scenes[scene]})`,
        }}
      >
        {state === 'speaking' && (
          <svg className="assistant-mouth" width="40" height="24" viewBox="0 0 40 24">
            <ellipse cx="20" cy="12" rx="10" ry="6" fill="#b97b5b">
              <animate attributeName="ry" values="6;12;4;10;6" dur="0.45s" repeatCount="indefinite" />
            </ellipse>
          </svg>
        )}

        {state === 'idle' && <div className="assistant-hand">👋</div>}

        {state === 'thinking' && (
          <div className="assistant-thinking">
            <span>.</span><span>.</span><span>.</span>
          </div>
        )}
      </div>

      <div className="chat-bubble">
        {message === 'typing...' ? (
          <span className="typing-dots"><span>.</span><span>.</span><span>.</span></span>
        ) : (
          message
        )}
      </div>
    </div>
  );
}