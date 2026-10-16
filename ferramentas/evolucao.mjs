// Interpretação do texto de evolução do livro.
//
// Extraído do pipeline porque é a regra mais frágil dele: o livro descreve evolução em
// prosa livre, e cada padrão novo é uma chance de ler errado. Com o módulo isolado, cada
// padrão vira um teste.

/**
 * Só há evolução à frente quando o texto diz "evoluir … para".
 *
 * É o que separa as três famílias de frase do livro:
 *
 *   - "Charmander pode evoluir para Charmeleon no nível 6"  → evolui
 *   - "Applin pode evoluir, a partir do nível 6, para Flapple" → evolui (daí o `[^.]*`)
 *   - "Infernape é a evolução final de Chimchar e Monferno" → NÃO evolui
 *   - "Pikachu não possui evoluções conhecidas"             → NÃO evolui
 *
 * Sem essa porta, as 410 espécies que são evolução final passam a "evoluir" para os
 * próprios antecessores, porque o nome deles aparece na frase.
 */
const TEM_EVOLUCAO_ADIANTE = /evoluir[^.]*\bpara\b/i

const CONDICAO_ESPECIAL = /(após|somente após|troc|chuva|névoa|neblina|girar|de cabeça|crític|dano de recuo|passos|vencer|derrot|equipe|Pokéslot|clima|montanha|lugar|local|região|segurando|enquanto|Move (?!do tipo)[A-Z])/i

/**
 * A espécie-alvo de uma cláusula.
 *
 * O alvo é o nome que vem depois de "para" — a preposição que o livro usa para
 * indicar destino. Aceitar qualquer nome em qualquer posição produzia três erros:
 *
 *   - "Corsola de Galar pode evoluir para Cursola" achava "Corsola", pedaço do
 *     próprio nome, em vez de Cursola;
 *   - "Mantyke … para Mantine … ao entrar em contato com um Remoraid" achava
 *     Remoraid, porque o nome é mais longo e a lista é ordenada por tamanho;
 *   - "…, apenas na presença de um Shelmet" criava uma segunda evolução, quando
 *     a frase é condição da primeira.
 *
 * Sem "para", a cláusula só introduz alvo se COMEÇAR com um nome — o caso das
 * ramificações encadeadas do Applin ("… e Appletun com uma Sweet Apple").
 */
function acharAlvo(clausula, propriaEspecie, nomesDeEspecie) {
	const candidatos = nomesDeEspecie.filter((n) => n !== propriaEspecie)
	const depoisDePara = clausula.match(/\bpara\s+(.+)$/is)?.[1]

	if (depoisDePara == null) {
		return candidatos.find((n) => clausula.trim().startsWith(n))
	}

	const exato = candidatos.find((n) => depoisDePara.startsWith(n))
	if (exato != null) return exato

	// O livro às vezes nomeia a espécie-base onde só existem formas: "evoluir para
	// Meowstic" quando o compêndio tem "Meowstic Macho" e "Meowstic Fêmea".
	const base = depoisDePara.match(/^([A-ZÀ-Ý][\wÀ-ÿ'’.-]*)/)?.[1]
	return base != null ? candidatos.find((n) => n.startsWith(`${base} `)) : undefined
}

/**
 * Cria o interpretador com o vocabulário do compêndio.
 *
 * @param {object} vocabulario
 * @param {string[]} vocabulario.nomesDeEspecie Nomes conhecidos, do mais longo ao mais
 *   curto — a ordem importa: "Raichu de Alola" tem de ser testado antes de "Raichu".
 * @param {{ nome: string }[]} vocabulario.itensEvolutivos Pedras e afins, idem.
 * @param {Record<string, string>} vocabulario.tipoPorChave Chave Foundry → id do tipo.
 */
export function criarInterpretadorDeEvolucao({ nomesDeEspecie, itensEvolutivos = [], tipoPorChave = {} }) {
	return function interpretarEvolucao(texto = "", propriaEspecie = "") {
		if (!TEM_EVOLUCAO_ADIANTE.test(texto)) return []

		// "Quando evolui, seus pontos de vida aumentam…" é consequência, não condição.
		const frase = texto
			.split(/\.\s+Quando evolui/)[0]
			.replace(/\([^)]*\)/g, " ")
			// Protege "ou superior" de virar separador de cláusula.
			.replace(/ou superior/g, "ou_superior")

		const nivelGlobal = (() => {
			if (/em qualquer nível/i.test(frase)) return 1
			const casa = frase.match(/(?:a partir d[oa]|no) nível (\d+)/i)
			return casa != null ? Number(casa[1]) : null
		})()

		const resultado = []

		// "ou" e "e" só separam ramificações quando vêm antes de nome próprio: isso
		// distingue "…para Flapple … e Appletun …" (duas ramificações) de
		// "…no nível 6 e apenas durante a noite" (uma só, com duas condições).
		for (const bruta of frase.split(/,\s*(?:ou\s+)?|\s+(?:ou|e)\s+(?=[A-ZÀ-Ý])/)) {
			const clausula = bruta.replace(/ou_superior/g, "ou superior")

			const alvo = acharAlvo(clausula, propriaEspecie, nomesDeEspecie)

			const nivel = clausula.match(/(?:a partir d[oa]|no) nível (\d+)/i)
			const item = itensEvolutivos.find((i) => clausula.includes(i.nome))
			const lealdade = clausula.match(/Lealdade (?:for )?\+?(\d)/)
				?? (/amizade/i.test(clausula) ? [ 0, "2" ] : null)
			const tipoDeMove = clausula.match(/Move do tipo (\p{L}+)/u)
			const chaveDoTipo = tipoDeMove != null ? tipoPorChave[tipoDeMove[1].toLowerCase()] : undefined

			const periodo = /pôr do sol|crepúsculo/i.test(clausula) ? "crepusculo"
				: /noite/i.test(clausula) ? "noite"
					: /durante o dia|de dia/i.test(clausula) ? "dia"
						: undefined

			const condicao = {
				...(item != null ? { item: item.nome } : {}),
				...(lealdade != null ? { lealdade: Number(lealdade[1]) } : {}),
				...(periodo != null ? { periodo } : {}),
				...(chaveDoTipo != null ? { tipoDeMove: chaveDoTipo } : {}),
				...(/fêmea/i.test(clausula) ? { genero: "F" } : /\bmacho\b/i.test(clausula) ? { genero: "M" } : {}),
				...(CONDICAO_ESPECIAL.test(clausula) && item == null ? { especial: clausula.trim() } : {}),
			}

			if (alvo != null) {
				resultado.push({
					para: alvo,
					paraId: null,
					nivel: nivel != null ? Number(nivel[1]) : nivelGlobal ?? 1,
					...condicao,
				})
				continue
			}

			// Cláusula sem espécie: complementa a anterior ("…, apenas durante a noite").
			const anterior = resultado.at(-1)
			if (anterior != null && Object.keys(condicao).length > 0) {
				for (const [ chave, valor ] of Object.entries(condicao)) {
					if (anterior[chave] === undefined) anterior[chave] = valor
				}
				if (nivel != null && anterior.nivel == null) anterior.nivel = Number(nivel[1])
			}
		}

		// Mesmo alvo repetido (alternativas de item) fica só na primeira forma.
		return resultado.filter((e, i, todas) => todas.findIndex((x) => x.para === e.para) === i)
	}
}
