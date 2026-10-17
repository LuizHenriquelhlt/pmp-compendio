<script lang="ts">
	import type { HabilidadeNoIndice } from "$dados/carregar.server"
	import { t, tPlural } from "$i18n"
	import { nomeDoClima } from "$pmp/habilidade"
	import { nomeDoStatus } from "$pmp/move"
	import { nomeDoTipo } from "$pmp/tipos"

	type Props = { habilidade: HabilidadeNoIndice, portadores: number }

	let { habilidade, portadores }: Props = $props()

	/**
	 * As pílulas do cartão: o que a habilidade concede, na ordem em que a ficha mostra.
	 *
	 * Ficam sem rótulo de propósito — o cartão tem espaço para o valor, não para
	 * "Imune a" na frente de cada um. O rótulo aparece na ficha.
	 */
	const facetas = $derived([
		...habilidade.imunidadesDeStatus.map(nomeDoStatus),
		...habilidade.imunidadesDeTipo.map(nomeDoTipo),
		...habilidade.climas.map(nomeDoClima),
		...(habilidade.suprimeClima ? [ t("habilidade.clima.todos") ] : []),
	])
</script>

<!--
	Mesma decisão do CartaoMove: o cartão inteiro é um link, para que a área de toque seja
	o cartão todo e o leitor de tela anuncie um alvo em vez de quatro.
-->
<a class="cartao" class:sem-regra={habilidade.semRegra} href="/habilidades/{habilidade.id}">
	<div class="cabeca">
		<span class="nome">{habilidade.nome}</span>
		{#if habilidade.semRegra}
			<span class="etiqueta aviso">{t("habilidade.semRegra.etiqueta")}</span>
		{/if}
	</div>

	<!--
		"Sem portador" só quando não há portador NENHUM. Três habilidades pertencem só a
		formas Mega, que não estão na Pokédex: contá-las como zero espécies e parar aí
		diria que ninguém tem Delta Stream, onde o módulo diz que Mega Rayquaza tem.
	-->
	<p class="portadores">
		{#if portadores > 0}
			{tPlural(portadores, "habilidade.portadores.uma", "habilidade.portadores")}
		{:else if habilidade.megas > 0}
			{tPlural(habilidade.megas, "habilidade.megas.contagem", "habilidade.megas.contagens")}
		{:else}
			{t("habilidade.portadores.nenhuma")}
		{/if}
	</p>

	{#if facetas.length > 0 || habilidade.concedeMove}
		<div class="facetas">
			{#each facetas as faceta (faceta)}
				<span class="pilula">{faceta}</span>
			{/each}
			{#if habilidade.concedeMove}
				<span class="pilula">{t("habilidade.moveConcedido")}</span>
			{/if}
		</div>
	{/if}
</a>

<style>
	.cartao {
		display: grid;
		gap: 0.4rem;
		align-content: start;
		padding: 0.875rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		/* Faixa à esquerda como no CartaoMove, só que aqui ela marca a procedência do
		   dado: cheia quando o livro traz a regra, tracejada quando não. */
		border-left: 4px solid var(--marca);
		border-radius: var(--raio);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	.sem-regra {
		border-left-style: dashed;
		border-left-color: var(--borda-forte);
	}

	.cartao:hover {
		border-color: var(--borda-forte);
		box-shadow: var(--sombra-2);
		transform: translateY(-1px);
	}

	.cartao:hover .nome {
		color: var(--marca);
	}

	.cabeca {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		justify-content: space-between;
	}

	.nome {
		font-size: var(--txt-g);
		font-weight: 650;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.etiqueta {
		padding: 0.25em 0.6em;
		background: var(--superficie-afundada);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 600;
	}

	/* Tracejada pelo mesmo motivo que a borda: diz "falta dado na fonte" sem parecer um
	   rótulo de categoria do sistema. */
	.etiqueta.aviso {
		border-style: dashed;
		border-color: var(--borda-forte);
	}

	.portadores {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.facetas {
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
