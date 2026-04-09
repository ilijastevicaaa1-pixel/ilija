import React, { useState, useEffect } from 'react';

// Debounced input za instant pretragu
function InstantSearchInput({ value, onChange, delay = 200, ...props }) {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) onChange(localValue);
    }, delay);
    return () => clearTimeout(handler);
  }, [localValue, delay]);

  return (
    <input
      {...props}
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      autoComplete="off"
    />
  );
}

export default InstantSearchInput;
