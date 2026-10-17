import { acharRegra, idsDeRegra, lerIndiceDeRegras } from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de regra existem - uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeRegra().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const regra = acharRegra(params.id)
	if (regra == null) error(404, `A regra "${params.id}" não existe no compêndio.`)

	// Vizinhas do mesmo grupo, para seguir lendo sem voltar ao sumário - é texto corrido,
	// e quem lê "Condições" costuma querer "Mudanças de Status" em seguida.
	const vizinhas = lerIndiceDeRegras()
		.filter((r) => r.grupo === regra.grupo && r.id !== regra.id)
		.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

	return { regra, vizinhas }
}
