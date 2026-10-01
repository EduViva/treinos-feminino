import { grp } from './dsl.mjs';
const q = grp('quadriceps');
const p = grp('posterior-coxa');
const gl = grp('gluteos');
const ad = grp('adutores');
const ab = grp('abdutores');
const pa = grp('panturrilhas');

export default [
  // ================= QUADRÍCEPS — agachamentos
  q.pc('agachamento-livre', 'Agachamento livre', ['Agachamento', 'Air squat', 'Agachamento com peso do corpo', 'Squat'], ['gluteos', 'posterior-coxa'], 'i', [
    'Em pé, pés na largura dos ombros, braços à frente.', 'Desça flexionando joelhos e quadril, como se fosse sentar em uma cadeira.', 'Suba empurrando o chão, sem deixar os joelhos caírem para dentro.',
  ], 'Mantenha o peito aberto e o peso distribuído nos calcanhares.', { p: 'bw', reps: 15, art: 'squat' }),
  q.bar('agachamento-barra', 'Agachamento livre com barra', ['Agachamento com barra', 'Back squat', 'Agachamento costas'], ['gluteos', 'posterior-coxa', 'lombar'], 'a', [
    'Apoie a barra na parte alta das costas, pés na largura dos ombros.', 'Desça flexionando joelhos e quadril até as coxas ficarem paralelas ao chão, mantendo a coluna reta.', 'Suba empurrando o chão com os pés.',
  ], 'Aprenda o movimento com a barra vazia; use o rack de segurança.', { p: 'comp', reps: 8, rest: 150 }),
  q.bar('agachamento-frontal-barra', 'Agachamento frontal com barra', ['Front squat', 'Agachamento frontal'], ['gluteos', 'abdomen-core'], 'a', [
    'Apoie a barra na frente dos ombros com os cotovelos altos.', 'Desça flexionando joelhos e quadril, mantendo o tronco ereto.', 'Suba empurrando o chão.',
  ], 'Cotovelos altos o tempo todo; exige boa mobilidade de punhos e tornozelos.', { p: 'comp', reps: 8, rest: 150 }),
  q.smi('agachamento-smith', 'Agachamento no Smith', ['Smith squat', 'Agachamento guiado'], ['gluteos', 'posterior-coxa'], 'i', [
    'Barra apoiada nos ombros, pés um pouco à frente.', 'Desça flexionando joelhos e quadril até as coxas ficarem paralelas ao chão.', 'Suba empurrando o chão, sem travar os joelhos.',
  ], 'Pés levemente à frente da barra ajudam a manter o equilíbrio.', { p: 'leg', step: 5, art: 'smith_squat', legacy: 'ex-smith' }),
  q.maq('agachamento-hack', 'Agachamento hack', ['Hack squat', 'Hack'], ['gluteos'], 'i', [
    'Costas apoiadas, pés na plataforma.', 'Desça o carrinho até os joelhos formarem ~90°.', 'Empurre a plataforma para subir, sem travar os joelhos.',
  ], 'Pés mais baixos na plataforma enfatizam o quadríceps.', { p: 'leg', step: 5, art: 'hack_squat', legacy: 'ex-hack' }),
  q.maq('agachamento-pendulo', 'Agachamento pêndulo', ['Pendulum squat', 'Agachamento no pêndulo'], ['gluteos'], 'm', [
    'Apoie os ombros nas almofadas e os pés na plataforma.', 'Desça flexionando os joelhos o máximo que a mobilidade permitir.', 'Suba empurrando a plataforma.',
  ], 'A trajetória em arco poupa a lombar e foca o quadríceps.', { p: 'mach' }),
  q.hal('agachamento-goblet', 'Agachamento goblet', ['Goblet squat', 'Agachamento com halter', 'Agachamento com kettlebell'], ['gluteos', 'abdomen-core'], 'i', [
    'Halter junto ao peito, cotovelos para baixo.', 'Desça flexionando joelhos e quadril, mantendo o tronco ereto.', 'Suba empurrando o chão.',
  ], 'Ótimo para aprender o padrão do agachamento.', { p: 'mid', step: 2, art: 'goblet_squat' }),
  q.hal('agachamento-halteres', 'Agachamento com halteres', ['Dumbbell squat'], ['gluteos', 'posterior-coxa'], 'i', [
    'Em pé, segure um halter em cada mão ao lado do corpo.', 'Desça flexionando joelhos e quadril.', 'Suba empurrando o chão.',
  ], 'Mantenha os halteres rentes ao corpo.', { p: 'mid', step: 2 }),
  q.hal('agachamento-bulgaro', 'Agachamento búlgaro', ['Afundo búlgaro', 'Bulgarian split squat', 'Agachamento unilateral no banco'], ['gluteos', 'posterior-coxa'], 'm', [
    'Apoie o peito do pé de trás em um banco, com um halter em cada mão.', 'Desça flexionando o joelho da frente até a coxa ficar paralela ao chão.', 'Suba empurrando o chão com o pé da frente.',
  ], 'Dê um passo largo o bastante para o joelho da frente não passar da ponta do pé.', { p: 'mid', step: 2 }),
  q.sus('agachamento-trx', 'Agachamento na suspensão (TRX)', ['TRX squat', 'Agachamento assistido'], ['gluteos'], 'i', [
    'Segure as alças com os braços estendidos à frente.', 'Desça flexionando os joelhos, usando as alças como apoio.', 'Suba empurrando o chão.',
  ], 'Boa opção para aprender a profundidade do agachamento.', { p: 'bw', reps: 12 }),
  q.pc('agachamento-isometrico-parede', 'Agachamento isométrico na parede', ['Wall sit', 'Cadeirinha'], ['gluteos'], 'i', [
    'Encoste as costas na parede e deslize até os joelhos formarem 90°.', 'Mantenha os pés na largura dos ombros e as costas coladas.', 'Segure pelo tempo programado.',
  ], 'Respire normalmente e não apoie as mãos nas coxas.', { p: 'time', reps: 30 }),
  q.pc('agachamento-pistol', 'Agachamento unilateral (pistol)', ['Pistol squat', 'Agachamento em uma perna'], ['gluteos', 'abdomen-core'], 'a', [
    'Em pé sobre uma perna, com a outra estendida à frente.', 'Desça flexionando o joelho de apoio o máximo possível.', 'Suba empurrando o chão.',
  ], 'Use apoio (TRX ou parede) para progredir aos poucos.', { p: 'bw', reps: 5 }),
  q.pc('sissy-squat', 'Sissy squat', ['Agachamento sissy'], [], 'a', [
    'Em pé, apoie-se em algo e eleve os calcanhares.', 'Incline o corpo para trás flexionando os joelhos, levando-os à frente.', 'Volte contraindo o quadríceps.',
  ], 'Exercício avançado e exigente para os joelhos; comece sem carga.', { p: 'bw', reps: 8 }),

  // ---- afundos e passadas
  q.pc('afundo-peso-corporal', 'Afundo', ['Passada', 'Lunge', 'Avanço'], ['gluteos', 'posterior-coxa'], 'i', [
    'Em pé, pés juntos, tronco ereto.', 'Dê um passo à frente e desça até os dois joelhos formarem 90°.', 'Empurre o chão com o pé da frente para voltar.',
  ], 'Joelho da frente alinhado com o pé; tronco ereto.', { p: 'bw', reps: 10, art: 'lunge' }),
  q.hal('afundo-halteres', 'Afundo com halteres', ['Dumbbell lunge', 'Passada com halteres'], ['gluteos', 'posterior-coxa'], 'm', [
    'Em pé, com um halter em cada mão ao lado do corpo.', 'Dê um passo à frente e desça até os dois joelhos formarem 90°.', 'Empurre o chão com o pé da frente para voltar.',
  ], 'Mantenha o tronco ereto e o olhar à frente.', { p: 'mid', reps: 10, step: 2 }),
  q.bar('afundo-barra', 'Afundo com barra', ['Barbell lunge'], ['gluteos', 'posterior-coxa'], 'a', [
    'Apoie a barra nas costas e fique em pé com os pés juntos.', 'Dê um passo à frente e desça até os dois joelhos formarem 90°.', 'Empurre o chão com o pé da frente para voltar.',
  ], 'Comece com a barra vazia para ajustar o equilíbrio.', { p: 'comp', reps: 8 }),
  q.smi('afundo-smith', 'Afundo no Smith', ['Smith lunge'], ['gluteos', 'posterior-coxa'], 'm', [
    'Barra apoiada nos ombros, uma perna à frente.', 'Desça até o joelho da frente formar ~90°.', 'Empurre o chão com o pé da frente para subir.',
  ], 'A barra guiada ajuda no equilíbrio, mas mantenha o tronco ereto.', { p: 'leg', step: 5, art: 'smith_lunge', legacy: 'ex-afundo-smith' }),
  q.hal('afundo-step-pe-da-frente', 'Afundo com pé da frente no step', ['Afundo no step', 'Front foot elevated lunge'], ['gluteos', 'posterior-coxa'], 'm', [
    'Pé da frente apoiado no step, tronco ereto.', 'Desça até o joelho de trás se aproximar do chão.', 'Empurre o step com o pé da frente para subir.',
  ], 'O pé elevado aumenta a amplitude e o trabalho de glúteos.', { p: 'leg', step: 1, art: 'step_lunge', legacy: 'ex-afundo-step' }),
  q.hal('passada-caminhando', 'Passada caminhando', ['Walking lunge', 'Avanço caminhando'], ['gluteos', 'posterior-coxa'], 'm', [
    'Em pé, com um halter em cada mão.', 'Dê um passo à frente e desça até os dois joelhos formarem 90°.', 'Suba e dê o passo seguinte com a outra perna, avançando.',
  ], 'Passos largos o bastante para o joelho da frente ficar sobre o pé.', { p: 'mid', reps: 12, step: 2 }),
  q.hal('afundo-reverso', 'Afundo reverso', ['Reverse lunge', 'Passada para trás'], ['gluteos', 'posterior-coxa'], 'i', [
    'Em pé, segure um halter em cada mão.', 'Dê um passo para trás e desça até os dois joelhos formarem 90°.', 'Empurre o chão com o pé da frente para voltar.',
  ], 'Mais fácil para os joelhos que o afundo à frente.', { p: 'mid', reps: 10, step: 2 }),
  q.ban('step-up-banco', 'Subida no banco (step-up)', ['Step up', 'Subida no step'], ['gluteos', 'posterior-coxa'], 'i', [
    'De frente para um banco, apoie um pé inteiro sobre ele.', 'Suba empurrando com a perna de cima até ficar em pé sobre o banco.', 'Desça devagar com controle.',
  ], 'Evite impulsionar com a perna de baixo.', { p: 'mid', reps: 10, step: 2 }),

  // ---- máquinas de pernas
  q.maq('leg-press-45', 'Leg press 45°', ['Leg press', 'Leg press inclinado'], ['gluteos', 'posterior-coxa'], 'i', [
    'Costas e quadril apoiados, pés na plataforma.', 'Empurre até quase estender os joelhos, sem travar.', 'Volte devagar sem tirar o quadril do banco.',
  ], 'Pés na largura dos ombros; nunca trave os joelhos no topo.', { p: 'leg', step: 5, art: 'leg_press_45', legacy: 'ex-leg-press-45' }),
  q.maq('leg-press-horizontal', 'Leg press horizontal', ['Leg press sentado'], ['gluteos', 'posterior-coxa'], 'i', [
    'Lombar e quadril apoiados, pés na largura dos ombros.', 'Empurre a plataforma até quase estender os joelhos.', 'Volte devagar até ~90° sem tirar o quadril do banco.',
  ], 'Mantenha lombar e quadril colados no encosto.', { p: 'leg', step: 5, art: 'leg_press', legacy: 'ex-leg-press' }),
  q.maq('cadeira-extensora', 'Cadeira extensora', ['Extensora', 'Leg extension', 'Extensão de joelhos'], [], 'i', [
    'Joelho alinhado com o eixo; apoio logo acima do tornozelo.', 'Estenda os joelhos até quase retos e segure 1 segundo.', 'Desça devagar.',
  ], 'Evite impulsionar; a contração no topo é o que trabalha o músculo.', { p: 'leg', step: 5, art: 'leg_extension', legacy: 'ex-extensora' }),
  q.maq('cadeira-extensora-unilateral', 'Cadeira extensora unilateral', ['Extensora unilateral', 'Single leg extension'], [], 'm', [
    'Ajuste o apoio logo acima do tornozelo de uma perna.', 'Estenda o joelho até quase reto e segure 1 segundo.', 'Desça devagar e troque de perna.',
  ], 'Corrige desequilíbrios entre as pernas.', { p: 'mach', step: 2.5 }),

  // ================= POSTERIOR DE COXA
  p.maq('cadeira-flexora', 'Cadeira flexora', ['Flexora sentada', 'Seated leg curl', 'Flexora'], ['panturrilhas'], 'i', [
    'Pernas esticadas sobre o apoio, coxas presas.', 'Flexione os joelhos levando os calcanhares para baixo e para trás.', 'Volte devagar sem deixar a carga encostar.',
  ], 'Ajuste o encosto para o joelho ficar alinhado com o eixo.', { p: 'mach', art: 'leg_curl' }),
  p.maq('flexora-deitada', 'Flexora deitada', ['Mesa flexora', 'Lying leg curl'], ['panturrilhas'], 'i', [
    'Deitada de bruços, rolo sobre os calcanhares.', 'Flexione os joelhos levando os calcanhares ao glúteo.', 'Volte devagar sem tirar o quadril do banco.',
  ], 'Mantenha o quadril colado no banco.', { p: 'leg', step: 5, art: 'lying_leg_curl', legacy: 'ex-flexora-deitada' }),
  p.maq('flexora-em-pe-unilateral', 'Flexora em pé unilateral', ['Flexora em pé', 'Standing leg curl'], ['panturrilhas'], 'i', [
    'Em pé, apoiada na máquina, rolo atrás do calcanhar.', 'Flexione o joelho levando o calcanhar ao glúteo.', 'Quadril parado; volte devagar; troque de perna.',
  ], 'Evite arquear a lombar para ajudar o movimento.', { p: 'leg', step: 2.5, art: 'standing_leg_curl', legacy: 'ex-flexora-em-pe' }),
  p.bar('stiff-barra', 'Stiff com barra', ['Levantamento terra romeno', 'RDL', 'Romanian deadlift', 'Stiff'], ['gluteos', 'lombar'], 'm', [
    'Em pé, joelhos levemente flexionados, barra à frente das coxas.', 'Leve o quadril para trás inclinando o tronco, com a barra rente às pernas.', 'Volte contraindo glúteos e posteriores.',
  ], 'Coluna reta o tempo todo; desça até sentir alongar atrás das coxas.', { p: 'comp', reps: 10 }),
  p.hal('stiff-halteres', 'Stiff com halteres', ['RDL com halteres', 'Romanian deadlift com halteres'], ['gluteos', 'lombar'], 'i', [
    'Em pé, joelhos levemente flexionados, halteres à frente das coxas.', 'Leve o quadril para trás inclinando o tronco, com os halteres rentes às pernas.', 'Volte contraindo glúteos e posteriores.',
  ], 'Não arredonde as costas: o movimento nasce no quadril.', { p: 'mid', art: 'rdl' }),
  p.hal('stiff-unilateral-halter', 'Stiff unilateral com halter', ['Single leg RDL', 'Levantamento terra unilateral'], ['gluteos', 'lombar'], 'm', [
    'Em pé sobre uma perna, com um halter na mão oposta.', 'Incline o tronco à frente levando a outra perna para trás.', 'Volte contraindo o glúteo e o posterior.',
  ], 'Olhe um ponto fixo à frente para manter o equilíbrio.', { p: 'iso', step: 1 }),
  p.smi('stiff-smith', 'Stiff no Smith', ['Smith RDL', 'Stiff guiado'], ['gluteos', 'lombar'], 'i', [
    'Em pé, barra do Smith à frente das coxas, joelhos levemente flexionados.', 'Leve o quadril para trás deslizando a barra rente às pernas.', 'Volte contraindo glúteos e posteriores.',
  ], 'A barra guiada ajuda a manter a trajetória reta.', { p: 'mid', step: 2.5 }),
  p.bar('bom-dia-barra', 'Bom dia com barra', ['Good morning', 'Bom dia'], ['lombar', 'gluteos'], 'a', [
    'Barra apoiada nas costas, joelhos levemente flexionados.', 'Incline o tronco à frente levando o quadril para trás, com a coluna reta.', 'Volte à posição inicial contraindo glúteos e posteriores.',
  ], 'Use carga leve: exige muito da região lombar.', { p: 'iso', reps: 10, step: 2.5 }),
  p.pol('flexora-polia', 'Flexora na polia', ['Cable leg curl', 'Flexão de joelho no cabo'], ['panturrilhas'], 'm', [
    'Prenda a tornozeleira, apoie-se na torre e fique de frente para a polia baixa.', 'Flexione o joelho levando o calcanhar em direção ao glúteo.', 'Volte devagar controlando o cabo.',
  ], 'Mantenha o quadril parado.', { p: 'iso', step: 1.25 }),
  p.bol('flexao-pernas-bola', 'Flexão de pernas na bola suíça', ['Stability ball leg curl', 'Flexora na bola'], ['gluteos', 'abdomen-core'], 'm', [
    'Deite de costas com os calcanhares sobre a bola e o quadril elevado.', 'Flexione os joelhos puxando a bola em direção ao glúteo.', 'Estenda as pernas devagar de volta.',
  ], 'Mantenha o quadril elevado durante todo o movimento.', { p: 'bw', reps: 10 }),
  p.pc('flexao-nordica', 'Flexão nórdica', ['Nordic hamstring curl', 'Nordic curl'], ['gluteos'], 'a', [
    'Ajoelhe com os tornozelos presos e o corpo reto.', 'Incline o corpo para frente o mais devagar possível, controlando com os posteriores.', 'Apoie as mãos no chão e empurre para voltar.',
  ], 'Muito exigente: faça poucas repetições e use as mãos para ajudar.', { p: 'bw', reps: 5 }),
  p.maq('elevacao-gluteo-isquiotibial', 'Elevação glúteo-isquiotibial (GHR)', ['Glute ham raise', 'GHD'], ['gluteos', 'lombar'], 'a', [
    'Posicione-se no banco GHD com os pés presos e o quadril na almofada.', 'Desça o tronco controlando com os posteriores.', 'Suba flexionando os joelhos e estendendo o quadril.',
  ], 'Comece com amplitude parcial e avance aos poucos.', { p: 'bw', reps: 8 }),

  // ================= GLÚTEOS
  gl.bar('elevacao-pelvica-barra', 'Elevação pélvica com barra', ['Elevação pélvica', 'Hip thrust', 'Hip thrust com barra'], ['posterior-coxa', 'quadriceps'], 'm', [
    'Parte alta das costas no banco, barra sobre o quadril.', 'Empurre o chão elevando o quadril até alinhar ombro e joelho.', 'Segure 1 segundo e desça devagar.',
  ], 'Use uma almofada na barra para proteger o quadril; queixo levemente recolhido.', { p: 'leg', step: 5, art: 'hip_thrust', legacy: 'ex-pelvica' }),
  gl.maq('elevacao-pelvica-maquina', 'Elevação pélvica na máquina', ['Hip thrust machine', 'Glute drive'], ['posterior-coxa'], 'i', [
    'Sente com as costas apoiadas e o cinto sobre o quadril.', 'Empurre os pés elevando o quadril contraindo os glúteos.', 'Desça devagar.',
  ], 'Boa opção para cargas altas com conforto.', { p: 'mach' }),
  gl.hal('elevacao-pelvica-halter', 'Elevação pélvica com halter', ['Hip thrust com halter', 'Dumbbell hip thrust'], ['posterior-coxa'], 'i', [
    'Parte alta das costas no banco, halter apoiado sobre o quadril.', 'Eleve o quadril contraindo os glúteos.', 'Desça devagar.',
  ], 'Ótimo para começar a aprender o movimento.', { p: 'mid', step: 2 }),
  gl.pc('elevacao-pelvica-unilateral', 'Elevação pélvica unilateral', ['Single leg hip thrust'], ['posterior-coxa'], 'm', [
    'Parte alta das costas no banco, um pé apoiado e a outra perna estendida.', 'Eleve o quadril contraindo o glúteo da perna de apoio.', 'Desça devagar e troque de lado.',
  ], 'Mantenha o quadril nivelado durante o movimento.', { p: 'bw', reps: 10 }),
  gl.smi('elevacao-pelvica-smith', 'Elevação pélvica no Smith', ['Hip thrust no Smith'], ['posterior-coxa'], 'm', [
    'Parte alta das costas no banco, barra do Smith sobre o quadril.', 'Eleve o quadril até alinhar ombros e joelhos.', 'Desça devagar.',
  ], 'A barra guiada ajuda a manter a trajetória.', { p: 'mid', step: 5 }),
  gl.pc('ponte-de-gluteo', 'Ponte de glúteo', ['Glute bridge', 'Ponte', 'Elevação de quadril no solo'], ['posterior-coxa', 'lombar'], 'i', [
    'Deitada de barriga para cima, joelhos dobrados e pés no chão.', 'Eleve o quadril contraindo os glúteos.', 'Desça devagar sem encostar totalmente no chão.',
  ], 'Empurre pelos calcanhares e não arqueie a lombar.', { p: 'bw', reps: 15 }),
  gl.ela('ponte-gluteo-elastico', 'Ponte de glúteo com elástico', ['Banded glute bridge'], ['abdutores', 'posterior-coxa'], 'i', [
    'Deitada de costas, elástico acima dos joelhos e pés no chão.', 'Eleve o quadril empurrando os joelhos para fora contra o elástico.', 'Desça devagar.',
  ], 'Mantenha a tensão do elástico durante todo o movimento.', { p: 'light' }),
  gl.pol('extensao-quadril-polia', 'Extensão de quadril na polia', ['Glúteo na polia', 'Cable kickback', 'Coice na polia'], ['posterior-coxa'], 'i', [
    'Tornozeleira presa, mãos apoiadas na torre.', 'Leve a perna para trás e para cima contraindo o glúteo, sem arquear a lombar.', 'Volte devagar sem deixar o peso encostar.',
  ], 'Movimento curto e controlado; o quadril fica parado.', { p: 'leg', step: 2.5, art: 'cable_kickback', legacy: 'ex-ext-quadril-polia' }),
  gl.pc('gluteo-quatro-apoios', 'Glúteo em quatro apoios', ['Coice de glúteo', 'Donkey kick', 'Kickback no solo'], ['posterior-coxa', 'lombar'], 'i', [
    'Quatro apoios: mãos sob os ombros, abdômen firme.', 'Eleve uma perna dobrada empurrando o calcanhar para o teto.', 'Coxa na altura do quadril, sem arquear a lombar; volte devagar.',
  ], 'Pode usar caneleira ou elástico para aumentar a dificuldade.', { p: 'leg', step: 1, bw: true, art: 'quadruped_kickback', legacy: 'ex-quatro-apoios' }),
  gl.maq('coice-maquina', 'Coice na máquina', ['Glute kickback machine', 'Extensão de quadril na máquina'], ['posterior-coxa'], 'i', [
    'Apoie o peito na almofada e posicione o pé na plataforma.', 'Empurre a perna para trás contraindo o glúteo.', 'Volte devagar controlando a carga.',
  ], 'Evite arquear a lombar no final do movimento.', { p: 'mach', step: 2.5 }),
  gl.ela('agachamento-elastico', 'Agachamento com elástico', ['Banded squat', 'Agachamento com mini band'], ['quadriceps', 'abdutores'], 'i', [
    'Elástico acima dos joelhos, pés na largura dos ombros.', 'Desça flexionando joelhos e quadril, empurrando os joelhos contra o elástico.', 'Suba empurrando o chão.',
  ], 'Não deixe os joelhos fecharem para dentro.', { p: 'light' }),
  gl.pol('pull-through-polia', 'Pull-through na polia', ['Cable pull through', 'Puxada entre as pernas'], ['posterior-coxa', 'lombar'], 'm', [
    'De costas para a polia baixa, segure a corda entre as pernas e dê um passo à frente.', 'Leve o quadril para trás inclinando o tronco com a coluna reta.', 'Estenda o quadril contraindo os glúteos.',
  ], 'O movimento é de quadril, não de braços.', { p: 'iso', step: 2.5 }),
  gl.maq('leg-press-pes-altos', 'Leg press com pés altos e afastados', ['Leg press glúteo', 'Leg press pés altos'], ['posterior-coxa', 'quadriceps'], 'i', [
    'Costas e quadril apoiados, pés altos e mais abertos que os ombros na plataforma.', 'Desça até os joelhos formarem ~90° sem tirar o quadril do banco.', 'Empurre a plataforma sem travar os joelhos.',
  ], 'Pés mais altos aumentam a participação de glúteos e posteriores.', { p: 'mach' }),
  gl.pc('step-up-lateral', 'Step-up lateral', ['Subida lateral no banco', 'Lateral step up'], ['quadriceps', 'abdutores'], 'm', [
    'Em pé ao lado de um banco, apoie um pé inteiro sobre ele.', 'Suba lateralmente empurrando com a perna de cima.', 'Desça devagar e repita.',
  ], 'Mantenha o quadril nivelado.', { p: 'bw', reps: 10 }),

  // ================= ADUTORES
  ad.maq('cadeira-adutora', 'Cadeira adutora', ['Adutora', 'Hip adduction', 'Máquina adutora'], [], 'i', [
    'Costas apoiadas, apoios na parte interna dos joelhos.', 'Feche as pernas sem balançar o tronco.', 'Abra devagar, controlando o peso.',
  ], 'Evite abrir demais as pernas na volta.', { p: 'leg', step: 5, art: 'hip_adduction', legacy: 'ex-adutora' }),
  ad.pol('aducao-polia', 'Adução de quadril na polia', ['Cable hip adduction', 'Adutora na polia'], [], 'm', [
    'Tornozeleira presa na perna mais próxima da torre, apoie-se nela.', 'Leve a perna para dentro cruzando à frente da outra.', 'Volte devagar controlando o cabo.',
  ], 'Mantenha o tronco parado.', { p: 'iso', step: 1.25 }),
  ad.hal('agachamento-sumo-step', 'Agachamento sumô no step', ['Sumô no step', 'Agachamento sumô'], ['gluteos', 'quadriceps'], 'i', [
    'Pés afastados sobre o step, pontas para fora, halter ao centro.', 'Desça o quadril com os joelhos abertos na direção dos pés.', 'Suba empurrando o chão e contraindo os glúteos.',
  ], 'Joelhos sempre na direção das pontas dos pés.', { p: 'leg', step: 2, art: 'sumo_squat', legacy: 'ex-sumo-step' }),
  ad.hal('agachamento-sumo-halter', 'Agachamento sumô com halter', ['Sumo squat'], ['gluteos', 'quadriceps'], 'i', [
    'Pés bem afastados com as pontas para fora, halter entre as pernas com os braços estendidos.', 'Desça flexionando joelhos e quadril, abrindo os joelhos.', 'Suba apertando glúteos e adutores.',
  ], 'Mantenha o tronco ereto durante todo o movimento.', { p: 'mid', step: 2 }),
  ad.pc('afundo-lateral', 'Afundo lateral', ['Lateral lunge', 'Passada lateral', 'Side lunge'], ['gluteos', 'quadriceps'], 'm', [
    'Em pé, pés juntos. Dê um passo largo para o lado.', 'Flexione o joelho do lado do passo levando o quadril para trás, com a outra perna estendida.', 'Empurre o chão para voltar.',
  ], 'Mantenha o pé de trás inteiro apoiado no chão.', { p: 'bw', reps: 10 }),
  ad.pc('aducao-deitada', 'Adução de quadril deitada', ['Elevação de perna lateral inferior', 'Side-lying adduction'], [], 'i', [
    'Deite de lado com a perna de baixo estendida e a de cima apoiada à frente.', 'Eleve a perna de baixo em direção ao teto.', 'Desça devagar sem encostar no chão.',
  ], 'Pode usar caneleira para aumentar a dificuldade.', { p: 'light' }),

  // ================= ABDUTORES
  ab.maq('cadeira-abdutora', 'Cadeira abdutora', ['Abdutora', 'Hip abduction', 'Máquina abdutora'], ['gluteos'], 'i', [
    'Costas apoiadas, apoios na parte externa dos joelhos.', 'Abra as pernas sem balançar o tronco.', 'Segure 1 segundo e feche devagar.',
  ], 'Incline o tronco levemente à frente para enfatizar mais o glúteo.', { p: 'leg', step: 5, art: 'hip_abduction', legacy: 'ex-abdutora' }),
  ab.pol('abducao-polia', 'Abdução de quadril na polia', ['Cable hip abduction', 'Abdutora na polia'], ['gluteos'], 'm', [
    'Tornozeleira presa na perna mais distante da torre, apoie-se nela.', 'Leve a perna para o lado, afastando-a do corpo.', 'Volte devagar controlando o cabo.',
  ], 'Evite inclinar o tronco para o lado.', { p: 'iso', step: 1.25 }),
  ab.pc('abducao-deitada', 'Abdução de quadril deitada', ['Elevação lateral de perna', 'Side-lying hip abduction'], ['gluteos'], 'i', [
    'Deite de lado com a perna de baixo flexionada e a de cima estendida.', 'Eleve a perna de cima lateralmente sem girar o quadril.', 'Desça devagar.',
  ], 'Pode usar caneleira ou elástico para aumentar a dificuldade.', { p: 'light' }),
  ab.ela('caminhada-lateral-elastico', 'Caminhada lateral com elástico', ['Banded lateral walk', 'Monster walk lateral'], ['gluteos'], 'i', [
    'Elástico acima dos joelhos, joelhos levemente flexionados.', 'Dê passos laterais mantendo a tensão do elástico.', 'Volte para o outro lado sem juntar os pés.',
  ], 'Mantenha o tronco ereto e os pés paralelos.', { p: 'light', reps: 12 }),
  ab.pc('hidrante', 'Hidrante (fire hydrant)', ['Fire hydrant', 'Abdução em quatro apoios'], ['gluteos'], 'i', [
    'Em quatro apoios, mantenha o joelho dobrado a 90°.', 'Eleve o joelho lateralmente, abrindo o quadril.', 'Desça devagar sem girar o tronco.',
  ], 'Pode usar caneleira ou elástico acima dos joelhos.', { p: 'light' }),

  // ================= PANTURRILHAS
  pa.maq('panturrilha-em-pe-maquina', 'Panturrilha em pé na máquina', ['Standing calf raise', 'Gêmeos em pé'], [], 'i', [
    'Apoie os ombros nas almofadas e a ponta dos pés na plataforma.', 'Eleve os calcanhares o máximo possível.', 'Desça alongando completamente a panturrilha.',
  ], 'Amplitude completa e pausa de 1 segundo no topo.', { p: 'mach', reps: 15, step: 5 }),
  pa.maq('panturrilha-sentada', 'Panturrilha sentada', ['Seated calf raise', 'Sóleo sentado'], [], 'i', [
    'Sente com os joelhos sob a almofada e a ponta dos pés na plataforma.', 'Eleve os calcanhares o máximo possível.', 'Desça alongando completamente.',
  ], 'Com o joelho flexionado, o foco passa para o sóleo.', { p: 'mach', reps: 15, step: 5 }),
  pa.maq('panturrilha-leg-press', 'Panturrilha no leg press', ['Calf press', 'Gêmeos no leg press'], [], 'i', [
    'Apoie a ponta dos pés na parte baixa da plataforma, joelhos quase estendidos.', 'Empurre a plataforma elevando os calcanhares.', 'Volte alongando a panturrilha.',
  ], 'Não trave os joelhos durante o exercício.', { p: 'mach', reps: 15, step: 5 }),
  pa.smi('panturrilha-smith', 'Panturrilha no Smith', ['Calf raise no Smith'], [], 'i', [
    'Barra apoiada nos ombros, ponta dos pés sobre um step.', 'Eleve os calcanhares o máximo possível.', 'Desça alongando completamente a panturrilha.',
  ], 'Use um step firme e estável.', { p: 'mid', reps: 15, step: 5 }),
  pa.pc('elevacao-panturrilha-em-pe', 'Elevação de panturrilha em pé', ['Panturrilha em pé', 'Calf raise', 'Gêmeos em pé sem carga'], [], 'i', [
    'Em pé, apoiada na ponta dos pés, joelhos estendidos.', 'Eleve os calcanhares o máximo possível.', 'Desça devagar alongando a panturrilha.',
  ], 'Pode ser feita em um degrau para aumentar a amplitude.', { p: 'bw', reps: 20, art: 'calf_raise' }),
  pa.hal('panturrilha-unilateral-degrau', 'Panturrilha unilateral no degrau', ['Single leg calf raise', 'Panturrilha em uma perna'], [], 'm', [
    'Apoie a ponta de um pé na borda de um degrau, segurando um halter e um apoio para equilíbrio.', 'Eleve o calcanhar o máximo possível.', 'Desça abaixo da linha do degrau alongando a panturrilha.',
  ], 'Faça com amplitude completa e sem balançar.', { p: 'mid', reps: 12, step: 1 }),
  pa.maq('panturrilha-burrinho', 'Panturrilha burrinho', ['Donkey calf raise', 'Gêmeos no burrinho'], [], 'm', [
    'Incline o tronco à frente apoiando-se na máquina, com a carga sobre o quadril.', 'Eleve os calcanhares o máximo possível.', 'Desça alongando completamente.',
  ], 'A posição inclinada alonga mais o gastrocnêmio.', { p: 'mach', reps: 15, step: 5 }),
  pa.ela('elevacao-tibial-anterior', 'Elevação de tibial anterior', ['Dorsiflexão', 'Tibial anterior'], [], 'i', [
    'Sentada com as pernas estendidas e o elástico (ou carga) no peito do pé.', 'Puxe a ponta dos pés em direção às canelas.', 'Volte devagar controlando.',
  ], 'Fortalece a região da canela e ajuda a prevenir dores.', { p: 'light', reps: 15 }),

  q.maq('leg-press-unilateral', 'Leg press unilateral', ['Single leg press', 'Leg press com uma perna'], ['gluteos', 'posterior-coxa'], 'm', [
    'Costas e quadril apoiados, apenas um pé no centro da plataforma.', 'Empurre até quase estender o joelho, sem travar.', 'Volte devagar e troque de perna.',
  ], 'Use metade da carga bilateral para começar.', { p: 'mach', step: 2.5 }),
  gl.maq('agachamento-hack-invertido', 'Agachamento hack invertido', ['Reverse hack squat', 'Hack reverso'], ['posterior-coxa', 'quadriceps'], 'm', [
    'Posicione-se de frente para o apoio da máquina, com o peito encostado e os pés na plataforma.', 'Desça flexionando os joelhos e empurrando o quadril para trás.', 'Suba empurrando a plataforma com os calcanhares.',
  ], 'Enfatiza os glúteos; mantenha o peito apoiado.', { p: 'mach' }),
  p.maq('cadeira-flexora-unilateral', 'Cadeira flexora unilateral', ['Single leg curl sentada', 'Flexora unilateral'], ['panturrilhas'], 'i', [
    'Sente com uma perna sobre o apoio e a outra livre.', 'Flexione o joelho levando o calcanhar para baixo e para trás.', 'Volte devagar e troque de perna.',
  ], 'Boa opção para equilibrar a força entre as pernas.', { p: 'mach', step: 2.5 }),
  gl.pc('ponte-gluteo-unilateral', 'Ponte de glúteo unilateral', ['Single leg glute bridge', 'Ponte com uma perna'], ['posterior-coxa', 'lombar'], 'm', [
    'Deitada de costas com um pé apoiado e a outra perna estendida.', 'Eleve o quadril contraindo o glúteo da perna de apoio.', 'Desça devagar e troque de perna.',
  ], 'Mantenha o quadril nivelado durante todo o movimento.', { p: 'bw', reps: 12 }),
  ab.ela('abducao-elastico-em-pe', 'Abdução de quadril em pé com elástico', ['Standing banded abduction', 'Abdução com mini band'], ['gluteos'], 'i', [
    'Em pé, elástico acima dos tornozelos, apoie-se em uma parede.', 'Leve uma perna para o lado contra a resistência do elástico.', 'Volte devagar e troque de lado.',
  ], 'Mantenha o tronco ereto e o pé de apoio firme.', { p: 'light' }),
  ad.bar('agachamento-sumo-barra', 'Agachamento sumô com barra', ['Barbell sumo squat', 'Agachamento pliê com barra'], ['gluteos', 'quadriceps'], 'm', [
    'Barra apoiada nas costas, pés bem afastados com as pontas para fora.', 'Desça flexionando joelhos e quadril, abrindo os joelhos na direção dos pés.', 'Suba apertando glúteos e adutores.',
  ], 'Mantenha o tronco ereto durante todo o movimento.', { p: 'comp', reps: 10 }),
];
