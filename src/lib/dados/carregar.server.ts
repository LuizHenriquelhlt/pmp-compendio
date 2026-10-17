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
import type { Habilidade, IdClima } from "$pmp/habilidade"
import type { Item, ItemNoIndice } from "$pmp/item"
import type { Mega, MegaNoIndice } from "$pmp/mega"
import type { IdModo, IdResolucao, IdStatus, Move } from "$pmp/move"
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

export function lerHabilidades(): Habilidade[] {
	return ler<Habilidade[]>("habilidades")
}

// ------------------------------------------------------------------ Megas

export function lerMegas(): Mega[] {
	return ler<Mega[]>("megas")
}

export function lerIndiceDeMegas(): MegaNoIndice[] {
	return ler<MegaNoIndice[]>("indice-megas")
}

let megaPorId: Map<string, Mega> | undefined

export function acharMega(id: string): Mega | undefined {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerMegas().map((m) => [ m.id, m ])).get(id)

	megaPorId ??= new Map(lerMegas().map((m) => [ m.id, m ]))
	return megaPorId.get(id)
}

/** Todos os `id` de Mega, para o gerador de rotas do prerender. */
export function idsDeMega(): string[] {
	return lerIndiceDeMegas().map((m) => m.id)
}

/**
 * As Megas de uma espécie — uma LISTA, não um campo.
 *
 * Seis espécies têm duas pedras na v1.33.0: Charizard, Mewtwo e Raichu com as formas X e
 * Y, e Garchomp, Absol e Lucario com a forma Z que o PMP acrescentou. Um campo único
 * esconderia metade.
 *
 * É relação inversa, como `evoluiDe` e `especiesComHabilidade`: a pedra declara a
 * espécie-base, e não o contrário, então o pipeline não grava a volta na ficha de espécie.
 * Varrer 93 registros por página de espécie é barato — ao contrário do índice inverso de
 * Moves, que precisou de memoização por ter 77 mil referências.
 */
export function megasDaEspecie(especieId: string): MegaNoIndice[] {
	return lerIndiceDeMegas().filter((m) => m.especieId === especieId)
}

// ------------------------------------------------------------------ Itens

export function lerItens(): Item[] {
	return ler<Item[]>("itens")
}

export function lerIndiceDeItens(): ItemNoIndice[] {
	return ler<ItemNoIndice[]>("indice-itens")
}

let itemPorId: Map<string, Item> | undefined

export function acharItem(id: string): Item | undefined {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerItens().map((i) => [ i.id, i ])).get(id)

	itemPorId ??= new Map(lerItens().map((i) => [ i.id, i ]))
	return itemPorId.get(id)
}

/** Todos os `id` de Item, para o gerador de rotas do prerender. */
export function idsDeItem(): string[] {
	return lerIndiceDeItens().map((i) => i.id)
}

/** Uma evolução que depende de um item, vista do lado do item. */
export type EvolucaoPorItem = {
	de: { id: string, nome: string, numero: number }
	para: { id: string | null, nome: string }
}

/**
 * Quem evolui com este item — a relação inversa de `evolucoes.itemId`.
 *
 * Calculada na leitura e não gravada no pipeline, pela mesma razão que `evoluiDe` e
 * `especiesComHabilidade`: é o avesso do caminho natural do dado. O livro declara o item
 * dentro da condição de evolução da espécie, e duplicar a volta na ficha do item criaria
 * duas cópias da mesma ligação para divergirem.
 *
 * São 80 evoluções por item nas 1.149 espécies — varrer é barato, e não precisa da
 * memoização que o índice inverso de Moves exigiu.
 */
export function especiesQueEvoluemCom(itemId: string): EvolucaoPorItem[] {
	const encontradas: EvolucaoPorItem[] = []

	for (const especie of lerEspecies()) {
		for (const evolucao of especie.evolucoes) {
			if (evolucao.itemId !== itemId) continue

			encontradas.push({
				de: { id: especie.id, nome: especie.nome, numero: especie.numero },
				para: { id: evolucao.paraId, nome: evolucao.para },
			})
		}
	}

	return encontradas.sort((a, b) => a.de.numero - b.de.numero || a.de.nome.localeCompare(b.de.nome, "pt-BR"))
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
 * Uma habilidade na ficha de espécie: o texto de regra, o `id` da ficha própria e as duas
 * ressalvas que a página precisa dizer em voz alta.
 *
 * `oculta` é propriedade do PAR espécie–habilidade, não da habilidade: das 302 com
 * portador, 139 aparecem como padrão numa espécie e como oculta em outra (Sheer Force é
 * oculta em 22 e padrão em 12). Por isso a marca vive aqui e não em `Habilidade`.
 */
export type HabilidadeDaEspecie = {
	nome: string
	/** `null` se o nome não casar com o pack — não acontece na v1.33.0, mas o link precisa decidir. */
	id: string | null
	texto: string
	oculta: boolean
	/** O módulo não tem a regra: a página diz isso em vez de mostrar a nota de extração. */
	semRegra: boolean
}

let habilidadePorNome: Map<string, Habilidade> | undefined

function mapaDeHabilidades(): Map<string, Habilidade> {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerHabilidades().map((h) => [ h.nome, h ]))

	habilidadePorNome ??= new Map(lerHabilidades().map((h) => [ h.nome, h ]))
	return habilidadePorNome
}

/**
 * As habilidades de uma espécie, já resolvidas contra o pack.
 *
 * As 2.662 referências das fichas casam com o pack nas 2.662 na v1.33.0 — nada do reparo
 * que `moveTable`, `tms` e `eggMoves` exigem. Ainda assim o `id` pode ser `null`, porque
 * é a página que decide entre link e texto, e não dá para supor que a fonte continue
 * limpa na próxima versão.
 */
export function habilidadesDaEspecie(especie: Especie): HabilidadeDaEspecie[] {
	const catalogo = mapaDeHabilidades()

	const resolver = (nome: string, oculta: boolean): HabilidadeDaEspecie => {
		const habilidade = catalogo.get(nome)

		return {
			nome,
			id: habilidade?.id ?? null,
			texto: habilidade?.descricao ?? "",
			oculta,
			semRegra: habilidade?.semRegra ?? false,
		}
	}

	const normais = especie.habilidades.map((nome) => resolver(nome, false))
	if (especie.habilidadeOculta == null) return normais

	return [ ...normais, resolver(especie.habilidadeOculta, true) ]
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

/**
 * Um nome de Move de ficha de espécie, com o `id` da rota quando ele existe.
 *
 * `tm` vem preenchido só na lista de TMs, e é o número que o livro dá ao disco — está no
 * nome do documento no módulo ("TM114: Grass Knot"), não num campo.
 */
export type MoveReferenciado = { nome: string, id: string | null, tm?: number }

let numeroDeTm: Record<string, number> | undefined

function tmPorMove(): Record<string, number> {
	if (!building) return ler<Record<string, number>>("tms")

	numeroDeTm ??= ler<Record<string, number>>("tms")
	return numeroDeTm
}

/**
 * A lista de TMs de uma espécie, com o número de cada disco.
 *
 * Separada de `referenciarMoves` porque só os TMs têm número: a tabela por nível e os
 * Moves de Ovo são os mesmos Moves sem disco nenhum.
 *
 * `tm` fica ausente nas 21 entradas que não casam — e essas são justamente as linhas
 * contaminadas que `movesNaoResolvidos` já acusa, não TMs que faltam no pack.
 */
export function referenciarTms(nomes: string[]): MoveReferenciado[] {
	const porNome = mapaDeMoves()
	const numero = tmPorMove()

	return nomes.map((nome) => ({
		nome,
		id: porNome.get(nome) ?? null,
		...(numero[nome] != null ? { tm: numero[nome] } : {}),
	}))
}

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

// ------------------------------------------------------------------ Habilidades

/**
 * A fatia de Habilidade que a listagem e a busca consomem. Enxuta por desenho: fica de
 * fora o texto da descrição, os efeitos detalhados e a lista de Megas.
 *
 * Os efeitos entram achatados em facetas, como `resolucoes` e `modos` no índice de
 * Moves — é o que os filtros consultam.
 */
export type HabilidadeNoIndice = {
	id: string
	nome: string
	/** O módulo não tem a regra. 74 das 313 na v1.33.0. */
	semRegra: boolean
	imunidadesDeStatus: IdStatus[]
	imunidadesDeTipo: IdTipo[]
	climas: IdClima[]
	/** Air Lock e Cloud Nine suprimem o clima inteiro, sem nomear nenhum. */
	suprimeClima: boolean
	concedeMove: boolean
	/**
	 * Quantas Megas concedem a habilidade.
	 *
	 * Vem do pipeline, e não da leitura como a contagem de espécies, porque não é relação
	 * inversa: a pedra declara a habilidade, e não o contrário. É o que impede o cartão de
	 * dizer "sem portador" em Delta Stream, Aerilate e Parental Bond.
	 */
	megas: number
}

export function lerIndiceDeHabilidades(): HabilidadeNoIndice[] {
	return ler<HabilidadeNoIndice[]>("indice-habilidades")
}

let habilidadePorId: Map<string, Habilidade> | undefined

export function acharHabilidade(id: string): Habilidade | undefined {
	// Mesma regra do cache de arquivos: memoiza no build, relê em desenvolvimento.
	if (!building) return new Map(lerHabilidades().map((h) => [ h.id, h ])).get(id)

	habilidadePorId ??= new Map(lerHabilidades().map((h) => [ h.id, h ]))
	return habilidadePorId.get(id)
}

/** Todos os `id` de Habilidade, para o gerador de rotas do prerender. */
export function idsDeHabilidade(): string[] {
	return lerIndiceDeHabilidades().map((h) => h.id)
}

/** Uma espécie na lista de quem tem uma habilidade. */
export type EspecieComHabilidade = { id: string, nome: string, numero: number }

/**
 * Quem tem a habilidade, separado pelo jeito de obtê-la.
 *
 * Os dois grupos existem porque "oculta" é propriedade do par espécie–habilidade: 139 das
 * 302 habilidades com portador são padrão em algumas espécies e ocultas em outras, e
 * juntá-las num grupo só apagaria a distinção que o livro faz.
 */
export type QuemTem = {
	padrao: EspecieComHabilidade[]
	oculta: EspecieComHabilidade[]
}

/**
 * Índice inverso: de nome de Habilidade para as espécies que a têm.
 *
 * Construído de uma vez e memoizado no build pela mesma razão que o de Moves — é o
 * oposto do caminho natural dos dados, e refazer a varredura em cada uma das 313 páginas
 * de habilidade repetiria 1.149 leituras de ficha por página.
 */
let quemTem: Map<string, QuemTem> | undefined

function indiceInversoDeHabilidades(): Map<string, QuemTem> {
	const indice = new Map<string, QuemTem>()

	const registrar = (nome: string, campo: keyof QuemTem, especie: EspecieComHabilidade) => {
		const atual = indice.get(nome) ?? { padrao: [], oculta: [] }
		atual[campo].push(especie)
		indice.set(nome, atual)
	}

	for (const e of lerEspecies()) {
		const resumo = { id: e.id, nome: e.nome, numero: e.numero }

		// `Set` porque Rockruff é a única espécie com três opções e nada garante que a
		// fonte não repita um nome na lista.
		for (const nome of new Set(e.habilidades)) registrar(nome, "padrao", resumo)
		if (e.habilidadeOculta != null) registrar(e.habilidadeOculta, "oculta", resumo)
	}

	return indice
}

export function especiesComHabilidade(nomeDaHabilidade: string): QuemTem {
	if (building) quemTem ??= indiceInversoDeHabilidades()

	const indice = quemTem ?? indiceInversoDeHabilidades()
	return indice.get(nomeDaHabilidade) ?? { padrao: [], oculta: [] }
}

/**
 * Quantos portadores cada habilidade tem, para a listagem.
 *
 * Vem daqui e não do pipeline de propósito: é relação inversa, e o projeto não a grava
 * nos dados para não duplicar na fonte o que já está nas fichas de espécie — a mesma
 * razão de `evoluiDe` não existir como campo.
 */
export function totalDePortadores(): Map<string, number> {
	if (building) quemTem ??= indiceInversoDeHabilidades()

	const indice = quemTem ?? indiceInversoDeHabilidades()
	return new Map([ ...indice ].map(([ nome, { padrao, oculta } ]) => [ nome, padrao.length + oculta.length ]))
}
