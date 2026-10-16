// Interpretação dos campos de um Move do módulo Foundry.
//
// O pack de Moves vem muito mais estruturado que a Pokédex — `moveType`, `pp`, `priority`
// e `damage.scaling` são campos de verdade —, mas quatro deles não querem dizer o que o
// nome promete, e é por isso que este módulo existe (e tem testes):
//
//   1. `damage.baseFormula` e `damage.scaling` são "os dados do Move", não "os dados de
//      dano": Recover guarda 2d6 de CURA ali, e 16 Moves escalonam cura. Quem confia no
//      nome do campo publica "dano 4d12" num Move que só cura.
//   2. `category` é string vazia nos 833 Moves. A categoria de resolução do PMP (ataque,
//      salvaguarda, disputa) só existe no texto.
//   3. `system.activities[].type` é a modelagem do Foundry, não a do PMP: 75 Moves
//      marcados como `attack` são DISPUTAS no livro ("Role 1d20 + MOVE e compare o
//      resultado com 10 + CON do alvo"), porque o Foundry não tem disputa como primitiva.
//   4. `priority` está zerado em 3 Moves que declaram prioridade no próprio texto.
//
// `range.meters` e `range.melee`, por outro lado, conferem com o texto nos 833 Moves —
// esses dão para usar direto.

/**
 * Chave do módulo → `id` de tipo em pt-BR.
 *
 * Mesma tabela de `src/lib/pmp/tipos.ts`, repetida aqui porque o pipeline é Node puro e
 * não resolve os aliases do SvelteKit. `variable` não é defeito: é o tipo dos Moves que
 * mudam de tipo em jogo (Natural Gift, Judgment), e o módulo tem uma pasta própria para
 * eles ("Tipo Variável").
 */
export const TIPO_DE_MOVE_POR_CHAVE = {
	normal: "normal", fire: "fogo", water: "agua", electric: "eletrico", grass: "grama",
	ice: "gelo", fighting: "lutador", poison: "venenoso", ground: "terrestre", flying: "voador",
	psychic: "psiquico", bug: "inseto", rock: "pedra", ghost: "fantasma", dragon: "dragao",
	dark: "sombrio", steel: "aco", fairy: "fada",
}

export const CHAVE_DE_TIPO_VARIAVEL = "variable"

// ------------------------------------------------------------------ Alcance

/**
 * `"40 pés (12 metros)"` → `"12m"`. O PMP é métrico; os pés são herança do d20 em inglês.
 *
 * A conversão é textual, e não a reconstrução da frase a partir dos campos, porque o
 * livro diz coisas que nenhum campo guarda: "Corpo a Corpo / alcance de deslocamento",
 * "Pessoal (semicírculo de 3m)", "Variável". Reescrever só o número preserva tudo isso.
 *
 * As duas formas existem no corpus, com e sem parênteses, e com a barra sem espaços
 * (`"60 pés/18 metros"`), então são dois padrões.
 */
export function emMetros(bruto = "") {
	return bruto
		.replace(/(\d+(?:,\d+)?)\s*pés?\s*\/\s*(\d+(?:,\d+)?)\s*metros?/gi, (_, pes, metros) => `${metros}m`)
		.replace(/(\d+(?:,\d+)?)\s*pés?\s*\(\s*(\d+(?:,\d+)?)\s*metros?\s*\)/gi, (_, pes, metros) => `${metros}m`)
		.replace(/(\d+(?:,\d+)?)\s*metros?/gi, (_, metros) => `${metros}m`)
		.replace(/\(\s*\)/g, "")
		.replace(/\s{2,}/g, " ")
		.trim()
}

/**
 * Sobrou "pé" depois da conversão: o campo está truncado na fonte (Tera Starstorm).
 *
 * O lookahead no lugar de `\b` final porque, sem a flag `u`, `\w` é só ASCII — depois de
 * "é" não existe fronteira de palavra, e `/p[ée]s?\b/` nunca casaria o singular.
 */
export function sobrouEmPes(convertido) {
	return /p[ée]s?(?![a-zà-ÿ])/i.test(convertido)
}

const FORMAS_DE_AREA = [
	[ /\bcone\b/i, "cone" ],
	[ /\blinha\b/i, "linha" ],
	[ /\braio\b/i, "raio" ],
	[ /\bsemicírculo\b/i, "semicirculo" ],
]

/**
 * O alcance como o compêndio o usa.
 *
 * `metros` e `corpoACorpo` vêm do módulo (conferidos contra o texto nos 833 Moves); o
 * resto é lido do texto, porque só ele distingue "12m de alcance" de "cone de 12m" — a
 * diferença entre atingir um alvo e atingir todo mundo na frente.
 */
export function interpretarAlcance(bruto = "", metros = 0, corpoACorpo = false) {
	const texto = emMetros(bruto)

	return {
		texto,
		bruto,
		metros,
		corpoACorpo,
		pessoal: /^pessoal/i.test(bruto),
		variavel: /^vari[áa]vel$/i.test(bruto.trim()),
		forma: FORMAS_DE_AREA.find(([ padrao ]) => padrao.test(bruto))?.[1] ?? null,
		truncado: sobrouEmPes(texto),
	}
}

// ------------------------------------------------------------------ Ativação

/**
 * `"1 ação / reação"` → `{ texto: "1 ação / reação", modos: [ "acao", "reacao" ] }`.
 *
 * `activation.type` do módulo guarda só o primeiro modo: os 18 Moves de "1 ação /
 * reação" ficam como `action`, e filtrar por reação os perderia — justamente os Moves
 * que alguém procura quando quer saber o que dá para fazer fora do seu turno.
 *
 * "recarga" e "carga" não são modos, são restrições de uso (o Move gasta a rodada
 * seguinte ou a anterior), e viram campos próprios.
 */
export function interpretarAtivacao(bruto = "") {
	const texto = bruto.trim()
	const modos = []

	if (/ação\s+bônus/i.test(texto)) modos.push("bonus")
	if (/reação/i.test(texto)) modos.push("reacao")
	// "1 ação bônus" contém "ação": só conta como ação quando não é a bônus.
	if (/(?:^|[\s/])\d*\s*ação(?!\s+bônus)/i.test(texto)) modos.push("acao")

	return {
		texto,
		modos: [ ...new Set(modos) ],
		recarga: /recarga/i.test(texto),
		carga: /\bcarga\b/i.test(texto),
	}
}

// ------------------------------------------------------------------ Duração

/** `"1 rodada, Concentração"` → texto mais os dois marcadores que o livro acrescenta. */
export function interpretarDuracao(bruto = "") {
	// O módulo deixa um ponto final solto em "Instantânea, 3 rodadas."
	const texto = bruto.trim().replace(/\.$/, "")

	return {
		texto,
		concentracao: /concentração/i.test(texto),
		instantanea: /^instantânea/i.test(texto),
	}
}

// ------------------------------------------------------------------ Resolução

/**
 * Como o Move é resolvido na mesa.
 *
 * Lido do TEXTO, não de `system.activities[].type`, porque o tipo de atividade é a
 * modelagem do Foundry e não a do PMP — 75 Moves marcados como `attack` são disputas, e
 * 24 são Moves de acerto garantido ou de cura pura, sem rolagem de ataque nenhuma.
 *
 * Um Move pode ter mais de uma: 41 deles pedem ataque E salvaguarda. `nenhuma` é o
 * resultado quando o texto não declara rolagem alguma — os buffs pessoais e os Moves de
 * campo —, e não um "não sei".
 */
const RESOLUCOES = [
	[ "ataque", /Faça\s+(?:um|uma|dois|duas|três|quatro|novamente|\d+)[^.]{0,40}ataques?|ataques?\s+(?:corpo\s+a\s+corpo|à\s+distância)|rolage(?:m|ns)\s+de\s+ataque|realiz(?:a|e|ar)\s+um\s+ataque|fazendo\s+(?:dois|duas|três)\s+ataques?/i ],
	[ "salvaguarda", /teste\s+de\s+(?:resistência\s+de\s+)?(?:FOR|DES|CON|INT|SAB|CAR)|deve(?:m)?\s+fazer\s+um\s+teste|jogada\s+de\s+resistência/i ],
	[ "disputa", /Role\s+1d20\s*\+\s*MOVE[^.]{0,60}compare\s+o\s+resultado\s+com\s+10\s*\+/i ],
	[ "automatico", /garantid[oa]\s+(?:de|para)\s+acertar|com\s+acerto\s+garantido|garantia\s+de\s+acertar|sempre\s+acerta|sempre\s+atinge|nunca\s+err\w+|sem\s+chance\s+de\s+errar|automaticamente\s+acertará|sem\s+testes\s+de\s+resistência/i ],
]

export function classificarResolucao(descricao = "") {
	const achadas = RESOLUCOES.filter(([ , padrao ]) => padrao.test(descricao)).map(([ nome ]) => nome)

	// Ataque e acerto garantido se excluem: ou se rola para acertar, ou não. Os 21 Moves
	// que casam com os dois são de múltiplos golpes, e dizem que os golpes ADICIONAIS
	// acertam sozinhos ("Para cada golpe adicional, você pode … realizar um novo ataque
	// contra o mesmo alvo com acerto garantido"). Rotular o Move de "acerto garantido"
	// por causa disso diria que o primeiro golpe também não erra, e ele erra.
	const resolucoes = achadas.includes("ataque")
		? achadas.filter((nome) => nome !== "automatico")
		: achadas

	return resolucoes.length > 0 ? resolucoes : [ "nenhuma" ]
}

// ------------------------------------------------------------------ Dados de dano e de cura

/**
 * O assunto do bloco "Níveis Superiores".
 *
 * É o desempate mais confiável para saber se os dados do Move são de dano ou de cura,
 * porque o livro nomeia o assunto ali de forma explícita: "Os dados de dano para este
 * Move mudam para…" ou "Os dados de cura para este Move mudam para…". `null` quando não
 * há bloco; `"?"` quando há e o assunto não é nenhum dos dois (Helping Hand escalona um
 * "dado de ajuda").
 */
function assuntoDoEscalonamento(niveisSuperiores) {
	if (niveisSuperiores === "") return null
	if (/dados?\s+(?:base\s+)?de\s+cura/i.test(niveisSuperiores)) return "cura"
	if (/dados?\s+de\s+dano|dano\s+deste\s+Move|dano\s+para\s+(?:este|esse)\s+Move/i.test(niveisSuperiores)) return "dano"
	return "?"
}

/** O mesmo pela descrição: `"2d8 + MOVE de dano"` é dano, `"2d6 + MOVE pontos de vida"` é cura. */
function assuntoDaDescricao(base, descricao) {
	if (base === "") return null
	if (new RegExp(`${base}(?:\\s*\\+\\s*MOVE)?\\s+de\\s+dano`, "i").test(descricao)) return "dano"
	if (new RegExp(`${base}(?:\\s*\\+\\s*MOVE)?\\s+(?:pontos\\s+de\\s+vida|PV)`, "i").test(descricao)) return "cura"
	if (new RegExp(`(?:recupera|restaura|cura)\\w*[^.]{0,80}${base}`, "i").test(descricao)) return "cura"
	// Sete Moves escrevem "de dado do tipo fogo" onde queriam "de dano" — erro de digitação
	// no livro, que o bloco de Níveis Superiores desfaz.
	if (new RegExp(`${base}[^.]{0,60}de\\s+dan[oe]`, "i").test(descricao)) return "dano"
	return "?"
}

const ESCALONAMENTO_NO_TEXTO = /(?:muda|mudam)\s+para\s+(.+)$/is

/**
 * Os dados do Move, separados em dano e cura.
 *
 * O módulo guarda os dois no mesmo lugar (`damage.baseFormula` e `damage.scaling`) sem
 * dizer qual é qual. O assunto do bloco de Níveis Superiores decide, e a descrição é a
 * reserva; quando nenhum dos dois resolve, nada é atribuído e o Move vai para o
 * relatório — é melhor a ficha não mostrar dado nenhum do que mostrar cura como dano.
 *
 * `escalonamentoPlano` existe porque dois Moves (Sonic Boom, Dragon Rage) escalonam um
 * número fixo e não dados, e `damage.scaling` do módulo só aceita `NdM` — para esses, o
 * escalonamento está no texto e em nenhum campo.
 */
export function interpretarDados({ base = "", escalonamento = [], niveisSuperiores = "", descricao = "" }) {
	const porNiveis = assuntoDoEscalonamento(niveisSuperiores)
	const porDescricao = assuntoDaDescricao(base, descricao)

	const assunto = porNiveis === "cura" || porNiveis === "dano"
		? porNiveis
		: porDescricao === "cura" || porDescricao === "dano" ? porDescricao : null

	// O módulo nomeia o campo `level`; o compêndio é em pt-BR do dado à URL.
	const doModulo = escalonamento.map((d) => ({ nivel: d.level ?? d.nivel, formula: d.formula }))
	const degraus = doModulo.length > 0 ? doModulo : escalonamentoPlano(niveisSuperiores)

	const vazio = { dano: null, cura: null, naoClassificado: null }

	if (assunto == null) {
		const haDados = base !== "" || degraus.length > 0
		return haDados ? { ...vazio, naoClassificado: niveisSuperiores || descricao.slice(0, 160) } : vazio
	}

	const bloco = {
		...(base !== "" ? { base } : {}),
		...(degraus.length > 0 ? { escalonamento: degraus } : {}),
	}

	if (Object.keys(bloco).length === 0) return vazio
	return assunto === "cura" ? { ...vazio, cura: bloco } : { ...vazio, dano: bloco }
}

/**
 * `"O dano deste Move muda para 6 no nível 5, 8 no nível 10 e 10 no nível 17."`
 *
 * O módulo só estrutura escalonamento em dados (`NdM`); quando o livro escalona um valor
 * fixo, `damage.scaling` fica vazio e a informação existe só na prosa.
 */
function escalonamentoPlano(niveisSuperiores) {
	const depois = niveisSuperiores.match(ESCALONAMENTO_NO_TEXTO)?.[1]
	if (depois == null) return []

	return [ ...depois.matchAll(/(\d+d\d+|d\d+|\d+)\s+no\s+nível\s+(\d+)/gi) ]
		.map((casa) => ({ nivel: Number(casa[2]), formula: casa[1] }))
}

// ------------------------------------------------------------------ Prioridade

/**
 * A prioridade que o próprio texto declara, quando difere do campo.
 *
 * O padrão é deliberadamente a frase inteira: Quick Guard cita "Prioridade 1 ou 2, ou de
 * Prioridade 3" para dizer de quais Moves ele PROTEGE, e um padrão solto em
 * `/Prioridade (\d+)/` leria 3 como a prioridade dele (é 1).
 */
const PRIORIDADE_DECLARADA = /Este\s+Move\s+é\s+classificado\s+como\s+Prioridade\s+(-?\d+)/i

export function prioridadeDeclarada(descricao = "") {
	const casa = descricao.match(PRIORIDADE_DECLARADA)
	return casa != null ? Number(casa[1]) : null
}

// ------------------------------------------------------------------ Nomes de Move

/**
 * Reparo de nomes de Move vindos das fichas de espécie.
 *
 * As listas de Moves da Pokédex são texto extraído de PDF, e chegam quebradas de três
 * jeitos: com as letras espaçadas (`"T a k e D o w n"`), com hífen partido
 * (`"Double- Edge"`, `"Will-O- Wisp"`) e com nomes mesclados numa só entrada
 * (`"Vine Whip Focus Energy"`). O conserto é segmentar o texto normalizado contra o
 * dicionário de Moves conhecidos.
 *
 * Normalizar jogando fora tudo que não é letra ou dígito resolve o espaçamento e o hífen
 * de uma vez, porque os três defeitos só acrescentam separadores.
 */
export function criarReparadorDeMoves(nomesDeMove) {
	const conhecidos = new Map(nomesDeMove.map((nome) => [ normalizarMove(nome), nome ]))

	/** Menor quantidade de Moves conhecidos que cobre a string inteira, ou `undefined`. */
	function segmentar(texto) {
		const melhor = Array(texto.length + 1).fill(null)
		melhor[0] = []

		for (let i = 0; i < texto.length; i++) {
			if (melhor[i] == null) continue
			for (let j = i + 1; j <= texto.length; j++) {
				const nome = conhecidos.get(texto.slice(i, j))
				if (nome == null) continue
				if (melhor[j] == null || melhor[j].length > melhor[i].length + 1) {
					melhor[j] = [ ...melhor[i], nome ]
				}
			}
		}

		return melhor[texto.length] ?? undefined
	}

	/**
	 * Uma lista achatada de nomes (TMs, Moves de Ovo) com os nomes consertados.
	 *
	 * Devolve também o que não resolveu, em vez de descartar: nas 29 entradas que falham
	 * na v1.33.0, o que sobrou é tabela de defesas vazada para dentro da lista
	 * (`"Will-O-Wisp Def esa s d e T ipo : ½ ½ x2"`) ou prosa de forma alternativa do
	 * Rotom. Salvar o nome do começo seria adivinhar onde a contaminação começa.
	 */
	function resolverLista(brutos = []) {
		const resolvidos = []
		const naoResolvidos = []

		for (const bruto of brutos) {
			const limpo = bruto.replace(/—/g, "").trim()
			if (limpo === "") continue

			const chave = normalizarMove(limpo)
			const exato = conhecidos.get(chave)
			if (exato != null) {
				resolvidos.push(exato)
				continue
			}

			const segmentos = segmentar(chave)
			if (segmentos != null) resolvidos.push(...segmentos)
			else naoResolvidos.push(limpo)
		}

		return { resolvidos: [ ...new Set(resolvidos) ], naoResolvidos }
	}

	/**
	 * A tabela de Moves por nível, com os nomes consertados.
	 *
	 * Além dos defeitos da lista achatada, a tabela tem um que é só dela: nomes partidos
	 * ENTRE LINHAS (`"Take"` no nível 4, `"Down Flamethrower"` no nível 8). Daí o
	 * fragmento pendente, que só se resolve quando a linha seguinte o completa — e o
	 * primeiro Move do resultado pertence à linha anterior.
	 */
	function repararTabela(linhas = []) {
		const saida = linhas.map((linha) => ({ nivel: linha.level, moves: [] }))
		const naoResolvidos = []
		let reparados = 0
		let pendente = ""

		linhas.forEach((linha, indice) => {
			for (const bruto of linha.moves ?? []) {
				const limpo = bruto.replace(/—/g, "").trim()
				if (limpo === "") continue

				const chave = normalizarMove(limpo)
				if (pendente === "" && conhecidos.has(chave)) {
					saida[indice].moves.push(conhecidos.get(chave))
					continue
				}

				const segmentos = segmentar(pendente + chave)
				if (segmentos != null) {
					if (pendente !== "" && indice > 0) {
						saida[indice - 1].moves.push(segmentos[0])
						saida[indice].moves.push(...segmentos.slice(1))
					} else {
						saida[indice].moves.push(...segmentos)
					}
					pendente = ""
					reparados++
				} else if (pendente === "") {
					pendente = chave
				} else {
					naoResolvidos.push(limpo)
					pendente = ""
				}
			}
		})

		if (pendente !== "") naoResolvidos.push(pendente)

		return {
			tabela: saida
				.filter((linha) => linha.moves.length > 0)
				.map((linha) => ({ nivel: linha.nivel, moves: [ ...new Set(linha.moves) ] })),
			naoResolvidos,
			reparados,
		}
	}

	return { resolverLista, repararTabela }
}

/** Texto comparável de um nome de Move: só letras, dígitos e apóstrofo. */
export function normalizarMove(texto) {
	return texto.toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9']/g, "")
}
