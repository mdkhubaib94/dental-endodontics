const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';
const destPath = path.join(__dirname, 'run-flow-restored.js');

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Read ${lines.length} lines from transcript.`);
  
  let found = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      // Check if it's a tool call to write_to_file for run-flow.cjs
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' && tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('run-flow.cjs')) {
            found.push({
              step: obj.step_index,
              type: 'write_to_file',
              content: tc.args.CodeContent
            });
          }
        }
      }
      // Or check if it's in content (like output or input)
      if (lines[i].includes('run-flow.cjs') && lines[i].includes('axios') && lines[i].includes('MONGO_URI')) {
        found.push({
          step: obj.step_index,
          type: 'text_match',
          length: lines[i].length,
          snippet: lines[i].substring(0, 100)
        });
      }
    } catch (e) {
      // ignore JSON parse errors on partial lines
    }
  }
  
  console.log(`Found ${found.length} matches.`);
  found.forEach((f, idx) => {
    console.log(`Match ${idx}: Step ${f.step}, Type: ${f.type}`);
    if (f.type === 'write_to_file') {
      console.log(`  Code length: ${f.content.length}`);
      // Save it
      const out = path.join(__dirname, `restored-step-${f.step}.js`);
      fs.writeFileSync(out, f.content, 'utf8');
      console.log(`  Saved to ${out}`);
    }
  });
  
} catch (err) {
  console.error('Error:', err);
}
