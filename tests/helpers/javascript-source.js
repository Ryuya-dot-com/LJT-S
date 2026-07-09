'use strict';

const assert = require('node:assert/strict');

function extractFunctionDeclaration(source, functionName) {
  // The application keeps these contract functions as declarations at one
  // indentation level. Slicing to the next same-level declaration avoids an
  // npm parser dependency while handling regex and template literals safely.
  const escapedName = functionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declarationPattern = new RegExp(`^([\\t ]*)function ${escapedName}\\(`, 'm');
  const match = declarationPattern.exec(source);
  assert.ok(match, `${functionName} was not found`);
  const indentation = match[1];
  const start = match.index + indentation.length;
  const nextPattern = new RegExp(`^${indentation.replace(/ /g, '\\ ')}function \\w+\\(`, 'gm');
  nextPattern.lastIndex = match.index + match[0].length;
  const next = nextPattern.exec(source);
  const declaration = source.slice(start, next ? next.index : source.length).trim();
  assert.ok(declaration.endsWith('}'), `Could not find the end of ${functionName}`);
  return declaration;
}

module.exports = { extractFunctionDeclaration };
