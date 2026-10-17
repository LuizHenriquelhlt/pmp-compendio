/**
 * As páginas de regras, lidas dos JournalEntry do módulo.
 *
 * ONDE O TEXTO VIVE. Em `pages[].text.content`, e não em `system.description` como nos
 * outros packs - um JournalEntry é uma coleção de páginas, cada uma com HTML próprio.
 * São 23 entradas em 34 páginas, 121 mil caracteres, em duas pastas: "Regras" (20
 * entradas) e "Homebrews" (3).
 *
 * POR QUE DÁ PARA PUBLICAR O HTML. Medido sobre as 34 páginas: zero `<script>`, zero
 * `<style>`, zero `<iframe>`, zero atributo `on*`, zero `href` e zero `<img>`. Também
 * zero sintaxe própria do Foundry - nenhum `@UUID[...]`, nenhuma `[[rolagem]]` - então
 * não há linguagem de marcação a interpretar, só HTML comum. As tags usadas são 16, e
 * os ÚNICOS atributos em todo o corpus são sete `style="text-align:center"` e um
 * `style="font-size:0.72rem"`.
 *
 * MESMO ASSIM, SANITIZAMOS, e fechado: a lista de tags é de permissão, TODOS os
 * atributos são descartados, e o que não está na lista é removido. A medição acima diz
 * como o corpus está hoje, não como estará na próxima versão do módulo - e é o autor do
 * módulo quem escreve esse HTML, não nós. O que for descartado vai para o relatório, que
 * é como a próxima versão nos avisa que mudou.
 *
 * O único atributo preservado vira classe: `text-align:center` sai como `class="centro"`,
 * para o CSS do site decidir o que isso significa.
 */
import { slug } from "./texto.mjs"

/** As 16 tags que o corpus usa. Qualquer outra é removida, mantendo o texto de dentro. */
const PERMITIDAS = new Set([
	"p", "strong", "em", "code", "br",
	"ul", "ol", "li",
	"table", "thead", "tbody", "tr", "th", "td",
	"h2", "h3", "h4", "h5",
])

/** Títulos descem um nível: o nome da página já é o `h2` da ficha. */
const REBAIXAR = { h2: "h3", h3: "h4", h4: "h5", h5: "h6" }

const TAG = /<\s*(\/?)\s*([a-zA-Z][\w-]*)([^>]*)>/g

export function sanitizar(html = "", descartadas = []) {
	return String(html ?? "").replace(TAG, (inteira, barra, nome, atributos) => {
		const tag = nome.toLowerCase()

		if (!PERMITIDAS.has(tag)) {
			descartadas.push(tag)
			return ""
		}

		const final = REBAIXAR[tag] ?? tag
		if (barra === "/") return `</${final}>`

		// Único atributo que sobrevive, e traduzido para classe: o CSS do site decide o
		// que "centro" significa, em vez de herdar um estilo embutido do módulo.
		const centralizado = /text-align\s*:\s*center/i.test(atributos)
		return centralizado ? `<${final} class="centro">` : `<${final}>`
	})
}

/**
 * Uma entrada de regra já pronta para o site.
 *
 * `grupo` vem da pasta do Foundry: "Regras" é o livro, "Homebrews" é o que a mesa
 * acrescentou. A distinção importa na leitura, então ela sobe para o modelo em vez de
 * virar uma lista só.
 */
export function interpretarEntrada(documento, nomeDaPasta = null) {
	const descartadas = []

	const paginas = (documento.pages ?? [])
		.map((pagina) => ({
			titulo: String(pagina.name ?? "").trim(),
			html: sanitizar(pagina.text?.content ?? "", descartadas).trim(),
		}))
		.filter((p) => p.html !== "")

	return {
		entrada: {
			id: slug(documento.name ?? ""),
			nome: String(documento.name ?? "").trim(),
			grupo: nomeDaPasta,
			paginas,
		},
		descartadas,
	}
}

/**
 * Lê o pack inteiro. Os documentos sem `pages` são as PASTAS do Foundry - é delas que
 * sai o nome do grupo, e por isso elas vêm no mesmo arquivo.
 */
export function interpretarRegras(documentos = []) {
	const pastas = new Map()
	for (const documento of documentos) {
		if (documento?.pages == null) pastas.set(documento?._id, documento?.name ?? null)
	}

	const entradas = []
	const descartadas = []

	for (const documento of documentos) {
		if (documento?.pages == null) continue
		const lido = interpretarEntrada(documento, pastas.get(documento.folder) ?? null)
		if (lido.entrada.paginas.length === 0) continue
		entradas.push(lido.entrada)
		for (const tag of lido.descartadas) descartadas.push({ entrada: lido.entrada.nome, tag })
	}

	return { entradas, descartadas }
}
