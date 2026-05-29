const fs = require('fs');
const readline = require('readline');

async function listOccurrences() {
  const fileStream = fs.createReadStream('C:/Users/jaaga/.gemini/antigravity-ide/brain/556d384f-dcbb-4876-bdd2-87fac06878de/.system_generated/logs/transcript.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let index = 0;
  for await (const line of rl) {
    if (line.includes('PROOF')) {
      try {
        const obj = JSON.parse(line);
        console.log(`Step ${obj.step_index}: Type: ${obj.type}, Source: ${obj.source}`);
        if (obj.content) {
          const lines = obj.content.split('\n');
          lines.forEach(l => {
            if (l.includes('PROOF')) {
              console.log(`  Content: ${l.trim()}`);
            }
          });
        }
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            console.log(`  Tool call: ${tc.name}`);
            const argsStr = JSON.stringify(tc.args);
            if (argsStr.includes('PROOF')) {
              console.log(`    Args match! length: ${argsStr.length}`);
            }
          });
        }
      } catch (e) {
        // ignore parsing issues
      }
    }
    index++;
  }
}

listOccurrences();
