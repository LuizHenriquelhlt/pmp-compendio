import { acharItem, especiesQueEvoluemCom, idsDeItem } from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de Item existem - uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeItem().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const item = acharItem(params.id)
	if (item == null) error(404, `Item "${params.id}" não existe no compêndio.`)

	return { item, evolucoes: especiesQueEvoluemCom(item.id) }
}
