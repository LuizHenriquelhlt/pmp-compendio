import { lerIndice } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
	const especies = lerIndice()

	// As gerações do filtro vêm dos próprios dados, não de uma lista fixa: quando o
	// módulo ganhar uma geração nova, o filtro a mostra sem alteração de código.
	const geracoes = [ ...new Map(
		especies
			.filter((e) => e.geracao != null)
			.map((e) => [ e.geracao, { numero: e.geracao as number, regiao: e.regiao ?? "" } ]),
	).values() ].sort((a, b) => a.numero - b.numero)

	return { especies, geracoes }
}
