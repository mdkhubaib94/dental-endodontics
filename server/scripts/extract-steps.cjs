const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  console.log('Searching for step descriptions in transcript...');
  const matches = [];
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      const text = obj.content || '';
      
      // Look for occurrences of "Step 1" through "Step 14" in text
      if (/Step\s+(?:[1-9]|1[0-4])\b/i.test(text) && (text.includes('booking') || text.includes('prescription') || text.includes('revisit') || text.includes('approval') || text.includes('flow'))) {
        matches.push({
          step_index: obj.step_index,
          source: obj.source,
          length: text.length,
          text: text
        });
      }
    } catch (e) {
      // ignore
    }
  }
  
  console.log(`Found ${matches.length} matching text steps.`);
  // Print unique or most detailed match
  matches.forEach((m, idx) => {
    console.log(`\n========================================`);
    console.log(`MATCH ${idx}: Step Index ${m.step_index} (${m.source})`);
    console.log(`========================================`);
    console.log(m.text.substring(0, 1500));
  });
} catch (err) {
  console.error(err);
}
