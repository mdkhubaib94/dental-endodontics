const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';
const destPath = path.join(__dirname, 'initial-prompt.txt');

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      if (obj.step_index === 0) {
        fs.writeFileSync(destPath, obj.content, 'utf8');
        console.log(`Saved full prompt of length ${obj.content.length} to ${destPath}`);
        break;
      }
    } catch (e) {}
  }
} catch (err) {
  console.error(err);
}
