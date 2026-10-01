import { grp } from './dsl.mjs';
const g = grp('costas');

export default [
  // ---- puxadas
  g.pol('puxada-alta-polia', 'Puxada alta na polia', ['Puxada frontal', 'Pulldown', 'Puxada na frente', 'Lat pulldown'], ['biceps', 'ombros'], 'i', [
    'Sente com as coxas presas sob o apoio e segure a barra com pegada um pouco mais larga que os ombros.', 'Puxe a barra até a altura do peito levando os cotovelos para baixo e para trás.', 'Volte devagar até estender os braços.',
  ], 'Evite balançar o tronco: puxe com as costas, não com os braços.', { p: 'mach', art: 'lat_pulldown' }),
  g.pol('puxada-fechada-supinada', 'Puxada fechada pegada supinada', ['Puxada supinada', 'Chin-down', 'Puxada fechada'], ['biceps', 'ombros'], 'i', [
    'Pegada fechada com as palmas voltadas para você.', 'Puxe a barra até o peito levando os cotovelos para baixo.', 'Aperte as escápulas e volte devagar.',
  ], 'A pegada supinada envolve mais o bíceps; use carga que permita controlar a descida.', { p: 'leg', step: 5, art: 'lat_pulldown_supine', legacy: 'ex-puxada-supinada' }),
  g.pol('puxada-pegada-neutra', 'Puxada com pegada neutra (triângulo)', ['Puxada triângulo', 'Neutral grip pulldown'], ['biceps', 'ombros'], 'i', [
    'Sente com as coxas presas e segure o triângulo com as palmas voltadas uma para a outra.', 'Puxe até o triângulo chegar à parte alta do peito.', 'Volte devagar estendendo os braços.',
  ], 'Mantenha o peito aberto e o olhar à frente.', { p: 'mach' }),
  g.pol('puxada-unilateral-polia', 'Puxada unilateral na polia', ['Single arm pulldown', 'Puxada com um braço'], ['biceps', 'ombros'], 'm', [
    'Sente de frente para a polia alta e segure a pegada com uma mão.', 'Puxe o cotovelo para baixo e para trás até a lateral do tronco.', 'Volte devagar alongando as costas.',
  ], 'Mantenha os ombros nivelados: não deixe o tronco girar.', { p: 'iso', step: 2.5 }),
  g.pol('pulldown-bracos-estendidos', 'Puxada com braços estendidos na polia', ['Pullover na polia', 'Straight arm pulldown', 'Pulldown com corda'], ['peitoral', 'triceps'], 'm', [
    'Em pé de frente para a polia alta, segure a barra ou a corda com os braços quase estendidos.', 'Leve as mãos para baixo, em arco, até as coxas.', 'Volte devagar sentindo as costas alongarem.',
  ], 'Mantenha os cotovelos quase retos: o movimento nasce no ombro, não no cotovelo.', { p: 'iso', step: 2.5 }),
  g.bf('barra-fixa-pronada', 'Barra fixa pegada pronada', ['Barra fixa', 'Pull-up'], ['biceps', 'ombros', 'abdomen-core'], 'a', [
    'Segure a barra com as palmas para a frente, mãos mais abertas que os ombros.', 'Puxe o corpo até o queixo passar da barra.', 'Desça devagar até estender os braços.',
  ], 'Evite balançar as pernas; contraia as escápulas antes de puxar.', { p: 'bw', reps: 6, rest: 90 }),
  g.bf('barra-fixa-supinada', 'Barra fixa pegada supinada', ['Chin-up', 'Barra fixa supinada'], ['biceps', 'ombros'], 'a', [
    'Segure a barra com as palmas voltadas para você, mãos na largura dos ombros.', 'Puxe o corpo até o queixo passar da barra.', 'Desça devagar até estender os braços.',
  ], 'É a variação mais fácil para começar; envolve bastante o bíceps.', { p: 'bw', reps: 6, rest: 90 }),
  g.bf('barra-fixa-pegada-neutra', 'Barra fixa pegada neutra', ['Pull-up neutro', 'Barra fixa paralela'], ['biceps', 'ombros'], 'a', [
    'Segure as pegadas paralelas com as palmas voltadas uma para a outra.', 'Puxe o corpo até o queixo ficar na altura das mãos.', 'Desça devagar até estender os braços.',
  ], 'Costuma ser mais confortável para punhos e ombros.', { p: 'bw', reps: 6, rest: 90 }),
  g.maq('barra-fixa-assistida', 'Barra fixa assistida na máquina', ['Graviton', 'Pull-up assistido', 'Assisted pull-up'], ['biceps', 'ombros'], 'i', [
    'Ajuste o contrapeso e apoie os joelhos (ou pés) na plataforma.', 'Puxe o corpo até o queixo passar das pegadas.', 'Desça devagar até estender os braços.',
  ], 'Quanto MAIOR o contrapeso, mais fácil; reduza aos poucos conforme evoluir.', { p: 'mach', bw: false }),
  g.ela('puxada-elastico', 'Puxada com elástico', ['Pulldown com elástico', 'Resistance band pulldown'], ['biceps', 'ombros'], 'i', [
    'Prenda o elástico no alto e segure as pontas com os braços estendidos.', 'Puxe as mãos até a altura do peito levando os cotovelos para baixo.', 'Volte devagar controlando a tensão.',
  ], 'Bom para treinar em casa ou como aquecimento.', { p: 'light' }),

  // ---- remadas na polia / máquina
  g.pol('remada-sentada-polia', 'Remada sentada na polia', ['Remada baixa', 'Remada no cabo', 'Seated cable row'], ['biceps', 'ombros'], 'i', [
    'Sente com os pés apoiados e os joelhos levemente flexionados, segurando o triângulo.', 'Puxe até o abdômen levando os cotovelos para trás rente ao corpo.', 'Volte devagar estendendo os braços sem arredondar as costas.',
  ], 'Mantenha o tronco ereto: não use o balanço do corpo para puxar.', { p: 'mach', art: 'seated_row' }),
  g.pol('remada-pegada-aberta-polia', 'Remada na polia com pegada aberta', ['Remada pronada no cabo', 'Wide grip cable row'], ['ombros', 'biceps'], 'm', [
    'Sente com os pés apoiados e segure a barra reta com as mãos bem abertas.', 'Puxe a barra até a parte baixa do peito, abrindo os cotovelos.', 'Volte devagar estendendo os braços.',
  ], 'Foca a parte superior das costas e as escápulas.', { p: 'mach' }),
  g.pol('remada-unilateral-polia', 'Remada unilateral na polia baixa', ['Single arm cable row', 'Remada com um braço na polia'], ['biceps', 'ombros'], 'm', [
    'Sente de frente para a polia baixa e segure a pegada com uma mão.', 'Puxe o cotovelo para trás rente ao corpo.', 'Volte devagar, alongando as costas.',
  ], 'Mantenha o tronco estável, sem girar.', { p: 'iso', step: 2.5 }),
  g.maq('serrote-na-maquina', 'Serrote na máquina', ['Remada unilateral na máquina', 'Remada articulada unilateral'], ['biceps', 'ombros'], 'i', [
    'Peito apoiado, um braço de cada vez.', 'Puxe o cotovelo para trás rente ao corpo.', 'Aperte a escápula e volte devagar.',
  ], 'Ajuste o apoio do peito para que os braços possam estender por completo.', { p: 'leg', step: 5, art: 'one_arm_row', legacy: 'ex-serrote-maq' }),
  g.maq('remada-maquina-neutra', 'Remada na máquina com apoio no peito', ['Remada articulada', 'Chest supported row machine', 'Remada máquina'], ['biceps', 'ombros'], 'i', [
    'Apoie o peito no suporte e segure as pegadas neutras.', 'Puxe os cotovelos para trás apertando as escápulas.', 'Volte devagar sem soltar a carga.',
  ], 'O apoio no peito protege a lombar: foque em puxar com as costas.', { p: 'mach' }),
  g.maq('remada-alta-maquina', 'Remada alta na máquina', ['High row', 'Remada articulada alta'], ['ombros', 'biceps'], 'i', [
    'Sente com o peito apoiado e segure as pegadas acima da linha do peito.', 'Puxe os cotovelos para trás e para baixo.', 'Volte devagar estendendo os braços.',
  ], 'Trabalha a parte alta das costas e a região entre as escápulas.', { p: 'mach' }),
  g.maq('voador-invertido', 'Voador invertido', ['Crucifixo invertido na máquina', 'Reverse pec deck', 'Reverse fly na máquina'], ['ombros', 'triceps'], 'i', [
    'Peito apoiado no encosto, braços à frente.', 'Abra os braços para trás levando os cotovelos para fora.', 'Aperte as escápulas e volte devagar.',
  ], 'Evite encolher os ombros: mantenha-os baixos.', { p: 'leg', step: 5, art: 'reverse_fly', legacy: 'ex-voador-invertido' }),

  // ---- remadas livres
  g.bar('remada-curvada-barra', 'Remada curvada com barra', ['Remada curvada', 'Bent-over row', 'Remada barra'], ['biceps', 'lombar', 'ombros'], 'm', [
    'Em pé, com os joelhos levemente flexionados, incline o tronco à frente com a coluna reta e segure a barra.', 'Puxe a barra em direção ao abdômen levando os cotovelos para trás.', 'Desça devagar estendendo os braços.',
  ], 'Mantenha a coluna neutra o tempo todo; se arredondar, reduza a carga.', { p: 'comp' }),
  g.bar('remada-curvada-supinada', 'Remada curvada supinada', ['Yates row', 'Remada supinada com barra'], ['biceps', 'lombar'], 'm', [
    'Incline o tronco à frente com a coluna reta e segure a barra com as palmas para cima.', 'Puxe a barra até o abdômen.', 'Desça devagar controlando a carga.',
  ], 'A pegada supinada envolve mais o bíceps e a parte baixa das costas.', { p: 'comp' }),
  g.bar('remada-pendlay', 'Remada Pendlay', ['Pendlay row'], ['lombar', 'biceps'], 'a', [
    'Com o tronco paralelo ao chão, segure a barra apoiada no solo.', 'Puxe a barra explosivamente até o abdômen.', 'Devolva a barra ao chão a cada repetição.',
  ], 'Cada repetição começa do zero, com o tronco imóvel.', { p: 'comp', reps: 6 }),
  g.bar('remada-cavalinho', 'Remada cavalinho (T-bar)', ['Remada T', 'T-bar row', 'Cavalinho'], ['biceps', 'lombar', 'ombros'], 'm', [
    'Posicione-se sobre a barra T, tronco inclinado e coluna reta.', 'Puxe a carga em direção ao peito.', 'Desça devagar estendendo os braços.',
  ], 'Evite impulsionar com a lombar; mantenha o quadril fixo.', { p: 'comp' }),
  g.hal('remada-unilateral-halter', 'Serrote com halter', ['Remada unilateral com halter', 'One-arm dumbbell row', 'Remada serrote'], ['biceps', 'ombros'], 'i', [
    'Apoie joelho e mão do mesmo lado em um banco, com a coluna reta e o halter na outra mão.', 'Puxe o halter em direção ao quadril levando o cotovelo para trás.', 'Desça devagar estendendo o braço.',
  ], 'Evite girar o tronco: só o braço se move.', { p: 'mid' }),
  g.hal('remada-curvada-halteres', 'Remada curvada com halteres', ['Bent-over dumbbell row', 'Remada com halteres'], ['biceps', 'lombar'], 'm', [
    'Em pé, incline o tronco à frente com a coluna reta e um halter em cada mão.', 'Puxe os halteres em direção ao quadril.', 'Desça devagar estendendo os braços.',
  ], 'Mantenha o pescoço alinhado com a coluna.', { p: 'mid' }),
  g.hal('remada-apoiada-banco-halteres', 'Remada apoiada no banco inclinado com halteres', ['Chest supported dumbbell row', 'Remada deitada no banco inclinado'], ['biceps', 'ombros'], 'i', [
    'Deite de bruços sobre o banco inclinado com um halter em cada mão.', 'Puxe os halteres levando os cotovelos para trás.', 'Desça devagar estendendo os braços.',
  ], 'O apoio do peito evita o uso da lombar: ótimo para focar as costas.', { p: 'mid' }),
  g.smi('remada-smith', 'Remada curvada no Smith', ['Smith row', 'Remada no Smith'], ['biceps', 'lombar'], 'm', [
    'Incline o tronco à frente com a coluna reta e segure a barra do Smith.', 'Puxe a barra em direção ao abdômen.', 'Desça devagar estendendo os braços.',
  ], 'A trajetória fixa ajuda a focar o movimento; mantenha a coluna neutra.', { p: 'mid', step: 2.5 }),
  g.bar('remada-invertida', 'Remada invertida', ['Remada australiana', 'Inverted row', 'Remada na barra baixa'], ['biceps', 'ombros', 'abdomen-core'], 'm', [
    'Deite sob uma barra baixa e segure-a com as mãos na largura dos ombros, corpo reto.', 'Puxe o peito em direção à barra.', 'Desça devagar estendendo os braços.',
  ], 'Quanto mais horizontal o corpo, mais difícil.', { p: 'bw' }),
  g.sus('remada-trx', 'Remada na suspensão (TRX)', ['TRX row', 'Remada com TRX'], ['biceps', 'ombros', 'abdomen-core'], 'i', [
    'Segure as alças em pé, incline o corpo para trás com os braços estendidos.', 'Puxe o peito em direção às mãos levando os cotovelos para trás.', 'Volte devagar estendendo os braços.',
  ], 'Quanto mais inclinado para trás, maior a dificuldade.', { p: 'bw' }),
  g.ela('remada-elastico', 'Remada com elástico', ['Resistance band row', 'Remada sentada com elástico'], ['biceps', 'ombros'], 'i', [
    'Sentada com as pernas estendidas, passe o elástico pelos pés e segure as pontas.', 'Puxe as mãos em direção ao abdômen levando os cotovelos para trás.', 'Volte devagar controlando a tensão.',
  ], 'Mantenha o tronco ereto durante todo o movimento.', { p: 'light' }),

  // ---- levantamentos
  g.bar('levantamento-terra', 'Levantamento terra', ['Terra', 'Deadlift', 'Levantamento terra convencional'], ['posterior-coxa', 'gluteos', 'lombar'], 'a', [
    'Pés na largura do quadril, barra sobre o meio dos pés; segure a barra logo fora das pernas.', 'Estenda quadril e joelhos mantendo a coluna reta, subindo a barra rente às pernas.', 'Desça a barra com controle, empurrando o quadril para trás.',
  ], 'Coluna sempre neutra; aprenda o movimento com carga leve antes de progredir.', { p: 'comp', reps: 6, rest: 150 }),
  g.bar('levantamento-terra-sumo', 'Levantamento terra sumô', ['Terra sumô', 'Sumo deadlift'], ['gluteos', 'posterior-coxa', 'adutores'], 'a', [
    'Pés bem afastados com as pontas para fora, mãos entre as pernas segurando a barra.', 'Estenda quadril e joelhos mantendo o peito aberto.', 'Desça a barra com controle até o chão.',
  ], 'Empurre os joelhos para fora, na direção dos pés.', { p: 'comp', reps: 6, rest: 150 }),
  g.bar('levantamento-terra-trap-bar', 'Levantamento terra com barra hexagonal', ['Trap bar deadlift', 'Terra com trap bar', 'Hex bar deadlift'], ['quadriceps', 'gluteos', 'lombar'], 'm', [
    'Entre na barra hexagonal com os pés na largura do quadril e segure as pegadas laterais.', 'Estenda quadril e joelhos mantendo a coluna reta.', 'Desça com controle até a barra tocar o chão.',
  ], 'Variação mais amigável à lombar que o terra convencional.', { p: 'comp', reps: 6, rest: 150 }),
  g.bar('rack-pull', 'Rack pull (terra parcial)', ['Puxada no rack', 'Rack pull'], ['lombar', 'gluteos', 'ombros'], 'a', [
    'Ajuste a barra no rack na altura do joelho e segure-a com as mãos na largura dos ombros.', 'Estenda quadril e joelhos mantendo a coluna reta.', 'Desça com controle até a posição inicial.',
  ], 'Permite cargas altas com amplitude reduzida; cuide da postura.', { p: 'comp', reps: 6, rest: 150 }),

  g.maq('pullover-maquina', 'Pullover na máquina', ['Pullover machine', 'Pulldown articulado'], ['triceps', 'peitoral'], 'i', [
    'Sente com os cotovelos apoiados nas almofadas e segure as pegadas.', 'Leve os cotovelos para baixo e à frente até a altura do quadril.', 'Volte devagar alongando as costas.',
  ], 'Mantenha o peito aberto e evite encolher os ombros.', { p: 'mach' }),
  g.maq('puxada-articulada-maquina', 'Puxada articulada na máquina', ['Lat pulldown machine', 'Puxada na máquina'], ['biceps', 'ombros'], 'i', [
    'Sente com o peito apoiado e segure as pegadas acima da cabeça.', 'Puxe as pegadas para baixo levando os cotovelos ao lado do corpo.', 'Volte devagar estendendo os braços.',
  ], 'Cada braço trabalha de forma independente, corrigindo desequilíbrios.', { p: 'mach' }),
];
