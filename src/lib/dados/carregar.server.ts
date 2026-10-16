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
