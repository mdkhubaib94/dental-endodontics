const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      if (text.includes('PROOF 6') && text.includes('Step') && text.length > 500) {
        console.log(`\n========================================`);
        console.log(`Step Index ${obj.step_index}`);
        console.log(`========================================`);
        console.log(text.substring(0, 3000));
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
