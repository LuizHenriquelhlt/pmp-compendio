<script lang="ts">
	import { t } from "$i18n"
	import IconeDeSecao, { type Secao } from "$ui/IconeDeSecao.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	/**
	 * Os cartões da tela principal, no desenho do poke5e: uma pílula larga por seção, com
	 * o nome à esquerda e um ícone grande à direita, cada uma na cor da sua seção.
	 *
	 * A lista vive aqui, e não no layout, porque a ordem é editorial — Pokémon primeiro
	 * porque é o que mais se consulta, "Dados da sua mesa" por último porque é sobre o
	 * projeto, não sobre o sistema.
	 */
	const secoes: { id: Secao, href: string, titulo: string, texto: string }[] = $derived([
		{
			id: "pokemon",
			href: "/pokemon",
			titulo: t("inicio.cartao.pokemon.titulo"),
			texto: t("inicio.cartao.pokemon.texto", { n: data.totalDeEspecies.toLocaleString("pt-BR") }),
		},
		{
			id: "moves",
			href: "/moves",
			titulo: t("inicio.cartao.moves.titulo"),
			texto: t("inicio.cartao.moves.texto", { n: data.totalDeMoves.toLocaleString("pt-BR") }),
		},
		{
			id: "habilidades",
			href: "/habilidades",
			titulo: t("inicio.cartao.habilidades.titulo"),
			texto: t("inicio.cartao.habilidades.texto", { n: data.totalDeHabilidades.toLocaleString("pt-BR") }),
		},
		{
			id: "megas",
			href: "/megas",
			titulo: t("inicio.cartao.megas.titulo"),
			texto: t("inicio.cartao.megas.texto", { n: data.totalDeMegas.toLocaleString("pt-BR") }),
		},
		{
			id: "itens",
			href: "/itens",
			titulo: t("inicio.cartao.itens.titulo"),
			texto: t("inicio.cartao.itens.texto", { n: data.totalDeItens.toLocaleString("pt-BR") }),
		},
		{
			id: "dados",
			href: "/sobre",
			titulo: t("inicio.cartao.dados.titulo"),
			texto: t("inicio.cartao.dados.texto"),
		},
	])
</script>

<svelte:head>
	<title>{t("site.nome")}</title>
	<meta name="description" content={t("site.descricao")} />
</svelte:head>

<div class="pagina">
	<section class="abertura">
		<p class="sobretitulo">{t("site.descricao")}</p>
		<h1>{t("site.nome")}</h1>
		<p class="chamada">{t("site.chamada")}</p>
	</section>

	<!--
		Cada cartão é um link inteiro, como os das listagens: a área de toque é a pílula
		toda, e o leitor de tela anuncia um alvo em vez de três.
	-->
	<nav class="secoes" aria-label={t("inicio.secoes")}>
		{#each secoes as secao (secao.href)}
			<a class="cartao secao-{secao.id}" href={secao.href}>
				<span class="texto">
					<span class="titulo">{secao.titulo}</span>
					<span class="descricao">{secao.texto}</span>
				</span>
				<IconeDeSecao secao={secao.id} tamanho={72} />
			</a>
		{/each}
	</nav>
</div>

<style>
	.abertura {
		max-width: var(--largura-leitura);
		padding-block: 2.5rem 2rem;
		text-align: center;
		margin-inline: auto;
	}

	.sobretitulo {
		color: var(--marca);
		font-size: var(--txt-pequeno);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	h1 {
		margin-top: 0.5rem;
		/* Grande como a do poke5e: a tela principal é uma capa, não uma página de leitura. */
		font-size: clamp(2.25rem, 7vw, 3.5rem);
		letter-spacing: -0.03em;
		/* O `nowrap` global dos títulos estouraria em 375px com o nome inteiro. */
		white-space: normal;
	}

	.chamada {
		margin-top: 0.875rem;
		color: var(--texto-suave);
		font-size: var(--txt-g);
	}

	.secoes {
		display: grid;
		gap: 1rem;
		padding-bottom: 2rem;
	}

	/*
	 * A pílula do poke5e: muito arredondada, com o ícone sangrando na borda direita.
	 * `overflow: hidden` é o que recorta o ícone contra a curva, e é ele que dá o efeito.
	 */
	.cartao {
		position: relative;
		display: flex;
		gap: 1rem;
		align-items: center;
		justify-content: space-between;
		overflow: hidden;
		min-height: 5rem;
		padding: 1rem 0 1rem 1.75rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-left: 6px solid var(--secao);
		border-radius: 999px;
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	.cartao:hover {
		border-color: var(--secao);
		box-shadow: var(--sombra-2);
		transform: translateY(-2px);
	}

	.texto {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
		/* Acima do ícone, que avança por baixo do texto em telas estreitas. */
		position: relative;
		z-index: 1;
	}

	.titulo {
		font-size: var(--txt-g);
		font-weight: 700;
		letter-spacing: -0.01em;
	}

	.cartao:hover .titulo {
		color: var(--secao);
	}

	.descricao {
		/* Mais larga agora que o cartão é baixo: a descrição cabe em uma ou duas linhas
		   em vez de empurrar a altura. */
		max-width: 60ch;
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		line-height: 1.45;
	}

	/* O ícone encosta na borda e é cortado pela curva da pílula, como no poke5e. */
	.cartao :global(.icone) {
		margin-right: -1rem;
	}

	@media (width < 40rem) {
		.cartao {
			/* Pílula inteira em tela estreita viraria um comprimido: cantos grandes, mas
			   não redondos, para o texto não bater na curva. */
			min-height: 0;
			padding: 1.25rem 0 1.25rem 1.25rem;
			border-radius: var(--raio-grande);
		}

		.cartao :global(.icone) {
			width: 3.5rem;
			height: 3.5rem;
			margin-right: -0.5rem;
			opacity: 0.55;
		}
	}
</style>
