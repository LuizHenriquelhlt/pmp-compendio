import { t } from "$i18n"
import type { Evolucao } from "./especie"
import { nomeDoTipo } from "./tipos"

/**
 * Uma condição de evolução pronta para a tela.
 *
 * `itemId` vem preenchido só na condição que nomeia um item com ficha, e é o que permite
 * a pílula virar link — a ligação para `/itens`, no mesmo espírito do `moveId` que
 * `descreverEfeitoDeHabilidade` devolve.
 */
export type CondicaoDeEvolucao = { texto: string, itemId: string | null }

/**
 * As condições de uma evolução como frases curtas, para exibir em sequência.
 *
 * O nível vem primeiro porque é a única condição sempre presente; `especial` vem por
 * último porque é o texto do livro que o pipeline não soube estruturar, e lê melhor
 * depois das condições objetivas.
 */
export function descreverCondicoes(evolucao: Evolucao): CondicaoDeEvolucao[] {
	const simples = (texto: string): CondicaoDeEvolucao => ({ texto, itemId: null })

	const condicoes: CondicaoDeEvolucao[] = [ simples(
		evolucao.nivel <= 1
			? t("especie.evolucao.qualquerNivel")
			: t("especie.evolucao.nivel", { n: evolucao.nivel })),
	]

	// O item é a única condição que vira link: ele tem ficha própria desde o catálogo de
	// Itens. `itemId` é `null` quando o nome não casou com o catálogo — aí a pílula fica
	// como texto, e o relatório registra o nome.
	if (evolucao.item != null) {
		condicoes.push({
			texto: t("especie.evolucao.item", { item: evolucao.item }),
			itemId: evolucao.itemId ?? null,
		})
	}

	if (evolucao.lealdade != null) condicoes.push(simples(t("especie.evolucao.lealdade", { n: evolucao.lealdade })))

	if (evolucao.periodo != null) {
		condicoes.push(simples(t(`especie.evolucao.periodo.${evolucao.periodo}`)))
	}

	if (evolucao.tipoDeMove != null) {
		condicoes.push(simples(t("especie.evolucao.tipoDeMove", { tipo: nomeDoTipo(evolucao.tipoDeMove) })))
	}

	if (evolucao.genero != null) condicoes.push(simples(t(`especie.evolucao.genero.${evolucao.genero}`)))
	if (evolucao.especial != null) condicoes.push(simples(evolucao.especial))

	return condicoes
}
