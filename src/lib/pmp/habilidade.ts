import { t } from "$i18n"
import { nomeDoStatus, type IdStatus } from "./move"
import { nomeDoTipo, type IdTipo } from "./tipos"

/**
 * Uma Habilidade Passiva como o compêndio a consome. Deriva do pack `abilities` via
 * `ferramentas/construir.mjs`.
 *
 * Os nomes ficam em inglês de propósito, como os de Move: é assim que o PMP os publica,
 * em qualquer idioma do livro. O `id` da rota segue a regra de slug do projeto, então
 * `Shield Dust` vira `/habilidades/shield-dust`.
 *
 * O pack não oferece mais nada além de nome e descrição: `type`, `img`, `requirements` e
 * até `category` têm um único valor nas 313 habilidades. Tudo o que `efeitos` carrega é
 * leitura do texto, feita em `ferramentas/habilidades.mjs`.
 */
export type Habilidade = {
	id: string
	nome: string
	/**
	 * Vazia nas 74 habilidades em que o módulo não achou a regra no livro — ver
	 * `semRegra`. O que o módulo grava nesse campo é uma nota de extração, não texto do
	 * PMP, e publicá-la como descrição mostraria um erro de pipeline no lugar da regra.
	 */
	descricao: string
	/** O módulo não tem a regra desta habilidade. 74 das 313 na v1.33.0. */
	semRegra: boolean
	efeitos: EfeitoDeHabilidade[]
	/** Megas que concedem esta habilidade — o portador que não está na Pokédex. */
	megas: MegaQueConcede[]
}

/**
 * Uma Mega Evolução que concede a habilidade.
 *
 * Três habilidades do pack (Delta Stream, Aerilate, Parental Bond) não pertencem a
 * nenhuma espécie da Pokédex: quem as tem é uma forma Mega, declarada na pedra. Sem esta
 * lista a ficha afirmaria que ninguém tem a habilidade.
 */
export type MegaQueConcede = {
	megaId: string
	pedra: string
	forma: string
	especie: string
	/**
	 * `null` quando o nome da espécie-base não casa com a Pokédex, que publica algumas
	 * formas separadas (Meowstic na v1.33.0). O nome continua visível, sem link.
	 */
	especieId: string | null
}

/**
 * Como a habilidade se relaciona com o clima.
 *
 * `interage` é deliberadamente o rótulo mais fraco: é a relação de quem nomeia um clima
 * sem gerá-lo, suprimi-lo nem se proteger dele ("Durante a chuva, todos os deslocamentos
 * deste Pokémon são dobrados"), e a frase do livro é a única evidência.
 */
export type RelacaoComClima = "gera" | "suprime" | "protege" | "interage"

/**
 * Os fatos mecânicos lidos da descrição.
 *
 * As duas variantes de `imunidade` são exclusivas pelo mesmo motivo que as de `recuo` em
 * `move.ts`: imunidade a uma condição e imunidade a um tipo de Move são mecânicas
 * diferentes, e a união as mantém exclusivas em vez de deixar os dois campos opcionais e
 * as duas ausências possíveis.
 */
export type EfeitoDeHabilidade =
	| { tipo: "imunidade", status: IdStatus }
	| { tipo: "imunidade", tipoDeMove: IdTipo }
	// `gera` é o único que nomeia um Move, porque é assim que o livro escreve: "gera os
	// efeitos do Move Rain Dance". O clima vem da tabela que o pipeline confere contra o
	// dicionário de Moves.
	| { tipo: "clima", relacao: "gera", clima: IdClima, move?: string, moveId?: string | null }
	// `clima: null` é a resposta certa, não um dado faltando: Air Lock e Cloud Nine
	// suprimem o clima inteiro, e escolher um dos cinco estreitaria a regra.
	| { tipo: "clima", relacao: "suprime", clima: null }
	| { tipo: "clima", relacao: "protege" | "interage", clima: IdClima }
	| { tipo: "moveConcedido", move: string, moveId: string | null }

/**
 * Os climas do PMP.
 *
 * Os nomes ficam aqui, e não em `mensagens/`, pela mesma razão que os de tipo em
 * `tipos.ts` e as condições de status em `move.ts`: são vocabulário do sistema, não texto
 * de interface. Um idioma novo os traduz junto com o conteúdo.
 *
 * **Granizo e neve são climas distintos.** O compêndio publica `Hail`, `Snowscape` e
 * `Chilly Reception` como Moves separados; mesclar os dois inventaria uma regra.
 */
export const CLIMAS = [
	{ id: "chuva", nome: "Chuva" },
	{ id: "sol", nome: "Sol intenso" },
	{ id: "tempestade-de-areia", nome: "Tempestade de Areia" },
	{ id: "granizo", nome: "Granizo" },
	{ id: "neve", nome: "Neve" },
	{ id: "ventos-fortes", nome: "Ventos fortes" },
] as const

export type IdClima = (typeof CLIMAS)[number]["id"]

const NOME_DE_CLIMA = new Map<string, string>(CLIMAS.map((c) => [ c.id, c.nome ]))

export const nomeDoClima = (id: IdClima): string => NOME_DE_CLIMA.get(id) ?? id

/**
 * Um fato mecânico em duas partes, para a pílula da ficha: o rótulo da relação e o que
 * ela atinge.
 *
 * `moveId` vem preenchido só quando o fato nomeia um Move que tem ficha, e é o que
 * permite a pílula virar link — a ligação de volta para `/moves`, no mesmo espírito do
 * que a ficha de Move faz com as espécies.
 */
export function descreverEfeitoDeHabilidade(
	efeito: EfeitoDeHabilidade,
): { rotulo: string, valor: string, moveId: string | null } {
	if (efeito.tipo === "imunidade") {
		return {
			rotulo: t("habilidade.imunidade"),
			valor: "status" in efeito ? nomeDoStatus(efeito.status) : nomeDoTipo(efeito.tipoDeMove),
			moveId: null,
		}
	}

	if (efeito.tipo === "moveConcedido") {
		return { rotulo: t("habilidade.moveConcedido"), valor: efeito.move, moveId: efeito.moveId }
	}

	return {
		rotulo: t(`habilidade.clima.${efeito.relacao}`),
		valor: efeito.clima != null ? nomeDoClima(efeito.clima) : t("habilidade.clima.todos"),
		moveId: efeito.relacao === "gera" ? efeito.moveId ?? null : null,
	}
}
