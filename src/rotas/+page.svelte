<script lang="ts">
	import { t } from "$i18n"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()
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
		<a class="acao" href="/pokemon">{t("inicio.explorar")}</a>
	</section>

	<section class="cartoes">
		<article>
			<h2>{t("inicio.cartao.pokemon.titulo")}</h2>
			<p>{t("inicio.cartao.pokemon.texto", { n: data.totalDeEspecies.toLocaleString("pt-BR") })}</p>
			<a href="/pokemon">{t("nav.pokemon")} →</a>
		</article>

		<article>
			<h2>{t("inicio.cartao.moves.titulo")}</h2>
			<p>{t("inicio.cartao.moves.texto", { n: data.totalDeMoves.toLocaleString("pt-BR") })}</p>
			<a href="/moves">{t("nav.moves")} →</a>
		</article>

		<article>
			<h2>{t("inicio.cartao.habilidades.titulo")}</h2>
			<p>{t("inicio.cartao.habilidades.texto", { n: data.totalDeHabilidades.toLocaleString("pt-BR") })}</p>
			<a href="/habilidades">{t("nav.habilidades")} →</a>
		</article>

		<article>
			<h2>{t("inicio.cartao.megas.titulo")}</h2>
			<p>{t("inicio.cartao.megas.texto", { n: data.totalDeMegas.toLocaleString("pt-BR") })}</p>
			<a href="/megas">{t("nav.megas")} →</a>
		</article>

		<article>
			<h2>{t("inicio.cartao.dados.titulo")}</h2>
			<p>{t("inicio.cartao.dados.texto")}</p>
			<a href="/sobre">{t("nav.sobre")} →</a>
		</article>
	</section>
</div>

<style>
	.abertura {
		max-width: var(--largura-leitura);
		padding-block: 2rem 3rem;
	}

	.sobretitulo {
		color: var(--marca);
		font-size: var(--txt-pequeno);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	h1 {
		margin-top: 0.4rem;
	}

	.chamada {
		margin-top: 0.875rem;
		color: var(--texto-suave);
		font-size: var(--txt-g);
	}

	.acao {
		display: inline-block;
		margin-top: 1.5rem;
		padding: 0.7rem 1.4rem;
		background: var(--marca);
		color: var(--marca-contraste);
		border-radius: var(--raio);
		font-weight: 650;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: background 150ms ease, transform 150ms ease;
	}

	.acao:hover {
		background: var(--marca-forte);
		color: var(--marca-contraste);
		transform: translateY(-1px);
	}

	.cartoes {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 20rem), 1fr));
		gap: 1rem;
	}

	article {
		display: grid;
		/* O link desce para a base mesmo quando os textos têm alturas diferentes. */
		grid-template-rows: auto 1fr auto;
		gap: 0.5rem;
		padding: 1.25rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	article h2 {
		font-size: var(--txt-gg);
	}

	article p {
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
	}

	article a {
		font-size: var(--txt-pequeno);
		font-weight: 650;
		text-decoration: none;
	}

	article a:hover {
		text-decoration: underline;
	}
</style>
