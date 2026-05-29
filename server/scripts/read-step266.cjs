const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'step266.json');
try {
  const content = fs.readFileSync(srcPath, 'utf16le');
  console.log('File read successfully. Length:', content.length);
  // Print first 500 characters
  console.log('Preview:');
  console.log(content.substring(0, 1000));
} catch (err) {
  console.error(err);
}
