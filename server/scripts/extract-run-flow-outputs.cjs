const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for run-flow outputs:');
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      // We look for steps that contain 'VERIFICATION SUMMARY' or 'PROOF 6'
      const text = obj.content || '';
      if (text.includes('VERIFICATION SUMMARY') || text.includes('PROOF 6 — CLEAN FLOW RUN')) {
        console.log(`\n========================================`);
        console.log(`Step ${obj.step_index}: Type: ${obj.type}, Length: ${text.length}`);
        console.log(`========================================`);
        // Find all lines that look like step logs
        const textLines = text.split('\n');
        textLines.forEach(l => {
          if (l.includes('Step ') || l.includes('Test ') || l.includes('Flow Steps:') || l.includes('Role Boundaries:')) {
            console.log(l.trim());
          }
        });
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
