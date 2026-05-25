const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'step-292-raw.txt');
try {
  const content = fs.readFileSync(srcPath, 'utf8');
  console.log('--- RAW START ---');
  console.log(content);
  console.log('--- RAW END ---');
} catch (err) {
  console.error(err);
}
