// Interpretação do texto de uma pedra Mega — `otherEffects` e `description`.
//
// Separado de `construir.mjs` pela mesma razão que `habilidades.mjs` e `efeitos.mjs`: é
// prosa do livro, e um erro aqui não deixa um campo vazio — ele inventa uma regra.
//
// O pack `mega-evolutions` é o MAIS estruturado dos quatro (treze campos de
// `flags[…].mega` carregam dado útil, contra três no `abilities`), então quase tudo vem
// de campo e não de texto. Só sobram dois pedaços de prosa, e os dois são armadilha:
//
//   1. `otherEffects` — 10 frases em 10 das 93 pedras, e NENHUMA é redundante com os
//      campos. Várias os CORRIGEM: Mega Eelektross tem `movementBonusFeet: 0` e diz
//      "+ 10 pés em todos os seus deslocamentos" no texto; Mega Delphox tem
//      `movementGrants: []` e ganha voo de 40 pés só na prosa; Mega Floette tem
//      `passiveAbility: ""` e ganha Fairy Aura só aqui. Zero e lista vazia querem dizer
//      "o campo não foi preenchido", não "não há".
//
//   2. `description` — a prosa de sabor, e o texto mais contaminado que o módulo tem.
//      Quatro das 93 carregam conteúdo de outra entrada: a de Mega Delphox traz um bloco
//      de estatísticas de espécie INTEIRO (o de Eternal Flower Floette, com CA, PV,
//      atributos, duas habilidades com regra completa e lista de Moves), e a de Mega
//      Hawlucha traz a lore de Mega Zygarde mais o statblock do Move Nihil Light.
//
// O `<ul>` de `system.description.value` fica deliberadamente de fora: agrupando os 475
// `<li>` do corpus em formas de frase, todas saem de um campo estruturado — nenhum fato
// vive só ali. O que ele dá de graça é o vocabulário em português do próprio módulo
// ("à escolha do jogador", "em todos os deslocamentos"), que a interface copia.
//
// Cada família segue o desenho de `habilidades.mjs` — `sinal` largo, `ler` estreito —, só
// que a unidade aqui é a ENTRADA de `otherEffects`, não a frase: o módulo já separou as
// afirmações em itens de lista. Uma entrada com sinal da família da qual nada foi extraído
// é a única que vai para `dados/relatorio.json`. É o que separa "o livro não declara isso"
// de "o livro declara e eu não entendi".

/**
 * A string de pendência que o módulo grava onde a habilidade ainda não existe.
 *
 * Aparece em 10 das 93 pedras como valor de `passiveAbility` e uma vez dentro de
 * `otherEffects` (Mega Hawlucha, que já tem No Guard e ganharia uma segunda). É marca de
 * trabalho a fazer na fonte, não nome de habilidade: lida como nome produz uma ficha
 * chamada "[ainda a ser lançada]".
 */
const PENDENCIA = /^\s*\[\s*ainda a ser lançada\s*\]\s*$/i

/** A habilidade que a pedra nomeia é a marca de pendência do módulo, não um nome. */
export function habilidadePendente(nome = "") {
	return PENDENCIA.test(nome)
}

// ------------------------------------------------------------------ Vocabulários

/**
 * Nome de tamanho no texto → chave do Foundry.
 *
 * Existe para UMA frase ("Aumenta de tamanho para Imenso", em Mega Hawlucha) e serve
 * principalmente para provar que ela não casa: a escala do PMP é Minúsculo, Pequeno,
 * Médio, Grande, **Enorme** e Gigantesco — `huge` é "Enorme", e "Imenso" é uma sétima
 * palavra que o vocabulário do sistema não tem. Mapear "Imenso" para `huge` por
 * parecença seria adivinhar um degrau da escala, então a frase vai para o relatório.
 *
 * A tabela fica aqui, e não só em `tamanhos.ts`, porque o pipeline não importa do app —
 * e porque o que ela aceita são os nomes como o LIVRO os escreve, não os `id` das rotas.
 */
const TAMANHO_POR_NOME = {
	minúsculo: "tiny", minusculo: "tiny",
	pequeno: "small",
	médio: "medium", medio: "medium",
	grande: "large",
	enorme: "huge",
	gigantesco: "gigantic",
}

/**
 * Modo de deslocamento como a pedra o escreve → modo do compêndio.
 *
 * `flutuação` merece nota. A Pokédex **nunca** usa a palavra como modo sozinho (0 das
 * 1.149): ela escreve `"6m de voo (flutuação)"` em 98 espécies, sempre como qualificador
 * do voo — é o voo que ignora terreno difícil. O pack de Megas, por outro lado, grava
 * `{ type: "flutuação" }` em `movementGrants` e "deslocamento de flutuação" no texto.
 *
 * Como "flutuação" só tem um significado neste sistema, ela entra como o par
 * `voo` + `flutuacao: true`, que é exatamente a forma que `interpretarDeslocamento`
 * produz para as espécies — e assim a Mega e a espécie-base se formatam com a mesma
 * função. Um modo fora desta tabela não vira dado: vai para o relatório.
 */
const MODO_DE_DESLOCAMENTO = {
	caminhada: { modo: "caminhada" },
	natação: { modo: "natação" }, natacao: { modo: "natação" },
	nado: { modo: "natação" },
	voo: { modo: "voo" },
	flutuação: { modo: "voo", flutuacao: true },
	flutuacao: { modo: "voo", flutuacao: true },
	escalada: { modo: "escalada" },
	escavação: { modo: "escavação" }, escavacao: { modo: "escavação" },
}

/**
 * Pés → metros, na equivalência que o próprio módulo declara.
 *
 * O pack de Megas grava deslocamento em PÉS (`movementBonusFeet`, "de 40 pés") enquanto a
 * Pokédex grava em METROS em 1.148 das 1.149 ("9m de caminhada"), sem uma única
 * ocorrência de "pés". Publicar o número cru mostraria "+20 de deslocamento" na ficha da
 * Mega ao lado de "9m de caminhada" na da espécie.
 *
 * O fator não é escolha nossa: o corpus declara os dois lados três vezes — "40 pés (12
 * metros)" duas e "+ 10 pés (3 metros)" uma —, sempre 0,3 m/pé, que é a convenção do
 * dnd5e em português (1,5 m por 5 pés). Todos os valores do campo são múltiplos de 5.
 */
export function pesEmMetros(pes) {
	return Math.round(pes * 0.3 * 10) / 10
}

/** `{ type: "flutuação", equalTo: "caminhada" }` → `{ modo: "voo", flutuacao: true, igualA: "caminhada" }`. */
export function interpretarDeslocamentoConcedido({ type, equalTo } = {}) {
	const concedido = MODO_DE_DESLOCAMENTO[String(type ?? "").toLowerCase()]
	if (concedido == null) return null

	const base = MODO_DE_DESLOCAMENTO[String(equalTo ?? "").toLowerCase()]
	return { ...concedido, igualA: base?.modo ?? null }
}

// ------------------------------------------------------------------ Habilidade concedida

/**
 * "Ganha a habilidade Fairy Aura", "Mantém a habilidade Snow Warning".
 *
 * Duas das quatro pedras com `passiveAbility` vazia declaram a habilidade AQUI — e uma
 * delas (Mega Floette → Fairy Aura) nomeia uma habilidade que existe no pack. Quem lê só
 * `passiveAbility` publica "sem habilidade" para Mega Floette, e a ficha de Fairy Aura
 * nunca descobre que uma Mega a concede.
 *
 * O nome não é resolvido aqui: `construir.mjs` o confere contra o pack, como faz com os
 * alvos de evolução e os Moves de habilidade, e relata o que não casar. É o que mantém o
 * acoplamento num lugar só.
 */
const SINAL_HABILIDADE = /\bhabilidade\b/i
const HABILIDADE_CONCEDIDA = /\b(?:Ganha|Mantém|Mantem)\s+a\s+habilidade\s+(.+?)\s*$/i

/**
 * O texto da fonte foi cortado no meio.
 *
 * Mega Abomasnow grava "Mantém a habilidade Snow Warning (torna-se Snow" — parêntese
 * aberto e palavra pela metade. A habilidade "Snow Warning" existe no pack, mas o nome
 * capturado inclui o fragmento, então não casa. Aparar no "(" devolveria o nome certo
 * **por sorte**: nada garante que o próximo corte caia depois de um nome completo, e
 * adivinhar onde o texto acabaria é justamente o que o pipeline não faz. Marcamos o corte
 * e deixamos o relatório pedir a correção na fonte.
 */
function truncado(texto) {
	const abre = (texto.match(/\(/g) ?? []).length
	const fecha = (texto.match(/\)/g) ?? []).length
	return abre > fecha
}

function lerHabilidadeConcedida(entrada) {
	const casa = entrada.match(HABILIDADE_CONCEDIDA)
	if (casa == null) return []

	const nome = casa[1].trim()

	// A marca de pendência não é nome de habilidade: vira a própria ausência, sinalizada,
	// como `semRegra` faz com as 74 habilidades sem regra no módulo.
	if (habilidadePendente(nome)) return [ { tipo: "habilidadePendente" } ]

	return [ { tipo: "habilidadeConcedida", nome, ...(truncado(nome) ? { truncado: true } : {}) } ]
}

// ------------------------------------------------------------------ Tamanho

/**
 * "Aumenta de tamanho para Imenso" — a única frase da família, e ela não casa.
 *
 * Mega Hawlucha tem `size: null` no campo estruturado e declara a mudança só no texto, com
 * uma palavra que a escala do PMP não usa. A família existe para que isso apareça no
 * relatório como trabalho a fazer, em vez de o tamanho sumir em silêncio.
 */
const SINAL_TAMANHO = /\btamanho\b/i
const TAMANHO_NO_TEXTO = /\b(?:Aumenta|Muda|Reduz)(?:\s+\w+)?\s+(?:de\s+)?tamanho\s+(?:para|a)\s+([A-Za-zÀ-ÿ]+)/i

function lerTamanho(entrada) {
	const casa = entrada.match(TAMANHO_NO_TEXTO)
	if (casa == null) return []

	const chave = TAMANHO_POR_NOME[casa[1].toLowerCase()]
	return chave != null ? [ { tipo: "tamanho", chave } ] : []
}

// ------------------------------------------------------------------ Deslocamento

/**
 * Quatro formas, e cada uma contradiz um campo estruturado:
 *
 *   - "Ganha deslocamento de voo de 40 pés (12 metros)" — `movementGrants: []`, e o valor
 *     é ABSOLUTO, ao contrário do `equalTo: "caminhada"` do campo (Delphox, Tatsugiri);
 *   - "+ 10 pés (3 metros) em todos os seus deslocamentos" — `movementBonusFeet: 0`
 *     (Eelektross). Repare no ESPAÇO depois do `+`: um `/^\+\d+/` não casa;
 *   - "Seu deslocamento é reduzido pela metade" — metade não é delta fixo, e nenhum campo
 *     do módulo expressa proporção (Abomasnow);
 *   - "Perde seu deslocamento de nado" — nenhum campo expressa remoção (Golisopod).
 *
 * As quatro saem em metros, pela razão de `pesEmMetros`.
 */
const SINAL_DESLOCAMENTO = /\bdeslocament/i
const CONCEDE = /\bGanha\s+deslocamento\s+de\s+([A-Za-zÀ-ÿ]+)\s+de\s+(\d+)\s*pés/i
const BONUS_EM_TODOS = /\+\s*(\d+)\s*pés\b[^.]*?\bem\s+todos\s+os\s+(?:seus\s+)?deslocamentos/i
const METADE = /\bdeslocamento\b[^.]*?\breduzid[oa]\s+pela\s+metade/i
const PERDE = /\bPerde\s+(?:seu\s+)?deslocamento\s+de\s+([A-Za-zÀ-ÿ]+)/i

function lerDeslocamento(entrada) {
	const concede = entrada.match(CONCEDE)
	if (concede != null) {
		const modo = MODO_DE_DESLOCAMENTO[concede[1].toLowerCase()]
		// Modo fora do vocabulário não vira dado: devolver nada deixa a frase no relatório.
		return modo != null
			? [ { tipo: "deslocamentoConcedido", ...modo, metros: pesEmMetros(Number(concede[2])) } ]
			: []
	}

	const bonus = entrada.match(BONUS_EM_TODOS)
	if (bonus != null) {
		return [ { tipo: "deslocamentoBonus", metros: pesEmMetros(Number(bonus[1])) } ]
	}

	if (METADE.test(entrada)) return [ { tipo: "deslocamentoMetade" } ]

	const perde = entrada.match(PERDE)
	if (perde != null) {
		const modo = MODO_DE_DESLOCAMENTO[perde[1].toLowerCase()]
		return modo != null ? [ { tipo: "deslocamentoPerdido", modo: modo.modo } ] : []
	}

	return []
}

// ------------------------------------------------------------------ Entrada

const FAMILIAS = [
	{ nome: "habilidade", sinal: SINAL_HABILIDADE, ler: lerHabilidadeConcedida },
	{ nome: "tamanho", sinal: SINAL_TAMANHO, ler: lerTamanho },
	{ nome: "deslocamento", sinal: SINAL_DESLOCAMENTO, ler: lerDeslocamento },
]

/**
 * Os fatos mecânicos de `otherEffects`.
 *
 * @param {string[]} entradas As entradas de `mega.otherEffects`, como o módulo as grava.
 * @returns {{ efeitos: object[], textos: string[], naoInterpretado: { familia: string, frase: string }[] }}
 *
 * `textos` é o que sobra: entrada sem sinal de família nenhuma, que a ficha mostra como
 * prosa. São as regras de ativação das três pedras especiais — a Reversão Primal de
 * Groudon e Kyogre e o "não precisa de pedra" de Rayquaza —, que declaram nível mínimo,
 * usos por descanso e condição de obediência. Estruturá-las seria modelar um vocabulário
 * a partir de três frases; exibidas, continuam sendo a regra inteira.
 *
 * Uma entrada que a família leu NÃO entra em `textos`: o fato já aparece estruturado, e
 * repetir a frase ao lado da pílula diria a mesma coisa duas vezes.
 */
export function interpretarOutrosEfeitos(entradas = []) {
	const efeitos = []
	const textos = []
	const naoInterpretado = []

	for (const entrada of entradas) {
		const frase = String(entrada ?? "").trim()
		if (frase === "") continue

		const familias = FAMILIAS.filter((familia) => familia.sinal.test(frase))
		const extraidos = familias.flatMap((familia) => familia.ler(frase))

		if (extraidos.length > 0) {
			efeitos.push(...extraidos)
			continue
		}

		// Com sinal e sem extração: o livro declara e o parser não entendeu. É o caso de
		// "Aumenta de tamanho para Imenso", cuja palavra está fora da escala do PMP.
		if (familias.length > 0) {
			naoInterpretado.push({ familia: familias[0].nome, frase })
			// A frase continua visível: o relatório é para corrigir a fonte, e quem consulta
			// no meio de uma sessão precisa da regra do livro mesmo sem a pílula de resumo.
			textos.push(frase)
			continue
		}

		textos.push(frase)
	}

	return { efeitos, textos, naoInterpretado }
}

// ------------------------------------------------------------------ Descrição

/**
 * O lead-in que o módulo repete em toda descrição, e os quatro jeitos de ele vir quebrado.
 *
 * A forma canônica é "<espécie-base> recebe os seguintes benefícios:" (66 das 93). As
 * outras 27: 11 começam **direto** em "recebe os seguintes benefícios:", sem sujeito
 * nenhum (Mega Glalie, Absol, Latias…); 3 começam com "Evoluir, Mega X recebe…"; 7 trazem
 * a forma Mega no lugar da base ("Mewtwo X recebe…"); e as 3 especiais têm abertura
 * própria ("Groudon não Mega Evolui — passa pela Reversão Primal…"), que NÃO é lead-in e
 * precisa sobreviver.
 *
 * Como a frase é só uma deixa — a página já diz de quem é a ficha —, removê-la resolve os
 * quatro casos com uma regra e sem inventar sujeito nenhum: os 11 sujeitos perdidos deixam
 * de ter consequência visível. O `?` no grupo do sujeito é o que faz as 11 sem sujeito
 * casarem junto.
 */
const LEAD_IN = /^(?:.{0,60}?\s)?recebe\s+os\s+seguintes\s+benefícios:\s*/i

/** A prosa da descrição, sem a deixa que o módulo repete nas 93. */
export function prosaDaDescricao(descricao = "") {
	return descricao.replace(LEAD_IN, "").trim()
}

/**
 * Marcas de que a descrição carrega texto que pertence a outra entrada do livro.
 *
 * Quatro das 93 estão contaminadas, e não com um resto de linha: a de **Mega Delphox**
 * traz a lore de Eternal Flower Floette e um bloco de estatísticas de espécie completo
 * (Tipo, SR, CA, PV, Dado de Vida, deslocamento, os seis atributos, perícias,
 * vulnerabilidades, resistências, Flower Veil e Symbiosis com regra inteira, lista de
 * Moves e Move Assinatura); a de **Mega Hawlucha** traz a lore de Mega Zygarde, a entrada
 * da pedra Zygardite e o statblock do Move Nihil Light; a de **Mega Pinsir** traz a
 * entrada da Aerodactylite; a de **Mega Abomasnow**, fragmentos de statblock.
 *
 * Zygardite e Aerodactylite NÃO estão no pack: é texto de Mega que o módulo não publica,
 * vazado para a descrição de outra.
 *
 * As quatro marcas abaixo pegam as 4 e nenhuma das 89 limpas (conferido lendo as cinco
 * maiores limpas até o fim). Cada uma é uma estrutura que não pode aparecer numa prosa de
 * sabor: a frase de abertura de OUTRA pedra, um segundo lead-in, campos de statblock de
 * espécie e campos de statblock de Move.
 */
const CONTAMINACAO = [
	[ "entrada de outra pedra", /Permite que .{1,40} Mega Evolua/ ],
	[ "segunda descrição de Mega", /recebe os seguintes benefícios[\s\S]+recebe os seguintes benefícios/i ],
	[ "bloco de estatísticas de espécie", /Bloco de estat[íi]sticas|Perícias Proficientes:|Pontos de Vida:|Dado de Vida:|Habilidade Oculta\b/ ],
	[ "statblock de Move", /Tempo de Execução:|Poder do Move:|Níveis Superiores:|Move Assinatura:/ ],
]

/**
 * A marca de contaminação da descrição, ou `null` quando ela está limpa.
 *
 * Decisão deliberada: a descrição contaminada **não é publicada**, ao contrário do
 * `textosDeMoveContaminados`, que mantém visível o crédito de arte vazado em Swallow. A
 * diferença não é de princípio, é de grau e de lugar — lá era uma linha a mais num campo
 * separado (`observacoes`), e dá para ver onde a regra acaba; aqui são até 2.600
 * caracteres DENTRO do único campo de prosa, e a ficha de Mega Delphox mostraria "CA: 17"
 * e a regra de Flower Veil como se fossem dela.
 *
 * Aparar o trecho vazado não é opção: as marcas provam a PRESENÇA da contaminação, não
 * onde ela começa — em Delphox o vazamento começa no meio de um parágrafo de sabor, muitas
 * linhas antes da primeira marca, e cortar na marca deixaria a lore da Floette dentro.
 * Então a página faz o que faz com as 74 habilidades sem regra: diz, em texto de
 * interface, que o módulo gravou texto de outra entrada ali, e o original inteiro vai para
 * o relatório.
 */
export function contaminacaoNaDescricao(descricao = "") {
	return CONTAMINACAO.find(([ , padrao ]) => padrao.test(descricao))?.[0] ?? null
}
