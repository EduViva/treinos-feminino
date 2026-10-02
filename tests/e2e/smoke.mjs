// Fumaça: login → onboarding da conta nova (sem treinos ainda). Gera capturas de tela.
import { makeEnv } from './harness.mjs';
import { mkdirSync } from 'node:fs';
const OUT = process.argv[2] || 'tests/e2e/out';
mkdirSync(OUT, { recursive: true });
const env = await makeEnv({ port: 8124 });
const anon = await env.device({ name: 'sem-conta' });
await anon.goto(); await anon.page.waitForSelector('.auth', { timeout: 8000 });
await anon.page.screenshot({ path: `${OUT}/00-login.png`, fullPage: true });
await anon.page.getByRole('tab', { name: 'Criar conta' }).click();
await anon.page.screenshot({ path: `${OUT}/00b-criar-conta.png`, fullPage: true });
const { session } = env.fake.createUser({ email: 'ana@teste.com', password: 'senha-forte-1', name: 'Ana' });
const logged = await env.device({ session, name: 'com-conta' });
await logged.goto(); await logged.page.waitForSelector('.hero', { timeout: 15000 });
await logged.page.screenshot({ path: `${OUT}/01-onboarding.png`, fullPage: true });
console.log(env.errors.length ? env.errors.join('\n') : 'no errors');
await env.close();
process.exit(env.errors.length ? 1 : 0);
