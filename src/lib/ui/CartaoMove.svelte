<script lang="ts">
	import type { MoveNoIndice } from "$dados/carregar.server"
	import { t } from "$i18n"
	import { formatarPP, nomeDaResolucao } from "$pmp/move"
	import EmblemaTipo from "./EmblemaTipo.svelte"

	type Props = { move: MoveNoIndice }

	let { move }: Props = $props()
</script>

<!--
	Mesma decisão do CartaoEspecie: o cartão inteiro é um link, para que a área de toque
	seja o cartão todo e o leitor de tela anuncie um alvo em vez de cinco.

	A classe `tipo-<id>` fornece `--tipo-cor`; nos Moves de tipo variável ela não existe,
	e a faixa cai no valor neutro declarado no próprio estilo.
-->
<a class="cartao {move.tipo != null ? `tipo-${move.tipo}` : 'sem-tipo'}" href="/moves/{move.id}">
	<div class="cabeca">
		<span class="nome">{move.nome}</span>
		{#if move.tipo != null}
			<EmblemaTipo tipo={move.tipo} tamanho="pequeno" />
		{:else}
			<span class="etiqueta">{t("move.tipo.variavel")}</span>
		{/if}
	</div>

	<dl class="medidas">
		<div>
			<dt>{t("move.ativacao")}</dt>
			<dd>{move.ativacao}</dd>
		</div>
		<div>
			<dt>{t("move.alcance")}</dt>
			<dd>{move.alcance}</dd>
		</div>
		<div>
			<dt>{t("move.pp")}</dt>
			<dd class="numero">{formatarPP(move.pp)}</dd>
		</div>
		{#if move.dano != null}
			<div>
				<dt>{t("move.dano")}</dt>
				<dd class="numero">{move.dano}</dd>
			</div>
		{:else if move.cura != null}
			<div>
				<dt>{t("move.cura")}</dt>
				<dd class="numero">{move.cura}</dd>
			</div>
		{/if}
	</dl>

	<div class="resolucoes">
		{#each move.resolucoes as resolucao (resolucao)}
			<span class="pilula">{nomeDaResolucao(resolucao)}</span>
		{/each}
	</div>
</a>

<style>
	.cartao {
		display: grid;
		gap: 0.5rem;
		align-content: start;
		padding: 0.875rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		/* A cor do tipo entra como faixa à esquerda, não como fundo — identifica o tipo
		   sem comprometer o contraste do texto. */
		border-left: 4px solid var(--tipo-cor);
		border-radius: var(--raio);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	/* Natural Gift e Judgment mudam de tipo em jogo: sem cor de tipo para mostrar. */
	.sem-tipo {
		--tipo-cor: var(--borda-forte);
	}

	.cartao:hover {
		border-color: var(--borda-forte);
		border-left-color: var(--tipo-cor);
		box-shadow: var(--sombra-2);
		transform: translateY(-1px);
	}

	.cabeca {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		align-items: center;
		justify-content: space-between;
	}

	.nome {
		font-size: var(--txt-g);
		font-weight: 650;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.cartao:hover .nome {
		color: var(--marca);
	}

	.etiqueta {
		padding: 0.25em 0.6em;
		background: var(--superficie-afundada);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 600;
		white-space: nowrap;
	}

	.medidas {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.3rem 0.875rem;
		margin: 0;
	}

	.medidas div {
		min-width: 0;
	}

	.medidas dt {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.medidas dd {
		margin: 0;
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		overflow-wrap: break-word;
	}

	.resolucoes {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
	}

	.pilula {
		padding: 0.15em 0.55em;
		background: var(--superficie-afundada);
		border-radius: var(--raio-pilula);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 600;
	}
</style>
