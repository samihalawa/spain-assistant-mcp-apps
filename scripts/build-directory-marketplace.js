import {mkdirSync,writeFileSync} from 'node:fs';
import {CODEX_MARKETPLACE} from '../src/catalog.js';
const output=new URL('../.agents/plugins/marketplace.json',import.meta.url);
mkdirSync(new URL('.',output),{recursive:true});
writeFileSync(output,JSON.stringify(CODEX_MARKETPLACE,null,2)+'\n');
console.log('Generated public Codex marketplace with '+CODEX_MARKETPLACE.plugins.length+' pinned plugin sources.');
