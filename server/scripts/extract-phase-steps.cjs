const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for PHASE in all logs:');
  const matched = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      const textLines = text.split('\n');
      textLines.forEach(l => {
        if (l.includes('PHASE') || l.includes('Phase')) {
          matched.add(l.trim());
        }
      });
    } catch (e) {}
  }
  
  matched.forEach(l => console.log(l));
} catch (err) {
  console.error(err);
}
