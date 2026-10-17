<script lang="ts">
	/**
	 * O ícone grande de cada seção, para os cartões da tela principal.
	 *
	 * Desenhados aqui, em traço de `currentColor`, pela mesma razão do `IconeDeItem`: não
	 * acrescentam dependência nem arquivo para baixar, não levantam questão de licença, e
	 * acompanham o tema sozinhos. O poke5e usa um ícone por seção do mesmo jeito.
	 *
	 * `stroke-width` baixo e tamanho grande: na tela principal eles são ilustração, não
	 * ícone de interface, e um traço grosso em 7rem fica pesado.
	 */
	type Props = { secao: Secao, tamanho?: number }

	export type Secao = "pokemon" | "moves" | "habilidades" | "megas" | "itens" | "dados"

	let { secao, tamanho = 112 }: Props = $props()
</script>

<svg
	class="icone"
	width={tamanho}
	height={tamanho}
	viewBox="0 0 48 48"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if secao === "pokemon"}
		<!-- Pokébola: a mesma marca do cabeçalho, em tamanho de ilustração. -->
		<circle cx="24" cy="24" r="19" />
		<path d="M5 24h11a8 8 0 0 1 16 0h11" />
		<circle cx="24" cy="24" r="5" />
	{:else if secao === "moves"}
		<!-- Estrela de impacto, como a do poke5e para Moves. -->
		<path d="M24 4l5 11 12-4-6 11 9 8-12 2 2 12-10-7-10 7 2-12-12-2 9-8-6-11 12 4 5-11Z" />
	{:else if secao === "habilidades"}
		<!-- Faísca dupla: o efeito passivo, sempre ligado. -->
		<path d="M18 4l3 9 9 3-9 3-3 9-3-9-9-3 9-3 3-9Z" />
		<path d="M34 24l2 6 6 2-6 2-2 6-2-6-6-2 6-2 2-6Z" />
	{:else if secao === "megas"}
		<!-- A pedra Mega: cristal facetado. -->
		<path d="M24 4 40 15l-4 25H12L8 15 24 4Z" />
		<path d="M8 15l16 9 16-9M24 24v16" />
	{:else if secao === "itens"}
		<!--
			Mochila. As alças saem POR FORA do corpo e o bolso é um retângulo próprio: na
			primeira tentativa, com a alça rente ao topo, o glifo lia como uma porta.
		-->
		<path d="M14 18h20a4 4 0 0 1 4 4v18a2 2 0 0 1-2 2H12a2 2 0 0 1-2-2V22a4 4 0 0 1 4-4Z" />
		<path d="M18 18v-3a6 6 0 0 1 12 0v3" />
		<rect x="18" y="28" width="12" height="9" rx="2" />
	{:else}
		<!-- Dados da sua mesa: um d20 visto de frente. -->
		<path d="M24 4 42 14v20L24 44 6 34V14L24 4Z" />
		<path d="M24 4v14M6 14l18 4 18-4M24 18l-9 16h18l-9-16Z" />
	{/if}
</svg>

<style>
	.icone {
		flex: none;
		color: var(--secao, var(--marca));
		/* O ícone é decoração: fica atrás do texto quando o cartão aperta. */
		opacity: 0.9;
	}
</style>
