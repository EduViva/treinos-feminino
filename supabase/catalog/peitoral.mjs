import { grp } from './dsl.mjs';
const g = grp('peitoral');

export default [
  // ---- barra
  g.bar('supino-reto-barra', 'Supino reto com barra', ['Supino reto', 'Supino com barra', 'Bench press'], ['ombros', 'triceps'], 'm', [
    'Deitada no banco, pés firmes no chão.', 'Empurre a barra até estender os braços.', 'Desça devagar até tocar de leve o peito.',
  ], 'Mantenha as escápulas juntas e apoiadas no banco durante todo o movimento.', { p: 'leg', sets: 4, reps: 10, step: 2.5, art: 'bench_press', legacy: 'ex-supino-reto' }),
  g.bar('supino-inclinado-barra', 'Supino inclinado com barra', ['Supino inclinado', 'Incline bench press'], ['ombros', 'triceps'], 'm', [
    'Deite no banco inclinado (30° a 45°) com os pés firmes no chão.', 'Retire a barra do suporte e desça até a parte alta do peito.', 'Empurre até estender os cotovelos, sem travar.',
  ], 'Inclinação acima de 45° transfere o esforço do peito para os ombros.', { p: 'comp' }),
  g.bar('supino-declinado-barra', 'Supino declinado com barra', ['Supino declinado', 'Decline bench press'], ['triceps', 'ombros'], 'm', [
    'Deite no banco declinado e prenda os pés no apoio.', 'Desça a barra até a parte baixa do peito com controle.', 'Empurre até estender os braços.',
  ], 'Peça ajuda para retirar e devolver a barra do suporte.', { p: 'comp' }),
  g.ani('svend-press-anilha', 'Aperto de anilha no peito (Svend press)', ['Svend press', 'Press com anilha'], ['ombros', 'triceps'], 'i', [
    'Em pé, segure uma anilha com as duas mãos na altura do peito.', 'Estenda os braços à frente apertando a anilha.', 'Volte devagar mantendo a pressão das mãos.',
  ], 'Aperte a anilha o tempo todo: a tensão constante é o que trabalha o peito.', { p: 'light' }),

  // ---- halteres
  g.hal('supino-reto-halteres', 'Supino reto com halteres', ['Supino com halteres', 'Dumbbell bench press'], ['ombros', 'triceps'], 'm', [
    'Deite no banco com um halter em cada mão ao lado do peito.', 'Empurre os halteres até estender os braços.', 'Desça devagar até sentir o peito alongar.',
  ], 'Desça até a altura do peito, sem deixar os cotovelos abrirem demais.', { p: 'mid' }),
  g.hal('supino-inclinado-halteres', 'Supino inclinado com halteres', ['Supino inclinado halteres', 'Incline dumbbell press'], ['ombros', 'triceps'], 'm', [
    'Sente no banco inclinado (30° a 45°) com os halteres à altura do peito.', 'Empurre para cima até estender os braços.', 'Desça com controle até o peito alongar.',
  ], 'Use inclinação moderada para manter o foco no peitoral superior.', { p: 'mid' }),
  g.hal('supino-declinado-halteres', 'Supino declinado com halteres', ['Decline dumbbell press'], ['triceps', 'ombros'], 'm', [
    'Deite no banco declinado com os halteres ao lado do peito.', 'Empurre até estender os braços.', 'Desça devagar, controlando o peso.',
  ], 'Comece leve: a posição declinada exige mais estabilidade.', { p: 'mid' }),
  g.hal('supino-pegada-neutra-halteres', 'Supino com halteres e pegada neutra', ['Supino pegada neutra', 'Neutral grip dumbbell press'], ['triceps', 'ombros'], 'i', [
    'Deite no banco com as palmas das mãos voltadas uma para a outra.', 'Empurre os halteres para cima mantendo as palmas frente a frente.', 'Desça devagar até a altura do peito.',
  ], 'A pegada neutra costuma ser mais confortável para os ombros.', { p: 'mid' }),
  g.hal('crucifixo-reto-halteres', 'Crucifixo reto com halteres', ['Crucifixo', 'Fly com halteres', 'Dumbbell fly'], ['ombros'], 'm', [
    'Deite no banco com os braços estendidos acima do peito, palmas frente a frente.', 'Abra os braços em arco, com os cotovelos levemente flexionados.', 'Feche subindo os halteres em arco, como num abraço.',
  ], 'Não desça abaixo da linha do peito para proteger os ombros.', { p: 'iso' }),
  g.hal('crucifixo-inclinado-halteres', 'Crucifixo inclinado com halteres', ['Crucifixo inclinado', 'Incline dumbbell fly'], ['ombros'], 'm', [
    'No banco inclinado, estenda os braços acima do peito com os halteres.', 'Abra os braços em arco com os cotovelos levemente flexionados.', 'Retorne contraindo o peito.',
  ], 'Use cargas menores que no supino: o movimento é de isolamento.', { p: 'iso' }),
  g.hal('pullover-halter', 'Pullover com halter', ['Pullover', 'Dumbbell pullover'], ['costas', 'triceps'], 'm', [
    'Deite no banco com as costas apoiadas e segure um halter com as duas mãos sobre o peito.', 'Leve o halter para trás da cabeça com os braços quase estendidos.', 'Volte ao ponto inicial contraindo o peito e as costas.',
  ], 'Mantenha o quadril firme e evite arquear a lombar.', { p: 'iso' }),

  // ---- Smith
  g.smi('supino-reto-smith', 'Supino reto no Smith', ['Supino Smith', 'Smith bench press'], ['ombros', 'triceps'], 'i', [
    'Posicione o banco sob a barra, na altura do meio do peito.', 'Destrave e desça a barra até tocar de leve o peito.', 'Empurre até estender os braços.',
  ], 'Ajuste o banco para a barra descer sobre a linha do mamilo.', { p: 'mid', step: 2.5 }),
  g.smi('supino-inclinado-smith', 'Supino inclinado no Smith', ['Incline Smith press'], ['ombros', 'triceps'], 'i', [
    'Incline o banco e posicione-o de modo que a barra desça na parte alta do peito.', 'Destrave a barra e desça com controle.', 'Empurre até estender os braços sem travar.',
  ], 'Garanta que a barra desça em linha reta, sem ir para o pescoço.', { p: 'mid', step: 2.5 }),

  // ---- máquinas
  g.maq('supino-reto-maquina', 'Supino reto na máquina', ['Supino máquina', 'Chest press', 'Supino sentado'], ['ombros', 'triceps'], 'i', [
    'Costas apoiadas no encosto, pegadas na altura do peito.', 'Empurre as manoplas até quase estender os cotovelos.', 'Volte devagar sem deixar a carga encostar.',
  ], 'Ajuste o banco para que as manoplas fiquem na altura do meio do peito.', { p: 'mach', art: 'chest_press' }),
  g.maq('supino-inclinado-articulado', 'Supino inclinado articulado', ['Supino inclinado na máquina', 'Incline chest press'], ['ombros', 'triceps'], 'i', [
    'Banco inclinado, costas apoiadas.', 'Empurre até quase estender os cotovelos.', 'Volte devagar sentindo o peito alongar.',
  ], 'Mantenha as escápulas encostadas no encosto.', { p: 'leg', step: 5, art: 'incline_press', legacy: 'ex-supino-inclinado' }),
  g.maq('supino-declinado-maquina', 'Supino declinado na máquina', ['Decline chest press'], ['triceps', 'ombros'], 'i', [
    'Sente com as costas apoiadas e as pegadas na altura da parte baixa do peito.', 'Empurre as manoplas até quase estender os cotovelos.', 'Retorne devagar controlando a carga.',
  ], 'Evite impulsionar o tronco: o peito deve conduzir o movimento.', { p: 'mach' }),
  g.maq('voador-peitoral', 'Voador', ['Crucifixo na máquina', 'Peck deck', 'Pec deck', 'Pec fly', 'Voador peitoral'], ['ombros'], 'i', [
    'Costas apoiadas, antebraços nos apoios.', 'Feche os braços à frente como num abraço.', 'Contraia o peito e volte devagar.',
  ], 'Regule o banco para os cotovelos ficarem na altura do peito.', { p: 'leg', step: 5, art: 'pec_fly', legacy: 'ex-voador' }),

  // ---- cabos
  g.pol('crossover-polia-alta', 'Crossover na polia alta', ['Cross over', 'Crucifixo no cabo', 'Cable crossover'], ['ombros'], 'm', [
    'Em pé entre as polias altas, segure as pegadas com os cotovelos levemente flexionados.', 'Traga as mãos para baixo e à frente, cruzando-as na altura do quadril.', 'Volte devagar abrindo os braços até sentir o peito alongar.',
  ], 'Incline o tronco levemente à frente e mantenha-o parado.', { p: 'iso', step: 2.5 }),
  g.pol('crossover-polia-baixa', 'Crossover na polia baixa', ['Crucifixo na polia baixa', 'Low cable fly'], ['ombros'], 'm', [
    'Em pé entre as polias baixas, segure as pegadas com os braços ao lado do corpo.', 'Suba as mãos em arco até se encontrarem na altura do peito.', 'Desça devagar controlando a carga.',
  ], 'Foca o peitoral superior; use carga moderada.', { p: 'iso', step: 2.5 }),
  g.pol('supino-polia-em-pe', 'Supino na polia em pé', ['Cable chest press', 'Press no cabo'], ['ombros', 'triceps'], 'm', [
    'Em pé, de costas para as polias, segure as pegadas na altura do peito com um pé à frente.', 'Empurre as mãos à frente até estender os braços.', 'Volte devagar sem deixar o tronco ser puxado.',
  ], 'Mantenha o abdômen firme para não girar o tronco.', { p: 'iso', step: 2.5 }),

  // ---- peso corporal / barras
  g.pc('flexao-de-bracos', 'Flexão de braço', ['Flexão', 'Apoio', 'Push-up', 'Flexão no solo'], ['triceps', 'ombros', 'abdomen-core'], 'i', [
    'Apoie as mãos no chão um pouco mais abertas que os ombros, corpo em linha reta.', 'Flexione os cotovelos até o peito ficar perto do chão.', 'Empurre o chão até estender os braços.',
  ], 'Contraia abdômen e glúteos para não deixar o quadril cair.', { p: 'bw', reps: 10 }),
  g.pc('flexao-joelhos-apoiados', 'Flexão com joelhos apoiados', ['Flexão facilitada', 'Knee push-up'], ['triceps', 'ombros'], 'i', [
    'Apoie mãos e joelhos no chão, corpo em linha da cabeça aos joelhos.', 'Flexione os cotovelos até o peito se aproximar do chão.', 'Empurre o chão voltando à posição inicial.',
  ], 'Boa progressão para chegar à flexão completa.', { p: 'bw', reps: 10 }),
  g.pc('flexao-inclinada', 'Flexão inclinada (mãos elevadas)', ['Flexão no banco', 'Incline push-up'], ['triceps', 'ombros'], 'i', [
    'Apoie as mãos em um banco ou barra, corpo em linha reta.', 'Flexione os cotovelos aproximando o peito do apoio.', 'Empurre até estender os braços.',
  ], 'Quanto mais alto o apoio, mais fácil o exercício.', { p: 'bw', reps: 12 }),
  g.pc('flexao-declinada', 'Flexão declinada (pés elevados)', ['Decline push-up'], ['ombros', 'triceps'], 'm', [
    'Apoie os pés em um banco e as mãos no chão, corpo em linha reta.', 'Flexione os cotovelos descendo o peito em direção ao chão.', 'Empurre até estender os braços.',
  ], 'Transfere mais carga para o peitoral superior e os ombros.', { p: 'bw', reps: 10 }),
  g.bf('mergulho-paralelas', 'Mergulho nas paralelas', ['Paralelas', 'Dips', 'Mergulho'], ['triceps', 'ombros'], 'a', [
    'Apoie-se nas barras paralelas com os braços estendidos e o tronco levemente inclinado à frente.', 'Flexione os cotovelos descendo até os ombros ficarem na altura dos cotovelos.', 'Empurre para cima até estender os braços.',
  ], 'Inclinar o tronco à frente enfatiza o peito; manter ereto enfatiza o tríceps.', { p: 'bw', reps: 8 }),
];
