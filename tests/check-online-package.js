#!/usr/bin/env node
'use strict';

const path = require('node:path');
const { inspectOnlinePackage } = require('./helpers/offline-package');

const ROOT = path.resolve(__dirname, '..');
const target = process.argv[2];
if (!target) {
  console.error('Usage: node tests/check-online-package.js <online-directory-or-zip>');
  process.exitCode = 2;
} else {
  try {
    const report = inspectOnlinePackage(target, { sourceRoot: ROOT });
    if (!report.valid) {
      console.error(`FAIL ${path.resolve(target)}`);
      for (const error of report.errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(`PASS ${path.resolve(target)} (${report.files.length} files)`);
    }
  } catch (error) {
    console.error(`FAIL ${path.resolve(target)}`);
    console.error(`- ${error.message}`);
    process.exitCode = 1;
  }
}
