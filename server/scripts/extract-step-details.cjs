const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for Step matches:');
  const matched = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      const textLines = text.split('\n');
      textLines.forEach(l => {
        if (/Step\s+\d+:/i.test(l) || /Step\s+\d+\b/i.test(l) || l.includes('Patient Books') || l.includes('PG confirms') || l.includes('Prescription')) {
          matched.add(l.trim());
        }
      });
    } catch (e) {}
  }
  
  const sorted = Array.from(matched).sort();
  sorted.forEach(l => console.log(l));
} catch (err) {
  console.error(err);
}
