/**
 * As três linhas de defesa de uma espécie: vulnerabilidades, resistências e imunidades.
 *
 * ONDE ELAS VIVEM. No `system.traits` do dnd5e, nos campos `dv`, `dr` e `di`. O campo
 * `value` de cada um — a lista de tipos de dano do próprio dnd5e, que não conhece tipo de
 * Pokémon — está vazio nas 1.158 espécies. Tudo está em `custom`, como texto livre:
 *
 *     dv: "Tipo Fogo; Tipo Gelo; Tipo Voador; Tipo Psíquico"
 *     dr: "Tipo Água; Tipo Elétrico; Tipo Grama (x1/4); Tipo Lutador; Tipo Fada"
 *     di: "Tipo Terrestre"
 *
 * É texto livre, mas medido, e o corpus é excepcionalmente regular: as 9.011 entradas
 * começam TODAS com "Tipo " (zero exceções), o único separador é `;` (nenhuma vírgula,
 * nenhum " e "), e só há dois marcadores de grau — `(x4)` em 259 entradas e `(x1/4)` em
 * 417. Por isso o parser pode ser estrito: ele casa com o que o corpus tem e DEVOLVE o
 * que não reconhece, em vez de adivinhar. O que sobra vai para o relatório.
 *
 * O ponto e vírgula é o separador e a vírgula nunca é — a mesma regra dos outros parsers
 * daqui, porque em português a vírgula é separador de lista E de decimal.
 *
 * O GRAU SAI VERBATIM. `(x4)` numa vulnerabilidade quer dizer fraqueza dobrada; `(x1/4)`
 * numa resistência, resistência dobrada. O compêndio publica o marcador como está e deixa
 * a leitura com quem lê: interpretar aqui seria afirmar uma regra que o módulo não diz.
 */
import { TIPO_POR_NOME } from "./habilidades.mjs"

/** "Tipo Grama (x1/4)" → { tipo: "grama", grau: "x1/4" } */
const ENTRADA = /^Tipo\s+(.+?)(?:\s*\(\s*(x4|x1\/4)\s*\))?$/i

export function interpretarLinhaDeDefesa(bruto = "") {
	const entradas = []
	const naoReconhecidas = []

	for (const pedaco of String(bruto ?? "").split(";")) {
		const texto = pedaco.trim()
		if (texto === "") continue

		const casa = texto.match(ENTRADA)
		const tipo = casa == null ? undefined : TIPO_POR_NOME[casa[1].trim().toLowerCase()]

		if (tipo == null) {
			naoReconhecidas.push(texto)
			continue
		}

		entradas.push({ tipo, grau: casa[2]?.toLowerCase() ?? null })
	}

	return { entradas, naoReconhecidas }
}

/**
 * Lê as três linhas de um `system.traits`. Devolve também o que não foi reconhecido, para
 * o relatório: espécie com defesa ilegível é problema de dado, e some se ninguém contar.
 */
export function interpretarDefesas(traits = {}) {
	const linhas = {
		vulnerabilidades: interpretarLinhaDeDefesa(traits?.dv?.custom),
		resistencias: interpretarLinhaDeDefesa(traits?.dr?.custom),
		imunidades: interpretarLinhaDeDefesa(traits?.di?.custom),
	}

	const defesas = {}
	const naoReconhecidas = []
	for (const [ nome, linha ] of Object.entries(linhas)) {
		defesas[nome] = linha.entradas
		for (const texto of linha.naoReconhecidas) naoReconhecidas.push({ linha: nome, texto })
	}

	// Espécie sem nenhuma das três não ganha o campo: `null` diz "o módulo não declarou",
	// que é diferente de três listas vazias dizendo "não tem nenhuma defesa".
	const vazio = Object.values(defesas).every((lista) => lista.length === 0)

	return { defesas: vazio ? null : defesas, naoReconhecidas }
}
