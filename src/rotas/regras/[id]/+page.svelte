<script lang="ts">
	import { t } from "$i18n"
	import BotaoVoltar from "$ui/BotaoVoltar.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const regra = $derived(data.regra)
</script>

<svelte:head>
	<title>{regra.nome} - {t("site.nome")}</title>
	<meta name="description" content={regra.paginas[0]?.titulo ?? regra.nome} />
</svelte:head>

<article class="pagina">
	<BotaoVoltar href="/regras" texto={t("regra.voltar")} />

	<header class="abertura">
		{#if regra.grupo != null}
			<p class="grupo cadastro">{regra.grupo}</p>
		{/if}
		<h1>{regra.nome}</h1>
	</header>

	{#if regra.grupo === "Homebrews"}
		<p class="aviso">{t("regra.homebrew")}</p>
	{/if}

	{#each regra.paginas as pagina (pagina.titulo)}
		<section class="painel">
			<h2>{pagina.titulo}</h2>
			<!--
				`@html` com HTML que veio do módulo do Foundry.

				É seguro porque o pipeline já sanitizou: `ferramentas/regras.mjs` só deixa
				passar uma lista fechada de 18 tags e descarta TODOS os atributos, então
				não há como chegar aqui um `<script>`, um `onerror` ou um `href`. O que for
				descartado é contado em `relatorio.json`, que é como a próxima versão do
				módulo nos avisa que mudou de forma.

				Sanitizar no PIPELINE e não aqui é de propósito: o site é prerenderizado,
				então o HTML é decidido no build, uma vez, com teste em cima - e não no
				navegador de quem lê.
			-->
			<div class="texto">{@html pagina.html}</div>
		</section>
	{/each}

	{#if data.vizinhas.length > 0}
		<section class="painel">
			<h2>{t("regra.vizinhas")}</h2>
			<ul class="vizinhas">
				{#each data.vizinhas as vizinha (vizinha.id)}
					<li><a href="/regras/{vizinha.id}">{vizinha.nome}</a></li>
				{/each}
			</ul>
		</section>
	{/if}
</article>

<style>
	.abertura {
		margin-bottom: 1.25rem;
	}

	.grupo {
		color: var(--secao);
		font-size: var(--txt-miudo);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.aviso {
		max-width: var(--largura-leitura);
		margin-bottom: 1.25rem;
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	/*
	 * O texto das regras é o único lugar do compêndio onde a marcação vem de fora, então
	 * os estilos são escritos para as tags, e não para classes nossas. `:global` porque o
	 * conteúdo entra por `@html` e o Svelte não tem como marcar o que não compilou.
	 */
	.texto {
		max-width: var(--largura-leitura);
		line-height: 1.65;
	}

	.texto :global(p) {
		margin: 0 0 0.9rem;
	}

	.texto :global(h3) {
		margin: 1.6rem 0 0.5rem;
		font-size: var(--txt-g);
	}

	.texto :global(h4) {
		margin: 1.2rem 0 0.4rem;
		font-size: var(--txt-normal);
	}

	.texto :global(ul),
	.texto :global(ol) {
		margin: 0 0 0.9rem;
		padding-left: 1.4rem;
	}

	.texto :global(li) {
		margin-bottom: 0.3rem;
	}

	.texto :global(code) {
		padding: 0.1rem 0.3rem;
		background: var(--superficie-afundada);
		border-radius: 0.25rem;
		font-size: 0.92em;
	}

	.texto :global(.centro) {
		text-align: center;
	}

	/* As tabelas das regras são largas - 27 delas, algumas com dez colunas. Rolam dentro
	   do próprio bloco para não empurrar a página inteira em 375px. */
	.texto :global(table) {
		display: block;
		overflow-x: auto;
		width: max-content;
		max-width: 100%;
		margin: 0 0 1.2rem;
		border-collapse: collapse;
		font-size: var(--txt-pequeno);
	}

	.texto :global(th),
	.texto :global(td) {
		padding: 0.4rem 0.7rem;
		border: 1px solid var(--borda);
		text-align: left;
	}

	.texto :global(th) {
		background: var(--superficie-afundada);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		text-transform: uppercase;
	}

	.vizinhas {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 15rem), 1fr));
		gap: 0.3rem 1rem;
		margin: 0;
		padding-left: 1.2rem;
	}
</style>
