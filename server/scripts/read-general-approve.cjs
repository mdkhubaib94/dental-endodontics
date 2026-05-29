const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'routes', 'general-case.js');
try {
  const content = fs.readFileSync(srcPath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 630; i < 680 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} catch (err) {
  console.error(err);
}
