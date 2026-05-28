const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generate = require('@babel/generator').default;

const controllersDir = path.join(__dirname, 'controllers');

const processFile = (filePath) => {
  const code = fs.readFileSync(filePath, 'utf-8');
  
  // Quick check if file has try {
  if (!code.includes('try {') && !code.includes('try\n')) return;

  try {
    const ast = parser.parse(code, {
      sourceType: 'module',
      plugins: ['jsx']
    });

    traverse(ast, {
      TryStatement(path) {
        // If this try statement is inside a function that handles routes (has req, res)
        // Or honestly, we just strip ALL try/catches in controllers except for the specific ones
        // Wait, in userController.js we have try { await user.save() ... }
        // Let's just strip try statements that catch (err) and do res.status(500)
        
        let hasResStatus500 = false;
        
        const catchClause = path.node.handler;
        if (catchClause) {
            // Very simplistic check if the catch block contains a res.status(500) or similar
            traverse(catchClause, {
                CallExpression(callPath) {
                    if (
                        callPath.node.callee.property && 
                        callPath.node.callee.property.name === 'status' &&
                        callPath.node.arguments[0] &&
                        callPath.node.arguments[0].value === 500
                    ) {
                        hasResStatus500 = true;
                    }
                }
            }, path.scope, path);
        }

        if (hasResStatus500) {
            // Replace the try statement with its block body
            path.replaceWithMultiple(path.node.block.body);
        }
      }
    });

    const output = generate(ast, {}, code);
    fs.writeFileSync(filePath, output.code, 'utf-8');
    console.log(`Processed ${path.basename(filePath)}`);
  } catch (err) {
    console.error(`Error parsing ${filePath}:`, err);
  }
};

const files = fs.readdirSync(controllersDir).filter(f => f.endsWith('.js'));
files.forEach(file => {
  if (['cardController.js', 'columnController.js', 'projectController.js', 'userController.js'].includes(file)) {
      processFile(path.join(controllersDir, file));
  }
});
