<script lang="ts">
	import type { EspecieNoIndice } from "$dados/carregar.server"
	import { t } from "$i18n"
	import EmblemaTipo from "./EmblemaTipo.svelte"

	type Props = {
		especie: EspecieNoIndice
		/** Fora da primeira tela, a imagem carrega sob demanda. */
		prioridade?: boolean
	}

	let { especie, prioridade = false }: Props = $props()
</script>

<!--
	O cartão inteiro é um link: a área de toque é o cartão todo, e o leitor de tela
	anuncia um único alvo em vez de três (imagem, nome, número).
-->
<a class="cartao tipo-{especie.tipos[0]}" href="/pokemon/{especie.id}">
	<div class="arte">
		{#if especie.imagem != null}
			<img
				src={especie.imagem}
				alt=""
				width="96"
				height="96"
				loading={prioridade ? "eager" : "lazy"}
				decoding="async"
			/>
		{:else}
			<span class="sem-arte" aria-hidden="true">?</span>
		{/if}
	</div>

	<div class="corpo">
		<span class="numero cadastro">{t("especie.numero", { n: String(especie.numero).padStart(3, "0") })}</span>
		<span class="nome">{especie.nome}</span>

		<span class="tipos">
			{#each especie.tipos as tipo (tipo)}
				<EmblemaTipo {tipo} tamanho="pequeno" />
			{/each}
		</span>

		<dl class="medidas">
			<div>
				<dt>{t("especie.sr")}</dt>
				<dd class="numero">{especie.srTexto}</dd>
			</div>
			<div>
				<dt>{t("especie.ca")}</dt>
				<dd class="numero">{especie.ca}</dd>
			</div>
			<div>
				<dt>{t("especie.pv")}</dt>
				<dd class="numero">{especie.pv}</dd>
			</div>
		</dl>
	</div>
</a>

<style>
	.cartao {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--espaco-5);
		align-items: center;
		padding: var(--espaco-5);
		background: var(--superficie);
		border: 1px solid var(--borda);
		/* A cor do tipo primário entra como uma faixa à esquerda, não como fundo:
		   identifica o tipo sem comprometer o contraste do texto. */
		border-left: 4px solid var(--tipo-cor);
		border-radius: var(--raio);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	.cartao:hover {
		border-color: var(--borda-forte);
		border-left-color: var(--tipo-cor);
		box-shadow: var(--sombra-2);
		transform: translateY(-1px);
	}

	.arte {
		display: grid;
		place-items: center;
		width: 4rem;
		height: 4rem;
		background: var(--superficie-afundada);
		border-radius: var(--raio);
	}

	.arte img {
		width: 3.5rem;
		height: 3.5rem;
		object-fit: contain;
	}

	.sem-arte {
		color: var(--texto-tenue);
		font-size: var(--txt-gg);
	}

	.corpo {
		display: grid;
		gap: var(--espaco-1);
		min-width: 0;
	}

	.cadastro {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
	}

	.nome {
		font-size: var(--txt-g);
		font-weight: 650;
		line-height: 1.2;
		/* Formas têm nomes longos ("Dudunsparce de Três Segmentos"). */
		overflow-wrap: break-word;
	}

	.cartao:hover .nome {
		color: var(--marca);
	}

	.tipos {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-1);
		margin-top: 0.1rem;
	}

	.medidas {
		display: flex;
		gap: var(--espaco-5);
		margin: 0.35rem 0 0;
	}

	.medidas div {
		display: flex;
		gap: var(--espaco-1);
		align-items: baseline;
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
	}
</style>
