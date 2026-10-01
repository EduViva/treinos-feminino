import { grp } from './dsl.mjs';
const co = grp('costas'), bi = grp('biceps'), pe = grp('peitoral'), tr = grp('triceps'), gl = grp('gluteos'), po = grp('posterior-coxa');
const qu = grp('quadriceps'), om = grp('ombros'), pa = grp('panturrilhas'), ad = grp('adutores'), ab = grp('abdutores');
const lo = grp('lombar'), cr = grp('abdomen-core'), an = grp('antebraco'), fu = grp('funcional'), ou = grp('outros');

const S = { p: 'stretch' };   // alongamento: 2 × 30 s
const M = { p: 'mob' };       // mobilidade: 2 × 10

export default [
  // ================= ALONGAMENTOS
  co.pc('alongamento-dorsais', 'Alongamento de dorsais', ['Alongamento de costas', 'Lat stretch'], ['ombros'], 'i', [
    'Em pé, mãos entrelaçadas à frente.', 'Empurre as mãos para frente e arredonde as costas.', 'Sinta o alongamento entre as escápulas e respire fundo.',
  ], 'Respire fundo e solte a tensão a cada expiração.', { ...S, art: 'stretch_lats', legacy: 'ex-al-dorsais' }),
  bi.pc('alongamento-biceps-ombros', 'Alongamento de bíceps e ombros', ['Alongamento de bíceps', 'Biceps stretch'], ['ombros', 'peitoral'], 'i', [
    'Em pé, braços estendidos ao lado do corpo.', 'Leve os braços para trás, com as palmas viradas para baixo.', 'Mantenha o peito aberto e sinta a frente do braço e do ombro.',
  ], 'Não force além do confortável.', { ...S, art: 'stretch_biceps', legacy: 'ex-al-biceps-ombro' }),
  pe.pc('alongamento-peitoral-batente', 'Alongamento de peitoral no batente', ['Alongamento de peito', 'Doorway chest stretch'], ['ombros', 'biceps'], 'i', [
    'Apoie os antebraços no batente, cotovelos na altura dos ombros.', 'Dê um passo à frente, deixando o peito passar pelo batente.', 'Sinta abrir o peito; mantenha o abdômen firme.',
  ], 'Varie a altura do braço para alongar diferentes fibras.', { ...S, art: 'stretch_chest', legacy: 'ex-al-peitoral' }),
  tr.pc('alongamento-triceps', 'Alongamento de tríceps', ['Triceps stretch', 'Alongamento de braço'], ['ombros'], 'i', [
    'Dobre um braço atrás da cabeça.', 'Com a outra mão, empurre suavemente o cotovelo para trás.', 'Sinta o alongamento no tríceps; depois troque de lado.',
  ], 'Mantenha o pescoço relaxado.', { ...S, art: 'stretch_triceps', legacy: 'ex-al-triceps' }),
  gl.pc('alongamento-gluteo-figura-4', 'Alongamento de glúteo (figura 4)', ['Figure four stretch', 'Alongamento de piriforme'], ['posterior-coxa'], 'i', [
    'Deitada, joelhos dobrados e pés no chão.', 'Cruze um tornozelo sobre o joelho oposto.', 'Puxe a coxa de baixo em direção ao peito até sentir o glúteo alongar; troque de lado.',
  ], 'Mantenha a cabeça e as costas apoiadas no chão.', { ...S, art: 'stretch_glute_fig4', legacy: 'ex-al-gluteo-4' }),
  gl.pc('alongamento-gluteo-joelho-peito', 'Alongamento de glúteo (joelho ao peito)', ['Knee to chest stretch'], ['lombar', 'posterior-coxa'], 'i', [
    'Deitada de barriga para cima.', 'Abrace um joelho e traga-o em direção ao peito.', 'Mantenha a lombar apoiada no chão; troque de perna.',
  ], 'Boa opção para soltar a lombar após o treino.', { ...S, art: 'stretch_glute_knee', legacy: 'ex-al-gluteo-joelho' }),
  po.pc('alongamento-posterior-inclinacao-tronco', 'Alongamento de posterior (inclinação de tronco)', ['Toe touch', 'Alongamento de posterior em pé'], ['lombar', 'panturrilhas'], 'i', [
    'Em pé, pernas estendidas.', 'Incline o tronco à frente, quadril para trás, mãos em direção aos pés.', 'Sinta atrás das coxas, sem forçar a lombar.',
  ], 'Flexione levemente os joelhos se sentir a lombar tensionar.', { ...S, art: 'stretch_fold', legacy: 'ex-al-posterior-tronco' }),
  po.pc('alongamento-posterior-perna-step', 'Alongamento de posterior com perna no step', ['Hamstring stretch no step'], ['panturrilhas'], 'i', [
    'Apoie um calcanhar no step, joelho quase estendido.', 'Incline o tronco com a coluna reta em direção ao pé apoiado.', 'Sinta atrás da coxa; troque de perna.',
  ], 'Mantenha a coluna reta: o movimento é do quadril.', { ...S, art: 'stretch_hamstring_step', legacy: 'ex-al-posterior-step' }),
  qu.pc('alongamento-quadriceps-em-pe', 'Alongamento de quadríceps em pé', ['Quad stretch', 'Alongamento de coxa'], ['abdomen-core'], 'i', [
    'Em pé, apoie-se se precisar.', 'Dobre o joelho e segure o pé, levando o calcanhar ao glúteo.', 'Joelhos juntos e quadril para frente; troque de perna.',
  ], 'Evite arquear a lombar: contraia o abdômen.', { ...S, art: 'stretch_quad', legacy: 'ex-al-quadriceps' }),
  pa.pc('alongamento-panturrilha-parede', 'Alongamento de panturrilha na parede', ['Calf stretch', 'Alongamento de gêmeos'], ['posterior-coxa'], 'i', [
    'De frente para a parede, apoie as mãos nela com uma perna atrás.', 'Mantenha o calcanhar de trás no chão e o joelho estendido.', 'Incline-se para a parede até sentir a panturrilha alongar; troque de perna.',
  ], 'Para alongar o sóleo, flexione levemente o joelho de trás.', S),
  ad.pc('alongamento-adutores-borboleta', 'Alongamento de adutores sentada (borboleta)', ['Butterfly stretch', 'Alongamento borboleta'], ['gluteos'], 'i', [
    'Sentada, junte as solas dos pés e deixe os joelhos caírem para os lados.', 'Segure os pés e incline o tronco levemente à frente.', 'Sinta alongar a parte interna das coxas.',
  ], 'Mantenha a coluna reta; não force os joelhos com as mãos.', S),
  ad.pc('alongamento-adutores-afastamento', 'Alongamento de adutores em afastamento lateral', ['Straddle stretch', 'Afastamento lateral'], ['posterior-coxa'], 'i', [
    'Sentada ou em pé com as pernas bem afastadas.', 'Incline o tronco à frente mantendo a coluna reta.', 'Sinta alongar a parte interna das coxas.',
  ], 'Só vá até onde se sentir confortável.', S),
  qu.pc('alongamento-flexores-quadril', 'Alongamento de flexores do quadril (afundo)', ['Hip flexor stretch', 'Alongamento de psoas'], ['gluteos'], 'i', [
    'Em afundo, com o joelho de trás apoiado no chão.', 'Empurre o quadril à frente mantendo o tronco ereto.', 'Sinta alongar a frente do quadril; troque de lado.',
  ], 'Contraia o glúteo da perna de trás para aprofundar o alongamento.', S),
  om.pc('alongamento-ombro-braco-cruzado', 'Alongamento de ombro (braço cruzado)', ['Cross-body shoulder stretch'], ['costas'], 'i', [
    'Cruze um braço à frente do peito.', 'Com a outra mão, puxe o braço em direção ao corpo.', 'Sinta alongar a parte de trás do ombro; troque de lado.',
  ], 'Mantenha o ombro baixo e relaxado.', S),
  om.pc('alongamento-pescoco-trapezio', 'Alongamento de pescoço e trapézio', ['Neck stretch', 'Alongamento cervical'], ['costas'], 'i', [
    'Sentada ou em pé, incline a cabeça para o lado.', 'Com a mão do mesmo lado, aplique uma leve pressão sobre a cabeça.', 'Sinta alongar o lado do pescoço; troque de lado.',
  ], 'Pressão bem leve: o peso da mão já é suficiente.', S),
  an.pc('alongamento-antebraco', 'Alongamento de antebraço', ['Wrist flexor stretch', 'Alongamento de punho'], [], 'i', [
    'Estenda um braço à frente com a palma voltada para cima.', 'Com a outra mão, puxe os dedos para baixo suavemente.', 'Sinta alongar o antebraço; depois vire a palma para baixo e repita.',
  ], 'Ótimo após exercícios de pegada.', S),
  cr.pc('alongamento-abdomen-cobra', 'Alongamento de abdômen (cobra)', ['Cobra stretch', 'Upward dog'], ['lombar', 'peitoral'], 'i', [
    'Deite de bruços com as mãos apoiadas sob os ombros.', 'Empurre o chão elevando o tronco, mantendo o quadril apoiado.', 'Sinta alongar o abdômen; mantenha o pescoço neutro.',
  ], 'Não force a lombar: suba apenas até o ponto confortável.', S),
  ab.pc('alongamento-abdutores-cruzado', 'Alongamento de abdutores em pé (perna cruzada)', ['IT band stretch', 'Alongamento da banda iliotibial'], ['gluteos'], 'i', [
    'Em pé, cruze uma perna por trás da outra.', 'Incline o tronco para o lado da perna da frente.', 'Sinta alongar a lateral do quadril; troque de lado.',
  ], 'Apoie-se em uma parede se precisar.', S),
  po.pc('alongamento-posterior-sentada', 'Alongamento de posterior sentada', ['Seated hamstring stretch', 'Alongamento sentada'], ['lombar', 'panturrilhas'], 'i', [
    'Sentada com uma perna estendida e a outra dobrada.', 'Incline o tronco à frente em direção ao pé estendido.', 'Sinta alongar atrás da coxa; troque de perna.',
  ], 'Mantenha a coluna reta: o movimento é do quadril.', S),
  lo.pc('posicao-da-crianca', 'Posição da criança', ['Child\'s pose', 'Balasana'], ['costas', 'gluteos'], 'i', [
    'Ajoelhe e sente sobre os calcanhares.', 'Incline o tronco à frente estendendo os braços no chão.', 'Respire fundo e relaxe a lombar.',
  ], 'Afaste os joelhos se precisar de mais conforto.', S),
  lo.pc('alongamento-rotacao-tronco-deitada', 'Torção de tronco deitada', ['Supine twist', 'Rotação lombar deitada'], ['gluteos', 'costas'], 'i', [
    'Deite de costas com os joelhos dobrados e os braços abertos.', 'Deixe os joelhos caírem para um lado enquanto os ombros permanecem no chão.', 'Respire fundo e troque de lado.',
  ], 'Olhe para o lado oposto para aumentar a torção.', S),

  // ================= MOBILIDADE
  om.pc('circulos-de-ombro', 'Círculos de ombro', ['Arm circles', 'Rotação de ombros'], [], 'i', [
    'Em pé, braços ao lado do corpo.', 'Faça círculos amplos com os braços, pelos lados e acima da cabeça.', 'Movimento controlado, sem encolher o pescoço.',
  ], 'Ótimo para aquecer antes de treinos de ombro e peito.', { ...M, art: 'mob_shoulder_circles', legacy: 'ex-mob-circulos-ombro' }),
  co.pc('gato-camelo', 'Gato-camelo', ['Cat-cow', 'Cat camel'], ['lombar', 'abdomen-core'], 'i', [
    'Quatro apoios: mãos sob os ombros e joelhos sob o quadril.', 'Arredonde a coluna e olhe para o umbigo.', 'Depois estenda a coluna olhando à frente; alterne devagar.',
  ], 'Sincronize o movimento com a respiração.', { ...M, art: 'mob_cat_camel', legacy: 'ex-mob-gato-camelo' }),
  om.pc('rotacao-externa-ombro-mobilidade', 'Rotação externa de ombro', ['Shoulder external rotation', 'Rotação externa'], ['costas'], 'i', [
    'Cotovelos junto ao corpo, dobrados a 90°.', 'Gire os antebraços para fora sem afastar os cotovelos.', 'Volte devagar.',
  ], 'Pode usar um elástico leve para aumentar o estímulo.', { ...M, art: 'mob_ext_rotation', legacy: 'ex-mob-rot-externa' }),
  pe.pc('abertura-de-bracos-toracica', 'Abertura de braços (mobilidade de tórax)', ['Chest opener', 'Abertura de peito'], ['ombros', 'costas'], 'i', [
    'Em pé, braços cruzados à frente do peito.', 'Abra os braços para os lados levando as escápulas para trás.', 'Volte abraçando o corpo.',
  ], 'Mantenha o abdômen firme, sem arquear a lombar.', { ...M, art: 'mob_open_arms', legacy: 'ex-mob-abertura' }),
  gl.pc('ponte-quadril-mobilidade', 'Ponte de quadril (mobilidade)', ['Pelvic bridge', 'Ponte de quadril'], ['posterior-coxa', 'lombar'], 'i', [
    'Deitada, joelhos dobrados e pés no chão.', 'Eleve o quadril contraindo os glúteos.', 'Desça devagar, vértebra por vértebra.',
  ], 'Mobiliza coluna e quadril; faça devagar.', { ...M, art: 'mob_glute_bridge', legacy: 'ex-mob-ponte' }),
  gl.pc('balanco-de-perna', 'Balanço de perna', ['Leg swing', 'Balanceio de perna'], ['posterior-coxa', 'quadriceps'], 'i', [
    'Em pé, uma mão apoiada na parede.', 'Balance a perna estendida para frente e para trás.', 'Aumente a amplitude aos poucos; tronco firme; troque de perna.',
  ], 'Faça também o balanço lateral para mobilizar o quadril.', { ...M, art: 'mob_leg_swing', legacy: 'ex-mob-balanco-perna' }),
  qu.pc('agachamento-profundo-mobilidade', 'Agachamento profundo (mobilidade)', ['Deep squat hold', 'Agachamento profundo'], ['gluteos', 'adutores'], 'i', [
    'Pés um pouco mais afastados que os ombros.', 'Desça o quadril o máximo que a postura permitir, cotovelos empurrando os joelhos para fora.', 'Suba empurrando o chão.',
  ], 'Se os calcanhares levantarem, apoie-os em um pequeno calço.', { ...M, art: 'deep_squat', legacy: 'ex-mob-agach-profundo' }),
  pa.pc('mobilidade-tornozelo-parede', 'Mobilidade de tornozelo na parede', ['Ankle mobility', 'Knee to wall'], ['quadriceps'], 'i', [
    'De frente para a parede, um pé à frente com os dedos a poucos centímetros dela.', 'Leve o joelho em direção à parede sem levantar o calcanhar.', 'Volte e repita; troque de pé.',
  ], 'Aumente a distância do pé à parede conforme ganhar mobilidade.', M),
  gl.pc('circulos-de-quadril', 'Círculos de quadril', ['Hip circles', 'Rotação de quadril'], ['lombar', 'abdutores'], 'i', [
    'Em pé, mãos na cintura e pés na largura dos ombros.', 'Faça círculos amplos com o quadril.', 'Alterne o sentido do giro.',
  ], 'Movimentos lentos e amplos.', M),
  co.pc('rotacao-toracica-open-book', 'Rotação torácica (livro aberto)', ['Open book', 'Thoracic rotation'], ['ombros', 'peitoral'], 'i', [
    'Deite de lado com os joelhos dobrados e os braços estendidos à frente.', 'Abra o braço de cima em arco, acompanhando com o olhar até o outro lado.', 'Volte devagar; troque de lado.',
  ], 'Mantenha os joelhos juntos e empilhados.', M),
  an.pc('mobilidade-de-punho', 'Mobilidade de punho', ['Wrist circles', 'Círculos de punho'], [], 'i', [
    'Estenda os braços à frente com os punhos relaxados.', 'Faça círculos amplos com as mãos nos dois sentidos.', 'Depois flexione e estenda os punhos devagar.',
  ], 'Ótimo antes de exercícios de pegada e flexões.', M),
  fu.pc('inchworm', 'Caminhada com as mãos (inchworm)', ['Inchworm', 'Lagarta'], ['posterior-coxa', 'ombros', 'abdomen-core'], 'i', [
    'Em pé, incline o tronco e apoie as mãos no chão.', 'Caminhe com as mãos à frente até ficar em prancha.', 'Caminhe com os pés até as mãos e volte à posição inicial.',
  ], 'Mantenha as pernas o mais estendidas que a mobilidade permitir.', { ...M, type: 'mobilidade' }),
  fu.pc('alongamento-mundial', 'Alongamento mundial (world\'s greatest stretch)', ['World\'s greatest stretch', 'Passada com rotação'], ['quadriceps', 'gluteos', 'costas'], 'm', [
    'Dê um passo largo à frente em afundo e apoie as duas mãos no chão.', 'Gire o tronco levando o braço do lado da perna da frente ao teto.', 'Volte e repita; troque de lado.',
  ], 'Exercício completo para aquecer quadril, coluna e ombros.', { ...M, type: 'mobilidade' }),
  co.pc('flexao-escapular', 'Flexão escapular', ['Scapular push-up', 'Protração e retração escapular'], ['ombros', 'peitoral'], 'i', [
    'Em posição de prancha alta com os braços estendidos.', 'Deixe o peito afundar entre as escápulas (retração).', 'Empurre o chão afastando as escápulas (protração).',
  ], 'Os cotovelos permanecem estendidos durante todo o movimento.', M),
  om.pc('deslizamento-parede', 'Deslizamento na parede (wall slides)', ['Wall slide', 'Wall angels'], ['costas', 'triceps'], 'i', [
    'Encoste as costas e os braços na parede, cotovelos a 90°.', 'Deslize os braços para cima mantendo o contato com a parede.', 'Desça devagar mantendo o contato.',
  ], 'Se os braços descolarem, reduza a amplitude.', M),
  ad.pc('cossack-squat', 'Agachamento cossaco', ['Cossack squat', 'Agachamento lateral profundo'], ['gluteos', 'quadriceps'], 'm', [
    'Em pé com os pés bem afastados, pontas dos pés para fora.', 'Desloque o quadril para um lado agachando nessa perna, mantendo a outra estendida.', 'Volte ao centro e alterne os lados.',
  ], 'Mantenha o calcanhar da perna flexionada no chão.', M),

  // ================= OUTROS — liberação miofascial e respiração
  ou.out('liberacao-rolo-costas', 'Liberação com rolo — costas', ['Foam roller costas', 'Rolo de liberação miofascial costas'], ['costas'], 'i', [
    'Deite com o rolo sob a parte alta das costas, joelhos dobrados.', 'Role devagar para cima e para baixo, parando nos pontos mais tensos.', 'Respire fundo e evite rolar sobre a lombar.',
  ], 'Pressão moderada: deve ser desconfortável, não doloroso.', { ...M, unit: 'seg', reps: 45, sets: 1 }),
  ou.out('liberacao-rolo-quadriceps', 'Liberação com rolo — quadríceps', ['Foam roller coxa', 'Rolo quadríceps'], ['quadriceps'], 'i', [
    'Apoie-se nos antebraços com o rolo sob as coxas.', 'Role devagar do quadril ao joelho.', 'Pare nos pontos tensos e respire fundo.',
  ], 'Evite rolar sobre a articulação do joelho.', { ...M, unit: 'seg', reps: 45, sets: 1 }),
  ou.out('liberacao-rolo-posterior', 'Liberação com rolo — posterior de coxa', ['Foam roller posterior', 'Rolo posterior'], ['posterior-coxa'], 'i', [
    'Sentada com o rolo sob as coxas, mãos no chão atrás de você.', 'Role devagar do glúteo até o joelho.', 'Pare nos pontos tensos e respire fundo.',
  ], 'Cruze uma perna sobre a outra para aumentar a pressão.', { ...M, unit: 'seg', reps: 45, sets: 1 }),
  ou.out('liberacao-rolo-gluteos', 'Liberação com rolo — glúteos', ['Foam roller glúteo', 'Rolo glúteos'], ['gluteos'], 'i', [
    'Sentada sobre o rolo, com um tornozelo cruzado sobre o joelho oposto.', 'Incline-se para o lado do glúteo cruzado e role devagar.', 'Pare nos pontos tensos; troque de lado.',
  ], 'Mantenha a respiração profunda e constante.', { ...M, unit: 'seg', reps: 45, sets: 1 }),
  ou.out('respiracao-diafragmatica', 'Respiração diafragmática', ['Respiração profunda', 'Diaphragmatic breathing'], ['abdomen-core'], 'i', [
    'Deite de costas com os joelhos dobrados e uma mão sobre a barriga.', 'Inspire pelo nariz inflando a barriga, sem elevar o peito.', 'Expire lentamente pela boca esvaziando a barriga.',
  ], 'Boa para relaxar entre séries ou ao final do treino.', { ...M, unit: 'seg', reps: 60, sets: 1 }),
];
