import {
	acharEspecie, evoluiDe, habilidadesDaEspecie, idsDeEspecie, megasDaEspecie, movesPorNivelComLinks,
	referenciarMoves, referenciarTms,
} from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de espécie existem — uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeEspecie().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const especie = acharEspecie(params.id)
	if (especie == null) error(404, `Espécie "${params.id}" não existe no compêndio.`)

	return {
		especie,
		habilidades: habilidadesDaEspecie(especie),
		megas: megasDaEspecie(especie.id),
		anteriores: evoluiDe(especie.id),
		// Os nomes de Move viram links aqui, e não no componente: a resolução precisa do
		// índice de Moves, que só o lado servidor lê.
		movesPorNivel: movesPorNivelComLinks(especie),
		tms: referenciarTms(especie.tms),
		movesDeOvo: referenciarMoves(especie.movesDeOvo),
	}
}
