// Interpretação dos efeitos mecânicos na descrição de um Move.
//
// Extraído do pipeline pela mesma razão que `evolucao.mjs`: é prosa livre do livro, e
// cada padrão novo é uma chance de ler errado. Aqui o risco é maior, porque um erro não
// deixa um campo vazio — ele inventa uma regra. "Reduz o Ataque em 1 estágio" lido com o
// sinal trocado vira um buff na tela, e quem consulta não tem como saber.
//
// Por isso cada família de efeito tem TRÊS padrões, não um:
//
//   - `sinal`: largo. Esta frase fala do assunto?
//   - `falsoSinal`: as frases que usam as mesmas palavras para outra coisa.
//     "Este Move drena sua energia" (9 Moves) significa que você fica sem ação, não que
//     alguém é curado; "drenar os PP do atacante" também não cura.
//   - `naoImpoe`: as frases que CITAM o efeito sem causá-lo — condicionais ("se você
//     estiver congelado, ainda pode usar este Move"), imunidades, e as curas da condição
//     ("a paralisia dele é curada").
//
// Uma frase com sinal verdadeiro, que não é citação, e da qual nada foi extraído é a
// única coisa que vai para `dados/relatorio.json`. É a diferença entre "o livro não
// declara esse efeito" e "o livro declara e eu não entendi" — a segunda é trabalho a
// fazer, e sem os três padrões ela desaparece no meio do ruído ou some em silêncio.
//
// O recorte de cada família é o VOCABULÁRIO DO PRÓPRIO LIVRO, não a mecânica: um Move
// que causa dano a si mesmo sem usar a palavra "recuo" (Mind Blown) está fora da família
// de recuo, não é uma falha de leitura. A descrição completa aparece sempre na página,
// então o que se perde é a pílula de resumo, não a regra.

/**
 * As condições de status do PMP, com as flexões que aparecem no corpus.
 *
 * `gravemente envenenad` vem antes de `envenenad` porque o livro trata as duas como
 * condições distintas e a segunda é sufixo da primeira — invertido, todo envenenamento
 * grave seria lido como envenenamento comum.
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
 * Os verbos com que o livro IMPÕE uma condição.
 *
 * Oito construções convivem no corpus, e nenhuma domina: "o alvo fica atordoado", "o
 * alvo recebe o status Atordoado", "o alvo é queimado", "se torna queimada", "ficará
 * queimada", o gerúndio depois de um teste ("ficando paralisado em caso de falha"), o
 * subjuntivo da oração subordinada ("faça com que o alvo fique confuso") e o gerúndio
 * com objeto explícito ("deixando o alvo queimado").
 *
 * A implementação de referência só reconhece a primeira, e por isso perde cerca de um
 * terço das condições do corpus.
 */
const IMPOE_STATUS = new RegExp(
	"(?:fica(?:rá|rão|ndo|rem|m|r)?|fique(?:m)?|é|são"
	+ "|se\\s+torna(?:m|rá|rão|ndo)?|torna(?:m|ndo)?-se"
	+ "|recebe(?:m|rá|ndo)?\\s+o\\s+status|ganha(?:m|ndo|rá)?\\s+(?:o\\s+status|a\\s+condição\\s+de\\s+status)"
	+ "|deixá-l[ao]|deixando-[oa]|deixa(?:ndo|r)?\\s+(?:o|a|os|as)\\s+(?:alvos?|criaturas?))"
	+ "\\s+(?:imediatamente\\s+|apenas\\s+|também\\s+)*",
)

/**
 * Frases que citam uma condição sem impor nenhuma.
 *
 * São 8 Moves que dizem "Se você estiver congelado, ainda pode usar este Move", os que
 * concedem imunidade, e os que curam a condição (Smelling Salts, Wake-Up Slap). Sem essa
 * porta, "a paralisia dele é curada" entra como "causa paralisia".
 */
const STATUS_NAO_IMPOE = [
	/\b(?:se|caso|quando|enquanto)\b[^,]{0,60}\b(?:estiver|estiverem|esteja|estejam|for|estava|está)\b/i,
	/não\s+(?:pode|podem|fica|ficam)|nenhuma\s+criatura\s+pode/i,
	/imun(?:e|es|idade)/i,
	/é\s+curad[oa]|curad[oa]\s+d[eo]|será\s+curad|cura\s+(?:a|o|todas)|remove|revitaliza|descongelar?|acorda\s+imediatamente/i,
	/\bcondições\s+negativas\b/i,
	/libert[ao]|sendo\s+removido|sofrendo\s+da\s+condição|condição\s+encerrada/i,
]

/** Os atributos de batalha que ganham estágio, do nome mais longo para o mais curto. */
const ATRIBUTOS_DE_ESTAGIO = [
	[ "Ataque Especial", "ataque-especial" ],
	[ "Defesa Especial", "defesa-especial" ],
	[ "Margem de Crítico", "critico" ],
	[ "Velocidade", "velocidade" ],
	[ "Precisão", "precisao" ],
	[ "Evasão", "evasao" ],
	[ "Ataque", "ataque" ],
	[ "Defesa", "defesa" ],
]

const SOBE = /^(?:aument|elev|ganh|sobe|fortific)/i
const DESCE = /^(?:reduz|diminu|perd|baix|abaix|exaur)/i
const VERBOS_DE_SENTIDO = /aument\w*|elev\w*|ganh\w*|sobe\w*|fortific\w*|reduz\w*|diminu\w*|perd\w*|baix\w*|abaix\w*|exaur\w*/gi

/** O livro escreve a quantidade de estágios em algarismo e por extenso, na mesma página. */
const NUMERAIS = { um: 1, uma: 1, dois: 2, duas: 2, três: 3, quatro: 4, cinco: 5, seis: 6 }
const QUANTIDADE = "(\\d+|um|uma|dois|duas|três|quatro|cinco|seis)"

/** Frases que falam de estágios sem mudar nenhum: leem, copiam ou limitam. */
const ESTAGIO_NAO_MUDA = [
	/para\s+cada\s+está?gio/i,
	/copia\s+todos\s+os\s+está?gios|são\s+redefinidas/i,
	/máximo\s+de\s+\d+\s+está?gios/i,
	/acumulad[oa]\s+até\s+um\s+máximo/i,
]

/** Frações escritas por extenso e em algarismos — o livro usa as duas formas. */
const FRACOES = {
	"metade": [ 1, 2 ],
	"um terço": [ 1, 3 ],
	"dois terços": [ 2, 3 ],
	"um quarto": [ 1, 4 ],
	"três quartos": [ 3, 4 ],
}

const PADRAO_FRACAO = /(metade|um terço|dois terços|um quarto|três quartos|(\d+)\s*\/\s*(\d+))/i

function lerFracao(texto) {
	const casa = texto.match(PADRAO_FRACAO)
	if (casa == null) return null

	if (casa[2] != null) return { numerador: Number(casa[2]), denominador: Number(casa[3]) }

	const extenso = FRACOES[casa[1].toLowerCase()]
	return extenso != null ? { numerador: extenso[0], denominador: extenso[1] } : null
}

/**
 * Quando o efeito acontece.
 *
 * `null` é resposta legítima: muitos efeitos são incondicionais, e marcar "em um acerto"
 * onde o livro não diz nada seria inventar a condição mais comum.
 *
 * O limiar de rolagem natural é PISO ou TETO conforme o dado seja de quem usa o Move ou
 * de quem resiste a ele, e o livro é consistente nisso: "natural de 19 ou 20 **no
 * acerto**" é piso (o atacante quer rolar alto), "natural de 1 ou 2 **no teste**" é teto
 * (quem resiste rolou baixo). Ler os dois como piso transforma um efeito que acontece em
 * 10% das vezes num que acontece sempre — daí a distinção explícita.
 *
 * Entre vários gatilhos na mesma frase a escolha é POSICIONAL: vale o primeiro. Não é o
 * mais específico de propósito. "Em um acerto, … ficando paralisado em caso de falha"
 * (Nuzzle) é uma cadeia — acerto E falha —, e dizer só "em um acerto" é verdade
 * incompleta. "Quem falhar no teste por 5 ou mais, OU rolar natural de 1 ou 2, se torna
 * queimada" (Heat Wave) é uma alternativa, e escolher o gatilho mais estreito faria o
 * efeito parecer mais raro do que é. Incompleto erra menos que estreito, e o texto
 * integral fica logo abaixo na página.
 */
function lerGatilho(frase) {
	const candidatos = [
		[ /resultado\s+natural\s+de\s+(\d+)\s+ou\s+menos/i, (c) => ({ tipo: "natural", maximo: Number(c[1]) }) ],
		[ /resultado\s+natural\s+de\s+(\d+)\s+ou\s+mais/i, (c) => ({ tipo: "natural", minimo: Number(c[1]) }) ],
		[ /resultado\s+natural\s+de\s+(\d+)\s+ou\s+(\d+)([^.;]{0,30})/i, (c) => {
			const [ menor, maior ] = [ Number(c[1]), Number(c[2]) ].sort((a, b) => a - b)
			return /no\s+teste/i.test(c[3]) ? { tipo: "natural", maximo: maior } : { tipo: "natural", minimo: menor }
		} ],
		[ /falhar?(?:em|ão)?\s+no\s+teste|em\s+uma\s+falha|em\s+caso\s+de\s+falha|em\s+um\s+fracasso|no\s+fracasso/i, () => ({ tipo: "falha" }) ],
		[ /resultado\s+maior\s+ou\s+igual/i, () => ({ tipo: "disputa" }) ],
		[ /em\s+um\s+acerto|ao\s+acertar|no\s+acerto|caso\s+acerte|se\s+acertar|ao\s+atingir/i, () => ({ tipo: "acerto" }) ],
		[ /ao\s+(?:usar|ativar)\s+(?:este|esse)\s+Move|após\s+(?:usar|ativar|realizar|isso)/i, () => ({ tipo: "uso" }) ],
	]

	const achados = candidatos
		.map(([ padrao, montar ]) => {
			const casa = frase.match(padrao)
			return casa != null ? { posicao: casa.index, gatilho: montar(casa) } : null
		})
		.filter((a) => a != null)
		.sort((a, b) => a.posicao - b.posicao)

	return achados.length > 0 ? achados[0].gatilho : null
}

/**
 * De quem é o efeito.
 *
 * O português não ajuda: "o alvo tem sua Precisão reduzida" usa o mesmo possessivo que
 * "sua Velocidade é reduzida" (o usuário). O desempate é por menção explícita — alvo e
 * aliado vencem o possessivo, porque o livro só os nomeia quando o efeito é deles.
 */
function lerAlvo(janela) {
	if (/de\s+todos|todas\s+as\s+criaturas|incluindo\s+você/i.test(janela)) return "todos"
	// "dele"/"dela" é o possessivo de terceiro: "O Ataque dele é aumentado" (Spicy
	// Extract) fala do alvo, mesmo sem nomeá-lo na mesma oração.
	if (/\balvos?\b|\bcriaturas?\b|\binimig|\bdel[ea]s?\b/i.test(janela)) return "alvo"
	if (/\baliad/i.test(janela)) return "aliado"
	// `\bvocê\b` NÃO funciona: sem a flag `u`, `\w` é só ASCII, então "ê" já é um
	// não-caractere-de-palavra e não existe fronteira depois dele. O lookahead faz o
	// papel que o `\b` final não consegue.
	if (/\bse(?:u|us)\b|\bsua(?:s)?\b|\bvocês?(?![a-zà-ÿ])|\bo\s+usuário\b|\bpara\s+si\b/i.test(janela)) return "usuario"
	return null
}

/** Quebra em frases, tratando também as quebras de parágrafo que `textoSimples` deixa. */
function emFrases(texto) {
	return texto
		.split(/(?<=[.!?])\s+|\n+/)
		.map((f) => f.trim())
		.filter((f) => f !== "")
}

// ------------------------------------------------------------------ Status

function lerStatus(frase) {
	const gatilho = lerGatilho(frase)

	return STATUS
		.filter(([ padrao ]) => new RegExp(IMPOE_STATUS.source + padrao.source, "i").test(frase))
		.map(([ , status ]) => ({
			tipo: "status",
			status,
			alvo: lerAlvo(frase) ?? "alvo",
			...(gatilho != null ? { gatilho } : {}),
		}))
}

// ------------------------------------------------------------------ Estágios

/**
 * Mudanças de estágio da frase.
 *
 * A âncora é a quantidade de estágios, e o que interessa está na JANELA à esquerda dela
 * — o trecho desde a âncora anterior (ou o começo da frase). Ler a frase inteira é o que
 * quebra em Fillet Away ("você **perde** 50% dos seus pontos de vida máximos, mas seu
 * Ataque… **aumentam** em 2 estágios"): com dois verbos de sinal oposto na mesma frase,
 * só a proximidade da âncora decide, e vale o último verbo da janela.
 *
 * Duas âncoras, porque o livro usa as duas construções:
 *
 *   - "reduzida **em 1** estágio" — a dominante;
 *   - "sua Velocidade **aumenta 1** estágio" — sem a preposição (Scale Shot).
 *
 * A segunda exige o verbo imediatamente antes do número justamente para não casar com as
 * cláusulas de limite e de referência, que também terminam em "N estágios": "até um
 * máximo de 6 estágios", "(máximo de 7 estágios em Mudança de Status)".
 */
function lerEstagios(frase) {
	if (ESTAGIO_NAO_MUDA.some((padrao) => padrao.test(frase))) return []

	const ancora = new RegExp(
		`(?:em\\s+${QUANTIDADE}|(?:aument\\w*|diminu\\w*|reduz\\w*|perd\\w*|sobe|cai)\\s+${QUANTIDADE})\\s+está?gios?`,
		"gi",
	)

	// Três âncoras ou mais numa frase só não é uma regra, é uma TABELA achatada pela
	// extração do PDF: Secret Power lista quatro ambientes com um efeito cada ("Areia,
	// terra e pedra Reduz Precisão em um estágio Água Reduz Ataque em um estágio…") e
	// Order Up lista três formas de Tatsugiri. Extrair as mudanças sem as condições que
	// as separam diria que o Move faz todas de uma vez, o que nunca acontece — então a
	// frase vai inteira para o relatório. Nenhuma regra legítima do corpus passa de duas.
	if ([ ...frase.matchAll(ancora) ].length >= 3) return []

	const efeitos = []
	let fim = 0

	for (const casa of frase.matchAll(ancora)) {
		const janela = frase.slice(fim, casa.index)
		fim = casa.index + casa[0].length

		// "em até -6 estágios" é limite, não mudança. A âncora com preposição não casa com
		// "em até -6", mas casaria com um "em 6 estágios" precedido de "até".
		if (/\baté\s*-?\s*$/i.test(janela)) continue

		const quantidade = lerQuantidade(casa[1] ?? casa[2])
		if (quantidade == null) continue

		const sentido = ultimoSentido(`${janela}${casa[0]}`)
		if (sentido == null) continue

		const depois = frase.slice(fim)

		// O atributo vem antes da âncora na maioria dos casos, mas também pode vir
		// depois: "passa a perder 1 estágio de Velocidade ao final de cada turno".
		const atributos = atributosNaJanela(janela)
		const alvos = atributos.length > 0 ? atributos : atributosLogoDepois(depois)
		if (alvos.length === 0) continue

		const limite = lerLimite(depois)
		const alvo = lerAlvo(janela)

		// Quando a janela declara mais de um limiar natural, vale o mais próximo da
		// âncora: Triple Arrows põe dois na mesma frase ("natural de 15 ou mais … o alvo
		// fica Atordoado, e um resultado natural de 11 ou mais reduz a Defesa"), e o da
		// mudança de estágio é o segundo. Fora disso vale o gatilho da frase.
		const gatilho = ultimoNatural(janela) ?? lerGatilho(frase)

		for (const atributo of alvos) {
			efeitos.push({
				tipo: "estagio",
				atributo,
				delta: sentido * quantidade,
				...(alvo != null ? { alvo } : {}),
				...(limite != null ? { limite } : {}),
				...(gatilho != null ? { gatilho } : {}),
			})
		}
	}

	return efeitos
}

/**
 * O limiar natural mais próximo do fim do trecho, mas SÓ quando há mais de um.
 *
 * Com um único limiar, a regra posicional de `lerGatilho` já acerta, e passar na frente
 * dela faria dano: "se a criatura falhar no teste por 5 ou mais, OU rolar um resultado
 * natural de 1 ou 2 …" (Bug Buzz) tem um natural e uma falha alternativos, e escolher o
 * natural faria o efeito parecer dez vezes mais raro do que é. Dois limiares na mesma
 * janela, por outro lado, só acontece quando a frase descreve dois efeitos diferentes.
 */
function ultimoNatural(trecho) {
	const posicoes = [ ...trecho.matchAll(/resultado\s+natural\s+de\s+\d+/gi) ]
	if (posicoes.length < 2) return null

	const gatilho = lerGatilho(trecho.slice(posicoes[posicoes.length - 1].index))
	return gatilho?.tipo === "natural" ? gatilho : null
}

function lerQuantidade(bruto) {
	if (bruto == null) return null
	const extenso = NUMERAIS[bruto.toLowerCase()]
	if (extenso != null) return extenso
	const n = Number(bruto)
	return Number.isInteger(n) && n > 0 ? n : null
}

/** +1 ou −1 pelo verbo mais próximo da âncora; `null` quando o trecho não tem verbo de sentido. */
function ultimoSentido(trecho) {
	let sentido = null
	for (const casa of trecho.matchAll(VERBOS_DE_SENTIDO)) {
		if (SOBE.test(casa[0])) sentido = 1
		else if (DESCE.test(casa[0])) sentido = -1
	}
	return sentido
}

/** Atributos citados na janela, do nome mais longo para o mais curto (e removidos ao achar). */
function atributosNaJanela(janela) {
	const achados = []
	let resto = janela

	for (const [ nome, id ] of ATRIBUTOS_DE_ESTAGIO) {
		if (!resto.includes(nome)) continue
		achados.push(id)
		resto = resto.split(nome).join(" ")
	}

	return achados
}

/** `"de Velocidade ao final de cada turno"` → `[ "velocidade" ]`. Só o atributo encostado na âncora. */
function atributosLogoDepois(depois) {
	const casa = depois.match(/^\s*(?:de|em|n[ao])\s+([A-ZÀ-Ý][\wÀ-ÿ]*(?:\s+Especial|\s+de\s+Crítico)?)/)
	if (casa == null) return []

	const achado = ATRIBUTOS_DE_ESTAGIO.find(([ nome ]) => nome === casa[1])
	return achado != null ? [ achado[1] ] : []
}

function lerLimite(depois) {
	const casa = depois.match(/^[,\s]*podendo\s+(?:ser\s+)?acumulad[oa]s?\s+em\s+até\s*(-?)\s*(\d+)\s*está?gios?/i)
	if (casa == null) return null
	return (casa[1] === "-" ? -1 : 1) * Number(casa[2])
}

// ------------------------------------------------------------------ Dreno

/**
 * Dreno: a fração do dano causado que volta como cura.
 *
 * O livro escreve de quatro jeitos — "retorna como cura ao usuário", "é convertido em
 * cura para o usuário", "ganhando … em pontos de vida" e "recuperando … como pontos de
 * vida" —, e usa "drenar" também para coisas que não curam ninguém. Daí o `falsoSinal`.
 */
const SINAL_DRENO = /\bdren(?:a|ar|am|ando|o)\b|convertid[oa]\s+em\s+cura|retorna\s+como\s+cura|do\s+dano\s+causado[^.]{0,60}(?:em|como)\s+pontos\s+de\s+vida/i
const DRENO_FALSO = /dren\w*\s+sua\s+energia|drena\s+suas\s+forças|drenar?\s+os\s+PP|drenando\s+também/i
const DRENO_DESTINO = /convertid[oa]\s+em\s+cura|retorna\s+como\s+cura|(?:em|como)\s+pontos\s+de\s+vida|em\s+cura\s+para/i

function lerDreno(frase) {
	if (!DRENO_DESTINO.test(frase)) return []

	const casa = frase.match(new RegExp(`${PADRAO_FRACAO.source}\\s+d[oe]\\s+dano`, "i"))
	if (casa == null) return []

	const fracao = lerFracao(casa[0])
	return fracao != null ? [ { tipo: "dreno", fracao } ] : []
}

// ------------------------------------------------------------------ Recuo

/**
 * Recuo: o dano que o usuário sofre de volta.
 *
 * A implementação de referência só reconhece as frações por extenso ("um quarto do dano
 * causado"), mas o corpus usa sobretudo algarismos ("sofre 1/3 do dano causado") — por
 * isso ela encontra 2 dos 13 Moves de recuo.
 *
 * Duas bases: fração do dano causado (o caso comum) e fração da vida máxima do próprio
 * usuário (Chloroblast). São mecânicas diferentes e campos diferentes.
 */
const SINAL_RECUO = /\brecuo\b/i
const RECUO_FALSO = /isso\s+inclui|como\s+dano\s+de\s+um/i

function lerRecuo(frase) {
	const daVida = frase.match(new RegExp(`${PADRAO_FRACAO.source}\\s+d[ae]\\s+(?:sua\\s+)?vida`, "i"))
	if (daVida != null) {
		const fracao = lerFracao(daVida[0])
		if (fracao != null) return [ { tipo: "recuo", fracaoDeVida: fracao } ]
	}

	const doDano = frase.match(new RegExp(`${PADRAO_FRACAO.source}\\s+d[oe]\\s+(?:dano|total)`, "i"))
	if (doDano != null) {
		const fracao = lerFracao(doDano[0])
		if (fracao != null) return [ { tipo: "recuo", fracao } ]
	}

	return []
}

// ------------------------------------------------------------------ Cura

/**
 * Cura.
 *
 * Os dados de cura já vêm estruturados do módulo — ver a classificação de
 * `damage.baseFormula` em `moves.mjs`, que o módulo usa tanto para dano quanto para cura.
 * O que só o texto diz é QUEM é curado (Floral Healing e Heal Pulse curam o alvo, não o
 * usuário) e as curas que não são em dados: fração da vida e restauração total.
 */
const SINAL_CURA = /(?:recupera|restaura)\w*[^.]{0,80}(?:pontos\s+de\s+vida|PV)|dados?\s+(?:base\s+)?de\s+cura|vida\s+completamente\s+restaurada/i
const CURA_FALSA = /incapaz\s+de\s+recuperar|não\s+pode(?:m)?\s+recuperar/i

function lerCura(frase) {
	// Um dreno é cura, mas já foi lido com a fração que lhe dá sentido; relê-lo aqui
	// renderia a mesma regra duas vezes na página.
	if (lerDreno(frase).length > 0) return []

	const alvo = lerAlvo(frase) ?? "usuario"

	if (/vida\s+completamente\s+restaurada|totalmente\s+curad[oa]|todos\s+os\s+(?:seus\s+)?PV\b/i.test(frase)) {
		return [ { tipo: "cura", total: true, alvo } ]
	}

	const comFracao = frase.match(new RegExp(
		`(?:recupera|restaura)\\w*[^.]{0,30}?${PADRAO_FRACAO.source}`
		+ "\\s+d[eo]s?\\s+(?:seus\\s+|sua\\s+)?(?:pontos\\s+de\\s+vida|PV|vida)\\s*(?:atuais|máximos?|máxima)",
		"i",
	))
	if (comFracao != null) {
		const fracao = lerFracao(comFracao[0])
		if (fracao != null) return [ { tipo: "cura", fracaoDeVida: fracao, alvo } ]
	}

	const comDados = frase.match(/(?:recupera|restaura)\w*[^.]{0,40}?(\d+d\d+)(\s*\+\s*MOVE)?\s*(?:pontos\s+de\s+vida|PV)/i)
	if (comDados != null) {
		return [ { tipo: "cura", dados: comDados[1], comMove: comDados[2] != null, alvo } ]
	}

	return []
}

// ------------------------------------------------------------------ Entrada

const FAMILIAS = [
	{
		nome: "status",
		sinal: new RegExp(STATUS.map(([ p ]) => p.source).join("|"), "i"),
		naoImpoe: STATUS_NAO_IMPOE,
		ler: lerStatus,
	},
	{ nome: "estagio", sinal: /está?gios?/i, naoImpoe: ESTAGIO_NAO_MUDA, ler: lerEstagios },
	{ nome: "dreno", sinal: SINAL_DRENO, falsoSinal: DRENO_FALSO, ler: lerDreno },
	{ nome: "recuo", sinal: SINAL_RECUO, falsoSinal: RECUO_FALSO, ler: lerRecuo },
	{
		nome: "cura",
		sinal: SINAL_CURA,
		// Um dreno é cura, mas pertence à família de dreno, que o lê com a fração que lhe
		// dá sentido. Sem esta exclusão, Oblivion Wing vira dreno E uma falha de cura.
		falsoSinal: new RegExp(`${CURA_FALSA.source}|${DRENO_DESTINO.source}`, "i"),
		ler: lerCura,
	},
]

/**
 * Um efeito não pode aparecer duas vezes.
 *
 * O livro costuma anunciar o efeito na frase de narração e declará-lo na de regra —
 * Lovely Kiss "tenta deixá-la sonolenta" e depois a deixa sonolenta numa disputa. As
 * duas leituras são a mesma regra, e vale a que tem gatilho, que é a da mecânica.
 */
function semDuplicatas(efeitos) {
	const porChave = new Map()

	for (const efeito of efeitos) {
		const { gatilho, ...resto } = efeito
		const chave = JSON.stringify(resto)
		if (!porChave.has(chave) || (gatilho != null && porChave.get(chave).gatilho == null)) {
			porChave.set(chave, efeito)
		}
	}

	return [ ...porChave.values() ]
}

/**
 * Os efeitos mecânicos de uma descrição de Move.
 *
 * @param {string} descricao Descrição já em texto simples (ver `texto.mjs`).
 * @returns {{ efeitos: object[], naoInterpretado: { familia: string, frase: string }[] }}
 *
 * `naoInterpretado` lista, por família, a primeira frase que declara o assunto num Move
 * de que nada foi extraído. É por Move e não por frase de propósito: Wood Hammer declara
 * o recuo numa frase ("sofrendo 1/3 do dano causado") e o anuncia em outra ("sofrendo um
 * sério dano de recuo"); a segunda não tem fração, e reportá-la com a primeira já lida
 * encheria o relatório de ruído em vez de trabalho.
 */
export function interpretarEfeitos(descricao = "") {
	const frases = emFrases(descricao)
	const efeitos = []
	const naoInterpretado = []

	for (const familia of FAMILIAS) {
		const comSinal = frases.filter((frase) =>
			familia.sinal.test(frase) && !(familia.falsoSinal?.test(frase) ?? false))

		const extraidos = comSinal.flatMap((frase) => familia.ler(frase))
		efeitos.push(...extraidos)

		if (extraidos.length > 0) continue

		// Só é trabalho a fazer quando sobra uma frase que DECLARA o efeito. Se todas as
		// frases com sinal são citação ("se você estiver congelado…"), nada foi perdido.
		const declara = comSinal.find((frase) => !(familia.naoImpoe ?? []).some((p) => p.test(frase)))
		if (declara != null) naoInterpretado.push({ familia: familia.nome, frase: declara })
	}

	return { efeitos: semDuplicatas(efeitos), naoInterpretado }
}
