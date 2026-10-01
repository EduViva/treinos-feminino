import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../../js/sync/mappers.js';
import { createDraft, Session, setClock } from '../../js/session.js';
import { state } from '../../js/store.js';

const U = '11111111-1111-4111-8111-111111111111';
const id = (n) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const strip = (o, ...keys) => JSON.parse(JSON.stringify(o, (k, v) => (keys.includes(k) ? undefined : v)));

test('exercício próprio: documento → linhas → documento (rótulos ↔ ids, secundários normalizados)', () => {
  const ex = {
    id: id(1), name: ' Supino reto máquina — Academia X ', aliases: ['Chest press X'], group: 'Peito', secondary: ['Tríceps', 'Ombros', 'Peitoral', 'Inexistente'],
    equipment: 'Máquina', kind: 'forca', level: 'iniciante', art: 'chest_press', instructions: ['a', 'b'], tips: ['dica'],
    defaults: { sets: 3, reps: 12, load: 0, rest: 90, loadStep: 5 }, repUnit: 'reps', bodyweight: false, visibility: 'private', parentId: id(2),
  };
  const { row, secondary } = M.exerciseToRows(ex, U);
  assert.equal(row.name, 'Supino reto máquina — Academia X');
  assert.equal(row.primary_group_id, 'peitoral', 'rótulo antigo "Peito" vira id');
  assert.equal(row.equipment_id, 'maquina');
  assert.equal(row.origin, 'custom'); assert.equal(row.owner_id, U); assert.equal(row.parent_exercise_id, id(2));
  assert.deepEqual(secondary.sort(), ['ombros', 'triceps'], 'sem duplicar o principal nem ids inválidos');
  const back = M.exerciseFromRow({ ...row, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-02T00:00:00Z', exercise_secondary_muscles: secondary.map((s) => ({ muscle_group_id: s })) });
  assert.equal(back.group, 'Peitoral'); assert.deepEqual(back.secondary, ['Ombros', 'Tríceps']); assert.equal(back.equipment, 'Máquina');
  assert.equal(back.builtin, false); assert.equal(back.parentId, id(2)); assert.equal(back.defaults.loadStep, 5);
});

test('exercício do catálogo vem como builtin e nunca é gravado como custom', () => {
  const b = M.exerciseFromRow({ id: id(3), origin: 'catalog', slug: 'supino-reto-barra', name: 'Supino reto com barra', primary_group_id: 'peitoral', equipment_id: 'barra', exercise_type_id: 'forca', level: 'intermediario',
    art_key: 'bench_press', default_sets: 4, default_reps: 10, default_rest_seconds: 90, default_load: '0', load_step: '2.5', rep_unit: 'reps', is_bodyweight: false, is_active: true, owner_id: null,
    exercise_secondary_muscles: [{ muscle_group_id: 'triceps' }, { muscle_group_id: 'ombros' }] });
  assert.equal(b.builtin, true); assert.equal(b.slug, 'supino-reto-barra'); assert.deepEqual(b.secondary, ['Ombros', 'Tríceps']); assert.equal(b.defaults.loadStep, 2.5);
});

test('preferências: favoritos/arquivado/observações + padrões pessoais sobre o catálogo', () => {
  const base = M.exerciseFromRow({ id: id(3), origin: 'catalog', slug: 's', name: 'Supino', primary_group_id: 'peitoral', equipment_id: 'barra', exercise_type_id: 'forca',
    default_sets: 4, default_reps: 10, default_rest_seconds: 90, default_load: 0, load_step: 2.5, rep_unit: 'reps', is_bodyweight: false, is_active: true, exercise_secondary_muscles: [] });
  // usuária edita um exercício do catálogo: muda carga/descanso, favorita e anota
  const merged = { ...M.applyPrefs(base, null), favorite: true, notes: 'banco 3', defaults: { ...base.defaults, load: 30, rest: 120 } };
  const { base: nb, prefs } = M.splitExercise(merged, base, U);
  assert.equal(nb, null, 'o exercício do catálogo NÃO é alterado');
  assert.deepEqual(prefs.defaults, { sets: null, reps: null, load: 30, rest: 120, loadStep: null }, 'só o que mudou vira preferência');
  assert.equal(prefs.favorite, true);
  const back = M.applyPrefs(base, M.prefsFromRow({ ...M.prefsToRow(prefs, U), updated_at: '2026-01-01T00:00:00Z' }));
  assert.deepEqual(back.defaults, { sets: 4, reps: 10, load: 30, rest: 120, loadStep: 2.5 });
  assert.equal(back.favorite, true); assert.equal(back.notes, 'banco 3');
  // dono edita o próprio exercício: padrões ficam no exercício (base), prefs só tem o pessoal
  const own = { ...base, id: id(9), builtin: false, ownerId: U, origin: 'custom', favorite: true, defaults: { ...base.defaults, sets: 5 } };
  const s2 = M.splitExercise(own, null, U);
  assert.equal(s2.base.defaults.sets, 5); assert.equal(s2.base.builtin, false); assert.equal('favorite' in s2.base, false);
  assert.deepEqual(s2.prefs.defaults, { sets: null, reps: null, load: null, rest: null, loadStep: null });
});

test('treino: itens viram linhas ordenadas e voltam iguais; itens inválidos são descartados', () => {
  const w = { id: id(10), name: 'Segunda', description: 'Costas', weekday: 1, order: 2, archived: false,
    items: [
      { id: id(11), exerciseId: id(3), sets: 4, reps: 12, load: 22.5, rest: 90, notes: 'devagar' },
      { id: id(12), exerciseId: id(4), sets: 3, reps: 30, load: 0, rest: 45, notes: '' },
      { id: id(13), exerciseId: 'ex-legado-nao-resolvido', sets: 3, reps: 10, load: 0, rest: 60, notes: '' },
    ] };
  const { row, items } = M.workoutToRows(w, U);
  assert.equal(items.length, 2, 'item sem exercício válido não é enviado');
  assert.deepEqual(items.map((i) => i.position), [0, 1]);
  assert.equal(row.weekday, 1); assert.equal(row.position, 2);
  const back = M.workoutFromRows({ ...row, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }, [items[1], items[0]]);
  assert.deepEqual(back.items.map((i) => [i.id, i.exerciseId, i.sets, i.reps, i.load, i.rest, i.notes]), [[id(11), id(3), 4, 12, 22.5, 90, 'devagar'], [id(12), id(4), 3, 30, 0, 45, '']]);
  assert.equal(back.name, 'Segunda'); assert.equal(back.order, 2);
});

test('sessão REAL do motor de treino: planejado × alvo × realizado sobrevive ao ciclo documento → linhas → documento', () => {
  let t = Date.parse('2026-03-02T10:00:00Z');
  setClock(() => t);
  state.exercises = new Map();
  const workout = { id: id(20), name: 'Segunda', description: 'Costas e bíceps', items: [
    { id: id(21), exerciseId: id(3), sets: 2, reps: 10, load: 20, rest: 60, notes: '' },
    { id: id(22), exerciseId: id(4), sets: 1, reps: 30, load: 0, rest: 30, notes: 'prancha' },
  ] };
  const S = new Session(createDraft(workout));
  S.startExercise(); S.startSet(); t += 30000; S.finishSet({ reps: 10, load: 20 }); t += 45000;
  S.editLastSet({ effort: 3, rir: 2 });
  S.proceedFromRest(); S.startSet(); t += 28000; S.finishSet({ reps: 9, load: 22.5 }); t += 30000;
  S.proceedFromRest();
  S.skipExercise();
  t += 5000;
  S.setFeel(4, 'boa sessão');
  const rec = S.finishWorkout();
  rec.feel = 4; rec.note = 'boa sessão';

  const { session, exercises, sets } = M.sessionToRows(rec, U);
  assert.equal(session.user_id, U); assert.equal(exercises.length, 2); assert.equal(sets.length, 2);
  assert.ok(sets.every((x) => x.user_id === U && x.session_id === rec.id));
  assert.equal(exercises[0].planned_load, 20); assert.equal(exercises[0].status, 'done'); assert.equal(exercises[1].status, 'skipped');
  assert.equal(sets[1].load, 22.5, 'o realizado difere do planejado e é registrado à parte');
  assert.equal(sets[1].planned_load, 20);

  const joined = { ...session, created_at: '2026-03-02T11:00:00Z', updated_at: '2026-03-02T11:00:00Z',
    session_exercises: exercises.map((e, i) => ({ ...e, session_sets: sets.filter((s) => s.exercise_position === i) })).reverse() };
  const back = M.sessionFromRows(joined);
  const want = strip(rec, 'createdAt', 'updatedAt');
  assert.deepEqual(strip(back, 'createdAt', 'updatedAt'), want);
  setClock(() => Date.now());
});

test('atividade, bem-estar, peso, sugestão e perfil: ciclo completo', () => {
  const a = { id: id(30), type: 'corrida', customName: null, startedAt: Date.parse('2026-03-01T08:00:00Z'), durationMin: 32.5, distanceKm: 5, paceSecKm: 390, speedKmh: null, intensity: 2, calories: 300, note: 'ok' };
  assert.deepEqual(strip(M.activityFromRow({ ...M.activityToRow(a, U), created_at: null, updated_at: null }), 'createdAt', 'updatedAt'), strip({ ...a }, 'createdAt', 'updatedAt'));

  const w = { date: '2026-03-01', period: true, flow: 'médio', cycleStart: true, mood: 4, energy: 3, tiredness: 2, fatigue: 2, recovery: 5, note: 'cólica leve' };
  assert.deepEqual(strip(M.wellbeingFromRow(M.wellbeingToRow(w, U)), 'createdAt', 'updatedAt'), w);
  const w2 = { date: '2026-03-02', energy: 5, note: '' };
  assert.deepEqual(strip(M.wellbeingFromRow(M.wellbeingToRow(w2, U)), 'createdAt', 'updatedAt'), w2, 'campos vazios continuam vazios');

  const kg = { id: 'qualquer', date: '2026-03-01', kg: 62.5, source: 'perfil' };
  const kb = M.weightFromRow(M.weightToRow(kg, U));
  assert.equal(kb.date, '2026-03-01'); assert.equal(kb.kg, 62.5); assert.equal(kb.id, 'w-2026-03-01');

  const s = { id: id(31), exerciseId: id(3), workoutId: id(20), createdAt: 1000, decidedAt: 2000, basis: 'x', status: 'suggest', currentLoad: 20, suggestedLoad: 22.5, explanation: ['a', 'b'],
    considered: [{ sessionId: id(40), startedAt: 5, text: 't' }], decision: 'accepted', newLoad: 22.5, outcome: { sessionId: id(41), sets: [{ reps: 10, load: 22.5 }] } };
  assert.deepEqual(M.suggestionFromRow({ ...M.suggestionToRow(s, U), created_at: '2026-01-01T00:00:00Z' }), s);

  const p = { name: 'Ana', age: 34, sex: 'Feminino', height: 165, weight: 62.5, goal: 'Força', level: 'Intermediário', createdAt: 1700000000000 };
  const pr = M.profileFromRow({ ...M.profileToRow(p, { theme: 'dark', defaultRest: 75 }, U), updated_at: '2026-01-01T00:00:00Z' });
  assert.deepEqual(strip(pr.profile, 'updatedAt'), p); assert.deepEqual(pr.settings, { theme: 'dark', defaultRest: 75 });
  assert.equal(M.profileFromRow({ id: U, display_name: 'x', onboarded_at: null }).profile, null, 'sem onboarded_at → ainda precisa do onboarding');
});

test('mídia: caminho segue <usuário>/<exercício>/<mídia>.<ext> (política de Storage)', () => {
  const m = { id: id(50), exerciseId: id(3), kind: 'image', mime: 'image/jpeg', name: 'foto.JPG', size: 1234 };
  assert.equal(M.mediaPath(U, m), `${U}/${id(3)}/${id(50)}.jpg`);
  const row = M.mediaToRow(m, U);
  assert.ok(row.storage_path.startsWith(`${U}/`)); assert.equal(row.bucket, 'user-media'); assert.equal(row.kind, 'image');
  const back = M.mediaFromRow({ ...row, created_at: '2026-01-01T00:00:00Z' });
  assert.equal(back.remote, true); assert.equal(back.path, row.storage_path);
});
