<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { descreverEfeitoDeHabilidade } from "$pmp/habilidade"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const habilidade = $derived(data.habilidade)

	const efeitos = $derived(habilidade.efeitos.map(descreverEfeitoDeHabilidade))

	const grupos = $derived([
		{ rotulo: t("habilidade.quemTem.padrao"), especies: data.quemTem.padrao },
		{ rotulo: t("habilidade.quemTem.oculta"), especies: data.quemTem.oculta },
	].filter((g) => g.especies.length > 0))

	const paragrafos = (texto: string) => texto.split("\n").filter((p) => p !== "")
</script>

<svelte:head>
	<title>{habilidade.nome} — {t("site.nome")}</title>
	<meta
		name="description"
		content={paragrafos(habilidade.descricao)[0] ?? t("habilidade.semRegra.etiqueta")}
	/>
</svelte:head>

<article class="pagina">
	<a class="voltar" href="/habilidades">← {t("habilidade.voltar")}</a>

	<header class="cabecalho" class:sem-regra={habilidade.semRegra}>
		<h1>{habilidade.nome}</h1>
		{#if habilidade.semRegra}
			<span class="etiqueta aviso">{t("habilidade.semRegra.etiqueta")}</span>
		{/if}
	</header>

	<div class="colunas">
		<div class="coluna">
			<section class="painel">
				<h2>{t("habilidade.descricao")}</h2>
				<!--
					As 74 habilidades sem regra recebem o aviso em texto de interface, e não o
					que o módulo gravou no campo: lá está uma nota de erro de extração, e
					publicá-la mostraria um defeito de pipeline no lugar da regra.
				-->
				{#if habilidade.semRegra}
					<p class="ressalva">{t("habilidade.semRegra")}</p>
				{:else}
					{#each paragrafos(habilidade.descricao) as paragrafo (paragrafo)}
						<p>{paragrafo}</p>
					{/each}
				{/if}
			</section>
		</div>

		<div class="coluna">
			{#if efeitos.length > 0}
				<section class="painel">
					<h2>{t("habilidade.efeitos")}</h2>
					<dl class="efeitos">
						{#each efeitos as efeito, indice (indice)}
							<div>
								<dt>{efeito.rotulo}</dt>
								<dd>
									<!-- A pílula vira link quando o fato nomeia um Move com ficha:
									     é a ligação de volta para /moves. -->
									{#if efeito.moveId != null}
										<a href="/moves/{efeito.moveId}">{efeito.valor}</a>
									{:else}
										{efeito.valor}
									{/if}
								</dd>
							</div>
						{/each}
					</dl>
					<!--
						Mesma ressalva da ficha de Move: o resumo é leitura automática da
						descrição, e o livro é mais rico que qualquer leitura automática.
					-->
					<p class="tenue">{t("habilidade.efeitos.nota")}</p>
				</section>
			{/if}

			<section class="painel">
				<h2>{t("habilidade.quemTem")}</h2>

				<!--
					A ausência é dita mesmo quando uma Mega concede a habilidade: "nenhuma
					espécie do compêndio" continua verdade — Mega Rayquaza não está na
					Pokédex —, e o painel de Megas logo abaixo completa a resposta. Calar
					aqui deixaria o painel com título e nada dentro.
				-->
				{#if grupos.length === 0}
					<p class="tenue">{t("habilidade.quemTem.nenhuma")}</p>
				{:else}
					{#each grupos as grupo (grupo.rotulo)}
						<details>
							<summary>
								{grupo.rotulo}
								<span class="quantidade">
									{tPlural(grupo.especies.length, "habilidade.quemTem.contagem", "habilidade.quemTem.contagens")}
								</span>
							</summary>
							<p class="lista-larga">
								{#each grupo.especies as especie, indice (especie.id)}
									<a href="/pokemon/{especie.id}">{especie.nome}</a>{indice < grupo.especies.length - 1 ? ", " : ""}
								{/each}
							</p>
						</details>
					{/each}
				{/if}
			</section>

			<!--
				Três habilidades do pack não pertencem a nenhuma espécie da Pokédex porque
				quem as tem é uma forma Mega. Sem este bloco a ficha afirmaria que ninguém
				tem a habilidade, onde o módulo diz que Mega Rayquaza tem.
			-->
			{#if habilidade.megas.length > 0}
				<section class="painel">
					<h2>{t("habilidade.megas")}</h2>
					<ul class="megas">
						{#each habilidade.megas as mega (mega.pedra)}
							<li>
								{#if mega.especieId != null}
									<a href="/pokemon/{mega.especieId}">{mega.forma}</a>
								{:else}
									<!-- A Pokédex publica algumas formas separadas e o nome-base não
									     casa (Meowstic na v1.33.0): fica como texto, sem link. -->
									<span class="sem-ficha">{mega.forma}</span>
								{/if}
								<span class="tenue">{mega.pedra}</span>
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
		gap: 0.75rem;
		align-items: center;
		padding: 1.5rem;
		/* Sem cor de tipo para mostrar: a habilidade não tem tipo. A tinta da marca faz o
		   papel que a cor do tipo faz nas outras fichas. */
		background: color-mix(in oklab, var(--marca) 8%, var(--superficie));
		border: 1px solid color-mix(in oklab, var(--marca) 22%, var(--borda));
		border-radius: var(--raio-grande);
	}

	/* Sem regra na fonte: o cabeçalho fica neutro, para não vestir de regra o que não é. */
	.cabecalho.sem-regra {
		background: var(--superficie-afundada);
		border-color: var(--borda-forte);
		border-style: dashed;
	}

	h1 {
		overflow-wrap: break-word;
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
		margin-top: 0.7rem;
	}

	.efeitos {
		display: grid;
		gap: 0.5rem;
		margin: 0;
	}

	.efeitos dt {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.efeitos dd {
		margin: 0.1rem 0 0;
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	details {
		border-top: 1px solid var(--borda);
		padding-block: 0.5rem;
	}

	details:first-of-type {
		border-top: 0;
		padding-top: 0;
	}

	summary {
		cursor: pointer;
		font-size: var(--txt-pequeno);
		font-weight: 650;
	}

	.quantidade {
		margin-left: 0.3rem;
		color: var(--texto-tenue);
		font-weight: 600;
	}

	.lista-larga {
		margin-top: 0.5rem;
		font-size: var(--txt-pequeno);
		line-height: 1.7;
	}

	.megas {
		display: grid;
		gap: 0.4rem;
		list-style: none;
	}

	.megas li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: baseline;
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	/* Mesmo ponto de quebra da ficha de Move, para as duas fichas empilharem juntas. */
	@media (width < 54rem) {
		.colunas {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
