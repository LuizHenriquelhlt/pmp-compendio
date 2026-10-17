/**
 * As páginas de regras do livro.
 *
 * Esta fatia não é um catálogo de fichas como as outras: não há campos a comparar, só
 * texto. Por isso o modelo é mínimo - o trabalho de verdade aconteceu no pipeline, que
 * sanitizou o HTML do módulo contra uma lista fechada de tags (ver `ferramentas/regras.mjs`).
 */

/** Uma página de uma entrada: o título e o HTML já sanitizado. */
export type PaginaDeRegra = {
	titulo: string
	html: string
}

export type Regra = {
	id: string
	nome: string
	/**
	 * A pasta de onde a entrada veio: "Regras" é o livro, "Homebrews" é o que a mesa
	 * acrescentou. A distinção muda como se lê a página, então ela sobe para o modelo em
	 * vez de virar uma lista só.
	 */
	grupo: string | null
	paginas: PaginaDeRegra[]
}

export type RegraNoIndice = {
	id: string
	nome: string
	grupo: string | null
	paginas: number
	/** Primeiras linhas em texto puro, para o cartão da listagem não ser só o título. */
	resumo: string
}
