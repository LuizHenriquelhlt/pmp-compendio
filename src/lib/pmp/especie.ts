import type { IdAtributo } from "./atributos"
import type { IdTamanho } from "./tamanhos"
import type { IdTipo } from "./tipos"

/** Um modo de deslocamento já interpretado: `{ modo: "caminhada", metros: 9 }`. */
export type Deslocamento = {
	modo: "caminhada" | "natação" | "voo" | "escalada" | "escavação"
	metros: number
	/** Voo por flutuação — o livro distingue, porque ignora terreno difícil. */
	flutuacao?: boolean
}

/** Um sentido especial: `{ nome: "Visão no Escuro", metros: 18 }`. */
export type Sentido = {
	nome: string
	metros: number | null
}

/**
 * Uma ramificação evolutiva já estruturada. `nivel` é sempre preenchido (1 = qualquer
 * nível); as demais condições aparecem só quando o texto do livro as declara.
 */
export type Evolucao = {
	para: string
	/** `id` da espécie-alvo, quando foi possível resolvê-la no compêndio. */
	paraId: string | null
	nivel: number
	item?: string
	lealdade?: number
	periodo?: "dia" | "noite" | "crepusculo"
	tipoDeMove?: IdTipo
	genero?: "M" | "F"
	/** Condição narrativa que o pipeline não soube estruturar — fica como texto. */
	especial?: string
}

/** Proporção de gêneros; `null` para espécies sem gênero. */
export type Genero = {
	machoPct: number
	femeaPct: number
}

/**
 * Uma espécie como o compêndio a consome. Deriva dos flags do módulo Foundry
 * (`flags["pokemon-mundo-perfeito"].species`) via `ferramentas/construir.mjs`.
 *
 * Nomes de Moves, habilidades e TMs ficam em inglês de propósito: é assim que o
 * PMP os publica, em qualquer idioma do livro.
 */
export type Especie = {
	/** Slug do nome em português: `charmander`, `weezing-de-galar`. */
	id: string
	nome: string
	/** Número na Pokédex nacional. Formas compartilham o número da espécie-base. */
	numero: number
	tipos: IdTipo[]
	sr: number
	/** SR como o livro imprime, incluindo frações: `"1/2"`, `"1/4"`. */
	srTexto: string
	tamanho: IdTamanho
	alturaM: number | null
	nivelMinimo: number
	geracao: number | null
	regiao: string | null
	gruposDeOvo: string[]
	genero: Genero | null
	estagio: { atual: number, total: number }
	/** Texto de evolução do livro, preservado na íntegra. */
	evolucao: string
	evolucoes: Evolucao[]
	descricao: string
	atributos: Record<IdAtributo, number>
	pericias: string[]
	/** Algumas espécies (Mew, Arceus) têm proficiência em todas as perícias. */
	todasAsPericias: boolean
	ca: number
	pv: number
	/** Dado de vida, como `"d6"`. */
	dadoDeVida: string
	deslocamentos: Deslocamento[]
	/** Texto original do módulo, para conferência. */
	deslocamentoBruto: string
	/**
	 * `true` quando o texto do módulo está truncado e um dos modos se perdeu.
	 * 65 espécies estão nessa situação na v1.33.0 — ver `relatorio.json`.
	 */
	deslocamentoIncompleto: boolean
	sentidos: Sentido[]
	habilidades: string[]
	habilidadeOculta: string | null
	movesPorNivel: { nivel: number, moves: string[] }[]
	tms: string[]
	movesDeOvo: string[]
	/** Resistências/fraquezas que fogem da tabela de tipos padrão. */
	defesasAlteradas: Record<string, string> | null
	imagem: string | null
}

/** Nome exibível de um gênero, no formato do livro: `88% M / 12% F`. */
export function formatarGenero(genero: Genero | null): string {
	if (genero == null) return "Sem gênero"
	return `${genero.machoPct}% M / ${genero.femeaPct}% F`
}

/** `9m de caminhada, 7,5m de natação` — números no formato brasileiro. */
export function formatarDeslocamentos(deslocamentos: Deslocamento[]): string {
	return deslocamentos.map(formatarDeslocamento).join(", ")
}

export function formatarDeslocamento({ modo, metros, flutuacao }: Deslocamento): string {
	const valor = metros.toLocaleString("pt-BR", { maximumFractionDigits: 1 })
	return `${valor}m de ${modo}${flutuacao === true ? " (flutuação)" : ""}`
}

export function formatarSentido({ nome, metros }: Sentido): string {
	if (metros == null) return nome
	return `${nome} ${metros.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}m`
}
