import type { IdTipo } from "./tipos"

/**
 * Uma linha do catálogo de TMs: o disco e o Move que ele ensina.
 *
 * Não existe página própria de TM, e isso é deliberado. Um TM É um Move - `/moves/absorb`
 * já é a ficha dele, com tudo. Uma rota `/tms/114` mostraria a mesma ficha num segundo
 * endereço, duplicando 321 páginas e dando dois caminhos canônicos para o mesmo
 * conteúdo. A aba de TMs é a TABELA dos discos; cada linha leva ao Move.
 */
export type Tm = {
	numero: number
	/** `null` quando o nome gravado no disco não casa com nenhum Move do compêndio. */
	id: string | null
	nome: string
	tipo: IdTipo | null
	pp: number | null
	alcance: string | null
}
