import { lerCatalogoDeTms } from "$dados/carregar.server"
import type { PageServerLoad } from "./$types"

export const load: PageServerLoad = () => ({ tms: lerCatalogoDeTms() })
