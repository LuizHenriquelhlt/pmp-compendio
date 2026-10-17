// Interpretação do texto de uma Habilidade Passiva.
//
// Separado de `construir.mjs` pela mesma razão que `efeitos.mjs`: é prosa livre do livro,
// e aqui um erro não deixa um campo vazio - ele inventa uma regra. "Esta habilidade não
// fornece imunidade" lido como imunidade (Justified) publica o oposto do livro, e quem
// consulta no meio de uma sessão não tem como saber.
//
// O pack `abilities` não ajuda: de todos os campos do documento, só `name`,
// `system.description.value` e o flag `placeholder` variam nas 313 habilidades. O resto é
// constante - inclusive `flags["pokemon-mundo-perfeito"].category`, que é
// `"habilidade-passiva"` em todas. O nome promete um vocabulário de categorias e entrega
// uma constante: não existe taxonomia de habilidade no módulo, nem derivável dele. Tudo
// o que este arquivo estrutura sai do texto.
//
// Cada família segue o desenho de `efeitos.mjs` - `sinal` largo, `falsoSinal` para as
// frases que usam as mesmas palavras para outra coisa, `naoDeclara` para as que CITAM o
// assunto sem afirmá-lo. Uma frase com sinal verdadeiro, que não é citação, e da qual
// nada foi extraído é a única que vai para `dados/relatorio.json`. É o que separa "o
// livro não declara isso" de "o livro declara e eu não entendi".
//
// O recorte da família de imunidade é deliberadamente estreito: só o que cai nos
// vocabulários que o PMP já tem (as condições de status e os 18 tipos). Imunidade a
// acerto crítico, a dano indireto, a Moves de som ou de gênero é regra do livro, mas
// modelá-la exigiria inventar um vocabulário de categorias que o sistema não publica -
// então essas vão para o relatório com a frase original. A descrição completa aparece
// sempre na página, então o que se perde é a pílula de resumo, não a regra.

/**
 * A nota que o módulo grava onde não achou a regra no livro.
 *
 * Nas 74 habilidades com `placeholder: true` (v1.33.0) a "descrição" é EXATAMENTE este
 * texto, e nenhuma das outras 239 se parece com ele. Cruzamos os dois sinais em vez de
 * confiar num só: o flag é a declaração da fonte, o texto é a evidência, e um pipeline
 * que leia só o texto quebra em silêncio quando a redação da nota mudar.
 */
const NOTA_DE_REGRA_AUSENTE = /Regra completa não encontrada no glossário de Habilidades Passivas/i

/**
 * A habilidade não tem regra no módulo - a descrição é uma nota de extração, não texto do
 * livro.
 *
 * Publicar essa nota como descrição mostraria um erro de pipeline onde se espera uma
 * regra. Devolvemos o diagnóstico para que a página diga o que de fato aconteceu, com
 * texto de interface, e o relatório guarde a lista.
 */
export function regraAusente({ placeholder, descricao = "" }) {
	return placeholder === true || NOTA_DE_REGRA_AUSENTE.test(descricao)
}

// ------------------------------------------------------------------ Vocabulários

/**
 * As condições de status do PMP, com as flexões do corpus de habilidades.
 *
 * Mesma tabela que `efeitos.mjs` usa para os Moves, e pela mesma razão de ordem:
 * `gravemente envenenad` vem antes de `envenenad` porque o livro trata as duas como
 * condições distintas e a segunda é sufixo da primeira.
 */
const STATUS = [
	[ /gravemente\s+envenenad[oa]s?/i, "gravemente-envenenado" ],
	[ /queimad[oa]s?/i, "queimado" ],
	[ /congelad[oa]s?/i, "congelado" ],
	[ /paralisad[oa]s?/i, "paralisado" ],
	[ /envenenad[oa]s?/i, "envenenado" ],
	[ /sonolent[oa]s?/i, "sonolento" ],
	[ /(?:dormindo|adormecid[oa]s?)/i, "dormindo" ],
	[ /confus[oa]s?/i, "confuso" ],
	[ /atordoad[oa]s?/i, "atordoado" ],
	[ /encantad[oa]s?/i, "encantado" ],
	[ /amedrontad[oa]s?/i, "amedrontado" ],
	[ /impedid[oa]s?/i, "impedido" ],
	[ /caíd[oa]s?/i, "caido" ],
	[ /ceg[oa]s?/i, "cego" ],
	[ /exaust[oa]s?/i, "exausto" ],
]

/**
 * Nome de tipo no texto → `id` do tipo.
 *
 * `terra` está aqui porque Levitate escreve "Moves do tipo terra" onde o resto do corpus
 * escreve "Terrestre". Uma tabela que só aceite os nomes canônicos perde exatamente a
 * habilidade mais conhecida da família.
 */
export const TIPO_POR_NOME = {
	normal: "normal", fogo: "fogo", água: "agua", agua: "agua", elétrico: "eletrico",
	eletrico: "eletrico", grama: "grama", gelo: "gelo", lutador: "lutador",
	venenoso: "venenoso", terrestre: "terrestre", terra: "terrestre", voador: "voador",
	psíquico: "psiquico", psiquico: "psiquico", inseto: "inseto", pedra: "pedra",
	fantasma: "fantasma", dragão: "dragao", dragao: "dragao", sombrio: "sombrio",
	aço: "aco", aco: "aco", fada: "fada",
}

/**
 * Os climas do PMP, com as formas que o corpus usa.
 *
 * **Granizo e neve são climas distintos.** O pack de Moves tem `Hail`, `Snowscape` e
 * `Chilly Reception` como Moves separados, e 11 Moves falam de neve ou nevasca contra 7
 * de granizo. Mesclar os dois inventaria uma regra.
 *
 * `graniz` cobre "granizo" e "granizando" com um padrão só; `nevad` cobre "condições
 * frias e nevadas" (Forecast).
 */
const CLIMAS = [
	[ /chuva|chovendo/i, "chuva" ],
	[ /luz\s+(?:do\s+sol|solar)|sol\s+intenso/i, "sol" ],
	[ /tempestade\s+de\s+areia/i, "tempestade-de-areia" ],
	[ /graniz/i, "granizo" ],
	[ /nevand|nevasc|nevad|\bneve\b/i, "neve" ],
	[ /ventos\s+fortes/i, "ventos-fortes" ],
]

/**
 * O clima de cada Move que gera clima.
 *
 * Quem gera clima no corpus não nomeia o clima: diz "gera imediatamente os efeitos do
 * Move Rain Dance". O fato extraído é então o NOME DO MOVE - que já existe no dicionário
 * e tem ficha própria -, e esta tabela só traduz o Move no clima que a descrição dele
 * declara ("Você provoca uma tempestade de granizo maciça", em Hail).
 *
 * `construir.mjs` confere cada chave contra o dicionário de Moves e relata a que não
 * existir, para que um Move renomeado na fonte apareça como trabalho em vez de sumir.
 */
export const CLIMA_POR_MOVE = {
	"Rain Dance": "chuva",
	"Sunny Day": "sol",
	"Sandstorm": "tempestade-de-areia",
	"Hail": "granizo",
	"Snowscape": "neve",
}

// ------------------------------------------------------------------ Frases

/** Quebra em frases, tratando as quebras de parágrafo que `textoSimples` deixa. */
function emFrases(texto) {
	return texto
		.split(/(?<=[.!?])\s+|\n+/)
		.map((f) => f.trim())
		.filter((f) => f !== "")
}

/** Os climas nomeados numa frase, na ordem do vocabulário. */
function climasNaFrase(frase) {
	return CLIMAS.filter(([ padrao ]) => padrao.test(frase)).map(([ , id ]) => id)
}

// ------------------------------------------------------------------ Imunidade

/**
 * A âncora de imunidade do PORTADOR.
 *
 * "Este Pokémon é imune a…" cobre 25 das 31 habilidades da família, e "o torna imune"
 * cobre Ice Body. Ancorar no sujeito é o que separa a imunidade de quem tem a habilidade
 * da imunidade de terceiros CONTRA ela - Prankster diz "Pokémon do tipo Sombrio são
 * imunes a Moves de inimigos sob efeito de Prankster", e lido sem sujeito o portador
 * ganharia uma imunidade que o livro dá ao oponente.
 */
const SINAL_IMUNIDADE = /imun(?:e|es|idade|idades)/i
const IMPOE_IMUNIDADE = /(?:este\s+pokémon\s+(?:é|são)\s+imune|torna\s+(?:[oa]\s+)?imune)/i

/**
 * Frases que falam de imunidade sem o portador ganhar nenhuma.
 *
 * São onze das trinta e sete menções, e cada uma inverte o sentido de um jeito diferente:
 *
 *   - **negação direta**: "Essa habilidade não fornece imunidade nem redução de dano"
 *     (Justified, que é ATINGIDO pelo tipo e ganha estágio por isso);
 *   - **imunidade alheia, negada**: "não ignora imunidades de tipo" (No Guard), "Não tem
 *     efeito sobre a imunidade dos Pokémon do tipo Aço" (Corrosion);
 *   - **imunidade de terceiros contra a habilidade**: Prankster e Effect Spore;
 *   - **parentético sobre o atacante**: "(se não for imune)" (Synchronize);
 *   - **menção sem concessão**: "imunidades e vulnerabilidades mudam" (Forecast);
 *   - **retirada do que a primeira frase concedeu**: "não será imune a condições de
 *     status" (o marcador de Shields Down).
 */
const IMUNIDADE_NAO_DECLARA = [
	/não\s+(?:fornece|concede|dá|garante)\s+imunidade/i,
	/não\s+ignora\s+imunidades?/i,
	/não\s+tem\s+efeito\s+sobre\s+a\s+imunidade/i,
	/pokémon\s+do\s+tipo\s+[a-zà-ÿ]+\s+são\s+imunes/i,
	/se\s+não\s+(?:for|forem)\s+imun/i,
	/imunidades\s+e\s+vulnerabilidades/i,
	/não\s+(?:será|serão|é|são)\s+imune/i,
]

/**
 * As imunidades declaradas numa frase.
 *
 * Duas, e só duas, saem estruturadas: condição de status e tipo de Move. São os
 * vocabulários que o PMP publica, e por isso o filtro da listagem é construído com o
 * vocabulário do sistema em vez de uma lista de categorias inventada aqui. Quando a
 * frase declara imunidade a outra coisa - acerto crítico, dano indireto, Moves de som ou
 * de gênero -, nada é extraído e a frase vai para o relatório.
 *
 * A janela é o trecho DEPOIS da âncora: "é imune ao dano e efeitos de Moves do tipo
 * Elétrico (incluindo Moves de Status)" tem a palavra "Status" sem nomear condição
 * nenhuma, e ler a frase inteira faria um tipo e uma condição saírem da mesma oração.
 */
function lerImunidades(frase) {
	const ancora = frase.match(IMPOE_IMUNIDADE)
	if (ancora == null) return []

	const janela = frase.slice(ancora.index + ancora[0].length)

	const porStatus = STATUS
		.filter(([ padrao ]) => padrao.test(janela))
		.map(([ , status ]) => ({ tipo: "imunidade", status }))

	// "do tipo" no singular de propósito. Wonder Guard usa o plural para dizer o OPOSTO
	// ("apenas Moves dos tipos Fogo, Voador… conseguem atingi-lo"), e o singular é a
	// construção de quem concede a imunidade.
	const porTipo = [ ...janela.matchAll(/d[eo]\s+tipo\s+([a-zà-ÿ]+)/gi) ]
		.map((casa) => TIPO_POR_NOME[casa[1].toLowerCase()])
		.filter((tipo) => tipo != null)
		.map((tipoDeMove) => ({ tipo: "imunidade", tipoDeMove }))

	return [ ...porStatus, ...porTipo ]
}

// ------------------------------------------------------------------ Clima

/**
 * Como a habilidade se relaciona com o clima, da relação mais específica para a mais
 * ampla. A primeira que casar vence.
 *
 *   - `gera` - "gera imediatamente os efeitos do Move Rain Dance"; e Delta Stream, que é
 *     o único a criar clima sem nomear um Move ("cria ventos fortes");
 *   - `suprime` - Air Lock e Cloud Nine, e suprimem TODOS os climas, não um;
 *   - `protege` - a imunidade ao dano do clima, que quatro habilidades declaram SEM a
 *     palavra "imune" ("não sofre dano das condições climáticas", "não receberá dano da
 *     Tempestade de Areia"). Quem procurar só "imune" perde Overcoat, Slush Rush,
 *     Sand Rush e Sand Force;
 *   - `interage` - o resto. É a relação de quem nomeia um clima sem gerá-lo, suprimi-lo
 *     nem se proteger dele: "Durante a chuva, todos os deslocamentos são dobrados". O
 *     rótulo é deliberadamente fraco porque a frase é a única evidência.
 */
const GERA_PELO_MOVE = /gera\s+(?:imediatamente\s+)?os\s+efeitos\s+do\s+Move\s+([A-Z][A-Za-z'\- ]*?)\s*[.,]/
const GERA_DIRETO = /\bcria\s+/i
const SUPRIME = /suprime\s+todos\s+os\s+efeitos\s+causados\s+pelo\s+clima/i
const PROTEGE = /(?:é\s+imune|torna\s+(?:[oa]\s+)?imune|não\s+(?:sofre|sofrerá|recebe|receberá)\s+dano)/i

/**
 * O sinal da família é um clima NOMEADO - não a palavra "clima".
 *
 * Essa é a diferença que dispensa a lista de citações que as outras famílias precisam
 * ter: toda frase que fala de clima genericamente para NEGAR algo ("Disguise não protege
 * contra dano de clima", "não previne dano indireto proveniente de … clima" em Wonder
 * Guard) e a que repete a lista de concorrentes das geradoras ("habilidades que geram
 * clima (Drizzle, Drought, Sand Stream ou Snow Warning)", que fala de ordem de
 * iniciativa) já ficam fora da família por não nomear clima nenhum.
 *
 * O preço é que `suprime` tem de entrar no sinal explicitamente: Air Lock e Cloud Nine
 * suprimem o clima inteiro e por isso são justamente as duas frases da família que não
 * nomeiam um clima.
 */
const SINAL_CLIMA = new RegExp(
	[ ...CLIMAS.map(([ p ]) => p.source), GERA_PELO_MOVE.source, SUPRIME.source ].join("|"),
	"i",
)

function lerClima(frase) {
	const pelomove = frase.match(GERA_PELO_MOVE)
	if (pelomove != null) {
		const move = pelomove[1].trim()
		const clima = CLIMA_POR_MOVE[move]

		// Um Move de clima que a tabela não conhece é "declarado e não entendido", não um
		// clima a adivinhar: devolver nada deixa a frase cair no relatório.
		return clima != null ? [ { tipo: "clima", relacao: "gera", clima, move } ] : []
	}

	const climas = climasNaFrase(frase)

	if (SUPRIME.test(frase)) {
		// `clima: null` é a resposta certa: Air Lock e Cloud Nine suprimem o clima
		// inteiro, e escolher um dos cinco seria estreitar a regra.
		return [ { tipo: "clima", relacao: "suprime", clima: null } ]
	}

	if (climas.length === 0) return []

	const relacao = GERA_DIRETO.test(frase) ? "gera" : PROTEGE.test(frase) ? "protege" : "interage"
	return climas.map((clima) => ({ tipo: "clima", relacao, clima }))
}

// ------------------------------------------------------------------ Move concedido

/**
 * Cinco habilidades concedem um Move fixo, e todas as cinco têm o nome do Move que
 * concedem: "Este Pokémon conhece Blizzard como um quinto Move".
 *
 * O desempate é `conhece … como`, não `conhece` sozinho: Forewarn fala de "revelar o
 * Move que conhece com maior potência de dano", que é leitura do Move do ALVO.
 *
 * O `id` da rota não é resolvido aqui - `construir.mjs` o resolve contra o dicionário de
 * Moves depois, como faz com os alvos de evolução, e relata o nome que não casar.
 */
const SINAL_MOVE_CONCEDIDO = /\bconhece\b/i
const MOVE_CONCEDIDO_FALSO = /revelar\s+o\s+Move/i
const MOVE_CONCEDIDO = /\bconhece\s+(?:o\s+Move\s+)?([A-Z][A-Za-z'\- ]*?)\s+como\s+(?:um|seu|o)\b/

function lerMoveConcedido(frase) {
	const casa = frase.match(MOVE_CONCEDIDO)
	return casa != null ? [ { tipo: "moveConcedido", move: casa[1].trim() } ] : []
}

// ------------------------------------------------------------------ Entrada

const FAMILIAS = [
	{
		nome: "imunidade",
		sinal: SINAL_IMUNIDADE,
		// O clima tem família própria, e é ela que lê "é imune ao dano da Tempestade de
		// Areia". Sem esta porta, Sand Veil e Snow Cloak virariam uma proteção de clima E
		// uma falha de imunidade no relatório.
		falsoSinal: new RegExp(CLIMAS.map(([ p ]) => p.source).join("|"), "i"),
		naoDeclara: IMUNIDADE_NAO_DECLARA,
		ler: lerImunidades,
	},
	// Sem `naoDeclara`: o sinal já é estreito (um clima nomeado), e o único jeito de uma
	// frase da família não render nada é nomear um Move de clima que `CLIMA_POR_MOVE` não
	// conhece - que é exatamente o que o relatório deve pegar.
	{ nome: "clima", sinal: SINAL_CLIMA, ler: lerClima },
	{
		nome: "moveConcedido",
		sinal: SINAL_MOVE_CONCEDIDO,
		falsoSinal: MOVE_CONCEDIDO_FALSO,
		ler: lerMoveConcedido,
	},
]

/** Da relação mais específica para a mais ampla - a ordem em que a ficha as mostra. */
const PRECEDENCIA = { gera: 0, suprime: 1, protege: 2, interage: 3 }

/**
 * Um clima que a habilidade gera ou suprime não precisa aparecer também como `interage`.
 *
 * As quatro geradoras repetem o clima numa segunda frase para tratar o empate de
 * iniciativa ("Se Drizzle for ativado enquanto já houver uma chuva ativa…"), e "Gera
 * chuva" mais "Interage com chuva" dizem a mesma coisa duas vezes.
 *
 * `protege` e `interage` convivem de propósito: Slush Rush dobra o deslocamento DURANTE o
 * granizo e também não sofre o dano dele. São dois fatos, não um repetido.
 *
 * A ordenação é aqui, e não na página, porque a ordem natural é a das FRASES - Sand Veil
 * declara a proteção antes do bônus e Slush Rush depois. Sem isto, duas habilidades com
 * os mesmos dois fatos sairiam em ordens diferentes na tela.
 */
function semRedundancia(efeitos) {
	const fortes = new Set(efeitos
		.filter((e) => e.tipo === "clima" && (e.relacao === "gera" || e.relacao === "suprime"))
		.map((e) => e.clima))

	const vistos = new Set()

	const mantidos = efeitos.filter((efeito) => {
		if (efeito.tipo === "clima" && efeito.relacao === "interage" && fortes.has(efeito.clima)) return false

		const chave = JSON.stringify(efeito)
		if (vistos.has(chave)) return false
		vistos.add(chave)
		return true
	})

	// Só a fatia de clima é reordenada; as outras famílias saem na ordem de `FAMILIAS`.
	const clima = mantidos
		.filter((e) => e.tipo === "clima")
		.sort((a, b) =>
			PRECEDENCIA[a.relacao] - PRECEDENCIA[b.relacao]
			|| String(a.clima ?? "").localeCompare(String(b.clima ?? "")))

	return [ ...mantidos.filter((e) => e.tipo !== "clima"), ...clima ]
}

/**
 * Os fatos mecânicos de uma descrição de Habilidade.
 *
 * @param {string} descricao Descrição já em texto simples (ver `texto.mjs`).
 * @returns {{ efeitos: object[], naoInterpretado: { familia: string, frase: string }[] }}
 *
 * `naoInterpretado` lista, por família, a primeira frase que declara o assunto numa
 * habilidade de que nada foi extraído - por habilidade e não por frase, como em
 * `efeitos.mjs`, para que o relatório seja trabalho a fazer e não ruído.
 */
export function interpretarHabilidade(descricao = "") {
	const frases = emFrases(descricao)
	const efeitos = []
	const naoInterpretado = []

	for (const familia of FAMILIAS) {
		const comSinal = frases.filter((frase) =>
			familia.sinal.test(frase) && !(familia.falsoSinal?.test(frase) ?? false))

		const extraidos = comSinal.flatMap((frase) => familia.ler(frase))
		efeitos.push(...extraidos)

		if (extraidos.length > 0) continue

		const declara = comSinal.find((frase) => !(familia.naoDeclara ?? []).some((p) => p.test(frase)))
		if (declara != null) naoInterpretado.push({ familia: familia.nome, frase: declara })
	}

	return { efeitos: semRedundancia(efeitos), naoInterpretado }
}
