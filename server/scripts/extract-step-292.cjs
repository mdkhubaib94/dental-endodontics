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
      if (obj.step_index === 292) {
        console.log(`Step 292: Type: ${obj.type}, Content length: ${obj.content ? obj.content.length : 0}`);
        if (obj.content) {
          // Let's write the whole content of step 292 to a file so we can read it.
          const outPath = path.join(__dirname, 'step-292-raw.txt');
          fs.writeFileSync(outPath, obj.content, 'utf8');
          console.log('Saved raw step 292 content to:', outPath);
        }
      }
    } catch (e) {
      // ignore
    }
  }
} catch (err) {
  console.error(err);
}
