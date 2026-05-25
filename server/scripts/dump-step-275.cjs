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
      if (obj.step_index === 275 || obj.step_index === 520) {
        console.log(`\n========================================`);
        console.log(`Step ${obj.step_index}: Type: ${obj.type}, Source: ${obj.source}`);
        console.log(`========================================`);
        console.log(obj.content);
        if (obj.tool_calls) {
          console.log('Tool calls:', JSON.stringify(obj.tool_calls, null, 2));
        }
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
