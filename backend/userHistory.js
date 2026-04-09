// Modul za učenje iz istorije korisnika i predikciju

const userHistory = [];

export function saveUserEntry(entry) {
  userHistory.push(entry);
}

export function predictField(fieldName, currentEntry) {
  // Jednostavna predikcija: vraća najčešću vrednost za polje
  const values = userHistory.map(e => e[fieldName]).filter(v => v);
  if (!values.length) return '';
  const freq = {};
  values.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
  return Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0];
}

export function getHistory() {
  return userHistory;
}
