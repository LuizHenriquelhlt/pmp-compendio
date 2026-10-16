// Utilitários de texto compartilhados pelo pipeline.

/** HTML do módulo → texto corrido, preservando quebras de parágrafo. */
export function textoSimples(html = "") {
	return html
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/<\/(?:p|div|h[1-6]|li|tr)>\s*/gi, "\n")
		.replace(/<li>/gi, "• ")
		.replace(/<[^>]+>/g, "")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&(?:quot|#34);/g, "\"")
		.replace(/&(?:apos|#39);/g, "'")
		.replace(/[ \t]+/g, " ")
		.replace(/\n{3,}/g, "\n\n")
		.split("\n").map((l) => l.trim()).join("\n")
		.trim()
}

/**
 * Nome → slug. Preserva a identidade em português ("Weezing de Galar" →
 * `weezing-de-galar`) e trata os símbolos de gênero que aparecem em Nidoran.
 */
export function slug(texto) {
	return texto
		.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
		.replace(/♀/g, "-f").replace(/♂/g, "-m")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "")
}

/** `"10,5"` → `10.5`. O módulo grava números no formato brasileiro. */
export function numeroBR(texto) {
	const n = Number(String(texto).replace(",", "."))
	return Number.isFinite(n) ? n : null
}

const MODOS = {
	caminhada: "caminhada",
	natacao: "natação",
	nado: "natação",
	voo: "voo",
	escalada: "escalada",
	escavacao: "escavação",
}

/**
 * `"9m de caminhada, 7,5m de natação"` → lista estruturada.
 *
 * Na v1.33.0 do módulo, 65 espécies têm esse campo truncado no meio
 * (`"9m de caminhada, 9m de escalada, 9m de"`) — aparentemente um corte de largura
 * na extração do PDF. Quando isso acontece devolvemos os modos legíveis e marcamos
 * `incompleto`, em vez de adivinhar o modo que falta.
 */
export function interpretarDeslocamento(bruto = "") {
	// Não dá para dividir por vírgula: em português ela é separador de lista E separador
	// decimal ("1,5m de caminhada, 9m de natação"). Em vez disso casamos o padrão
	// globalmente e julgamos o truncamento pelo que sobrou fora das correspondências —
	// que é justamente a definição de "o que não foi entendido".
	const padrao = () => /(\d+(?:,\d+)?)\s*m\s+de\s+([a-zà-ú]+)(\s*\(flutuação\))?/gi

	const deslocamentos = []
	for (const casa of bruto.matchAll(padrao())) {
		const modo = MODOS[slug(casa[2]).replace(/-/g, "")]
		if (modo == null) continue

		deslocamentos.push({
			modo,
			metros: numeroBR(casa[1]),
			...(casa[3] != null ? { flutuacao: true } : {}),
		})
	}

	const sobra = bruto.replace(padrao(), "").replace(/[,\s]+/g, " ").trim()
	const incompleto = /\d/.test(sobra) // fragmento com número e sem modo: "9m de", "12m"
		|| /\bde$/.test(sobra)
		|| /,\s*$/.test(bruto.trim()) // vírgula final: havia um modo a mais, cortado

	return { deslocamentos, incompleto }
}

/**
 * `"Visão no Escuro 18m, Visão Verdadeira 4,5m"` → lista estruturada.
 *
 * Mesma armadilha do deslocamento: a vírgula separa itens da lista e também as casas
 * decimais. Aqui só dividimos quando a vírgula NÃO é seguida de dígito, o que distingue
 * `", Visão Verdadeira"` (separador) de `"4,5m"` (decimal).
 */
export function interpretarSentidos(bruto = "") {
	return textoSimples(bruto)
		.split(/,(?!\s*\d)/)
		.map((parte) => parte.trim())
		.filter((parte) => parte !== "")
		.map((trecho) => {
			const casa = trecho.match(/^(.+?)\s+(\d+(?:,\d+)?)\s*m$/)
			return casa != null
				? { nome: casa[1].trim(), metros: numeroBR(casa[2]) }
				: { nome: trecho, metros: null }
		})
}
