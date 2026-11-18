'use strict';
const fs = require('node:fs');
const practice = fs.readFileSync('practice.html', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const errors = [];

function extractArray(source, marker) {
  const at = source.indexOf(marker);
  if (at < 0) throw new Error('Missing marker: ' + marker);
  const open = source.indexOf('[', at);
  let depth = 0, quote = '', escaped = false;
  for (let i = open; i < source.length; i++) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return JSON.parse(source.slice(open, i + 1));
    }
  }
  throw new Error('Unclosed array after marker: ' + marker);
}

const base = extractArray(practice, 'const BANK=');
const basicIndices = extractArray(practice, 'JAPANESE_BASIC_QUESTION_INDICES=');
const standard = extractArray(practice, 'const STANDARD_JAPANESE_QUESTIONS=');
const advancedBase = extractArray(practice, 'const ADVANCED_JAPANESE_QUESTIONS=');
const advancedPush = practice.match(/ADVANCED_JAPANESE_QUESTIONS\.push\(([\s\S]*?)\);/);
const advancedExtra = advancedPush ? [...advancedPush[1].matchAll(/\["([^"]*)",\[([^\]]*)\],(-?\d+),"([^"]*)",3\]/g)].map(q=>[q[1],[...q[2].matchAll(/"([^"]*)"/g)].map(m=>m[1]),Number(q[3]),q[4],3]) : [];
const advanced = [...advancedBase,...advancedExtra];
if (base.length !== 32) errors.push('Expected 32 base practice questions.');
if (basicIndices.length !== 24) errors.push('Expected 24 foundation-level question indices.');
if (standard.length !== 4) errors.push('Expected four standard additions.');
if (advanced.length !== 10) errors.push('Expected ten advanced questions including additions.');
const levelCounts = { foundation: basicIndices.length, standard: base.length - basicIndices.length + standard.length, advanced: advanced.length };
if (JSON.stringify(levelCounts) !== JSON.stringify({foundation:24,standard:12,advanced:10})) errors.push('Expected level pools 24/12/10.');

function validateQuestions(rows, name, answerIndex=2) {
  const positions = [0,0,0,0], seen = new Set();
  for (const [i,q] of rows.entries()) {
    const label = name + ' ' + (i+1);
    if (!Array.isArray(q) || q.length < 4) { errors.push(label + ': malformed question record'); continue; }
    if (typeof q[0] !== 'string' || !q[0].trim()) errors.push(label + ': missing prompt');
    if (!Array.isArray(q[1]) || q[1].length !== 4 || q[1].some(x => typeof x !== 'string' || !x.trim())) errors.push(label + ': expected four choices');
    if (!Number.isInteger(q[answerIndex]) || q[answerIndex] < 0 || q[answerIndex] > 3) errors.push(label + ': invalid answer index');
    if (!q[3] || !String(q[3]).trim()) errors.push(label + ': missing explanation');
    if (Array.isArray(q[1]) && q[1][q[answerIndex]] !== undefined) positions[q[answerIndex]]++;
    const prompt = String(q[0]||'').normalize('NFKC').toLocaleLowerCase().replace(/[\s　、。！？「」『』（）()【】・,:：;；]/g,'');
    if (prompt && seen.has(prompt)) errors.push(label + ': duplicate prompt in its pool');
    seen.add(prompt);
  }
  return positions;
}
const basePositions = validateQuestions(base,'Base');
const baseStandard = base.filter((q,i)=>!basicIndices.includes(i));
const standardPool = [...baseStandard,...standard];
const standardPositions = validateQuestions(standardPool,'Standard pool');
const advancedPositions = validateQuestions(advanced,'Advanced');
if (basePositions.some(n=>n!==8)) errors.push('Base answer positions must be balanced 8 per option.');
if (standardPositions.some(n=>n!==3)) errors.push('Standard pool answer positions must be balanced 3 per option.');
if (JSON.stringify(advancedPositions)!==JSON.stringify([3,3,2,2])) errors.push('Advanced answer positions must be balanced 3/3/2/2.');

if (!practice.includes('selected.length<count') || !practice.includes('refill')) errors.push('No-repeat rotation should refill to maintain fixed quiz length.');
if (!index.includes('function rebalanceJapaneseDbAnswers') || !index.includes('rebalanceJapaneseDbAnswers();')) errors.push('Main Japanese bank answer balancing is missing.');
if (!index.includes('function rebalanceJapaneseCaseAnswers') || !index.includes('rebalanceJapaneseCaseAnswers(JAPANESE_COMMON_CASES)') || !index.includes('rebalanceJapaneseCaseAnswers(JAPANESE_MOCK_CASES)')) errors.push('Common/mock case answer balancing is missing.');
if (!index.includes('if(selected.length<target)') || !index.includes('nextUsed=refill')) errors.push('Common-test no-repeat rotation should refill after consuming unseen questions.');

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Japanese difficulty pools OK: 24 foundation / 12 standard / 10 advanced; answer keys balanced; fixed-length no-repeat rotation.');
