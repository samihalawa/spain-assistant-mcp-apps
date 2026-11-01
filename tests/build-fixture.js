import {build} from 'esbuild';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
await build({entryPoints:[resolve(dir,'host-fixture.js')],outfile:resolve(dir,'host-fixture.bundle.js'),bundle:true,format:'esm',platform:'browser',target:['es2022'],logLevel:'silent'});
