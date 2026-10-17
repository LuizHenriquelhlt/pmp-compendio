import { acharEspecie, acharMega, idsDeMega } from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de Mega existem - uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeMega().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const mega = acharMega(params.id)
	if (mega == null) error(404, `Mega "${params.id}" não existe no compêndio.`)

	// A fatia da espécie-base que a ficha usa para mostrar o ANTES de cada delta. Vem aqui
	// e não no pipeline porque é a ficha de espécie que já tem esses números: duplicá-los
	// nos 93 registros de Mega criaria duas cópias do mesmo statblock para divergirem.
	//
	// `null` nas três cujo nome de espécie-base não casa com a Pokédex (Eternal Flower
	// Floette, Meowstic e Tatsugiri na v1.33.0). Sem base não há antes nem depois - só o
	// delta é verdade -, e a ficha diz isso.
	const base = mega.especieId != null ? acharEspecie(mega.especieId) : undefined

	return {
		mega,
		base: base == null ? null : {
			id: base.id,
			nome: base.nome,
			numero: base.numero,
			tipos: base.tipos,
			tamanho: base.tamanho,
			ca: base.ca,
			atributos: base.atributos,
			deslocamentos: base.deslocamentos,
			imagem: base.imagem,
		},
	}
}
