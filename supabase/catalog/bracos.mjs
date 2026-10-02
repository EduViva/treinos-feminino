import { grp } from './dsl.mjs';
const bi = grp('biceps');
const tri = grp('triceps');
const ant = grp('antebraco');

export default [
  // ================= BÍCEPS
  bi.bar('rosca-direta-barra', 'Rosca direta com barra', ['Rosca direta', 'Rosca com barra reta', 'Barbell curl'], ['antebraco'], 'i', [
    'Em pé, segure a barra com as palmas voltadas para a frente, mãos na largura dos ombros.', 'Flexione os cotovelos levando a barra aos ombros, sem balançar o tronco.', 'Desça devagar até estender os braços.',
  ], 'Cotovelos fixos junto ao corpo; evite usar o impulso das costas.', { p: 'mid', step: 2.5 }),
  bi.bar('rosca-direta-barra-w', 'Rosca direta com barra W', ['Rosca W', 'Rosca com barra EZ', 'EZ curl'], [], 'i', [
    'Em pé, barra W com pegada na largura dos ombros.', 'Flexione os cotovelos levando a barra aos ombros, sem balançar.', 'Desça devagar até estender os braços.',
  ], 'A barra W alivia os punhos em relação à barra reta.', { p: 'leg', step: 2, art: 'ez_curl', legacy: 'ex-rosca-w' }),
  bi.hal('rosca-direta-halteres', 'Rosca direta com halteres', ['Rosca com halteres', 'Dumbbell curl', 'Rosca bilateral'], ['antebraco'], 'i', [
    'Em pé, braços estendidos ao lado do corpo, palmas para a frente.', 'Flexione os cotovelos levando os halteres aos ombros.', 'Desça devagar até estender os braços.',
  ], 'Mantenha os cotovelos junto ao corpo e o tronco parado.', { p: 'mid', step: 1, art: 'biceps_curl' }),
  bi.hal('rosca-alternada-halteres', 'Rosca alternada com halteres', ['Rosca alternada', 'Alternating dumbbell curl'], ['antebraco'], 'i', [
    'Em pé, com um halter em cada mão ao lado do corpo.', 'Flexione um cotovelo girando a palma para cima.', 'Desça devagar e repita com o outro braço.',
  ], 'Gire o punho durante a subida (supinação) para trabalhar mais o bíceps.', { p: 'mid', step: 1 }),
  bi.hal('rosca-martelo-halteres', 'Rosca martelo com halteres', ['Rosca martelo', 'Hammer curl'], ['antebraco'], 'i', [
    'Em pé, halteres ao lado do corpo com as palmas voltadas uma para a outra.', 'Flexione os cotovelos mantendo a pegada neutra.', 'Desça devagar até estender os braços.',
  ], 'Trabalha também o braquiorradial, no antebraço.', { p: 'mid', step: 1 }),
  bi.pol('rosca-martelo-corda', 'Rosca martelo na polia com corda', ['Rope hammer curl', 'Rosca corda'], ['antebraco'], 'i', [
    'Em pé de frente para a polia baixa, segure a corda com as palmas voltadas uma para a outra.', 'Flexione os cotovelos levando as mãos aos ombros.', 'Desça devagar mantendo a tensão do cabo.',
  ], 'Cotovelos fixos junto ao corpo.', { p: 'iso', step: 2.5 }),
  bi.hal('rosca-concentrada', 'Rosca concentrada', ['Concentration curl'], [], 'i', [
    'Sentada, apoie o cotovelo na parte interna da coxa com o halter pendurado.', 'Flexione o cotovelo levando o halter ao ombro.', 'Desça devagar até estender o braço.',
  ], 'Movimento lento e focado; evite usar impulso.', { p: 'iso', step: 1 }),
  bi.bar('rosca-scott-barra-w', 'Rosca Scott com barra W', ['Rosca no banco Scott', 'Preacher curl', 'Rosca Scott'], ['antebraco'], 'm', [
    'Apoie os braços no banco Scott e segure a barra W.', 'Flexione os cotovelos levando a barra aos ombros.', 'Desça devagar sem estender totalmente os cotovelos.',
  ], 'Não estenda os cotovelos por completo na descida para proteger o tendão.', { p: 'iso', step: 2 }),
  bi.hal('rosca-scott-halter', 'Rosca Scott unilateral com halter', ['Preacher curl unilateral'], ['antebraco'], 'm', [
    'Apoie um braço no banco Scott e segure o halter.', 'Flexione o cotovelo levando o halter ao ombro.', 'Desça devagar e troque de lado.',
  ], 'Mantenha o braço totalmente apoiado durante todo o movimento.', { p: 'iso', step: 1 }),
  bi.maq('rosca-scott-maquina', 'Rosca Scott na máquina', ['Biceps curl machine', 'Rosca bíceps na máquina'], ['antebraco'], 'i', [
    'Sente com os braços apoiados no suporte e segure as pegadas.', 'Flexione os cotovelos trazendo as pegadas aos ombros.', 'Volte devagar controlando a carga.',
  ], 'Regule o banco para os cotovelos alinharem com o eixo da máquina.', { p: 'mach', step: 2.5 }),
  bi.pol('rosca-polia-baixa', 'Rosca na polia baixa', ['Cable curl', 'Rosca no cabo'], ['antebraco'], 'i', [
    'Em pé de frente para a polia baixa, segure a barra reta com as palmas para cima.', 'Flexione os cotovelos levando a barra aos ombros.', 'Desça devagar mantendo a tensão.',
  ], 'O cabo mantém tensão constante durante todo o movimento.', { p: 'iso', step: 2.5 }),
  bi.pol('rosca-polia-alta', 'Rosca na polia alta (bíceps em pose)', ['Rosca crucifixo na polia', 'High cable curl'], [], 'm', [
    'Em pé entre as polias altas, braços abertos na altura dos ombros.', 'Flexione os cotovelos trazendo as mãos em direção às orelhas.', 'Volte devagar abrindo os braços.',
  ], 'Mantenha os cotovelos na altura dos ombros.', { p: 'light', step: 2.5 }),
  bi.hal('rosca-inclinada-halteres', 'Rosca inclinada com halteres', ['Incline dumbbell curl', 'Rosca no banco inclinado'], [], 'm', [
    'Sente no banco inclinado com os braços pendentes ao lado do corpo.', 'Flexione os cotovelos levando os halteres aos ombros.', 'Desça devagar até estender totalmente os braços.',
  ], 'Alonga o bíceps na parte inferior; use cargas moderadas.', { p: 'iso', step: 1 }),
  bi.hal('rosca-spider', 'Rosca spider', ['Spider curl'], [], 'm', [
    'Deite de bruços em um banco inclinado com os braços pendentes à frente.', 'Flexione os cotovelos levando os halteres aos ombros.', 'Desça devagar até estender os braços.',
  ], 'O apoio no banco elimina o balanço do tronco.', { p: 'iso', step: 1 }),
  bi.bar('rosca-21', 'Rosca 21', ['21s', 'Rosca vinte e um'], ['antebraco'], 'a', [
    'Faça 7 repetições da metade inferior do movimento, 7 da metade superior e 7 completas, sem pausa.', 'Mantenha os cotovelos fixos junto ao corpo.', 'Termine com a descida controlada.',
  ], 'Use carga leve: o volume total (21 repetições) é intenso.', { p: 'iso', reps: 21, step: 1 }),
  bi.hal('rosca-zottman', 'Rosca Zottman', ['Zottman curl'], ['antebraco'], 'm', [
    'Suba os halteres com as palmas para cima, como uma rosca direta.', 'No topo, gire os punhos para baixo.', 'Desça devagar com as palmas para baixo e gire de volta embaixo.',
  ], 'Trabalha bíceps na subida e antebraço na descida.', { p: 'light', step: 1 }),
  bi.ela('rosca-elastico', 'Rosca com elástico', ['Rosca com faixa', 'Band curl'], ['antebraco'], 'i', [
    'Pise no elástico e segure as pontas com as palmas para cima.', 'Flexione os cotovelos levando as mãos aos ombros.', 'Desça devagar mantendo a tensão.',
  ], 'Boa opção para treinar em casa ou viajando.', { p: 'light' }),

  // ================= TRÍCEPS
  tri.pol('triceps-polia-barra-reta', 'Tríceps na polia com barra reta', ['Tríceps pulley', 'Tríceps polia', 'Pushdown', 'Tríceps na polia'], [], 'i', [
    'Cotovelos junto ao corpo, antebraços na horizontal.', 'Estenda os cotovelos empurrando a barra para baixo.', 'Volte devagar até os antebraços ficarem na horizontal.',
  ], 'Só os antebraços se movem; mantenha os cotovelos colados ao corpo.', { p: 'mach', step: 2.5, art: 'triceps_pushdown' }),
  tri.pol('triceps-corda-polia', 'Tríceps com corda na polia', ['Tríceps corda', 'Rope pushdown'], [], 'i', [
    'Cotovelos junto ao corpo.', 'Estenda os cotovelos abrindo a corda no final.', 'Só os antebraços se movem; volte devagar.',
  ], 'Abrir a corda no final aumenta a contração do tríceps.', { p: 'leg', step: 2.5, art: 'triceps_rope', legacy: 'ex-triceps-corda' }),
  tri.pol('triceps-polia-barra-v', 'Tríceps na polia com barra V', ['Tríceps V-bar', 'V-bar pushdown'], [], 'i', [
    'Cotovelos junto ao corpo, segurando a barra V.', 'Estenda os cotovelos empurrando a barra para baixo.', 'Volte devagar.',
  ], 'A barra V é mais confortável para os punhos.', { p: 'mach', step: 2.5 }),
  tri.pol('triceps-unilateral-polia', 'Tríceps unilateral na polia', ['Single arm pushdown', 'Tríceps polia unilateral'], [], 'm', [
    'De frente para a polia alta, segure a pegada com uma mão e o cotovelo junto ao corpo.', 'Estenda o cotovelo empurrando a pegada para baixo.', 'Volte devagar e troque de lado.',
  ], 'Corrige desequilíbrios entre os lados.', { p: 'iso', step: 1.25 }),
  tri.pol('triceps-polia-pegada-invertida', 'Tríceps na polia com pegada invertida', ['Reverse grip pushdown', 'Tríceps pegada supinada'], ['antebraco'], 'm', [
    'Segure a barra com as palmas voltadas para cima e os cotovelos junto ao corpo.', 'Estenda os cotovelos empurrando a barra para baixo.', 'Volte devagar.',
  ], 'Enfatiza a cabeça medial do tríceps; use carga menor.', { p: 'iso', step: 2.5 }),
  tri.bar('triceps-testa-barra-w', 'Tríceps testa com barra W', ['Tríceps francês deitado', 'Skullcrusher', 'Skull crusher', 'Lying triceps extension'], [], 'm', [
    'Deite no banco com a barra W sobre o peito, braços estendidos.', 'Flexione apenas os cotovelos, levando a barra em direção à testa.', 'Estenda os cotovelos voltando à posição inicial.',
  ], 'Cotovelos apontando para o teto e parados.', { p: 'iso', step: 2 }),
  tri.hal('triceps-testa-halteres', 'Tríceps testa com halteres', ['Dumbbell skullcrusher'], [], 'm', [
    'Deite no banco com um halter em cada mão, braços estendidos sobre o peito.', 'Flexione os cotovelos levando os halteres ao lado da cabeça.', 'Estenda os cotovelos voltando à posição inicial.',
  ], 'Pegada neutra costuma ser mais confortável para os cotovelos.', { p: 'iso', step: 1 }),
  tri.hal('triceps-frances-halter', 'Tríceps francês com halter', ['Tríceps francês bilateral', 'Overhead dumbbell extension'], ['ombros'], 'i', [
    'Sentada ou em pé, segure um halter com as duas mãos acima da cabeça.', 'Flexione os cotovelos levando o halter atrás da cabeça.', 'Estenda os cotovelos voltando à posição inicial.',
  ], 'Mantenha os cotovelos apontando para cima e próximos à cabeça.', { p: 'iso', step: 1 }),
  tri.hal('triceps-frances-unilateral-halter', 'Tríceps francês unilateral', ['Tríceps francês unilateral com halter', 'Single arm overhead extension'], ['ombros'], 'm', [
    'Halter acima da cabeça, braço estendido.', 'Dobre o cotovelo levando o halter atrás da cabeça.', 'Cotovelo parado apontando para cima; estenda de volta.',
  ], 'Use a outra mão para estabilizar o cotovelo, se precisar.', { p: 'leg', sets: 3, step: 1, art: 'overhead_triceps', legacy: 'ex-triceps-frances' }),
  tri.pol('triceps-frances-polia', 'Tríceps francês na polia', ['Overhead cable extension', 'Tríceps corda atrás da cabeça'], ['ombros'], 'm', [
    'De costas para a polia, segure a corda atrás da cabeça com os cotovelos flexionados.', 'Estenda os cotovelos empurrando a corda para a frente e para cima.', 'Volte devagar.',
  ], 'Mantenha os cotovelos apontando para a frente, sem abrir.', { p: 'iso', step: 2.5 }),
  tri.hal('triceps-coice-halter', 'Tríceps coice com halter', ['Kickback', 'Tríceps kickback', 'Tríceps coice'], [], 'i', [
    'Incline o tronco à frente com o cotovelo flexionado junto ao corpo.', 'Estenda o cotovelo levando o halter para trás.', 'Volte devagar.',
  ], 'Mantenha o braço parado, paralelo ao chão; só o antebraço se move.', { p: 'light', step: 1 }),
  tri.pol('triceps-coice-polia', 'Tríceps coice na polia', ['Cable kickback tríceps'], [], 'm', [
    'Incline o tronco à frente segurando a pegada da polia baixa com o cotovelo junto ao corpo.', 'Estenda o cotovelo levando a pegada para trás.', 'Volte devagar.',
  ], 'Tensão constante do cabo durante todo o movimento.', { p: 'light', step: 1.25 }),
  tri.ban('mergulho-no-banco', 'Mergulho no banco', ['Tríceps no banco', 'Bench dip', 'Mergulho banco'], ['ombros', 'peitoral'], 'i', [
    'Apoie as mãos na borda do banco atrás de você, pernas estendidas à frente.', 'Flexione os cotovelos descendo o quadril em direção ao chão.', 'Empurre até estender os braços.',
  ], 'Mantenha o quadril próximo ao banco; flexione os joelhos para facilitar.', { p: 'bw', reps: 10 }),
  tri.maq('mergulho-maquina', 'Mergulho na máquina', ['Dip machine', 'Tríceps mergulho assistido'], ['peitoral', 'ombros'], 'i', [
    'Sente com as costas apoiadas e segure as pegadas na altura do peito.', 'Empurre as pegadas para baixo até estender os cotovelos.', 'Volte devagar.',
  ], 'Mantenha os cotovelos junto ao corpo.', { p: 'mach' }),
  tri.maq('triceps-maquina', 'Tríceps na máquina', ['Triceps extension machine', 'Extensão de tríceps na máquina'], [], 'i', [
    'Sente com os cotovelos apoiados e segure as pegadas.', 'Estenda os cotovelos empurrando a carga.', 'Volte devagar controlando o peso.',
  ], 'Ajuste o banco para alinhar os cotovelos ao eixo da máquina.', { p: 'mach', step: 2.5 }),
  tri.bar('supino-fechado-barra', 'Supino fechado com barra', ['Supino pegada fechada', 'Close grip bench press'], ['peitoral', 'ombros'], 'm', [
    'Deite no banco e segure a barra com as mãos na largura dos ombros.', 'Desça a barra até a parte baixa do peito com os cotovelos junto ao corpo.', 'Empurre até estender os braços.',
  ], 'Não feche demais a pegada: a largura dos ombros protege os punhos.', { p: 'comp' }),
  tri.pc('flexao-diamante', 'Flexão diamante', ['Diamond push-up', 'Flexão fechada'], ['peitoral', 'ombros'], 'm', [
    'Apoie as mãos juntas sob o peito, formando um losango com polegares e indicadores.', 'Flexione os cotovelos mantendo-os junto ao corpo.', 'Empurre até estender os braços.',
  ], 'Se ficar muito difícil, apoie os joelhos.', { p: 'bw', reps: 8 }),
  tri.ela('triceps-elastico', 'Tríceps com elástico', ['Band pushdown', 'Extensão de tríceps com elástico'], [], 'i', [
    'Prenda o elástico no alto e segure as pontas com os cotovelos junto ao corpo.', 'Estenda os cotovelos puxando o elástico para baixo.', 'Volte devagar.',
  ], 'Mantenha o tronco firme.', { p: 'light' }),

  // ================= ANTEBRAÇO
  ant.bar('rosca-inversa-barra', 'Rosca inversa com barra', ['Reverse curl', 'Rosca pegada pronada'], ['biceps'], 'm', [
    'Em pé, segure a barra com as palmas para baixo, mãos na largura dos ombros.', 'Flexione os cotovelos levando a barra aos ombros.', 'Desça devagar até estender os braços.',
  ], 'Use carga menor que na rosca direta: o antebraço é mais fraco.', { p: 'iso', step: 2 }),
  ant.bar('rosca-de-punho-barra', 'Rosca de punho com barra', ['Wrist curl', 'Flexão de punho'], [], 'i', [
    'Sentada, apoie os antebraços nas coxas com as palmas para cima segurando a barra.', 'Flexione os punhos levando a barra para cima.', 'Desça devagar abrindo os dedos levemente.',
  ], 'O movimento é curto; antebraços sempre apoiados.', { p: 'light', step: 1 }),
  ant.bar('rosca-de-punho-inversa', 'Rosca de punho inversa', ['Reverse wrist curl', 'Extensão de punho'], [], 'i', [
    'Sentada, apoie os antebraços nas coxas com as palmas para baixo segurando a barra.', 'Estenda os punhos levando a barra para cima.', 'Desça devagar.',
  ], 'Use cargas leves para proteger os tendões do punho.', { p: 'light', step: 1 }),
  ant.hal('rosca-de-punho-halter', 'Rosca de punho com halter', ['Wrist curl com halter'], [], 'i', [
    'Apoie o antebraço no banco com a palma para cima segurando o halter.', 'Flexione o punho levando o halter para cima.', 'Desça devagar.',
  ], 'Trabalhe um braço de cada vez para equilibrar os lados.', { p: 'light', step: 0.5 }),
  ant.bf('suspensao-barra-fixa', 'Suspensão na barra fixa', ['Dead hang', 'Pendurar na barra', 'Hang'], ['costas', 'ombros'], 'i', [
    'Segure a barra fixa com as palmas para a frente e deixe o corpo pendurado.', 'Mantenha os ombros ativos (sem encolher) e o abdômen firme.', 'Segure pelo tempo programado.',
  ], 'Fortalece a pegada e alonga as costas; comece com 10 a 20 segundos.', { p: 'time', sets: 3, reps: 20 }),

  tri.smi('supino-fechado-smith', 'Supino fechado no Smith', ['Close grip Smith press', 'Supino pegada fechada no Smith'], ['peitoral', 'ombros'], 'i', [
    'Deite no banco sob a barra do Smith com as mãos na largura dos ombros.', 'Desça a barra até a parte baixa do peito com os cotovelos junto ao corpo.', 'Empurre até estender os braços.',
  ], 'Mantenha os punhos retos e os cotovelos próximos ao tronco.', { p: 'mid', step: 2.5 }),
  tri.bar('triceps-frances-barra', 'Tríceps francês com barra W', ['Overhead barbell extension', 'Tríceps francês sentado'], ['ombros'], 'm', [
    'Sentada ou em pé, segure a barra W acima da cabeça com os braços estendidos.', 'Flexione os cotovelos levando a barra atrás da cabeça.', 'Estenda os cotovelos voltando à posição inicial.',
  ], 'Mantenha os cotovelos apontando para cima e próximos à cabeça.', { p: 'iso', step: 2 }),
];
