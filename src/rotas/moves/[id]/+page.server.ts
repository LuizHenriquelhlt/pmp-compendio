import { acharMove, especiesQueAprendem, idsDeMove } from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de Move existem — uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeMove().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const move = acharMove(params.id)
	if (move == null) error(404, `Move "${params.id}" não existe no compêndio.`)

	const quemAprende = especiesQueAprendem(move.nome)

	// Ordenar pelo número da Pokédex é a ordem em que o livro lista as espécies, e torna
	// a lista percorrível para quem procura uma linha evolutiva específica.
	const porNumero = (a: { numero: number, nome: string }, b: { numero: number, nome: string }) =>
		a.numero - b.numero || a.nome.localeCompare(b.nome, "pt-BR")

	return {
		move,
		quemAprende: {
			nivel: [ ...quemAprende.nivel ].sort(porNumero),
			tm: [ ...quemAprende.tm ].sort(porNumero),
			ovo: [ ...quemAprende.ovo ].sort(porNumero),
		},
	}
}
