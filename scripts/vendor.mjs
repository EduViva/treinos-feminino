// Empacota o @supabase/supabase-js em UM arquivo ESM (js/vendor/supabase.js), servido pela própria origem:
// o app continua funcionando offline (service worker) e sem depender de CDN.
//   npm run vendor      (requer `npm install`; rode ao atualizar a versão do supabase-js)
import { build } from 'esbuild';
import { readFileSync } from 'node:fs';

const version = JSON.parse(readFileSync('node_modules/@supabase/supabase-js/package.json', 'utf8')).version;
await build({
  entryPoints: ['scripts/vendor-entry.mjs'],
  bundle: true, format: 'esm', minify: true, target: 'es2020', platform: 'browser', legalComments: 'none',
  banner: { js: `/* @supabase/supabase-js v${version} (MIT) empacotado com esbuild - gerado por "npm run vendor"; nao edite. */` },
  outfile: 'js/vendor/supabase.js',
});
console.log(`js/vendor/supabase.js gerado (supabase-js v${version})`);
