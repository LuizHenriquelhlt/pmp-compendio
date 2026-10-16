/**
 * Acesso aos dados gerados pelo pipeline.
 *
 * Os JSONs vivem em `dados/` — fora de `static/` de propósito. Eles são lidos do disco
 * durante o prerender e o resultado fica assado em cada página, então o site publicado
 * contém as páginas renderizadas, não um dump do conteúdo do PMP.
 *
 * O sufixo `.server` garante que o SvelteKit nunca empacote este módulo para o cliente.
 */
import { building } from "$app/environment"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Especie } from "$pmp/especie"
import type { IdModo, IdResolucao, Move } from "$pmp/move"
import type { IdTamanho } from "$pmp/tamanhos"
import type { IdTipo } from "$pmp/tipos"

/** A fatia de espécie que listagens e busca consomem. Enxuta por desenho. */
export type EspecieNoIndice = {
	id: string
	nome: string
	numero: number
	tipos: IdTipo[]
	sr: number
	srTexto: string
	tamanho: IdTamanho
	geracao: number | null
	regiao: string | null
	ca: number
	pv: number
	imagem: string | null
}

const PASTA_DE_DADOS = join(process.cwd(), "dados")

const FALTANDO = [
	"Os dados do PMP não foram gerados ainda.",
	"",
	"  1. npm run dados:desempacotar -- \"<pasta-do-módulo-foundry>\"",
	"  2. npm run dados:construir",
	"",
	"O conteúdo do sistema não é versionado (direitos dos autores do PMP), por isso",
	"precisa ser gerado localmente a partir do módulo Foundry.",
].join("\n")

/**
 * Lê um JSON de `dados/`.
 *
 * O cache só vale durante o build: o prerender gera 1149 páginas de espécie, e sem ele
 * cada uma releria o `especies.json` inteiro. Em desenvolvimento é o contrário — com
 * cache, rodar `npm run dados` não teria efeito até reiniciar o servidor, e a tela
 * mostraria dados velhos sem avisar.
 */
const cache = new Map<string, unknown>()

function ler<T>(nome: string): T {
	if (building) {
		const emCache = cache.get(nome)
		if (emCache !== undefined) return emCache as T
	}

	const caminho = join(PASTA_DE_DADOS, `${nome}.json`)
	if (!existsSync(caminho)) throw new Error(`${FALTANDO}\n\n(não encontrei ${caminho})`)

	const dados = JSON.parse(readFileSync(caminho, "utf8")) as T
	if (building) cache.set(nome, dados)
	return dados
}

export function lerIndice(): EspecieNoIndice[] {
	return ler<EspecieNoIndice[]>("indice")
}

export function lerEspecies(): Especie[] {
	return ler<Especie[]>("especies")
}

export function lerHabilidades(): Record<string, string> {
	return ler<Record<string, string>>("habilidades")
}

let porId: Map<string, Especie> | undefined

export function acharEspecie(id: string): Especie | undefined {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerEspecies().map((e) => [ e.id, e ])).get(id)

	porId ??= new Map(lerEspecies().map((e) => [ e.id, e ]))
	return porId.get(id)
}

/** Todos os `id` de espécie, para o gerador de rotas do prerender. */
export function idsDeEspecie(): string[] {
	return lerIndice().map((e) => e.id)
}

/**
 * As habilidades de uma espécie com o texto de regra de cada uma, já resolvido.
 * `oculta` marca a habilidade oculta, que o livro apresenta separadamente.
 */
export function habilidadesDaEspecie(especie: Especie): { nome: string, texto: string, oculta: boolean }[] {
	const catalogo = lerHabilidades()

	const normais = especie.habilidades.map((nome) => ({
		nome,
		texto: catalogo[nome] ?? "",
		oculta: false,
	}))

	if (especie.habilidadeOculta == null) return normais

	return [ ...normais, {
		nome: especie.habilidadeOculta,
		texto: catalogo[especie.habilidadeOculta] ?? "",
		oculta: true,
	} ]
}

/**
 * Espécies que evoluem para esta — a relação inversa de `evolucoes`, que o pipeline
 * não grava para não duplicar a informação na fonte.
 */
export function evoluiDe(id: string): { id: string, nome: string }[] {
	return lerEspecies()
		.filter((e) => e.evolucoes.some((evo) => evo.paraId === id))
		.map((e) => ({ id: e.id, nome: e.nome }))
}

// ------------------------------------------------------------------ Moves

/** A fatia de Move que a listagem e a busca consomem. Enxuta por desenho. */
export type MoveNoIndice = {
	id: string
	nome: string
	tipo: IdTipo | null
	tipoVariavel: boolean
	pp: number | null
	prioridade: number
	/** Já em metros: `"Pessoal (cone de 12m)"`. */
	alcance: string
	metros: number
	corpoACorpo: boolean
	ativacao: string
	modos: IdModo[]
	resolucoes: IdResolucao[]
	/** Dados base de dano, quando o Move causa dano. */
	dano: string | null
	/** Dados base de cura — campo separado porque o módulo guarda os dois no mesmo lugar. */
	cura: string | null
	poder: string
}

export function lerIndiceDeMoves(): MoveNoIndice[] {
	return ler<MoveNoIndice[]>("indice-moves")
}

export function lerMoves(): Move[] {
	return ler<Move[]>("moves")
}

let movePorId: Map<string, Move> | undefined

export function acharMove(id: string): Move | undefined {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerMoves().map((m) => [ m.id, m ])).get(id)

	movePorId ??= new Map(lerMoves().map((m) => [ m.id, m ]))
	return movePorId.get(id)
}

/** Todos os `id` de Move, para o gerador de rotas do prerender. */
export function idsDeMove(): string[] {
	return lerIndiceDeMoves().map((m) => m.id)
}

let idPorNomeDeMove: Map<string, string> | undefined

function mapaDeMoves(): Map<string, string> {
	if (!building) return new Map(lerIndiceDeMoves().map((m) => [ m.nome, m.id ]))

	idPorNomeDeMove ??= new Map(lerIndiceDeMoves().map((m) => [ m.nome, m.id ]))
	return idPorNomeDeMove
}

/** Um nome de Move de ficha de espécie, com o `id` da rota quando ele existe. */
export type MoveReferenciado = { nome: string, id: string | null }

/**
 * Resolve nomes de Move em links.
 *
 * `id: null` não é falha de busca: é uma entrada que o pipeline não conseguiu casar com
 * o compêndio e preservou como estava — tabela de defesas vazada para dentro da lista de
 * TMs, na v1.33.0 (ver `movesNaoResolvidos` em `relatorio.json`). A ficha mostra o texto
 * sem link, para que a lista do livro não encurte por causa de um defeito da fonte.
 */
export function referenciarMoves(nomes: string[]): MoveReferenciado[] {
	const porNome = mapaDeMoves()
	return nomes.map((nome) => ({ nome, id: porNome.get(nome) ?? null }))
}

/** A tabela de Moves por nível com cada nome já ligado à sua ficha. */
export function movesPorNivelComLinks(especie: Especie): { nivel: number, moves: MoveReferenciado[] }[] {
	return especie.movesPorNivel.map((linha) => ({
		nivel: linha.nivel,
		moves: referenciarMoves(linha.moves),
	}))
}

/** Uma espécie na lista de quem aprende um Move. */
export type EspecieQueAprende = { id: string, nome: string, numero: number }

export type QuemAprende = {
	nivel: EspecieQueAprende[]
	tm: EspecieQueAprende[]
	ovo: EspecieQueAprende[]
}

/**
 * Índice inverso: de nome de Move para as espécies que o aprendem.
 *
 * Construído de uma vez e memoizado no build porque é o oposto do caminho natural dos
 * dados — a ficha de espécie lista os Moves dela, e a ficha de Move precisa da relação
 * virada. São 77 mil referências; refazer a varredura em cada uma das 833 páginas de
 * Move custaria 64 milhões de comparações no prerender.
 */
let quemAprende: Map<string, QuemAprende> | undefined

function indiceInversoDeMoves(): Map<string, QuemAprende> {
	const indice = new Map<string, QuemAprende>()

	const registrar = (nome: string, campo: keyof QuemAprende, especie: EspecieQueAprende) => {
		const atual = indice.get(nome) ?? { nivel: [], tm: [], ovo: [] }
		atual[campo].push(especie)
		indice.set(nome, atual)
	}

	for (const e of lerEspecies()) {
		const resumo = { id: e.id, nome: e.nome, numero: e.numero }

		// `Set` por campo porque uma espécie pode repetir o mesmo Move em dois níveis.
		for (const nome of new Set(e.movesPorNivel.flatMap((l) => l.moves))) registrar(nome, "nivel", resumo)
		for (const nome of new Set(e.tms)) registrar(nome, "tm", resumo)
		for (const nome of new Set(e.movesDeOvo)) registrar(nome, "ovo", resumo)
	}

	return indice
}

export function especiesQueAprendem(nomeDoMove: string): QuemAprende {
	if (building) quemAprende ??= indiceInversoDeMoves()

	const indice = quemAprende ?? indiceInversoDeMoves()
	return indice.get(nomeDoMove) ?? { nivel: [], tm: [], ovo: [] }
}
