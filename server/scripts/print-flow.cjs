const fs = require('fs');
const path = require('path');

const srcPath = path.join(__dirname, 'run-flow.cjs');
const content = fs.readFileSync(srcPath, 'utf8');
console.log('--- CONTENT START ---');
console.log(content);
console.log('--- CONTENT END ---');
