<script lang="ts">
	import { t } from "$i18n"
	import type { Genero } from "$pmp/especie"

	type Props = { genero: Genero | null }

	let { genero }: Props = $props()

	/**
	 * Só os segmentos que existem de fato.
	 *
	 * 86 das 987 espécies com gênero são de um sexo só - 48 com 100% fêmea, 38 com 100%
	 * macho. Um segmento de 0% renderizaria uma lasca de cor com o rótulo espremido
	 * dentro, ilegível, e pior: pareceria dizer que aquele sexo existe em alguma medida.
	 *
	 * Fêmea primeiro, como no modelo do livro.
	 */
	const segmentos = $derived(
		genero == null
			? []
			: [
				{ sexo: "femea" as const, pct: genero.femeaPct, simbolo: "♀" },
				{ sexo: "macho" as const, pct: genero.machoPct, simbolo: "♂" },
			].filter((s) => s.pct > 0),
	)

	/**
	 * O que o leitor de tela anuncia. A barra inteira é uma imagem com este rótulo, em vez
	 * de duas faixas lidas uma a uma: "12% fêmea, 88% macho" é a informação; "♀ 12%" solto
	 * seguido de "♂ 88%" solto é a aparência dela.
	 */
	const leitura = $derived(
		segmentos.map((s) => t(`especie.genero.${s.sexo}`, { pct: s.pct })).join(", "),
	)
</script>

{#if genero == null}
	<span class="sem">{t("especie.genero.sem")}</span>
{:else}
	<span class="barra" role="img" aria-label={leitura}>
		{#each segmentos as segmento (segmento.sexo)}
			<span class="faixa {segmento.sexo}" style="flex-grow: {segmento.pct}">
				<span aria-hidden="true">{segmento.simbolo}&nbsp;{segmento.pct}%</span>
			</span>
		{/each}
	</span>
{/if}

<style>
	.sem {
		color: var(--texto-tenue);
	}

	.barra {
		display: flex;
		overflow: hidden;
		/* Compacta, como no modelo: a barra não se estica pela linha inteira. O
		   `min(100%, …)` impede que ela estoure a célula de valor em 375px, que mede
		   122px. Canto pequeno, também como no modelo - o `--raio` do sistema (8px)
		   arredondaria demais para uma barra desta altura. */
		width: min(100%, 11rem);
		border-radius: 0.25rem;
		font-size: var(--txt-miudo);
		font-weight: 700;
		line-height: 1;
	}

	/*
	 * `min-width: max-content` com `flex-grow` proporcional: a faixa nunca fica menor do
	 * que o próprio rótulo, e o espaço que sobra é repartido na proporção real.
	 *
	 * Isso distorce a proporção nos extremos - num 12/88 a faixa menor sai maior que 12%
	 * da barra. É de propósito: a alternativa é um rótulo cortado, e a porcentagem exata
	 * está escrita ali dentro, então nada se perde. Barra ilegível informaria menos que
	 * barra desproporcional.
	 */
	.faixa {
		display: grid;
		flex-basis: 0;
		place-items: center;
		min-width: max-content;
		padding: 0.35rem 0.5rem;
		color: var(--genero-contraste);
	}

	.femea {
		background: var(--genero-femea);
	}

	.macho {
		background: var(--genero-macho);
	}
</style>
