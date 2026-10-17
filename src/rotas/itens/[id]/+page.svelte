<script lang="ts">
	import { t } from "$i18n"
	import { formatarPreco } from "$pmp/item"
	import IconeDeItem from "$ui/IconeDeItem.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const item = $derived(data.item)
	const preco = $derived(formatarPreco(item.preco))

	const uso = $derived(
		item.recipiente
			? t("filtro.usoDeItem.recipiente")
			: item.consumivel ? t("filtro.usoDeItem.consumivel") : t("filtro.usoDeItem.equipamento"),
	)

	const paragrafos = (texto: string) => texto.split("\n").filter((p) => p !== "")
</script>

<svelte:head>
	<title>{item.nome} — {t("site.nome")}</title>
	<meta name="description" content={paragrafos(item.descricao)[0] ?? item.nome} />
</svelte:head>

<article class="pagina">
	<a class="voltar" href="/itens">← {t("item.voltar")}</a>

	<header class="cabecalho">
		{#if item.imagem != null}
			<img src={item.imagem} alt="" width="96" height="96" />
		{:else}
			<IconeDeItem {item} tamanho={80} />
		{/if}

		<div class="identidade">
			<h1>{item.nome}</h1>

			<div class="emblemas">
				{#if preco != null}
					<span class="etiqueta preco numero">{preco}</span>
				{:else}
					<!-- "Não vendido" e não "₽0": 15 itens-chave do livro não têm preço, e
					     zero diria que são de graça. -->
					<span class="etiqueta aviso">{t("item.semPreco")}</span>
				{/if}

				<span class="etiqueta">{uso}</span>

				{#if item.grupo != null && item.grupo !== "Itens"}
					<span class="etiqueta">{item.grupo}</span>
				{/if}
			</div>
		</div>
	</header>

	<div class="colunas">
		<div class="coluna">
			<section class="painel">
				<h2>{t("item.efeito")}</h2>

				<!--
					Dez itens têm o texto costurado com conteúdo de outra linha da tabela do
					livro. Publicar atribuiria a eles regra alheia — e em Mega Pedra inverteria
					a regra, porque o "Não" de "Não vendido" caiu no meio da frase ("durante a
					Não batalha"). A página diz o que houve; o original fica no relatório.
				-->
				{#if item.textoContaminado}
					<p class="ressalva">{t("item.textoContaminado")}</p>
				{:else if item.descricao === ""}
					<p class="tenue">{t("item.semEfeito")}</p>
				{:else}
					{#each paragrafos(item.descricao) as paragrafo (paragrafo)}
						<p>{paragrafo}</p>
					{/each}
				{/if}
			</section>
		</div>

		<div class="coluna">
			{#if item.secao != null}
				<!--
					Só os 77 itens das expansões de Galar e Paldea declaram a seção: ela vem do
					cabeçalho que o livro deixou colado no fim da descrição deles.
				-->
				<section class="painel">
					<h2>{t("item.secao")}</h2>
					<p class="secao">{item.secao}</p>
					{#if item.expansao != null}
						<p class="tenue">{item.expansao}</p>
					{/if}
				</section>
			{/if}

			<section class="painel">
				<h2>{t("item.preco")}</h2>
				{#if preco != null}
					<p class="valor numero">{preco}</p>
				{:else}
					<p class="valor sem">{t("item.semPreco")}</p>
					<p class="tenue">{t("item.semPreco.nota")}</p>
				{/if}
			</section>

			<!--
				A relação inversa: o livro declara o item dentro da condição de evolução da
				espécie, e esta é a volta. Sem ela, a ficha da Thunder Stone não diria que
				Pikachu evolui com ela.
			-->
			{#if data.evolucoes.length > 0}
				<section class="painel">
					<h2>{t("item.evolucoes")}</h2>
					<ul class="evolucoes">
						{#each data.evolucoes as evolucao (`${evolucao.de.id}-${evolucao.para.nome}`)}
							<li>
								<a href="/pokemon/{evolucao.de.id}">{evolucao.de.nome}</a>
								<span class="seta" aria-hidden="true">{t("item.evolucoes.seta")}</span>
								{#if evolucao.para.id != null}
									<a href="/pokemon/{evolucao.para.id}">{evolucao.para.nome}</a>
								{:else}
									<span class="sem-ficha">{evolucao.para.nome}</span>
								{/if}
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
</article>

<style>
	.voltar {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		text-decoration: none;
	}

	.voltar:hover {
		color: var(--marca);
	}

	.cabecalho {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		align-items: center;
		padding: 1.5rem;
		/* Sem cor de tipo para mostrar: o item não tem tipo. A tinta da marca faz o papel,
		   como no cabeçalho de habilidade. */
		background: color-mix(in oklab, var(--marca) 8%, var(--superficie));
		border: 1px solid color-mix(in oklab, var(--marca) 22%, var(--borda));
		border-radius: var(--raio-grande);
	}

	.cabecalho img {
		flex: none;
		width: 6rem;
		height: 6rem;
		object-fit: contain;
	}

	.identidade {
		min-width: 0;
	}

	h1 {
		margin-bottom: 0.6rem;
		overflow-wrap: break-word;
	}

	.emblemas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.etiqueta {
		padding: 0.35em 0.8em;
		background: var(--superficie);
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio-pilula);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.etiqueta.preco {
		color: var(--texto);
		font-weight: 700;
	}

	.etiqueta.aviso {
		border-style: dashed;
	}

	.colunas {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: 1rem;
		margin-top: 1rem;
		align-items: start;
	}

	.coluna {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	.painel {
		padding: 1.25rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	.painel h2 {
		margin-bottom: 0.7rem;
		font-size: var(--txt-pequeno);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--texto-tenue);
	}

	.painel p {
		max-width: var(--largura-leitura);
	}

	.painel p + p {
		margin-top: 0.7rem;
	}

	.ressalva {
		padding: 0.7rem 0.875rem;
		background: var(--superficie-afundada);
		border-left: 3px solid var(--borda-forte);
		border-radius: var(--raio);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
	}

	.tenue {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
	}

	.painel .tenue {
		margin-top: 0.4rem;
	}

	.secao {
		font-size: var(--txt-g);
		font-weight: 650;
	}

	.valor {
		font-size: var(--txt-gg);
		font-weight: 700;
	}

	.valor.sem {
		color: var(--texto-tenue);
		font-size: var(--txt-g);
	}

	.numero {
		font-family: var(--fonte-numeros);
	}

	.evolucoes {
		display: grid;
		gap: 0.45rem;
		list-style: none;
	}

	.evolucoes li {
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.seta {
		margin-inline: 0.25rem;
		color: var(--texto-tenue);
	}

	/* Mesmo sinal da ListaDeMoves: nome que veio da fonte sem corresponder a uma ficha. */
	.sem-ficha {
		color: var(--texto-tenue);
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}

	/* Mesmo ponto de quebra das outras fichas, para todas empilharem juntas. */
	@media (width < 54rem) {
		.colunas {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (width < 30rem) {
		.cabecalho img {
			width: 4rem;
			height: 4rem;
		}
	}
</style>
