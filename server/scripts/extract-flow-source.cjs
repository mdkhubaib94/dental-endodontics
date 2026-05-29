const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Scanning logs for code blocks...');
  
  // Find all steps where a code block containing `run-flow.cjs` was outputted or updated.
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.content && obj.content.includes('const step1') && obj.content.includes('apiCall')) {
        console.log(`\n========================================`);
        console.log(`Step Index ${obj.step_index}`);
        console.log(`========================================`);
        // Print the lines containing code
        const innerLines = obj.content.split('\n');
        innerLines.forEach((l, idx) => {
          if (l.includes('apiCall') || l.includes('step') || l.includes('Step ') || l.includes('results.flowSteps')) {
            console.log(`${idx}: ${l}`);
          }
        });
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
