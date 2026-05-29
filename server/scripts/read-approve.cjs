const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, '..', 'routes', 'appointment.js');
try {
  const content = fs.readFileSync(srcPath, 'utf8');
  const lines = content.split('\n');
  
  // Find lines around router.put("/:bookingId/approve"
  let startLine = -1;
  lines.forEach((line, idx) => {
    if (line.includes('/:bookingId/approve')) {
      startLine = idx;
    }
  });
  
  if (startLine !== -1) {
    console.log(`Found route at line ${startLine + 1}`);
    for (let i = startLine; i < startLine + 100 && i < lines.length; i++) {
      console.log(`${i + 1}: ${lines[i]}`);
    }
  } else {
    console.log('Route not found');
  }
} catch (err) {
  console.error(err);
}
