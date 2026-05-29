const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for "Step X" occurrences:');
  const matchedLines = new Set();
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      const textLines = text.split('\n');
      textLines.forEach(l => {
        if (/Step\s+\d+/i.test(l)) {
          matchedLines.add(l.trim());
        }
      });
    } catch (e) {}
  }
  
  // Sort and print matched lines
  const sorted = Array.from(matchedLines).sort((a, b) => {
    const numA = parseInt(a.match(/Step\s+(\d+)/i)?.[1] || '0', 10);
    const numB = parseInt(b.match(/Step\s+(\d+)/i)?.[1] || '0', 10);
    return numA - numB;
  });
  
  sorted.forEach(l => console.log(l));
} catch (err) {
  console.error(err);
}
