import {
	lerCatalogoDeTms, lerIndice, lerIndiceDeHabilidades, lerIndiceDeItens, lerIndiceDeMegas,
	lerIndiceDeMoves, lerIndiceDeRegras,
} from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
	return {
		totalDeEspecies: lerIndice().length,
		totalDeMoves: lerIndiceDeMoves().length,
		totalDeHabilidades: lerIndiceDeHabilidades().length,
		totalDeMegas: lerIndiceDeMegas().length,
		totalDeItens: lerIndiceDeItens().length,
		totalDeTms: lerCatalogoDeTms().length,
		totalDeRegras: lerIndiceDeRegras().length,
	}
}
