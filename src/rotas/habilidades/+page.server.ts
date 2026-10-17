import { lerIndiceDeHabilidades, totalDePortadores } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
	// A contagem de portadores não vem dos dados: é relação inversa, e o projeto não a
	// grava no pipeline para não duplicar na fonte o que já está nas fichas de espécie.
	// Aqui ela é calculada uma vez (memoizada no build) e assada na página.
	const portadores = totalDePortadores()

	return {
		habilidades: lerIndiceDeHabilidades().map((h) => ({
			...h,
			portadores: portadores.get(h.nome) ?? 0,
		})),
	}
}
