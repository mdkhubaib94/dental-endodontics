const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\jaaga\\.gemini\\antigravity-ide\\brain\\556d384f-dcbb-4876-bdd2-87fac06878de\\.system_generated\\logs\\transcript.jsonl';

try {
  const content = fs.readFileSync(logPath, 'utf8');
  const lines = content.split('\n');
  console.log(`Read ${lines.length} lines.`);
  
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i]) continue;
    try {
      const obj = JSON.parse(lines[i]);
      // Search for any tool call to write_to_file or replace_file_content or multi_replace_file_content
      if (obj.tool_calls) {
        for (const tc of obj.tool_calls) {
          if (tc.name === 'write_to_file' || tc.name === 'replace_file_content') {
            const file = tc.args.TargetFile || tc.args.AbsolutePath || '';
            if (file.includes('run-flow') || file.includes('run-mongo') || file.includes('audit')) {
              console.log(`Step ${obj.step_index}: ${tc.name} for ${file} (length: ${JSON.stringify(tc.args).length})`);
            }
          }
        }
      }
      
      // Let's also look for text output in SYSTEM/USER/MODEL steps containing execution results or file content
      if (obj.content && (obj.content.includes('run-flow') || obj.content.includes('FINAL_AUDIT_REPORT.md'))) {
        console.log(`Step ${obj.step_index}: text content match (length: ${obj.content.length})`);
      }
    } catch (e) {
      // ignore
    }
  }
} catch (err) {
  console.error(err);
}
