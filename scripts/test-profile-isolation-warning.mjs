import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync('src/components/AppShell.jsx', 'utf8');
const app = fs.readFileSync('src/App.jsx', 'utf8');
assert.match(shell, /Atenção: separação PF\/PJ ainda parcial/, 'a interface deve avisar que a separação PF/PJ ainda é parcial');
assert.match(shell, /contas, cartões, categorias e orçamentos ainda não têm isolamento completo/, 'o aviso deve enumerar os dados ainda compartilhados');
assert.match(shell, /Não use essa alternância como garantia de segregação contábil, fiscal ou de acesso/, 'o aviso deve evitar alegação indevida de segregação');
assert.match(app, /const filteredTransactions = transactions\.filter/, 'a filtragem de lançamentos por perfil deve continuar presente');
assert.match(app, /t\?\.profileType === profileMode/, 'lançamentos sem perfil não podem aparecer nas duas visões');
assert.match(app, /const filteredRecurring = recurring\.filter/, 'a filtragem de recorrências por perfil deve continuar presente');
assert.match(app, /rule\?\.profileType === profileMode/, 'recorrências sem perfil não podem aparecer nas duas visões');
console.log('Profile isolation disclosure checks: 7 passed, 0 failed');
