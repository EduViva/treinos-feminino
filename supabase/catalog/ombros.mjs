import { grp } from './dsl.mjs';
const g = grp('ombros');

export default [
  // ---- desenvolvimento
  g.hal('desenvolvimento-halteres-sentado', 'Desenvolvimento com halteres sentado', ['Desenvolvimento', 'Shoulder press com halteres', 'Seated dumbbell press'], ['triceps'], 'm', [
    'Sente no banco com as costas apoiadas e os halteres na altura dos ombros.', 'Empurre os halteres para cima até quase estender os cotovelos.', 'Desça devagar até a altura das orelhas.',
  ], 'Não arqueie a lombar: mantenha o abdômen firme e as costas no encosto.', { p: 'mid', art: 'shoulder_press' }),
  g.hal('desenvolvimento-halteres-em-pe', 'Desenvolvimento com halteres em pé', ['Standing dumbbell press', 'Desenvolvimento em pé'], ['triceps', 'abdomen-core'], 'm', [
    'Em pé, com os halteres na altura dos ombros e os pés na largura do quadril.', 'Empurre os halteres para cima até estender os braços.', 'Desça devagar até os ombros.',
  ], 'Contraia glúteos e abdômen para não inclinar o tronco.', { p: 'mid' }),
  g.bar('desenvolvimento-barra-em-pe', 'Desenvolvimento militar com barra', ['Military press', 'Overhead press', 'Desenvolvimento com barra em pé'], ['triceps', 'abdomen-core'], 'a', [
    'Em pé, barra apoiada na frente dos ombros, mãos na largura dos ombros.', 'Empurre a barra para cima até estender os braços, passando a cabeça para trás da linha da barra.', 'Desça com controle até a parte alta do peito.',
  ], 'Contraia glúteos e abdômen; não arqueie a lombar.', { p: 'comp', reps: 8 }),
  g.bar('desenvolvimento-barra-sentado', 'Desenvolvimento com barra sentado', ['Seated barbell press'], ['triceps'], 'm', [
    'Sente com as costas apoiadas e a barra na altura dos ombros.', 'Empurre a barra para cima até estender os braços.', 'Desça devagar até a altura do queixo.',
  ], 'Use o encosto para proteger a lombar.', { p: 'comp', reps: 8 }),
  g.hal('desenvolvimento-arnold', 'Desenvolvimento Arnold', ['Arnold press'], ['triceps'], 'm', [
    'Sente com os halteres à frente do peito, palmas voltadas para você.', 'Suba os halteres girando as palmas para a frente até estender os braços.', 'Desça girando de volta à posição inicial.',
  ], 'Faça o giro de forma lenta e controlada.', { p: 'mid' }),
  g.maq('desenvolvimento-maquina', 'Desenvolvimento na máquina', ['Shoulder press na máquina', 'Desenvolvimento articulado'], ['triceps'], 'i', [
    'Costas apoiadas, pegadas na altura dos ombros.', 'Empurre para cima até quase estender os cotovelos.', 'Desça devagar até a altura das orelhas.',
  ], 'Ajuste o banco para as pegadas ficarem na altura dos ombros.', { p: 'leg', step: 5, art: 'shoulder_press_machine', legacy: 'ex-desenv-maq' }),
  g.smi('desenvolvimento-smith', 'Desenvolvimento no Smith', ['Smith shoulder press'], ['triceps'], 'i', [
    'Sente com as costas apoiadas e a barra na altura do queixo.', 'Empurre a barra para cima até quase estender os braços.', 'Desça devagar até o queixo.',
  ], 'Posicione o banco de modo que a barra suba em linha com a testa.', { p: 'mid', step: 2.5 }),
  g.kb('desenvolvimento-kettlebell', 'Desenvolvimento com kettlebell', ['Kettlebell press', 'Press com kettlebell'], ['triceps', 'abdomen-core'], 'm', [
    'Em pé, kettlebell na altura do ombro com o cotovelo junto ao corpo.', 'Empurre o kettlebell para cima até estender o braço.', 'Desça devagar até o ombro e troque de lado.',
  ], 'O pulso deve ficar reto e o abdômen firme.', { p: 'mid', step: 4 }),
  g.bar('landmine-press', 'Landmine press', ['Press com barra no canto', 'Landmine'], ['peitoral', 'triceps'], 'm', [
    'Prenda uma ponta da barra no canto e segure a outra na altura do ombro.', 'Empurre a barra para cima e à frente até estender o braço.', 'Volte devagar até o ombro.',
  ], 'Ótimo para ombros sensíveis: a trajetória é mais natural.', { p: 'mid' }),

  // ---- elevações
  g.hal('elevacao-lateral-halteres', 'Elevação lateral com halteres', ['Elevação lateral', 'Lateral raise'], [], 'i', [
    'Halteres ao lado do corpo, cotovelos levemente flexionados.', 'Eleve os braços até a altura dos ombros.', 'Sem balançar o tronco; desça devagar.',
  ], 'Suba até a altura dos ombros, sem passar disso.', { p: 'leg', step: 1, art: 'lateral_raise', legacy: 'ex-elev-lateral' }),
  g.pol('elevacao-lateral-polia', 'Elevação lateral na polia', ['Cable lateral raise', 'Elevação lateral no cabo'], [], 'm', [
    'Em pé de lado para a polia baixa, segure a pegada com a mão mais distante.', 'Eleve o braço lateralmente até a altura do ombro.', 'Desça devagar mantendo a tensão do cabo.',
  ], 'O cabo mantém tensão constante, inclusive no início do movimento.', { p: 'iso', step: 1 }),
  g.maq('elevacao-lateral-maquina', 'Elevação lateral na máquina', ['Lateral raise machine'], [], 'i', [
    'Sente com os braços sob as almofadas na altura dos cotovelos.', 'Eleve os braços lateralmente até a altura dos ombros.', 'Desça devagar controlando a carga.',
  ], 'Empurre com os cotovelos, não com as mãos.', { p: 'mach', step: 2.5 }),
  g.ela('elevacao-lateral-elastico', 'Elevação lateral com elástico', ['Lateral raise com elástico'], [], 'i', [
    'Pise no elástico e segure as pontas ao lado do corpo.', 'Eleve os braços lateralmente até a altura dos ombros.', 'Desça devagar mantendo a tensão.',
  ], 'Boa opção para treinar em casa.', { p: 'light' }),
  g.bar('elevacao-frontal-barra', 'Elevação frontal com barra', ['Front raise com barra'], ['peitoral'], 'i', [
    'Barra à frente das coxas, braços estendidos.', 'Eleve a barra à frente até a altura dos ombros.', 'Tronco firme; desça devagar.',
  ], 'Evite usar o impulso do tronco para subir a carga.', { p: 'leg', sets: 3, step: 2, art: 'front_raise', legacy: 'ex-elev-frontal' }),
  g.hal('elevacao-frontal-halteres', 'Elevação frontal com halteres', ['Front raise com halteres', 'Dumbbell front raise'], ['peitoral'], 'i', [
    'Em pé, halteres à frente das coxas com as palmas voltadas para você.', 'Eleve um braço de cada vez até a altura do ombro.', 'Desça devagar alternando os braços.',
  ], 'Alterne os braços para evitar balançar o tronco.', { p: 'iso', step: 1 }),
  g.pol('elevacao-frontal-polia', 'Elevação frontal na polia', ['Cable front raise', 'Elevação frontal com corda'], ['peitoral'], 'm', [
    'De costas para a polia baixa, segure a corda entre as pernas.', 'Eleve os braços à frente até a altura dos ombros.', 'Desça devagar mantendo a tensão.',
  ], 'Mantenha o tronco firme, sem recuar.', { p: 'iso', step: 2.5 }),
  g.ani('elevacao-frontal-anilha', 'Elevação frontal com anilha', ['Plate raise', 'Front raise com anilha'], ['peitoral'], 'i', [
    'Em pé, segure uma anilha com as duas mãos à frente das coxas.', 'Eleve a anilha à frente até a altura dos olhos.', 'Desça devagar controlando o peso.',
  ], 'Mantenha os cotovelos levemente flexionados.', { p: 'iso', step: 1 }),

  // ---- deltoide posterior e manguito
  g.hal('crucifixo-inverso-halteres', 'Crucifixo inverso com halteres', ['Elevação posterior', 'Reverse fly', 'Bent-over lateral raise'], ['costas'], 'm', [
    'Incline o tronco à frente com a coluna reta e os halteres pendurados.', 'Abra os braços lateralmente até a altura dos ombros.', 'Desça devagar controlando o peso.',
  ], 'Use carga leve e mantenha o pescoço alinhado com a coluna.', { p: 'iso', step: 1 }),
  g.pol('crucifixo-inverso-polia', 'Crucifixo inverso na polia', ['Reverse cable fly', 'Cabo cruzado posterior'], ['costas'], 'm', [
    'Em pé entre as polias altas, segure cada pegada com a mão oposta (cabos cruzados).', 'Abra os braços para trás até a altura dos ombros.', 'Volte devagar sem soltar a tensão.',
  ], 'Pensa em "abrir" os braços, não em puxar para trás.', { p: 'iso', step: 2.5 }),
  g.pol('face-pull-corda', 'Face pull com corda', ['Face pull', 'Puxada para o rosto'], ['costas', 'biceps'], 'm', [
    'Corda na altura do rosto, braços estendidos.', 'Puxe em direção ao rosto abrindo os cotovelos.', 'Cotovelos altos, escápulas juntas; volte devagar.',
  ], 'Excelente para postura e saúde dos ombros; use carga leve.', { p: 'leg', step: 2.5, art: 'face_pull', legacy: 'ex-face-pull' }),
  g.pol('remada-alta-polia', 'Remada alta na polia', ['Remada alta', 'Upright row no cabo'], ['costas', 'biceps'], 'm', [
    'Em pé, barra à frente das coxas.', 'Suba a barra rente ao corpo, cotovelos para cima.', 'Até a altura dos ombros, sem encolher o pescoço; desça devagar.',
  ], 'Se sentir desconforto nos ombros, reduza a amplitude.', { p: 'leg', step: 2.5, art: 'upright_row', legacy: 'ex-remada-alta' }),
  g.bar('remada-alta-barra', 'Remada alta com barra', ['Upright row', 'Remada alta com barra W'], ['costas', 'biceps'], 'm', [
    'Em pé, barra à frente das coxas com pegada na largura dos ombros.', 'Suba a barra rente ao corpo até a altura do peito, cotovelos acima das mãos.', 'Desça devagar.',
  ], 'Não suba além da linha do peito para poupar os ombros.', { p: 'mid' }),
  g.hal('remada-alta-halteres', 'Remada alta com halteres', ['Dumbbell upright row'], ['costas', 'biceps'], 'm', [
    'Em pé, halteres à frente das coxas com as palmas voltadas para o corpo.', 'Suba os halteres rente ao corpo, cotovelos para cima.', 'Desça devagar controlando o peso.',
  ], 'Mantenha os cotovelos mais altos que as mãos.', { p: 'mid', step: 1 }),
  g.pol('rotacao-externa-polia', 'Rotação externa na polia', ['Rotação externa com cabo', 'Cable external rotation'], ['costas'], 'i', [
    'De lado para a polia na altura do cotovelo, cotovelo junto ao corpo flexionado a 90°.', 'Gire o antebraço para fora, afastando a mão da barriga.', 'Volte devagar controlando a tensão.',
  ], 'Exercício de manguito rotador: use cargas bem leves.', { p: 'light', step: 1 }),
  g.hal('rotacao-externa-halter-deitado', 'Rotação externa com halter deitado de lado', ['Side-lying external rotation'], ['costas'], 'i', [
    'Deite de lado com o cotovelo flexionado a 90° apoiado junto ao corpo, halter na mão de cima.', 'Gire o antebraço para cima, abrindo o ombro.', 'Desça devagar até a posição inicial.',
  ], 'Use 1 a 3 kg: o movimento é pequeno e preciso.', { p: 'light', step: 0.5 }),
  g.hal('elevacao-y', 'Elevação em Y', ['Y raise', 'Y-raise com halteres'], ['costas'], 'm', [
    'Deite de bruços no banco inclinado com os braços pendentes segurando halteres leves.', 'Eleve os braços em "Y" acima da cabeça com os polegares para cima.', 'Desça devagar.',
  ], 'Trabalha a parte inferior do trapézio e os estabilizadores da escápula.', { p: 'light', step: 0.5 }),

  // ---- trapézio
  g.hal('encolhimento-halteres', 'Encolhimento com halteres', ['Encolhimento de ombros', 'Shrug', 'Dumbbell shrug'], ['costas'], 'i', [
    'Em pé, halteres ao lado do corpo e os braços estendidos.', 'Eleve os ombros em direção às orelhas.', 'Segure 1 segundo no topo e desça devagar.',
  ], 'Suba os ombros reto, sem girá-los.', { p: 'mid', step: 2 }),
  g.bar('encolhimento-barra', 'Encolhimento com barra', ['Barbell shrug'], ['costas'], 'i', [
    'Em pé, segure a barra à frente das coxas com pegada na largura dos ombros.', 'Eleve os ombros em direção às orelhas.', 'Desça devagar mantendo os braços estendidos.',
  ], 'Evite girar os ombros: o movimento é só para cima e para baixo.', { p: 'mid', step: 2.5 }),
  g.smi('encolhimento-smith', 'Encolhimento no Smith', ['Smith shrug'], ['costas'], 'i', [
    'Em pé, segure a barra do Smith à frente das coxas.', 'Eleve os ombros em direção às orelhas.', 'Desça devagar.',
  ], 'Mantenha o pescoço relaxado e a postura ereta.', { p: 'mid', step: 2.5 }),
  g.maq('encolhimento-maquina', 'Encolhimento na máquina', ['Shrug machine'], ['costas'], 'i', [
    'Segure as pegadas da máquina com os braços estendidos.', 'Eleve os ombros em direção às orelhas.', 'Desça devagar controlando a carga.',
  ], 'Boa opção para cargas altas com segurança.', { p: 'mach' }),

  // ---- peso corporal / funcionais de ombro
  g.pc('flexao-pike', 'Flexão pike', ['Pike push-up', 'Flexão em V invertido'], ['triceps', 'peitoral'], 'm', [
    'Apoie mãos e pés no chão com o quadril alto, formando um "V" invertido.', 'Flexione os cotovelos descendo a cabeça em direção ao chão.', 'Empurre até estender os braços.',
  ], 'Quanto mais vertical o tronco, mais o ombro trabalha.', { p: 'bw', reps: 8 }),
  g.pc('flexao-parada-de-mao', 'Flexão em parada de mão na parede', ['Handstand push-up', 'Parada de mão'], ['triceps', 'abdomen-core'], 'a', [
    'Em posição de parada de mão com os pés apoiados na parede.', 'Flexione os cotovelos descendo a cabeça em direção ao chão.', 'Empurre até estender os braços.',
  ], 'Exercício avançado: domine a flexão pike antes de tentar.', { p: 'bw', reps: 5, rest: 90 }),
  g.bar('push-press', 'Push press', ['Desenvolvimento com impulso', 'Push press com barra'], ['triceps', 'quadriceps'], 'a', [
    'Em pé, barra apoiada na frente dos ombros.', 'Flexione levemente os joelhos e estenda-os com força, empurrando a barra para cima.', 'Receba a barra com os braços estendidos e desça com controle.',
  ], 'A força vem das pernas; os braços finalizam o movimento.', { p: 'comp', reps: 6, type: 'funcional' }),

  g.hal('desenvolvimento-unilateral-halter', 'Desenvolvimento unilateral com halter', ['Single arm dumbbell press', 'Press unilateral'], ['triceps', 'abdomen-core'], 'm', [
    'Em pé ou sentada, halter na altura do ombro de um braço.', 'Empurre o halter para cima até estender o braço.', 'Desça devagar e troque de lado.',
  ], 'Mantenha o abdômen firme para não inclinar o tronco.', { p: 'mid', step: 1 }),
];
