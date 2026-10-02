import { grp } from './dsl.mjs';
const c = grp('cardio');
const f = grp('funcional');

export default [
  // ================= CARDIO (aparelhos)
  c.car('esteira', 'Esteira', ['Esteira (caminhada ou corrida)', 'Treadmill', 'Caminhada na esteira', 'Corrida na esteira'], ['quadriceps', 'panturrilhas'], 'i', [
    'Comece devagar e aumente a velocidade aos poucos.', 'Postura ereta, olhar à frente, braços acompanhando o passo.', 'Termine reduzindo o ritmo para recuperar a respiração.',
  ], 'Evite segurar nas barras laterais: isso reduz o gasto e prejudica a postura.', { p: 'cardio', art: 'treadmill', legacy: 'ex-esteira' }),
  c.car('caminhada-inclinada-esteira', 'Caminhada inclinada na esteira', ['Incline walk', 'Esteira inclinada', 'Caminhada com inclinação'], ['gluteos', 'panturrilhas'], 'i', [
    'Ajuste a inclinação entre 6% e 12% e uma velocidade confortável (4 a 6 km/h).', 'Caminhe com postura ereta, sem se apoiar nas barras.', 'Termine reduzindo a inclinação e a velocidade.',
  ], 'Boa alternativa de baixo impacto para elevar a frequência cardíaca.', { p: 'cardio', reps: 25 }),
  c.car('intervalado-esteira', 'Intervalado na esteira (HIIT)', ['HIIT esteira', 'Tiros na esteira', 'Treino intervalado'], ['quadriceps', 'panturrilhas'], 'a', [
    'Aqueça por 5 minutos em ritmo leve.', 'Alterne 30 segundos de corrida forte com 60 a 90 segundos de caminhada.', 'Repita os ciclos e finalize com 5 minutos de desaceleração.',
  ], 'Comece com poucos ciclos e aumente aos poucos.', { p: 'cardio', reps: 20 }),
  c.car('bicicleta-ergometrica', 'Bicicleta ergométrica', ['Bike', 'Bicicleta vertical', 'Bike ergométrica', 'Stationary bike'], ['quadriceps', 'gluteos', 'panturrilhas'], 'i', [
    'Ajuste o banco para o joelho ficar levemente flexionado no ponto mais baixo.', 'Pedale em ritmo constante, ajustando a resistência.', 'Termine reduzindo a resistência gradualmente.',
  ], 'Mantenha as costas retas e os ombros relaxados.', { p: 'cardio' }),
  c.car('bicicleta-horizontal', 'Bicicleta ergométrica horizontal', ['Bike reclinada', 'Recumbent bike'], ['quadriceps', 'gluteos'], 'i', [
    'Ajuste o assento para as pernas ficarem quase estendidas no pedal.', 'Pedale em ritmo constante, ajustando a resistência.', 'Termine reduzindo a resistência aos poucos.',
  ], 'Boa opção para quem tem desconforto na lombar ou nos joelhos.', { p: 'cardio' }),
  c.car('spinning', 'Spinning (bike indoor)', ['Spinning', 'Indoor cycling', 'Bike de spinning'], ['quadriceps', 'gluteos', 'panturrilhas'], 'm', [
    'Ajuste o banco e o guidão à sua altura.', 'Alterne ritmos e resistências conforme a música ou o treino.', 'Termine com 3 a 5 minutos de pedalada leve.',
  ], 'Hidrate-se bem: a sessão costuma ser intensa.', { p: 'cardio', reps: 30 }),
  c.car('eliptico', 'Elíptico (transport)', ['Elíptico', 'Transport', 'Elliptical'], ['quadriceps', 'gluteos', 'costas'], 'i', [
    'Suba na plataforma e segure as manoplas.', 'Mova pernas e braços em ritmo constante e contínuo.', 'Termine reduzindo a velocidade aos poucos.',
  ], 'Baixo impacto nas articulações; mantenha a postura ereta.', { p: 'cardio' }),
  c.car('simulador-de-escada', 'Simulador de escada', ['Escada', 'Stair climber', 'Stairmaster', 'Escada rolante'], ['quadriceps', 'gluteos'], 'm', [
    'Suba nos degraus com postura ereta, mãos leves no apoio.', 'Alterne os passos em ritmo constante.', 'Termine reduzindo o ritmo aos poucos.',
  ], 'Evite se apoiar com todo o peso nas barras.', { p: 'cardio', art: 'stairs', legacy: 'ex-escada' }),
  c.car('remo-ergometro', 'Remo ergômetro', ['Remo', 'Rowing machine', 'Remo indoor'], ['costas', 'quadriceps', 'biceps'], 'm', [
    'Sente com os pés presos, joelhos flexionados e braços estendidos.', 'Empurre com as pernas, incline o tronco e puxe o cabo até o abdômen.', 'Volte na ordem inversa: braços, tronco e depois joelhos.',
  ], 'A força vem das pernas (60%), tronco (30%) e braços (10%).', { p: 'cardio', reps: 15 }),
  c.car('ski-ergometro', 'Ski ergômetro (SkiErg)', ['SkiErg', 'Ski erg'], ['costas', 'ombros', 'abdomen-core'], 'm', [
    'Em pé de frente para o aparelho, segure as alças acima da cabeça.', 'Puxe as alças para baixo flexionando joelhos e quadril.', 'Volte à posição inicial de forma fluida.',
  ], 'Use o tronco e as pernas, não apenas os braços.', { p: 'cardio', reps: 10 }),
  c.car('air-bike', 'Air bike', ['Assault bike', 'Bike de ventilação', 'Airdyne'], ['quadriceps', 'ombros', 'costas'], 'm', [
    'Ajuste o banco e segure as manoplas.', 'Pedale empurrando e puxando as manoplas ao mesmo tempo.', 'Alterne ritmos fortes e leves conforme o treino.',
  ], 'A resistência aumenta com a velocidade: ótimo para intervalados.', { p: 'cardio', reps: 15 }),
  c.out('corda-de-pular', 'Corda de pular', ['Pular corda', 'Jump rope'], ['panturrilhas', 'ombros'], 'm', [
    'Segure a corda com os cotovelos junto ao corpo.', 'Gire a corda com os punhos e salte baixo, aterrissando na ponta dos pés.', 'Mantenha um ritmo constante.',
  ], 'Saltos pequenos: só o suficiente para a corda passar.', { p: 'cardio', reps: 5 }),

  // ================= FUNCIONAL
  f.pc('burpee', 'Burpee', ['Burpees'], ['peitoral', 'quadriceps', 'abdomen-core'], 'm', [
    'Em pé, agache apoiando as mãos no chão.', 'Leve os pés para trás em posição de prancha e faça uma flexão (opcional).', 'Volte os pés, levante e finalize com um salto.',
  ], 'Mantenha o abdômen firme ao ir para a prancha.', { p: 'func', reps: 10, bw: true }),
  f.pc('polichinelo', 'Polichinelo', ['Jumping jack', 'Jumping jacks'], ['ombros', 'panturrilhas'], 'i', [
    'Em pé, pés juntos e braços ao lado do corpo.', 'Salte abrindo as pernas e elevando os braços acima da cabeça.', 'Salte de volta à posição inicial.',
  ], 'Aterrisse suave, com os joelhos levemente flexionados.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.pc('joelho-alto', 'Corrida estacionária com joelho alto', ['High knees', 'Joelho alto'], ['quadriceps', 'abdomen-core'], 'i', [
    'Em pé, corra no lugar elevando os joelhos até a altura do quadril.', 'Balance os braços de forma coordenada.', 'Mantenha o ritmo rápido e o tronco ereto.',
  ], 'Aterrisse na ponta dos pés e mantenha o abdômen firme.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.pc('agachamento-com-salto', 'Agachamento com salto', ['Jump squat', 'Salto com agachamento'], ['quadriceps', 'gluteos', 'panturrilhas'], 'm', [
    'Desça em um agachamento com o tronco ereto.', 'Salte explosivamente, estendendo totalmente o corpo.', 'Aterrisse suave e volte direto ao agachamento.',
  ], 'Amorteça a aterrissagem flexionando os joelhos.', { p: 'func', reps: 10, bw: true }),
  f.pc('afundo-com-salto', 'Afundo com salto', ['Jump lunge', 'Passada com salto'], ['quadriceps', 'gluteos'], 'a', [
    'Em posição de afundo, com uma perna à frente.', 'Salte trocando a posição das pernas no ar.', 'Aterrisse em outro afundo e repita.',
  ], 'Exercício intenso para os joelhos: domine o afundo sem salto antes.', { p: 'func', reps: 10, bw: true }),
  f.ste('salto-na-caixa', 'Salto na caixa', ['Box jump', 'Salto no step'], ['quadriceps', 'gluteos', 'panturrilhas'], 'm', [
    'De frente para a caixa, flexione os joelhos e balance os braços.', 'Salte com os dois pés sobre a caixa, aterrissando suave.', 'Desça (caminhando) com controle e repita.',
  ], 'Desça sempre andando; evite saltar para trás.', { p: 'func', reps: 8, bw: true }),
  f.pc('patinador-lateral', 'Salto lateral (patinador)', ['Skater jump', 'Skaters', 'Salto de patinador'], ['gluteos', 'abdutores', 'quadriceps'], 'm', [
    'Salte lateralmente de uma perna para a outra, cruzando a perna de trás.', 'Aterrisse suave com o joelho levemente flexionado.', 'Alterne os lados de forma contínua.',
  ], 'Mantenha o tronco levemente inclinado e o olhar à frente.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.pc('caminhada-do-urso', 'Caminhada do urso', ['Bear crawl', 'Engatinhar'], ['ombros', 'abdomen-core', 'quadriceps'], 'm', [
    'Em quatro apoios com os joelhos levemente elevados do chão.', 'Avance mão e pé opostos ao mesmo tempo.', 'Mantenha o quadril baixo e o abdômen firme.',
  ], 'Movimentos curtos e controlados.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.hal('renegade-row', 'Renegade row', ['Remada na prancha', 'Remada renegada'], ['costas', 'abdomen-core', 'ombros'], 'a', [
    'Em posição de prancha alta com as mãos sobre halteres.', 'Puxe um halter em direção ao quadril sem girar o tronco.', 'Devolva e alterne o lado.',
  ], 'Afaste os pés para ganhar estabilidade.', { p: 'func', reps: 8, step: 1 }),
  f.kb('kettlebell-swing', 'Balanço com kettlebell', ['Kettlebell swing', 'Swing'], ['gluteos', 'posterior-coxa', 'lombar'], 'm', [
    'Em pé, pés um pouco mais abertos que os ombros, kettlebell à frente.', 'Leve o kettlebell para trás das pernas e estenda o quadril com força, balançando-o até a altura do peito.', 'Deixe o kettlebell voltar e repita o movimento fluido.',
  ], 'O movimento é de quadril, não de agachamento nem de braços.', { p: 'func', reps: 15, step: 4 }),
  f.kb('turkish-get-up', 'Levantamento turco', ['Turkish get-up', 'Get-up'], ['ombros', 'abdomen-core', 'gluteos'], 'a', [
    'Deite de costas segurando o kettlebell acima do ombro com o braço estendido.', 'Levante-se em etapas até ficar de pé, mantendo o braço sempre estendido para cima.', 'Faça o caminho inverso até deitar novamente.',
  ], 'Aprenda cada etapa sem carga antes de usar o kettlebell.', { p: 'func', reps: 3, step: 2 }),
  f.kb('kettlebell-clean', 'Clean com kettlebell', ['Kettlebell clean'], ['gluteos', 'posterior-coxa', 'ombros'], 'a', [
    'Em pé com o kettlebell entre os pés.', 'Estenda o quadril puxando o kettlebell até a posição de ombro (rack).', 'Desça com controle e repita.',
  ], 'Mantenha o kettlebell rente ao corpo.', { p: 'func', reps: 8, step: 4 }),
  f.hal('thruster-halteres', 'Thruster com halteres', ['Thruster', 'Agachamento com desenvolvimento'], ['quadriceps', 'gluteos', 'ombros', 'triceps'], 'a', [
    'Em pé, halteres na altura dos ombros.', 'Agache profundamente mantendo o tronco ereto.', 'Suba explosivamente e empurre os halteres acima da cabeça.',
  ], 'Junte as duas fases em um único movimento fluido.', { p: 'func', reps: 10, step: 2 }),
  f.hal('clean-press-halteres', 'Clean and press com halteres', ['Dumbbell clean and press', 'Arremesso com halteres'], ['ombros', 'gluteos', 'posterior-coxa'], 'a', [
    'Em pé, halteres à frente das coxas.', 'Estenda o quadril levando os halteres aos ombros.', 'Empurre os halteres acima da cabeça e desça com controle.',
  ], 'Comece leve para aprender a coordenação.', { p: 'func', reps: 8, step: 2 }),
  f.hal('arranco-halter', 'Arranco com halter (snatch)', ['Dumbbell snatch', 'Snatch unilateral'], ['ombros', 'gluteos', 'posterior-coxa'], 'a', [
    'Em pé, halter entre os pés, segurando com uma mão.', 'Estenda o quadril e puxe o halter em um movimento contínuo até acima da cabeça.', 'Desça com controle e repita; troque de lado.',
  ], 'A potência vem do quadril, não dos braços.', { p: 'func', reps: 8, step: 2 }),
  f.bar('power-clean', 'Power clean com barra', ['Arremesso com barra', 'Clean'], ['costas', 'gluteos', 'posterior-coxa', 'ombros'], 'a', [
    'Barra no chão, pés na largura do quadril.', 'Estenda quadril e joelhos explosivamente e puxe a barra até os ombros.', 'Receba a barra na frente dos ombros e desça com controle.',
  ], 'Exige técnica: aprenda com instrutor e barra leve.', { p: 'comp', reps: 5, type: 'funcional' }),
  f.med('slam-ball', 'Arremesso no chão (slam ball)', ['Slam ball', 'Medicine ball slam'], ['ombros', 'abdomen-core', 'costas'], 'i', [
    'Em pé, segure a bola acima da cabeça.', 'Arremesse a bola com força no chão à sua frente.', 'Agache, pegue a bola e repita.',
  ], 'Use uma bola própria para slam (sem quique).', { p: 'func', reps: 10, step: 1 }),
  f.med('wall-ball', 'Arremesso na parede (wall ball)', ['Wall ball', 'Medicine ball na parede'], ['quadriceps', 'ombros', 'gluteos'], 'm', [
    'Em pé de frente para a parede, segure a bola junto ao peito.', 'Agache e, ao subir, arremesse a bola na parede acima da cabeça.', 'Pegue a bola e entre direto no próximo agachamento.',
  ], 'Use as pernas para impulsionar o arremesso.', { p: 'func', reps: 12, step: 1 }),
  f.cor('battle-rope-alternada', 'Corda naval — ondas alternadas', ['Battle rope', 'Battle ropes', 'Ondas alternadas'], ['ombros', 'abdomen-core', 'costas'], 'm', [
    'Em pé, joelhos levemente flexionados, segurando uma ponta da corda em cada mão.', 'Eleve e abaixe os braços alternadamente criando ondas.', 'Mantenha o abdômen firme e o ritmo constante.',
  ], 'A força vem do quadril e dos braços ao mesmo tempo.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.cor('battle-rope-duplo', 'Corda naval — ondas duplas', ['Battle rope duplo', 'Double wave'], ['ombros', 'abdomen-core', 'costas'], 'm', [
    'Em pé, joelhos flexionados, segurando as pontas da corda.', 'Eleve e abaixe os dois braços juntos, criando ondas simultâneas.', 'Mantenha o ritmo e a postura.',
  ], 'Varie com ondas laterais para trabalhar o core.', { p: 'func', unit: 'seg', reps: 30, bw: true }),
  f.hal('caminhada-fazendeiro', 'Caminhada do fazendeiro', ['Farmer\'s walk', 'Farmer walk', 'Transporte de halteres'], ['antebraco', 'abdomen-core', 'ombros'], 'i', [
    'Segure um halter pesado em cada mão ao lado do corpo.', 'Caminhe com passos curtos e postura ereta.', 'Mantenha os ombros para trás e o abdômen firme.',
  ], 'Pegada forte: ótimo para antebraço e postura.', { p: 'func', unit: 'seg', reps: 30, step: 2 }),
  f.hal('transporte-unilateral', 'Transporte unilateral (suitcase carry)', ['Suitcase carry', 'Caminhada com uma carga'], ['abdomen-core', 'antebraco'], 'm', [
    'Segure um halter pesado em apenas uma mão ao lado do corpo.', 'Caminhe mantendo o tronco ereto, sem inclinar para o lado.', 'Troque de lado na série seguinte.',
  ], 'Resista à inclinação lateral: é um exercício anti-flexão lateral.', { p: 'func', unit: 'seg', reps: 30, step: 2 }),
  f.out('empurrar-treno', 'Empurrar trenó', ['Sled push', 'Trenó'], ['quadriceps', 'gluteos', 'ombros'], 'm', [
    'Segure as hastes do trenó com os braços estendidos e o tronco inclinado à frente.', 'Empurre o trenó com passos fortes e curtos.', 'Mantenha o abdômen firme durante o trajeto.',
  ], 'Comece com carga moderada: o esforço é alto.', { p: 'func', unit: 'seg', reps: 20, step: 5 }),
  f.out('puxar-treno', 'Puxar trenó', ['Sled pull', 'Arrasto de trenó'], ['posterior-coxa', 'costas', 'gluteos'], 'm', [
    'Prenda a corda ao trenó e posicione-se de frente para ele.', 'Puxe a corda recuando em passos firmes.', 'Mantenha o tronco firme e o olhar à frente.',
  ], 'Alterne puxada e empurrada para variar o treino.', { p: 'func', unit: 'seg', reps: 20, step: 5 }),
  f.hal('man-maker', 'Man maker', ['Manmaker'], ['costas', 'ombros', 'quadriceps', 'abdomen-core'], 'a', [
    'Em posição de prancha com as mãos sobre halteres.', 'Faça uma flexão e uma remada com cada braço.', 'Salte levando os pés às mãos, levante e empurre os halteres acima da cabeça.',
  ], 'Exercício completo e muito intenso: use cargas leves.', { p: 'func', reps: 6, step: 1 }),

  c.out('corrida-ao-ar-livre', 'Corrida ao ar livre', ['Corrida', 'Running', 'Corrida de rua'], ['quadriceps', 'panturrilhas', 'gluteos'], 'i', [
    'Comece com 5 minutos de caminhada para aquecer.', 'Corra em ritmo que permita conversar, mantendo postura ereta e passos curtos.', 'Termine caminhando para recuperar a respiração.',
  ], 'Use tênis adequado e aumente o volume aos poucos.', { p: 'cardio', reps: 30 }),
  c.out('caminhada-ao-ar-livre', 'Caminhada ao ar livre', ['Caminhada', 'Walking', 'Caminhada rápida'], ['quadriceps', 'panturrilhas', 'gluteos'], 'i', [
    'Caminhe em ritmo constante com postura ereta e olhar à frente.', 'Balance os braços acompanhando os passos.', 'Finalize reduzindo o ritmo gradualmente.',
  ], 'Um ritmo em que você consegue falar, mas não cantar, é um bom parâmetro.', { p: 'cardio', reps: 30 }),
  c.out('pedalada-ao-ar-livre', 'Pedalada ao ar livre', ['Ciclismo', 'Bike ao ar livre', 'Outdoor cycling'], ['quadriceps', 'gluteos', 'panturrilhas'], 'i', [
    'Ajuste a altura do selim e use capacete.', 'Pedale em ritmo constante, alternando marchas conforme o terreno.', 'Termine com 5 minutos de pedalada leve.',
  ], 'Hidrate-se e respeite a sinalização.', { p: 'cardio', reps: 40 }),
];
