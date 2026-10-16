import { lerIndiceDeMoves } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => {
	return { moves: lerIndiceDeMoves() }
}
