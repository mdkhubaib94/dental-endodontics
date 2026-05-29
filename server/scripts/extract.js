const fs = require('fs');
const readline = require('readline');

async function extract() {
  const fileStream = fs.createReadStream('C:/Users/jaaga/.gemini/antigravity-ide/brain/556d384f-dcbb-4876-bdd2-87fac06878de/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('run-flow.cjs') && line.includes('CodeContent')) {
      try {
        const obj = JSON.parse(line);
        // Inside obj, we might have tool_calls
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.name === 'write_to_file' && tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('run-flow.cjs')) {
              let content = tc.args.CodeContent;
              // Sometimes it's double escaped or stringified
              if (content.startsWith('"') && content.endsWith('"')) {
                // Parse it as JSON string
                content = JSON.parse(content);
              }
              fs.writeFileSync('server/scripts/run-flow.cjs', content, 'utf8');
              console.log('Successfully extracted and restored run-flow.cjs!');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing line:', e.message);
      }
    }
  }
  console.log('Could not find run-flow.cjs creation in transcript.');
}

extract();
