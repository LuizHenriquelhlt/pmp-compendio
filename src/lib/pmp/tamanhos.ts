/** Categorias de tamanho do PMP, da menor para a maior. */
export const TAMANHOS = [
	{ id: "minusculo", nome: "Minúsculo", chaveFoundry: "tiny" },
	{ id: "pequeno", nome: "Pequeno", chaveFoundry: "small" },
	{ id: "medio", nome: "Médio", chaveFoundry: "medium" },
	{ id: "grande", nome: "Grande", chaveFoundry: "large" },
	{ id: "enorme", nome: "Enorme", chaveFoundry: "huge" },
	{ id: "gigantesco", nome: "Gigantesco", chaveFoundry: "gigantic" },
] as const

export type IdTamanho = (typeof TAMANHOS)[number]["id"]

const POR_ID = new Map(TAMANHOS.map((t) => [ t.id, t ]))

export const TAMANHO_POR_CHAVE_FOUNDRY: Record<string, IdTamanho> = Object.fromEntries(
	TAMANHOS.map((t) => [ t.chaveFoundry, t.id ]),
)

export function nomeDoTamanho(id: IdTamanho): string {
	return POR_ID.get(id)?.nome ?? id
}

/** Posição na escala, para ordenar listas por tamanho. */
export function ordemDoTamanho(id: IdTamanho): number {
	return TAMANHOS.findIndex((t) => t.id === id)
}
