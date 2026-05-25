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
        if (obj.tool_calls) {
          for (const tc of obj.tool_calls) {
            if (tc.name === 'write_to_file' && tc.args && tc.args.TargetFile && tc.args.TargetFile.includes('run-flow.cjs')) {
              let content = tc.args.CodeContent;
              console.log('Found CodeContent in logs. Type:', typeof content);
              
              // If it's a string, does it start with double quote and end with double quote?
              // The JSON parser has already decoded the outer string of JSON.
              // If the value itself was a JSON-stringified string inside the JSON,
              // then content is a string containing literal quotes and escapes.
              if (typeof content === 'string') {
                // If it starts with a quote, let's parse it as a JSON string to decode all escapes.
                if (content.startsWith('"') && content.endsWith('"')) {
                  console.log('Content is double-stringified. Parsing once...');
                  content = JSON.parse(content);
                } else {
                  console.log('Content is a normal string. We do not parse it.');
                }
              }
              
              fs.writeFileSync('server/scripts/run-flow.cjs', content, 'utf8');
              console.log('Successfully restored run-flow.cjs (length:', content.length, ')');
              return;
            }
          }
        }
      } catch (e) {
        console.error('Error parsing line:', e);
      }
    }
  }
}

extract();
