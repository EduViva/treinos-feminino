import { grp } from './dsl.mjs';
const c = grp('abdomen-core');
const l = grp('lombar');

export default [
  // ================= ABDÔMEN / CORE — flexão de tronco
  c.pc('abdominal-curto-solo', 'Abdominal curto no solo', ['Abdominal supra', 'Crunch', 'Abdominal tradicional'], [], 'i', [
    'Deitada, joelhos dobrados, mãos leves atrás da cabeça.', 'Contraia o abdômen e eleve as escápulas do chão.', 'Desça devagar sem relaxar totalmente.',
  ], 'Não puxe o pescoço com as mãos: o movimento vem do abdômen.', { p: 'leg', sets: 1, reps: 20, rest: 45, bw: true, art: 'crunch', legacy: 'ex-abdominal-curto' }),
  c.pc('abdominal-infra-solo', 'Abdominal infra no solo', ['Elevação de quadril', 'Reverse crunch', 'Abdominal infra'], [], 'i', [
    'Deitada, joelhos dobrados sobre o quadril.', 'Contraia o abdômen e eleve o quadril do chão.', 'Desça devagar sem relaxar a barriga.',
  ], 'Evite balançar as pernas: use o abdômen para elevar o quadril.', { p: 'leg', sets: 1, reps: 20, rest: 45, bw: true, art: 'reverse_crunch', legacy: 'ex-abdominal-infra' }),
  c.pc('abdominal-completo', 'Abdominal completo (sit-up)', ['Sit-up', 'Abdominal com elevação de tronco'], ['quadriceps'], 'i', [
    'Deitada com os joelhos dobrados e os pés no chão (ou presos).', 'Eleve o tronco até ficar sentada, contraindo o abdômen.', 'Desça devagar até as costas tocarem o chão.',
  ], 'Evite puxar a cabeça; cruze os braços sobre o peito.', { p: 'core' }),
  c.pc('abdominal-canivete', 'Abdominal canivete (V-up)', ['V-up', 'Abdominal em V'], ['quadriceps'], 'm', [
    'Deite de costas com braços e pernas estendidos.', 'Eleve tronco e pernas ao mesmo tempo, tocando as mãos nos pés.', 'Desça devagar sem apoiar totalmente no chão.',
  ], 'Se for difícil, flexione os joelhos.', { p: 'core', reps: 12 }),
  c.pc('abdominal-bicicleta', 'Abdominal bicicleta', ['Bicycle crunch', 'Abdominal oblíquo bicicleta'], ['quadriceps'], 'i', [
    'Deitada, mãos atrás da cabeça e pernas elevadas.', 'Leve o cotovelo em direção ao joelho oposto enquanto estende a outra perna.', 'Alterne os lados de forma contínua e controlada.',
  ], 'Gire o tronco, não só os cotovelos.', { p: 'core', reps: 20 }),
  c.pc('abdominal-obliquo-cruzado', 'Abdominal oblíquo cruzado', ['Cross crunch', 'Abdominal cruzado'], [], 'i', [
    'Deitada, joelhos dobrados e um tornozelo apoiado no joelho oposto.', 'Eleve o tronco levando o cotovelo oposto em direção ao joelho.', 'Desça devagar e troque de lado.',
  ], 'Mantenha o movimento curto e controlado.', { p: 'core' }),
  c.pc('abdominal-declinado', 'Abdominal no banco declinado', ['Decline sit-up', 'Abdominal declinado'], ['quadriceps'], 'm', [
    'Deite no banco declinado com os pés presos.', 'Eleve o tronco contraindo o abdômen.', 'Desça devagar controlando o movimento.',
  ], 'Pode segurar uma anilha no peito para aumentar a carga.', { p: 'core', reps: 12 }),
  c.bol('abdominal-bola-suica', 'Abdominal na bola suíça', ['Crunch na bola', 'Stability ball crunch'], [], 'i', [
    'Deitada com a lombar apoiada na bola e os pés no chão.', 'Eleve o tronco contraindo o abdômen.', 'Desça alongando o abdômen sobre a bola.',
  ], 'A bola aumenta a amplitude do movimento.', { p: 'core' }),
  c.maq('abdominal-maquina', 'Abdominal na máquina', ['Crunch machine', 'Máquina de abdominal'], [], 'i', [
    'Sente com os pés apoiados e segure as pegadas junto ao peito.', 'Flexione o tronco contraindo o abdômen.', 'Volte devagar controlando a carga.',
  ], 'Evite puxar com os braços: o abdômen conduz.', { p: 'mach', reps: 15, step: 2.5 }),
  c.pol('abdominal-polia-ajoelhado', 'Abdominal na polia ajoelhada', ['Cable crunch', 'Abdominal na polia alta'], [], 'm', [
    'Ajoelhada de frente para a polia alta, segure a corda junto à cabeça.', 'Flexione o tronco levando os cotovelos em direção aos joelhos.', 'Volte devagar controlando o cabo.',
  ], 'O quadril fica parado: só o tronco se move.', { p: 'iso', reps: 15, step: 2.5 }),
  c.ani('abdominal-com-anilha', 'Abdominal com anilha', ['Weighted crunch', 'Abdominal com peso'], [], 'm', [
    'Deitada, joelhos dobrados e uma anilha apoiada no peito.', 'Eleve o tronco contraindo o abdômen.', 'Desça devagar.',
  ], 'Comece com uma anilha leve.', { p: 'core', reps: 12 }),

  // ---- elevação de pernas
  c.bf('elevacao-pernas-barra-fixa', 'Elevação de pernas na barra fixa', ['Hanging leg raise', 'Elevação de pernas suspensa'], ['quadriceps'], 'a', [
    'Pendurada na barra fixa com o corpo estendido.', 'Eleve as pernas retas até a altura do quadril ou mais.', 'Desça devagar sem balançar.',
  ], 'Se for difícil, faça com os joelhos dobrados.', { p: 'core', reps: 10 }),
  c.bf('elevacao-joelhos-barra-fixa', 'Elevação de joelhos na barra fixa', ['Hanging knee raise', 'Elevação de joelhos suspensa'], [], 'm', [
    'Pendurada na barra fixa com o corpo estendido.', 'Eleve os joelhos em direção ao peito contraindo o abdômen.', 'Desça devagar.',
  ], 'Incline levemente o quadril para trás no topo.', { p: 'core', reps: 12 }),
  c.maq('elevacao-pernas-cadeira-romana', 'Elevação de pernas na cadeira romana', ['Captain\'s chair', 'Elevação de pernas no apoio'], ['quadriceps'], 'i', [
    'Apoie os antebraços e as costas na cadeira romana, pernas pendentes.', 'Eleve os joelhos (ou pernas retas) em direção ao peito.', 'Desça devagar.',
  ], 'Boa opção para quem ainda não consegue pendurar na barra.', { p: 'core', reps: 12 }),
  c.pc('elevacao-pernas-deitada', 'Elevação de pernas deitada', ['Lying leg raise', 'Elevação de pernas no solo'], ['quadriceps'], 'm', [
    'Deite de costas com as pernas estendidas e as mãos sob o quadril.', 'Eleve as pernas até 90° mantendo a lombar no chão.', 'Desça devagar sem encostar no chão.',
  ], 'Se a lombar descolar do chão, flexione os joelhos.', { p: 'core', reps: 12 }),
  c.pc('abdominal-tesoura', 'Abdominal tesoura', ['Flutter kicks', 'Tesoura'], ['quadriceps'], 'm', [
    'Deite de costas com as pernas estendidas e elevadas a poucos centímetros do chão.', 'Alterne as pernas para cima e para baixo em movimentos curtos.', 'Mantenha a lombar apoiada no chão.',
  ], 'Quanto mais perto do chão, maior a dificuldade.', { p: 'time', reps: 30 }),

  // ---- estabilidade / isometria
  c.pc('prancha-abdominal', 'Prancha abdominal', ['Plank', 'Prancha frontal', 'Prancha'], ['ombros', 'gluteos'], 'i', [
    'Antebraços no chão, cotovelos sob os ombros.', 'Corpo em linha reta da cabeça aos calcanhares.', 'Contraia abdômen e glúteos e respire normalmente.',
  ], 'Não deixe o quadril subir nem cair.', { p: 'leg', sets: 1, reps: 30, rest: 45, unit: 'seg', bw: true, art: 'plank', legacy: 'ex-prancha' }),
  c.pc('prancha-lateral', 'Prancha lateral', ['Side plank', 'Prancha de lado'], ['ombros', 'gluteos'], 'm', [
    'Deite de lado apoiada no antebraço, cotovelo sob o ombro.', 'Eleve o quadril alinhando o corpo da cabeça aos pés.', 'Segure pelo tempo programado e troque de lado.',
  ], 'Mantenha o quadril alto e o corpo em linha.', { p: 'time', reps: 20 }),
  c.pc('prancha-toque-ombro', 'Prancha com toque no ombro', ['Plank shoulder tap'], ['ombros'], 'm', [
    'Em posição de prancha alta, mãos sob os ombros.', 'Toque um ombro com a mão oposta sem girar o quadril.', 'Alterne os lados de forma controlada.',
  ], 'Afaste mais os pés para ganhar estabilidade.', { p: 'core', reps: 16 }),
  c.sus('prancha-trx', 'Prancha na suspensão (TRX)', ['TRX plank', 'Prancha com TRX'], ['ombros'], 'a', [
    'Apoie os pés nas alças e as mãos (ou antebraços) no chão.', 'Mantenha o corpo em linha reta.', 'Segure pelo tempo programado.',
  ], 'A instabilidade das alças aumenta muito o trabalho do core.', { p: 'time', reps: 20 }),
  c.pc('dead-bug', 'Dead bug (inseto morto)', ['Dead bug', 'Inseto morto'], ['lombar'], 'i', [
    'Deite de costas com braços estendidos para cima e joelhos a 90°.', 'Estenda um braço e a perna oposta sem perder o contato da lombar com o chão.', 'Volte e alterne os lados.',
  ], 'Movimento lento; a lombar nunca descola do chão.', { p: 'core', reps: 12 }),
  c.pc('bird-dog', 'Bird dog', ['Cachorro-pássaro', 'Quadrúpede alternado'], ['lombar', 'gluteos'], 'i', [
    'Em quatro apoios, abdômen firme.', 'Estenda um braço e a perna oposta, alinhando com o tronco.', 'Volte devagar e alterne os lados.',
  ], 'Não gire o quadril: imagine um copo de água sobre as costas.', { p: 'core', reps: 12 }),
  c.pc('hollow-hold', 'Hollow hold (canoinha)', ['Hollow body', 'Canoinha'], [], 'm', [
    'Deite de costas com braços e pernas estendidos.', 'Eleve ombros e pernas do chão mantendo a lombar colada.', 'Segure pelo tempo programado.',
  ], 'Se a lombar descolar, flexione os joelhos.', { p: 'time', reps: 20 }),
  c.bol('stir-the-pot', 'Stir the pot (círculos na bola)', ['Stir the pot', 'Prancha na bola com círculos'], ['ombros'], 'a', [
    'Em prancha com os antebraços sobre a bola suíça.', 'Faça pequenos círculos com os antebraços sobre a bola.', 'Mantenha o corpo em linha reta.',
  ], 'Comece com círculos pequenos para manter o controle.', { p: 'time', reps: 20 }),
  c.pc('vacuum-abdominal', 'Vácuo abdominal', ['Stomach vacuum', 'Abdominal vácuo'], [], 'i', [
    'Em pé, quatro apoios ou deitada, expire todo o ar.', 'Puxe o umbigo em direção à coluna e mantenha.', 'Respire de forma curta sem soltar a contração.',
  ], 'Faça com o estômago vazio.', { p: 'time', reps: 20, sets: 3 }),
  c.pc('escalador', 'Escalador (mountain climber)', ['Mountain climber', 'Alpinista'], ['ombros', 'quadriceps'], 'm', [
    'Em posição de prancha alta, mãos sob os ombros.', 'Leve um joelho em direção ao peito e alterne rapidamente as pernas.', 'Mantenha o quadril baixo e o abdômen firme.',
  ], 'Em ritmo mais lento é um bom exercício de core; mais rápido vira cardio.', { p: 'time', reps: 30, type: 'funcional' }),

  // ---- rotação e anti-rotação
  c.pc('rotacao-russa', 'Rotação russa', ['Russian twist', 'Giro russo'], ['quadriceps'], 'm', [
    'Sentada com os joelhos dobrados, tronco inclinado para trás e pés elevados (ou apoiados).', 'Gire o tronco de um lado para o outro tocando as mãos no chão.', 'Mantenha o abdômen firme e a coluna reta.',
  ], 'Pode segurar uma anilha ou medicine ball para aumentar a carga.', { p: 'core', reps: 20 }),
  c.pol('lenhador-polia', 'Lenhador na polia', ['Woodchop', 'Cable woodchop', 'Rotação de tronco na polia'], ['ombros'], 'm', [
    'Em pé de lado para a polia alta, segure a pegada com as duas mãos.', 'Gire o tronco puxando a pegada em diagonal até o quadril oposto.', 'Volte devagar controlando o cabo.',
  ], 'A rotação vem do tronco, não dos braços.', { p: 'iso', reps: 12, step: 2.5 }),
  c.pol('pallof-press', 'Pallof press', ['Anti-rotação na polia', 'Pallof'], ['ombros'], 'm', [
    'Em pé de lado para a polia, segure a pegada junto ao peito.', 'Estenda os braços à frente resistindo à rotação do tronco.', 'Volte devagar e repita; troque de lado.',
  ], 'O objetivo é NÃO girar: mantenha ombros e quadril alinhados.', { p: 'iso', reps: 12, step: 2.5 }),
  c.hal('flexao-lateral-halter', 'Flexão lateral de tronco com halter', ['Side bend', 'Inclinação lateral com halter'], [], 'i', [
    'Em pé, segure um halter em uma mão ao lado do corpo.', 'Incline o tronco para o lado do halter.', 'Volte contraindo o oblíquo do lado oposto.',
  ], 'Use carga leve para não sobrecarregar a coluna.', { p: 'iso', reps: 15, step: 1 }),
  c.bf('dragon-flag', 'Dragon flag', ['Bandeira do dragão'], ['lombar'], 'a', [
    'Deitada em um banco, segure atrás da cabeça e eleve o corpo apoiada nos ombros.', 'Desça o corpo reto, controlando, sem tocar o banco.', 'Volte contraindo o abdômen.',
  ], 'Exercício muito avançado: domine a elevação de pernas antes.', { p: 'core', reps: 5 }),
  c.pc('l-sit', 'L-sit', ['Suspensão em L'], ['triceps', 'ombros'], 'a', [
    'Apoie as mãos no chão (ou paralelas) com os braços estendidos.', 'Eleve o quadril e as pernas estendidas à frente, formando um "L".', 'Segure pelo tempo programado.',
  ], 'Comece com os joelhos dobrados.', { p: 'time', reps: 10 }),
  c.out('roda-abdominal', 'Roda abdominal', ['Ab wheel', 'Ab roller', 'Rollout'], ['ombros', 'lombar'], 'a', [
    'Ajoelhada, segure a roda com os braços estendidos sob os ombros.', 'Role a roda à frente o máximo que conseguir mantendo a lombar firme.', 'Volte contraindo o abdômen.',
  ], 'Comece com amplitude curta; não deixe a lombar afundar.', { p: 'core', reps: 8 }),

  // ================= LOMBAR
  l.ban('hiperextensao-lombar', 'Hiperextensão lombar', ['Banco romano', 'Extensão lombar', 'Hyperextension', 'Back extension'], ['gluteos', 'posterior-coxa'], 'i', [
    'Apoie o quadril no banco romano com os pés presos e o tronco para baixo.', 'Eleve o tronco até alinhar com as pernas.', 'Desça devagar controlando.',
  ], 'Não hiperestenda a coluna no topo: pare quando o corpo estiver reto.', { p: 'bw', reps: 12 }),
  l.ban('hiperextensao-com-anilha', 'Hiperextensão lombar com anilha', ['Hyperextension com peso'], ['gluteos', 'posterior-coxa'], 'm', [
    'No banco romano, segure uma anilha junto ao peito.', 'Eleve o tronco até alinhar com as pernas.', 'Desça devagar controlando.',
  ], 'Comece sem carga antes de adicionar anilha.', { p: 'iso', reps: 12, step: 2.5 }),
  l.maq('extensao-lombar-maquina', 'Extensão lombar na máquina', ['Lower back machine', 'Cadeira lombar'], ['gluteos'], 'i', [
    'Sente com a lombar apoiada e os pés presos.', 'Empurre o encosto para trás estendendo o tronco.', 'Volte devagar controlando a carga.',
  ], 'Movimento curto, sem hiperestender a coluna.', { p: 'mach', reps: 12, step: 2.5 }),
  l.pc('superman', 'Superman', ['Extensão no solo', 'Elevação de tronco no solo', 'Back extension no solo'], ['gluteos', 'ombros'], 'i', [
    'Deite de bruços com os braços estendidos à frente.', 'Eleve braços, peito e pernas do chão ao mesmo tempo.', 'Segure 1 a 2 segundos e desça devagar.',
  ], 'Mantenha o pescoço neutro: olhe para o chão.', { p: 'bw', reps: 12 }),
  l.bol('extensao-lombar-bola', 'Extensão lombar na bola suíça', ['Back extension na bola'], ['gluteos'], 'i', [
    'Deite de bruços sobre a bola com os pés apoiados no chão.', 'Eleve o tronco até alinhar com as pernas.', 'Desça devagar.',
  ], 'Afaste mais os pés para ganhar estabilidade.', { p: 'bw', reps: 12 }),
  l.pc('extensao-lombar-alternada', 'Extensão alternada de braço e perna no solo', ['Superman alternado', 'Opposite arm leg raise'], ['gluteos'], 'i', [
    'Deite de bruços com os braços estendidos à frente.', 'Eleve um braço e a perna oposta ao mesmo tempo.', 'Desça devagar e alterne os lados.',
  ], 'Faça devagar, sem balançar o quadril.', { p: 'bw', reps: 12 }),

  c.sus('pike-trx', 'Pike no TRX', ['TRX pike', 'Abdominal pike na suspensão'], ['ombros'], 'a', [
    'Em posição de prancha com os pés nas alças do TRX.', 'Eleve o quadril em direção ao teto mantendo as pernas estendidas.', 'Volte devagar à posição de prancha.',
  ], 'Exige força de ombro e abdômen: comece com poucas repetições.', { p: 'core', reps: 8 }),
  c.pc('prancha-elevacao-perna', 'Prancha com elevação de perna', ['Plank leg lift', 'Prancha com perna elevada'], ['gluteos', 'lombar'], 'm', [
    'Em prancha, antebraços no chão e corpo alinhado.', 'Eleve uma perna estendida mantendo o quadril nivelado.', 'Desça e alterne as pernas.',
  ], 'Não gire o quadril ao subir a perna.', { p: 'core', reps: 12 }),
];
