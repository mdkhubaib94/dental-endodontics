const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for USER_INPUT steps:');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.type === 'USER_INPUT') {
        console.log(`\n========================================`);
        console.log(`USER INPUT (Step Index ${obj.step_index})`);
        console.log(`========================================`);
        console.log(obj.content);
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
