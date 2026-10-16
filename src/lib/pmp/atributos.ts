/**
 * Os seis atributos, com as abreviações que o Livro de Regras usa em português.
 * As chaves internas seguem as do Foundry (`str`, `dex`, …) porque são a forma como
 * o módulo grava os valores e como as fórmulas dos Moves se referem a eles ("+ MOVE",
 * "teste de DES"); traduzir a chave só criaria um ponto de conversão a mais sem ganho.
 */
export const ATRIBUTOS = [
	{ id: "str", abrev: "FOR", nome: "Força" },
	{ id: "dex", abrev: "DES", nome: "Destreza" },
	{ id: "con", abrev: "CON", nome: "Constituição" },
	{ id: "int", abrev: "INT", nome: "Inteligência" },
	{ id: "wis", abrev: "SAB", nome: "Sabedoria" },
	{ id: "cha", abrev: "CAR", nome: "Carisma" },
] as const

export type IdAtributo = (typeof ATRIBUTOS)[number]["id"]

/** Modificador de um valor de atributo, pela regra padrão d20: (valor − 10) / 2, para baixo. */
export function modificador(valor: number): number {
	return Math.floor((valor - 10) / 2)
}

/** Formata um modificador com sinal explícito, como aparece numa ficha: `+2`, `−1`, `+0`. */
export function formatarModificador(valor: number): string {
	const mod = modificador(valor)
	return mod < 0 ? `−${Math.abs(mod)}` : `+${mod}`
}
