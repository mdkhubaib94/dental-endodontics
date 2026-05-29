const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'run-flow.cjs');
const destPath = path.join(__dirname, 'run-flow.js');

try {
  const content = fs.readFileSync(srcPath, 'utf8');
  console.log('Source file read, size:', content.length);
  
  let decoded;
  if (content.trim().startsWith('"') || content.trim().startsWith('`')) {
    try {
      decoded = JSON.parse(content.trim());
    } catch (e) {
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
