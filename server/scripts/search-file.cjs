const fs = require('fs');
const path = require('path');

function search(file) {
  const srcPath = path.join(__dirname, '..', 'routes', file);
  try {
    let content = fs.readFileSync(srcPath, 'utf8');
    if (content.startsWith('\uFEFF') || content.includes('\u0000')) {
      content = fs.readFileSync(srcPath, 'utf16le');
    }
    const lines = content.split('\n');
    console.log(`\n=== File: ${file} (lines: ${lines.length}) ===`);
    lines.forEach((line, idx) => {
      if (line.includes('router.') || line.includes('/api/')) {
        console.log(`${idx + 1}: ${line.trim()}`);
      }
    });
  } catch (err) {
    console.error(err);
  }
}

search('appointment.js');
search('general-case.js');
search('prescription.js');
