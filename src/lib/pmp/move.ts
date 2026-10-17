import { t } from "$i18n"
import type { IdAtributo } from "./atributos"
import type { IdTipo } from "./tipos"

/**
 * Um Move como o compêndio o consome. Deriva de `flags["pokemon-mundo-perfeito"].move`
 * via `ferramentas/construir.mjs`.
 *
 * Os nomes de Move ficam em inglês de propósito: é assim que o PMP os publica, em
 * qualquer idioma do livro. O `id` da rota segue a mesma regra de slug do resto do
 * projeto, então `Will-O-Wisp` vira `/moves/will-o-wisp`.
 */
export type Move = {
	id: string
	nome: string
	/** `null` nos Moves de tipo variável - ver `tipoVariavel`. */
	tipo: IdTipo | null
	/** Natural Gift e Judgment mudam de tipo em jogo; o módulo os marca como `variable`. */
	tipoVariavel: boolean
	poder: { atributos: IdAtributo[], texto: string }
	ativacao: Ativacao
	/** `null` em Struggle, o único Move de PP ilimitado. */
	pp: number | null
	duracao: Duracao
	alcance: Alcance
	prioridade: number
	/**
	 * A prioridade que o texto do Move declara, quando o campo do módulo discorda.
	 * Três Moves estão nessa situação na v1.33.0 - ver `relatorio.json`.
	 */
	prioridadeNoTexto: number | null
	resolucoes: IdResolucao[]
	dano: Dados | null
	cura: Dados | null
	efeitos: Efeito[]
	descricao: string
	niveisSuperiores: string
	observacoes: string
	/** Efeito do Move na forma Z, quando o livro o descreve. */
	zPower: string | null
	imagem: string | null
}

export type Ativacao = {
	/** Como o livro escreve: `"1 ação / reação"`. */
	texto: string
	modos: IdModo[]
	/** O Move consome a rodada seguinte. */
	recarga: boolean
	/** O Move precisa de uma rodada de preparação. */
	carga: boolean
}

export type Duracao = {
	texto: string
	concentracao: boolean
	instantanea: boolean
}

export type Alcance = {
	/** Já em metros: `"Pessoal (cone de 12m)"`. */
	texto: string
	/** Texto do módulo, com os pés, para conferência. */
	bruto: string
	metros: number
	corpoACorpo: boolean
	pessoal: boolean
	variavel: boolean
	forma: "cone" | "linha" | "raio" | "semicirculo" | null
	/** `true` quando o campo está cortado na fonte (Tera Starstorm na v1.33.0). */
	truncado: boolean
}

/** Dados de dano ou de cura, com o escalonamento por nível que o livro publica. */
export type Dados = {
	base?: string
	escalonamento?: { nivel: number, formula: string }[]
}

export type Fracao = { numerador: number, denominador: number }

/** Quem recebe o efeito. `null` quando o livro não deixa claro. */
export type AlvoDeEfeito = "alvo" | "usuario" | "aliado" | "todos" | null

export type Gatilho =
	| { tipo: "natural", minimo?: number, maximo?: number }
	| { tipo: "acerto" | "falha" | "disputa" | "uso" }

export type Efeito =
	| { tipo: "status", status: IdStatus, alvo: AlvoDeEfeito, gatilho?: Gatilho }
	| { tipo: "estagio", atributo: IdAtributoDeEstagio, delta: number, alvo?: AlvoDeEfeito, limite?: number, gatilho?: Gatilho }
	| { tipo: "dreno", fracao: Fracao }
	// O recuo tem exatamente uma das duas bases - fração do dano causado (o caso comum) ou
	// fração da vida máxima do usuário (Chloroblast). São mecânicas diferentes, e a união
	// as mantém exclusivas em vez de deixar as duas opcionais e as duas ausentes possíveis.
	| { tipo: "recuo", fracao: Fracao }
	| { tipo: "recuo", fracaoDeVida: Fracao }
	| { tipo: "cura", dados?: string, comMove?: boolean, fracaoDeVida?: Fracao, total?: boolean, alvo: AlvoDeEfeito }

/**
 * As condições de status do PMP.
 *
 * Os nomes ficam aqui, e não em `mensagens/`, pela mesma razão que os nomes de tipo em
 * `tipos.ts`: são vocabulário do sistema, não texto de interface. Um idioma novo os
 * traduz junto com o conteúdo, não junto com os rótulos da tela.
 */
export const STATUS = [
	{ id: "queimado", nome: "Queimado" },
	{ id: "congelado", nome: "Congelado" },
	{ id: "paralisado", nome: "Paralisado" },
	{ id: "envenenado", nome: "Envenenado" },
	{ id: "gravemente-envenenado", nome: "Gravemente Envenenado" },
	{ id: "sonolento", nome: "Sonolento" },
	{ id: "dormindo", nome: "Dormindo" },
	{ id: "confuso", nome: "Confuso" },
	{ id: "atordoado", nome: "Atordoado" },
	{ id: "encantado", nome: "Encantado" },
	{ id: "amedrontado", nome: "Amedrontado" },
	{ id: "impedido", nome: "Impedido" },
	{ id: "caido", nome: "Caído" },
	{ id: "cego", nome: "Cego" },
	{ id: "exausto", nome: "Exausto" },
] as const

export type IdStatus = (typeof STATUS)[number]["id"]

/** Os atributos de batalha que mudam por estágio. */
export const ATRIBUTOS_DE_ESTAGIO = [
	{ id: "ataque", nome: "Ataque" },
	{ id: "defesa", nome: "Defesa" },
	{ id: "ataque-especial", nome: "Ataque Especial" },
	{ id: "defesa-especial", nome: "Defesa Especial" },
	{ id: "velocidade", nome: "Velocidade" },
	{ id: "precisao", nome: "Precisão" },
	{ id: "evasao", nome: "Evasão" },
	{ id: "critico", nome: "Margem de Crítico" },
] as const

export type IdAtributoDeEstagio = (typeof ATRIBUTOS_DE_ESTAGIO)[number]["id"]

/**
 * Como o Move é resolvido na mesa - a categoria que o filtro da listagem usa.
 *
 * Não existe como campo no módulo (`category` é vazio nos 833 Moves) e `activities.type`
 * do Foundry não serve: 75 Moves marcados lá como ataque são disputas no livro. O
 * pipeline lê do texto; ver `ferramentas/moves.mjs`.
 */
export const RESOLUCOES = [
	{ id: "ataque", nome: "Ataque" },
	{ id: "salvaguarda", nome: "Salvaguarda" },
	{ id: "disputa", nome: "Disputa" },
	{ id: "automatico", nome: "Acerto garantido" },
	{ id: "nenhuma", nome: "Sem rolagem" },
] as const

export type IdResolucao = (typeof RESOLUCOES)[number]["id"]

/** Quando o Move pode ser usado. */
export const MODOS_DE_ATIVACAO = [
	{ id: "acao", nome: "Ação" },
	{ id: "bonus", nome: "Ação bônus" },
	{ id: "reacao", nome: "Reação" },
] as const

export type IdModo = (typeof MODOS_DE_ATIVACAO)[number]["id"]

const NOME_DE_STATUS = new Map(STATUS.map((s) => [ s.id, s.nome ]))
const NOME_DE_ATRIBUTO = new Map(ATRIBUTOS_DE_ESTAGIO.map((a) => [ a.id, a.nome ]))
const NOME_DE_RESOLUCAO = new Map(RESOLUCOES.map((r) => [ r.id, r.nome ]))
const NOME_DE_MODO = new Map(MODOS_DE_ATIVACAO.map((m) => [ m.id, m.nome ]))

export const nomeDoStatus = (id: IdStatus): string => NOME_DE_STATUS.get(id) ?? id
export const nomeDoAtributoDeEstagio = (id: IdAtributoDeEstagio): string => NOME_DE_ATRIBUTO.get(id) ?? id
export const nomeDaResolucao = (id: IdResolucao): string => NOME_DE_RESOLUCAO.get(id) ?? id
export const nomeDoModo = (id: IdModo): string => NOME_DE_MODO.get(id) ?? id

/** As frações que o livro usa, com o glifo tipográfico quando existe. */
const GLIFOS: Record<string, string> = {
	"1/2": "½", "1/3": "⅓", "2/3": "⅔", "1/4": "¼", "3/4": "¾",
}

export function formatarFracao({ numerador, denominador }: Fracao): string {
	return GLIFOS[`${numerador}/${denominador}`] ?? `${numerador}/${denominador}`
}

/** `null` em Struggle - o único Move sem limite de PP. */
export function formatarPP(pp: number | null): string {
	return pp == null ? t("move.pp.ilimitado") : String(pp)
}

/** `"+1"`, `"−2"`, `"0"` - com o sinal de menos tipográfico, como no resto do compêndio. */
export function formatarDelta(delta: number): string {
	if (delta < 0) return `−${Math.abs(delta)}`
	return delta > 0 ? `+${delta}` : "0"
}

/** `"3d8 → 6d6 (nível 5), 6d8 (nível 10)"`, para o resumo do escalonamento. */
export function formatarEscalonamento(dados: Dados): string {
	const degraus = (dados.escalonamento ?? [])
		.map((d) => t("move.escalonamento.degrau", { formula: d.formula, nivel: d.nivel }))

	if (degraus.length === 0) return dados.base ?? ""
	if (dados.base == null) return degraus.join(", ")

	return `${dados.base} → ${degraus.join(", ")}`
}

/**
 * Um efeito mecânico em duas partes, para a pílula da ficha: o que acontece e quando.
 *
 * `quando` é `null` quando o livro não declara condição, e isso é informação - marcar
 * "em um acerto" por padrão inventaria a condição mais comum. Ver `ferramentas/efeitos.mjs`.
 */
export function descreverEfeito(efeito: Efeito): { oque: string, dequem: string | null, quando: string | null } {
	return {
		oque: descreverOQue(efeito),
		dequem: "alvo" in efeito && efeito.alvo != null ? t(`move.alvo.${efeito.alvo}`) : null,
		quando: "gatilho" in efeito && efeito.gatilho != null ? descreverGatilho(efeito.gatilho) : null,
	}
}

function descreverOQue(efeito: Efeito): string {
	switch (efeito.tipo) {
		case "status":
			return nomeDoStatus(efeito.status)

		case "estagio": {
			const mudanca = `${nomeDoAtributoDeEstagio(efeito.atributo)} ${formatarDelta(efeito.delta)}`
			return efeito.limite != null
				? `${mudanca} ${t("move.efeito.limite", { n: formatarDelta(efeito.limite) })}`
				: mudanca
		}

		case "dreno":
			return t("move.efeito.dreno", { fracao: formatarFracao(efeito.fracao) })

		case "recuo":
			return "fracaoDeVida" in efeito
				? t("move.efeito.recuo.vida", { fracao: formatarFracao(efeito.fracaoDeVida) })
				: t("move.efeito.recuo.dano", { fracao: formatarFracao(efeito.fracao) })

		case "cura":
			if (efeito.total === true) return t("move.efeito.cura.total")
			if (efeito.fracaoDeVida != null) {
				return t("move.efeito.cura.vida", { fracao: formatarFracao(efeito.fracaoDeVida) })
			}
			return t("move.efeito.cura.dados", {
				dados: efeito.comMove === true
					? t("move.efeito.cura.comMove", { dados: efeito.dados ?? "" })
					: efeito.dados ?? "",
			})
	}
}

function descreverGatilho(gatilho: Gatilho): string {
	if (gatilho.tipo !== "natural") return t(`move.gatilho.${gatilho.tipo}`)

	if (gatilho.minimo != null) return t("move.gatilho.natural.minimo", { n: gatilho.minimo })
	if (gatilho.maximo != null) return t("move.gatilho.natural.maximo", { n: gatilho.maximo })
	return t("move.gatilho.natural")
}
