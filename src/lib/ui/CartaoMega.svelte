<script lang="ts">
	import { t } from "$i18n"
	import { abreviacaoDeAtributo, formatarDelta, type MegaNoIndice } from "$pmp/mega"
	import { nomeDoTamanho } from "$pmp/tamanhos"
	import EmblemaTipo from "./EmblemaTipo.svelte"

	type Props = { mega: MegaNoIndice }

	let { mega }: Props = $props()

	/**
	 * Os deltas de atributo em pílulas curtas: `FOR +3`, `DES −2`.
	 *
	 * Entram todos, inclusive os negativos — Mega Hawlucha perde 2 de FOR e ganha 9 de
	 * SAB, e mostrar só os ganhos venderia a forma melhor do que o livro a descreve.
	 */
	const deltas = $derived(mega.atributos.map((a) => ({
		rotulo: `${abreviacaoDeAtributo(a.id)} ${formatarDelta(a.delta)}`,
		negativo: a.delta < 0,
	})))
</script>

<!--
	Mesma decisão do CartaoMove: o cartão inteiro é um link, para que a área de toque seja
	o cartão todo e o leitor de tela anuncie um alvo em vez de oito.

	A faixa à esquerda usa a cor do PRIMEIRO tipo que a forma passa a ter — é a mudança
	mais visível que a pedra faz. Nas 74 que não trocam de tipo não há cor de tipo para
	mostrar, e a faixa cai na tinta da marca, como no CartaoHabilidade.
-->
<a
	class="cartao {mega.tipos.length > 0 ? `tipo-${mega.tipos[0]}` : 'sem-tipo'}"
	class:especial={mega.categoria === "especial"}
	href="/megas/{mega.id}"
>
	<div class="cabeca">
		{#if mega.imagem != null}
			<!-- `alt` vazio de propósito: o nome vem logo ao lado, e repeti-lo faria o leitor
			     de tela anunciar a forma duas vezes. -->
			<img src={mega.imagem} alt="" loading="lazy" width="56" height="56" />
		{:else}
			<!-- Duas das 93 não têm arte no módulo. O espaço fica reservado para que os
			     cartões da grade não desalinhem entre si. -->
			<span class="sem-arte" aria-hidden="true"></span>
		{/if}

		<div class="titulo">
			<span class="nome">{mega.nome}</span>
			<span class="pedra">{mega.pedra}</span>
		</div>
	</div>

	<p class="base">
		{t("mega.especie")}: <strong>{mega.especie}</strong>
	</p>

	<div class="facetas">
		{#each mega.tipos as tipo (tipo)}
			<EmblemaTipo {tipo} tamanho="pequeno" />
		{/each}

		{#if mega.tamanho != null}
			<span class="pilula">{nomeDoTamanho(mega.tamanho)}</span>
		{/if}

		{#if mega.deltaCA != null && mega.deltaCA !== 0}
			<span class="pilula" class:negativa={mega.deltaCA < 0}>
				{t("mega.ca")} {formatarDelta(mega.deltaCA)}
			</span>
		{/if}

		{#each deltas as delta (delta.rotulo)}
			<span class="pilula numero" class:negativa={delta.negativo}>{delta.rotulo}</span>
		{/each}

		{#each mega.escolhasDeAtributo as escolha, indice (indice)}
			<!-- Tracejada porque não é um bônus fixo: o jogador escolhe onde ele entra. -->
			<span class="pilula numero escolha">
				{formatarDelta(escolha.delta)} {escolha.opcoes.map(abreviacaoDeAtributo).join("/")}
			</span>
		{/each}
	</div>

	{#if mega.habilidades.length > 0 || mega.habilidadePendente}
		<p class="habilidade">
			{#each mega.habilidades as habilidade, indice (habilidade.nome)}
				<!-- Sem link: o cartão inteiro já é um, e um link dentro de outro não vale
				     HTML. A ficha é que liga a habilidade. -->
				<span class:sem-ficha={habilidade.id == null}>{habilidade.nome}</span>
				{indice < mega.habilidades.length - 1 ? ", " : ""}
			{/each}

			{#if mega.habilidadePendente}
				{#if mega.habilidades.length > 0}<span class="tenue"> + </span>{/if}
				<span class="pendente">{t("mega.habilidadePendente")}</span>
			{/if}
		</p>
	{:else}
		<p class="habilidade tenue">{t("mega.habilidade.nenhuma")}</p>
	{/if}
</a>

<style>
	.cartao {
		display: grid;
		gap: 0.5rem;
		align-content: start;
		padding: 0.875rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		/* Faixa à esquerda como no CartaoMove: aqui ela carrega a cor do tipo que a forma
		   PASSA A TER. */
		border-left: 4px solid var(--tipo-cor, var(--marca));
		border-radius: var(--raio);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	.sem-tipo {
		--tipo-cor: var(--marca);
	}

	/* As três que não seguem a regra comum da Mega Pedra. Tracejada pelo mesmo motivo que
	   no CartaoHabilidade: diz "este registro é de outra natureza" sem inventar rótulo. */
	.especial {
		border-left-style: dashed;
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

	img, .sem-arte {
		flex: none;
		width: 3.5rem;
		height: 3.5rem;
		object-fit: contain;
	}

	.sem-arte {
		background: var(--superficie-afundada);
		border-radius: var(--raio);
	}

	.titulo {
		display: grid;
		min-width: 0;
	}

	.nome {
		font-size: var(--txt-g);
		font-weight: 650;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.pedra {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.base {
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
	}

	.base strong {
		color: var(--texto);
		font-weight: 650;
	}

	.facetas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
	}

	.pilula {
		padding: 0.15em 0.55em;
		background: var(--superficie-afundada);
		border-radius: var(--raio-pilula);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 600;
		white-space: nowrap;
	}

	.numero {
		font-family: var(--fonte-numeros);
	}

	/* Delta negativo: a forma PERDE nesse campo, e a pílula não deve parecer um ganho. */
	.negativa {
		background: transparent;
		border: 1px solid var(--borda-forte);
	}

	.escolha {
		background: transparent;
		border: 1px dashed var(--borda-forte);
	}

	.habilidade {
		color: var(--texto);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.tenue {
		color: var(--texto-tenue);
		font-weight: 600;
	}

	/* Mesmo sinal da ListaDeMoves: nome que veio da fonte sem corresponder a uma ficha. */
	.sem-ficha {
		color: var(--texto-tenue);
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}

	.pendente {
		color: var(--texto-tenue);
		font-style: italic;
		font-weight: 600;
	}
</style>
