// cut-sprite.js
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const input = path.join(__dirname, 'frontend', 'public', 'assistant', 'scenes', 'scenes.png');
const outputDir = path.join(__dirname, 'frontend', 'public', 'assistant', 'scenes');

const names = ['office', 'bank', 'entrance', 'desk', 'globe', 'wide'];
const width = 512; // širina jedne scene
const height = 512; // visina jedne scene

(async () => {
  for (let i = 0; i < 6; i++) {
    const x = (i % 3) * width;
    const y = Math.floor(i / 3) * height;
    await sharp(input)
      .extract({ left: x, top: y, width, height })
      .toFile(path.join(outputDir, `${names[i]}.jpg`));
    console.log(`Saved: ${names[i]}.jpg`);
  }
})();
