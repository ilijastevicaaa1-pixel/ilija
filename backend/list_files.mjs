import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Svi fajlovi u backend folderu:');
fs.readdirSync(__dirname).forEach(file => {
  const filePath = path.join(__dirname, file);
  const stat = fs.statSync(filePath);
  if (stat.isFile()) {
    const buf = fs.readFileSync(filePath);
    let encoding = 'ascii';
    if (buf[0] === 0xFF && buf[1] === 0xFE) encoding = 'utf16le';
    else if (buf[0] === 0xFE && buf[1] === 0xFF) encoding = 'utf16be';
    else if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) encoding = 'utf8-bom';
    else if (buf.toString('utf8').includes('PG_USER')) encoding = 'utf8';
    console.log(`${file} (${encoding})`);
  }
});
