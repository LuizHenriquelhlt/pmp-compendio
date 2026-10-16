import { t } from "$i18n"
import type { Evolucao } from "./especie"
import { nomeDoTipo } from "./tipos"

/**
 * As condições de uma evolução como frases curtas, para exibir em sequência.
 *
 * O nível vem primeiro porque é a única condição sempre presente; `especial` vem por
 * último porque é o texto do livro que o pipeline não soube estruturar, e lê melhor
 * depois das condições objetivas.
 */
export function descreverCondicoes(evolucao: Evolucao): string[] {
	const condicoes: string[] = [
		evolucao.nivel <= 1
			? t("especie.evolucao.qualquerNivel")
			: t("especie.evolucao.nivel", { n: evolucao.nivel }),
	]

	if (evolucao.item != null) condicoes.push(t("especie.evolucao.item", { item: evolucao.item }))
	if (evolucao.lealdade != null) condicoes.push(t("especie.evolucao.lealdade", { n: evolucao.lealdade }))

	if (evolucao.periodo != null) {
		condicoes.push(t(`especie.evolucao.periodo.${evolucao.periodo}`))
	}

	if (evolucao.tipoDeMove != null) {
		condicoes.push(t("especie.evolucao.tipoDeMove", { tipo: nomeDoTipo(evolucao.tipoDeMove) }))
	}

	if (evolucao.genero != null) condicoes.push(t(`especie.evolucao.genero.${evolucao.genero}`))
	if (evolucao.especial != null) condicoes.push(evolucao.especial)

	return condicoes
}
