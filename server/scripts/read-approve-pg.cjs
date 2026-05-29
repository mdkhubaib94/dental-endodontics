const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'routes', 'appointment.js');
try {
  const content = fs.readFileSync(srcPath, 'utf8');
  const lines = content.split('\n');
  
  for (let i = 1520; i < 1650 && i < lines.length; i++) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
} catch (err) {
  console.error(err);
}
