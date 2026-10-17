import { lerIndiceDeRegras } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => ({ regras: lerIndiceDeRegras() })
