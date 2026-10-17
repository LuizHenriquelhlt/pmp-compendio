import { lerIndiceDeMegas } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => ({ megas: lerIndiceDeMegas() })
