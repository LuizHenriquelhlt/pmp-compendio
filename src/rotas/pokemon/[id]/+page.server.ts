import { acharEspecie, evoluiDe, habilidadesDaEspecie, idsDeEspecie } from "$dados/carregar.server"
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
		anteriores: evoluiDe(especie.id),
	}
}
