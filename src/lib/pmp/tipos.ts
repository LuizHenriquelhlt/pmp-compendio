/**
 * Os 18 tipos elementais do PMP.
 *
 * Os `id` são os nomes em português — essa é a identidade canônica no compêndio, e
 * aparece nas URLs (`/tipos/fogo`). O módulo Foundry grava os tipos com chaves em
 * inglês; a conversão acontece uma única vez, no pipeline (`ferramentas/construir.mjs`).
 *
 * As cores NÃO vivem aqui: cada tipo tem uma classe `.tipo-<id>` em `ui/tipos.css`
 * que define `--tipo-cor` e `--tipo-contraste`, para que o tema claro/escuro possa
 * reajustá-las sem tocar nesta tabela.
 */
export const TIPOS = [
	{ id: "normal", nome: "Normal" },
	{ id: "fogo", nome: "Fogo" },
	{ id: "agua", nome: "Água" },
	{ id: "eletrico", nome: "Elétrico" },
	{ id: "grama", nome: "Grama" },
	{ id: "gelo", nome: "Gelo" },
	{ id: "lutador", nome: "Lutador" },
	{ id: "venenoso", nome: "Venenoso" },
	{ id: "terrestre", nome: "Terrestre" },
	{ id: "voador", nome: "Voador" },
	{ id: "psiquico", nome: "Psíquico" },
	{ id: "inseto", nome: "Inseto" },
	{ id: "pedra", nome: "Pedra" },
	{ id: "fantasma", nome: "Fantasma" },
	{ id: "dragao", nome: "Dragão" },
	{ id: "sombrio", nome: "Sombrio" },
	{ id: "aco", nome: "Aço" },
	{ id: "fada", nome: "Fada" },
] as const

export type IdTipo = (typeof TIPOS)[number]["id"]

const POR_ID = new Map(TIPOS.map((t) => [ t.id, t ]))

export function nomeDoTipo(id: IdTipo): string {
	return POR_ID.get(id)?.nome ?? id
}

export function ehTipo(valor: string): valor is IdTipo {
	return POR_ID.has(valor as IdTipo)
}

/** Chaves em inglês usadas pelo módulo Foundry, na ordem de `TIPOS`. */
export const TIPO_POR_CHAVE_FOUNDRY: Record<string, IdTipo> = {
	normal: "normal",
	fire: "fogo",
	water: "agua",
	electric: "eletrico",
	grass: "grama",
	ice: "gelo",
	fighting: "lutador",
	poison: "venenoso",
	ground: "terrestre",
	flying: "voador",
	psychic: "psiquico",
	bug: "inseto",
	rock: "pedra",
	ghost: "fantasma",
	dragon: "dragao",
	dark: "sombrio",
	steel: "aco",
	fairy: "fada",
}
