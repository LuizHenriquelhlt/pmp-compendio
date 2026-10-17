<script lang="ts">
	/**
	 * O voltar das fichas: um botão de ícone com dica em texto.
	 *
	 * Era um link escrito ("← Todos os Pokémon") repetido nas cinco fichas. Como ícone
	 * ocupa menos e não compete com o nome da espécie logo abaixo, que é o que a pessoa
	 * veio ler.
	 *
	 * O nome continua existindo para quem não vê o ícone: vai em `aria-label`, que é o que
	 * o leitor de tela anuncia. A dica visível é `aria-hidden`, senão o nome seria lido
	 * duas vezes.
	 *
	 * A dica aparece no `:hover` E no `:focus-visible` — tooltip que só responde ao mouse
	 * deixa quem navega por teclado sem saber para onde o botão vai.
	 */
	type Props = { href: string, texto: string }

	let { href, texto }: Props = $props()
</script>

<div class="envolto">
	<a class="voltar" {href} aria-label={texto}>
		<svg
			viewBox="0 0 24 24"
			width="20"
			height="20"
			fill="none"
			stroke="currentColor"
			stroke-width="2.5"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="M15 5l-7 7 7 7" />
		</svg>
	</a>

	<span class="dica" role="presentation" aria-hidden="true">{texto}</span>
</div>

<style>
	.envolto {
		position: relative;
		display: inline-block;
		margin-bottom: 1rem;
	}

	.voltar {
		display: grid;
		place-items: center;
		width: 2.25rem;
		height: 2.25rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		color: var(--texto-suave);
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: background 150ms ease, color 150ms ease, border-color 150ms ease;
	}

	.voltar:hover {
		background: var(--secao);
		border-color: var(--secao);
		color: var(--cromo-texto);
	}

	.dica {
		position: absolute;
		top: 50%;
		left: calc(100% + 0.5rem);
		z-index: 4;
		padding: 0.3rem 0.6rem;
		background: var(--cromo);
		border-radius: var(--raio);
		color: var(--cromo-texto);
		font-size: var(--txt-miudo);
		font-weight: 600;
		white-space: nowrap;
		/* Fora da árvore de acessibilidade E fora do alcance do mouse: a dica não deve
		   roubar o `:hover` do próprio botão. */
		pointer-events: none;
		opacity: 0;
		transform: translateY(-50%) translateX(-0.25rem);
		transition: opacity 120ms ease, transform 120ms ease;
	}

	.envolto:hover .dica,
	.voltar:focus-visible ~ .dica {
		opacity: 1;
		transform: translateY(-50%) translateX(0);
	}

	@media (prefers-reduced-motion: reduce) {
		.dica {
			transition: none;
		}
	}
</style>
