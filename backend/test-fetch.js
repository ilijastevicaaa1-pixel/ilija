import fetch from 'node-fetch';

fetch('https://api.openai.com/v1/models')
  .then(res => res.text())
  .then(console.log)
  .catch(console.error);