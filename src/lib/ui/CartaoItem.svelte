<script lang="ts">
	import type { ItemNoIndice } from "$pmp/item"
	import { t } from "$i18n"
	import { formatarPreco } from "$pmp/item"
	import IconeDeItem from "./IconeDeItem.svelte"

	type Props = { item: ItemNoIndice }

	let { item }: Props = $props()

	const preco = $derived(formatarPreco(item.preco))
</script>

<!--
	Mesma decisão dos outros cartões: o cartão inteiro é um link, para que a área de toque
	seja o cartão todo e o leitor de tela anuncie um alvo em vez de quatro.
-->
<a class="cartao" class:sem-texto={item.textoContaminado || item.textoIncompleto} href="/itens/{item.id}">
	<div class="cabeca">
		{#if item.imagem != null}
			<!-- `alt` vazio: o nome vem ao lado, e repeti-lo faria o leitor de tela dizer
			     o item duas vezes. -->
			<img src={item.imagem} alt="" loading="lazy" width="40" height="40" />
		{:else}
			<!-- Sem sprite: um ícone desenhado, que ao menos diz que coisa é o item. -->
			<IconeDeItem {item} tamanho={34} />
		{/if}

		<span class="nome">{item.nome}</span>
	</div>

	<div class="rodape">
		<!--
			"Não vendido" e não "₽0": 15 itens-chave do livro (Mega Pedra, Pedra-Chave,
			Bracelete-Z) não têm preço, e zero diria que são de graça.
		-->
		{#if preco != null}
			<span class="preco numero">{preco}</span>
		{:else}
			<span class="preco sem">{t("item.semPreco")}</span>
		{/if}

		{#if item.grupo != null && item.grupo !== "Itens"}
			<!-- O grupo "Itens" é o balde genérico de 259 dos 343: como etiqueta não diz
			     nada, e só ocuparia espaço em três de cada quatro cartões. -->
			<span class="pilula">{item.grupo}</span>
		{/if}

		{#if item.consumivel}
			<span class="pilula">{t("filtro.usoDeItem.consumivel")}</span>
		{/if}
	</div>
</a>

<style>
	.cartao {
		display: grid;
		gap: var(--espaco-3);
		align-content: space-between;
		padding: 0.75rem var(--espaco-5);
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-left: 4px solid var(--marca);
		border-radius: var(--raio);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	/* Mesmo sinal do CartaoHabilidade: tracejado quando falta dado na fonte — texto
	   contaminado por outra entrada ou cortado no meio de uma frase. */
	.sem-texto {
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
		gap: 0.6rem;
		align-items: center;
		min-width: 0;
	}

	img {
		flex: none;
		width: 2.5rem;
		height: 2.5rem;
		object-fit: contain;
	}

	.nome {
		font-weight: 650;
		line-height: 1.25;
		overflow-wrap: anywhere;
	}

	.rodape {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-1);
		align-items: center;
	}

	.preco {
		font-size: var(--txt-pequeno);
		font-weight: 650;
	}

	.numero {
		font-family: var(--fonte-numeros);
	}

	.preco.sem {
		color: var(--texto-tenue);
		font-weight: 600;
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
