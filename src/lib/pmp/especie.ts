import type { IdAtributo } from "./atributos"
import type { IdTamanho } from "./tamanhos"
import type { IdTipo } from "./tipos"

/**
 * Uma entrada de defesa: o tipo, e o grau quando o livro o marca.
 *
 * `grau` sai verbatim do módulo. `x4` numa vulnerabilidade é fraqueza dobrada; `x1/4`
 * numa resistência, resistência dobrada. O compêndio mostra o marcador e não o traduz em
 * regra: o módulo não diz o que ele significa, e inventar isso seria pôr na ficha uma
 * regra que o livro não escreveu.
 */
export type Defesa = { tipo: IdTipo, grau: "x4" | "x1/4" | null }

/**
 * As três linhas de defesa por tipo. `null` na espécie inteira quer dizer que o módulo
 * não declarou nenhuma - diferente de três listas vazias, que diriam "não tem defesa".
 */
export type Defesas = {
	vulnerabilidades: Defesa[]
	resistencias: Defesa[]
	imunidades: Defesa[]
}

/** Um modo de deslocamento já interpretado: `{ modo: "caminhada", metros: 9 }`. */
export type Deslocamento = {
	modo: "caminhada" | "natação" | "voo" | "escalada" | "escavação"
	metros: number
	/** Voo por flutuação - o livro distingue, porque ignora terreno difícil. */
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
	/**
	 * `id` do item, quando o nome casa com o catálogo - o que faz a condição virar link.
	 *
	 * Casa nas 80 evoluções por item da v1.33.0. `null` continua previsto: o nome vem do
	 * texto do livro, e nada garante que a próxima versão do módulo o escreva igual.
	 */
	itemId?: string | null
	lealdade?: number
	periodo?: "dia" | "noite" | "crepusculo"
	tipoDeMove?: IdTipo
	genero?: "M" | "F"
	/** Condição narrativa que o pipeline não soube estruturar - fica como texto. */
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
	 * 65 espécies estão nessa situação na v1.33.0 - ver `relatorio.json`.
	 */
	deslocamentoIncompleto: boolean
	sentidos: Sentido[]
	habilidades: string[]
	habilidadeOculta: string | null
	movesPorNivel: { nivel: number, moves: string[] }[]
	tms: string[]
	movesDeOvo: string[]
	/** As três linhas por tipo, lidas do `traits` do módulo. */
	defesas: Defesas | null
	/** Resistências/fraquezas que fogem da tabela de tipos padrão. */
	defesasAlteradas: Record<string, string> | null
	imagem: string | null
}

/** `9m de caminhada, 7,5m de natação` - números no formato brasileiro. */
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
