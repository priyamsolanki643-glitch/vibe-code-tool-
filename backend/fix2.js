const fs = require('fs');
let content = fs.readFileSync('src/routes/stream.routes.ts', 'utf-8');
content = content.replace('let result: any = null;', 'let result: any = null;\n    let isTransitioningToExecution = false;');
fs.writeFileSync('src/routes/stream.routes.ts', content);
console.log('Added isTransitioningToExecution');
