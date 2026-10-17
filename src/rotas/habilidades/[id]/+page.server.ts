import { acharHabilidade, especiesComHabilidade, idsDeHabilidade } from "$dados/carregar.server"
import { error } from "@sveltejs/kit"
import type { EntryGenerator, PageServerLoad } from "./$types"

/** Diz ao prerender quais páginas de Habilidade existem — uma por `id` do compêndio. */
export const entries: EntryGenerator = () => idsDeHabilidade().map((id) => ({ id }))

export const load: PageServerLoad = ({ params }) => {
	const habilidade = acharHabilidade(params.id)
	if (habilidade == null) error(404, `Habilidade "${params.id}" não existe no compêndio.`)

	const quemTem = especiesComHabilidade(habilidade.nome)

	// Ordenar pelo número da Pokédex é a ordem em que o livro lista as espécies, e torna a
	// lista percorrível para quem procura uma linha evolutiva específica.
	const porNumero = (a: { numero: number, nome: string }, b: { numero: number, nome: string }) =>
		a.numero - b.numero || a.nome.localeCompare(b.nome, "pt-BR")

	return {
		habilidade,
		quemTem: {
			padrao: [ ...quemTem.padrao ].sort(porNumero),
			oculta: [ ...quemTem.oculta ].sort(porNumero),
		},
	}
}
