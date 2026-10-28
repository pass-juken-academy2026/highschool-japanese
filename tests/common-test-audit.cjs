'use strict';
const fs = require('node:fs');

const index = fs.readFileSync('index.html', 'utf8');
const practice = fs.readFileSync('practice.html', 'utf8');
const errors = [];
const expected = [10, 7, 5, 7, 8];
const targetMatch = index.match(/const commonTargets=\[([0-9,\s]+)\]/);
if (!targetMatch) {
  errors.push('Could not find common-test question targets.');
} else {
  const targets = targetMatch[1].split(',').map(x => Number(x.trim()));
  if (JSON.stringify(targets) !== JSON.stringify(expected)) errors.push('Expected five target counts 10/7/5/7/8.');
  if (targets.reduce((sum, n) => sum + n, 0) !== 37) errors.push('Common-test target total must be 37.');
}
if (!index.includes("JAPANESE_COMMON_CASES.slice(0,5).map((c,i)=>{")) {
  errors.push('Common-test mode must use only the five main sections.');
}
if (index.includes('79問の問題バンク')) errors.push('Outdated question-bank count remains in the common-test notice.');
if (!index.includes('5大問・全\\'+total+\\'問')) errors.push('The common-test notice must report the selected total dynamically.');
if (!practice.includes('共通テスト型（全37問）')) errors.push('Practice page label must match the 37-question common-test total.');
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Japanese common-test structure OK: 5 major sections, 37 selected questions.');
