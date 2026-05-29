const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'routes', 'appointment.js');
try {
  let content = fs.readFileSync(srcPath, 'utf8');
  if (content.startsWith('\uFEFF') || content.includes('\u0000')) {
    content = fs.readFileSync(srcPath, 'utf16le');
  }
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (line.includes('sendEmail')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  });
} catch (err) {
  console.error(err);
}
