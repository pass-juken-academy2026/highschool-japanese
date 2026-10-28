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
if (!index.includes("5大問・全'+total+'問")) errors.push('The common-test notice must report the selected total dynamically.');
if (!practice.includes('共通テスト型（全37問）')) errors.push('Practice page label must match the 37-question common-test total.');

function matchingBracket(source, open) {
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
    if (ch === '{' || ch === '[') depth++;
    else if (ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error('Unclosed bank question record.');
}
function decodeString(value) { return JSON.parse('"' + value + '"'); }
const bankStart = index.indexOf('const JAPANESE_COMMON_CASES=');
const bankEnd = index.indexOf('const JAPANESE_MOCK_CASES=', bankStart);
if (bankStart < 0 || bankEnd <= bankStart) {
  errors.push('Could not locate the full Japanese question bank.');
} else {
  const bank = index.slice(bankStart, bankEnd);
  const questions = [];
  let cursor = 0;
  while ((cursor = bank.indexOf('{q:', cursor)) >= 0) {
    const end = matchingBracket(bank, cursor);
    const row = bank.slice(cursor, end + 1);
    const qMatch = row.match(/\bq:"((?:\\.|[^"\\])*)"/s);
    const aMatch = row.match(/\ba:(\d+)/);
    const eMatch = row.match(/\be:"((?:\\.|[^"\\])*)"/s);
    const cAt = row.indexOf('c:[');
    let choices = [];
    if (cAt >= 0) {
      const cOpen = row.indexOf('[', cAt);
      const cEnd = matchingBracket(row, cOpen);
      choices = [...row.slice(cOpen + 1, cEnd).matchAll(/"((?:\\.|[^"\\])*)"/gs)].map(m => decodeString(m[1]));
    }
    questions.push({
      q: qMatch ? decodeString(qMatch[1]) : '',
      answer: aMatch ? Number(aMatch[1]) : -1,
      explanation: eMatch ? decodeString(eMatch[1]) : '',
      choices
    });
    cursor = end + 1;
  }
  if (questions.length !== 47) errors.push('Expected 47 questions in the full bank, found ' + questions.length + '.');
  const seen = new Set();
  const normalize = value => String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\s、。！？「」『』（）()【】・,:：;；]/g, '');
  for (const [i, q] of questions.entries()) {
    const label = 'Full bank question ' + (i + 1);
    if (!q.q.trim()) errors.push(label + ': missing prompt.');
    if (q.choices.length !== 4 || q.choices.some(x => !x.trim())) errors.push(label + ': expected four non-empty choices.');
    if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer > 3) errors.push(label + ': invalid answer index.');
    if (!q.explanation.trim()) errors.push(label + ': missing explanation.');
    const prompt = normalize(q.q);
    if (seen.has(prompt)) errors.push(label + ': duplicate normalized prompt.');
    seen.add(prompt);
  }
  if (!index.includes('制限時間：90分')) errors.push('Common-test mode must use the 90-minute official duration.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('Japanese common-test structure OK: 5 major sections, 37 selected questions.');
