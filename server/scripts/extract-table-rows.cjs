const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for table rows:');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      const textLines = text.split('\n');
      textLines.forEach(l => {
        if (l.includes('|') && (l.includes('Patient Books') || l.includes('1 |') || l.includes('2 |') || l.includes('3 |') || l.includes('Step 1') || l.includes('Step 2') || l.includes('Step 3'))) {
          console.log(`Step ${obj.step_index}: ${l.trim()}`);
        }
      });
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
