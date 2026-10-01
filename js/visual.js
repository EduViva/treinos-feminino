// Representação visual do exercício: animação instrucional (modelo feminina) ou quadros,
// mais as fotos/vídeos próprios da usuária.
import { h, clear } from './util.js';
import * as store from './store.js';
import { ico, icon, segmented } from './ui.js';
import { ARTS, hasArt, mountPlayer, framesHtml, thumbSvg, PHASES, PHASE_LABEL } from './figure/scene.js';

const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function artFor(ex) { return ex && ex.art && hasArt(ex.art) ? ARTS[ex.art] : null; }

// Mapeia músculos (grupo principal/secundários) para o destaque quando o exercício é personalizado.
export function musclesOf(ex) {
  const art = artFor(ex);
  return art ? art.muscles : null;
}

export function exerciseVisual(ex, { compact = false, controls = true, phaseText = true, startOn } = {}) {
  const art = artFor(ex);
  const media = store.listMedia(ex.id);
  const urls = [];
  let player = null, tab = startOn || (ex.mediaPrimary && media.some((m) => m.id === ex.mediaPrimary) ? 'media' : art ? 'anim' : 'media');
  let mode = reduceMotion() ? 'frames' : 'anim';
  let mediaIdx = Math.max(0, media.findIndex((m) => m.id === ex.mediaPrimary));
  const root = h('div', { class: `visual ${compact ? 'compact' : ''}` });
  const stageHost = h('div', { class: 'visual-stage' });
  const bar = h('div', { class: 'visual-bar' });
  const phases = h('div', { class: 'phases', 'aria-live': 'polite' });

  const destroyPlayer = () => { if (player) { player.destroy(); player = null; } };

  function renderPhases(cur) {
    if (!art || !phaseText) return;
    clear(phases);
    const cues = art.cues || {};
    phases.appendChild(h('div', { class: 'phase-dots' }, PHASES.map((p) => h('span', { class: `pdot ${p === cur ? 'on' : ''}`, title: PHASE_LABEL[p] }))));
    phases.appendChild(h('p', { class: 'cue' }, h('b', null, PHASE_LABEL[cur] + ': '), cues[cur] || ''));
  }

  async function showMedia() {
    destroyPlayer();
    clear(stageHost);
    if (!media.length) { stageHost.appendChild(placeholder()); return; }
    const m = media[Math.min(mediaIdx, media.length - 1)];
    const blob = await store.getMediaBlob(m.id);
    if (!blob) { stageHost.appendChild(placeholder()); return; }
    const url = URL.createObjectURL(blob); urls.push(url);
    const el = m.kind === 'video'
      ? h('video', { src: url, controls: true, muted: true, loop: true, playsinline: true, autoplay: true, preload: 'metadata' })
      : h('img', { src: url, alt: `${ex.name} — minha foto` });
    if (m.kind === 'video') el.muted = true;
    clear(stageHost);
    stageHost.appendChild(h('div', { class: 'media-view' }, el));
    if (media.length > 1) {
      stageHost.appendChild(h('div', { class: 'media-nav' },
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Anterior', html: icon('left'), onClick: () => { mediaIdx = (mediaIdx - 1 + media.length) % media.length; showMedia(); } }),
        h('span', null, `${mediaIdx + 1}/${media.length}`),
        h('button', { type: 'button', class: 'icon-btn', 'aria-label': 'Próxima', html: icon('right'), onClick: () => { mediaIdx = (mediaIdx + 1) % media.length; showMedia(); } })));
    }
  }

  function placeholder() {
    return h('div', { class: 'placeholder' }, h('div', { class: 'ph-ic', html: icon('image', 36) }),
      h('b', null, 'Sem animação para este exercício'),
      h('span', null, 'Adicione sua própria foto ou vídeo na tela do exercício.'));
  }

  function showAnim() {
    destroyPlayer();
    clear(stageHost);
    if (!art) { stageHost.appendChild(placeholder()); return; }
    if (mode === 'frames') {
      stageHost.innerHTML = framesHtml(ex.art);
      renderPhases('ini');
      return;
    }
    const wrap = h('div');
    stageHost.appendChild(wrap);
    player = mountPlayer(wrap, ex.art, { onPhase: (p) => renderPhases(p) });
    wrap.addEventListener('click', () => { if (player) { player.toggle(); renderBar(); } });
  }

  function renderBar() {
    clear(bar);
    if (!controls) return;
    if (art && tab === 'anim') {
      const playing = player && player.isPlaying();
      if (mode === 'anim') {
        bar.appendChild(h('button', { type: 'button', class: 'vbtn', 'aria-label': playing ? 'Pausar' : 'Reproduzir', onClick: () => { player.toggle(); renderBar(); }, html: icon(playing ? 'pause' : 'play', 18) }));
        bar.appendChild(h('button', {
          type: 'button', class: `vbtn ${slow ? 'on' : ''}`, 'aria-pressed': String(slow), title: 'Câmera lenta',
          onClick: () => { slow = !slow; player && player.setSpeed(slow ? 0.5 : 1); renderBar(); },
        }, h('span', { html: icon('turtle', 18) }), h('span', null, '0,5×')));
      }
      bar.appendChild(h('button', {
        type: 'button', class: 'vbtn', onClick: () => { mode = mode === 'anim' ? 'frames' : 'anim'; showAnim(); renderBar(); },
      }, h('span', { html: icon(mode === 'anim' ? 'frames' : 'film', 18) }), h('span', null, mode === 'anim' ? 'Ver em quadros' : 'Ver animação')));
    }
  }
  let slow = false;

  function renderTabs() {
    const tabs = h('div', { class: 'visual-tabs' });
    if (art && media.length) {
      tabs.appendChild(segmented({
        options: [['anim', 'Animação'], ['media', `Minha mídia (${media.length})`]], value: tab,
        onChange: (v) => { tab = v; draw(); },
      }));
    }
    return tabs;
  }

  function draw() {
    clear(root);
    root.appendChild(renderTabs());
    root.appendChild(stageHost);
    if (tab === 'anim') { showAnim(); } else { showMedia(); }
    root.appendChild(bar);
    renderBar();
    if (tab === 'anim' && art && phaseText) root.appendChild(phases);
  }
  draw();
  root._destroy = () => { destroyPlayer(); urls.forEach((u) => URL.revokeObjectURL(u)); };
  return root;
}

// Miniatura (lista): arte estática; se não houver arte, primeira foto; senão, inicial do nome.
export function exThumb(ex, cls = '') {
  const art = artFor(ex);
  const box = h('div', { class: `thumb ${cls}` });
  if (art) { box.innerHTML = thumbSvg(ex.art, 0.62); return box; }
  const first = store.listMedia(ex.id).find((m) => m.kind === 'image');
  if (first) {
    store.getMediaBlob(first.id).then((b) => {
      if (!b) return;
      const url = URL.createObjectURL(b);
      box.appendChild(h('img', { src: url, alt: '', onload: () => URL.revokeObjectURL(url) }));
    });
  } else {
    box.classList.add('thumb-ph');
    box.appendChild(h('span', null, (ex.name || '?').trim().charAt(0).toUpperCase()));
  }
  return box;
}

export function destroyTree(node) {
  if (!node) return;
  if (node._destroy) node._destroy();
  if (node.querySelectorAll) node.querySelectorAll('*').forEach((n) => { if (n._destroy) n._destroy(); });
}
