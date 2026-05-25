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
      if (obj.step_index === 266 || obj.step_index === 272) {
        console.log(`\n--- STEP ${obj.step_index} ---`);
        console.log(`Source: ${obj.source}, Type: ${obj.type}`);
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            console.log(`Tool Call Name: ${tc.name}`);
            console.log(`Args:`, JSON.stringify(tc.args, null, 2));
          });
        }
      }
    } catch (e) {
      // ignore
    }
  }
} catch (err) {
  console.error(err);
}
