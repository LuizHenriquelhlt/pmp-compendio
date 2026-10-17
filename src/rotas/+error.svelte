<script lang="ts">
	import { page } from "$app/state"
	import { t } from "$i18n"

	const titulo = $derived(
		page.status === 404 ? t("erro.naoEncontrado.titulo") : t("erro.generico.titulo"),
	)
</script>

<svelte:head>
	<title>{titulo} — {t("site.nome")}</title>
</svelte:head>

<div class="pagina erro">
	<p class="codigo numero">{page.status}</p>
	<h1>{titulo}</h1>

	{#if page.status === 404}
		<p>{t("erro.naoEncontrado.texto")}</p>
	{:else if page.error?.message != null}
		<p>{page.error.message}</p>
	{/if}

	<a href="/pokemon">{t("especie.voltar")} →</a>
</div>

<style>
	.erro {
		max-width: var(--largura-leitura);
		padding-block: var(--espaco-9);
	}

	.codigo {
		color: var(--texto-tenue);
		font-size: var(--txt-ggg);
		font-weight: 700;
	}

	h1 {
		margin-block: 0.25rem 0.75rem;
	}

	p {
		color: var(--texto-suave);
	}

	a {
		display: inline-block;
		margin-top: var(--espaco-8);
		font-weight: 650;
		text-decoration: none;
	}

	a:hover {
		text-decoration: underline;
	}
</style>
