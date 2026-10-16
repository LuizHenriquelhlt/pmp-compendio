/**
 * Busca do compêndio.
 *
 * Separada da página porque é a regra mais fácil de quebrar sem perceber: acento,
 * número com zeros à esquerda e nome de forma são três jeitos legítimos de procurar
 * o mesmo Pokémon.
 */
import { nomeDoTipo, type IdTipo } from "./tipos"

/** O mínimo que a busca precisa conhecer de uma espécie. */
export type Buscavel = {
	nome: string
	numero: number
	regiao: string | null
}

/**
 * Texto comparável: sem acento, sem caixa, sem pontuação.
 *
 * Buscar "pokemon" tem de achar "Pokémon", e "nidoran f" tem de achar "Nidoran♀" —
 * então a pontuação vira espaço em vez de desaparecer, para não colar palavras.
 */
export function normalizarParaBusca(texto: string): string {
	return texto
		.normalize("NFD").replace(/[̀-ͯ]/g, "")
		.toLowerCase()
		.replace(/♀/g, " f").replace(/♂/g, " m")
		.replace(/[^a-z0-9]+/g, " ")
		.trim()
}

/**
 * Chave de busca de uma espécie: nome, número cru e número com três dígitos, mais a
 * região. O número aparece nas duas formas porque tanto "4" quanto "004" são jeitos
 * naturais de procurar o Charmander.
 */
export function chaveDeBusca(especie: Buscavel): string {
	const partes = [
		normalizarParaBusca(especie.nome),
		String(especie.numero),
		String(especie.numero).padStart(3, "0"),
	]

	if (especie.regiao != null) partes.push(normalizarParaBusca(especie.regiao))

	return partes.join(" ")
}

/** O mínimo que a busca precisa conhecer de um Move. */
export type MoveBuscavel = {
	nome: string
	tipo: IdTipo | null
}

/**
 * Chave de busca de um Move: o nome e o nome do tipo em português.
 *
 * Os nomes de Move são em inglês (convenção do PMP), mas quem consulta pensa o tipo em
 * português — "fogo" tem de achar Flamethrower. É a única tradução que a busca faz, e
 * por isso o tipo entra na chave pelo nome, não pelo `id`.
 */
export function chaveDeBuscaDeMove(move: MoveBuscavel): string {
	const partes = [ normalizarParaBusca(move.nome) ]
	if (move.tipo != null) partes.push(normalizarParaBusca(nomeDoTipo(move.tipo)))
	return partes.join(" ")
}

/**
 * Verdadeiro quando a chave contém todos os termos da consulta, em qualquer ordem.
 *
 * Exigir todos os termos (e não qualquer um) é o que faz "galar weezing" achar
 * "Weezing de Galar" sem trazer as outras 150 espécies de Galar junto.
 */
export function corresponde(chave: string, consulta: string): boolean {
	const termos = normalizarParaBusca(consulta).split(" ").filter((termo) => termo !== "")
	if (termos.length === 0) return true

	return termos.every((termo) => chave.includes(termo))
}
