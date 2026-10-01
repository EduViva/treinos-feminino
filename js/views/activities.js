// Registro de atividades (corrida, caminhada, bike, vôlei, ping-pong, outras) com campos adaptáveis.
import { h, clear, dateKey, parseKey, fmtNum, parseNum, uid } from '../util.js';
import * as store from '../store.js';
import { openSheet, btn, field, textInput, textArea, numInput, readNum, chips, scale, toast, confirmDialog } from '../ui.js';
import { ACTIVITY_TYPES, catById } from '../data/seed.js';
import { paceFrom, speedFrom, fmtPace } from '../stats.js';

const INTENSITY = [{ v: 1, label: 'Leve' }, { v: 2, label: 'Moderada' }, { v: 3, label: 'Intensa' }];
export const intensityLabel = (v) => (INTENSITY.find((i) => i.v === v) || {}).label || '';

export function activitySheet({ date, activity, onSaved } = {}) {
  const a = activity ? { ...activity } : { id: uid(), type: 'corrida' };
  const when = activity ? new Date(activity.startedAt) : (date ? new Date(`${date}T${new Date().toTimeString().slice(0, 5)}`) : new Date());
  let type = a.type;
  const dateIn = h('input', { type: 'date', value: dateKey(when) });
  const timeIn = h('input', { type: 'time', value: when.toTimeString().slice(0, 5) });
  const dur = numInput(a.durationMin, { placeholder: 'min' });
  const dist = numInput(a.distanceKm, { placeholder: 'km' });
  const cal = numInput(a.calories, { placeholder: 'kcal' });
  const custom = textInput(a.customName || '', { placeholder: 'Nome da atividade (ex.: Natação)' });
  const note = textArea(a.note || '', { rows: 2, placeholder: 'Observações (opcional)' });
  let intensity = a.intensity ?? null;
  const derived = h('p', { class: 'muted', style: { fontSize: '13.5px', margin: '-6px 0 12px' } });
  const dynamic = h('div');
  const typeChips = chips({ options: ACTIVITY_TYPES.map((t) => [t.id, t.label]), value: type, onChange: (v) => { type = v; draw(); } });

  function updDerived() {
    const t = ACTIVITY_TYPES.find((x) => x.id === type);
    const d = readNum(dur), k = readNum(dist);
    const bits = [];
    if (t.fields.includes('pace') && d && k) bits.push(`Ritmo: ${fmtPace(paceFrom(d, k))}`);
    if (t.fields.includes('speed') && d && k) bits.push(`Velocidade média: ${fmtNum(speedFrom(d, k), 1)} km/h`);
    derived.textContent = bits.join(' · ');
  }
  function draw() {
    const t = ACTIVITY_TYPES.find((x) => x.id === type);
    clear(dynamic);
    if (type === 'outro') dynamic.appendChild(field('Nome', custom));
    const row = [];
    row.push(field('Duração (min)', dur));
    if (t.fields.includes('distance')) row.push(field('Distância (km)', dist));
    dynamic.appendChild(h('div', { class: 'two' }, row));
    dynamic.appendChild(derived);
    if (t.fields.includes('intensity')) dynamic.appendChild(field('Intensidade', scale({ options: INTENSITY, value: intensity, onChange: (v) => { intensity = v; } })));
    if (t.fields.includes('calories')) dynamic.appendChild(field('Calorias (opcional)', cal));
    updDerived();
  }
  dur.addEventListener('input', updDerived); dist.addEventListener('input', updDerived);
  draw();

  const foot = [btn('Cancelar', { kind: 'secondary', onClick: () => s.close() }), btn('Salvar', { onClick: save })];
  const s = openSheet({
    title: activity ? 'Editar atividade' : 'Registrar atividade', className: 'tall',
    body: [field('Tipo', typeChips), h('div', { class: 'two' }, field('Data', dateIn), field('Hora', timeIn)), dynamic, field('Observações', note),
      activity ? btn('Excluir atividade', { kind: 'danger', block: true, onClick: async () => { if (await confirmDialog({ title: 'Excluir atividade?', message: 'Esta ação não pode ser desfeita.', confirmText: 'Excluir', danger: true })) { await store.deleteActivity(a.id); s.close(); toast('Atividade excluída.'); onSaved && onSaved(); } } }) : null],
    footer: foot,
  });
  async function save() {
    const d = readNum(dur);
    if (!d || d <= 0) { toast('Informe a duração em minutos.'); dur.focus(); return; }
    const t = ACTIVITY_TYPES.find((x) => x.id === type);
    const k = t.fields.includes('distance') ? readNum(dist) : null;
    const rec = {
      id: a.id, type, customName: type === 'outro' ? (custom.value.trim() || null) : null,
      startedAt: new Date(`${dateIn.value}T${timeIn.value || '12:00'}`).getTime(),
      durationMin: d, distanceKm: k || null,
      paceSecKm: t.fields.includes('pace') ? paceFrom(d, k) : null, speedKmh: t.fields.includes('speed') ? speedFrom(d, k) : null,
      intensity: t.fields.includes('intensity') ? intensity : null, calories: t.fields.includes('calories') ? readNum(cal) : null,
      note: note.value.trim(), createdAt: a.createdAt,
    };
    await store.saveActivity(rec);
    s.close(); toast('Atividade salva.'); onSaved && onSaved();
  }
  return s;
}
