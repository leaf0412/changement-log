#!/usr/bin/env node

const generateLog = require('../index.js');
try {
  generateLog();
} catch (err) {
  console.log(err);
  process.exit(1);
}
