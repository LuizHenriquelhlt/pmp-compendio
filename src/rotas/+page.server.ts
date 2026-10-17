import { lerIndice, lerIndiceDeHabilidades, lerIndiceDeMoves } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
	return {
		totalDeEspecies: lerIndice().length,
		totalDeMoves: lerIndiceDeMoves().length,
		totalDeHabilidades: lerIndiceDeHabilidades().length,
	}
}
