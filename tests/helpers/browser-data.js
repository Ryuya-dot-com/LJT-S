'use strict';

const fs = require('node:fs');
const vm = require('node:vm');

function loadBrowserDataScript(filePath) {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(filePath, 'utf8'), context, {
    filename: filePath
  });
  return context.window;
}

module.exports = { loadBrowserDataScript };
