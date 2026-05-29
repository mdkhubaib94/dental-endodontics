const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'run-flow.cjs');
const destPath = path.join(__dirname, 'run-flow.js');

try {
  const content = fs.readFileSync(srcPath, 'utf8');
  console.log('Source file read, size:', content.length);
  
  // The content might be a JSON-serialized string or wrapped in quotes.
  // Let's try parsing it as JSON first, or eval it if it's a JS string literal.
  let decoded;
  if (content.trim().startsWith('"') || content.trim().startsWith('`')) {
    // It's a JS string literal. We can parse it by parsing it as JSON if it's valid JSON,
    // or wrapping it in JSON.parse/using a safe evaluation.
    // Let's try JSON.parse.
    try {
      decoded = JSON.parse(content.trim());
    } catch (e) {
      // If it's not strict JSON (e.g. escaped quotes or single quotes), use eval-like decoding
      decoded = Function('"use strict"; return (' + content.trim() + ')')();
    }
  } else {
    decoded = content;
  }
  
  fs.writeFileSync(destPath, decoded, 'utf8');
  console.log('Decoded code written to:', destPath);
  console.log('Decoded size:', decoded.length);
} catch (err) {
  console.error('Error decoding file:', err);
}
