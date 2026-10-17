<script lang="ts">
	import { page } from "$app/state"
	import { t } from "$i18n"
	import AlternadorDeTema from "$ui/AlternadorDeTema.svelte"
	import "$ui/base.css"
	import "$ui/tipos.css"

	let { children } = $props()

	const secoes = [
		{ href: "/", rotulo: t("nav.inicio") },
		{ href: "/pokemon", rotulo: t("nav.pokemon") },
		{ href: "/moves", rotulo: t("nav.moves") },
		{ href: "/habilidades", rotulo: t("nav.habilidades") },
		{ href: "/megas", rotulo: t("nav.megas") },
		{ href: "/itens", rotulo: t("nav.itens") },
		{ href: "/tms", rotulo: t("nav.tms") },
		{ href: "/regras", rotulo: t("nav.regras") },
		{ href: "/sobre", rotulo: t("nav.sobre") },
	]

	/** `/pokemon/charmander` mantém "Pokémon" marcado como seção atual. */
	function ehSecaoAtual(href: string): boolean {
		if (href === "/") return page.url.pathname === "/"
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`)
	}

	/**
	 * A cor que a seção veste, como no poke5e.
	 *
	 * Sai do primeiro segmento da URL, e não de uma prop por página, para que toda rota
	 * nova já nasça temática - inclusive as fichas, que são a maior parte das páginas.
	 * A home, o Sobre e o erro ficam sem classe e herdam a cor da marca.
	 */
	const SECOES_COM_COR = [ "pokemon", "moves", "habilidades", "megas", "itens", "tms", "regras" ]

	const classeDaSecao = $derived.by(() => {
		const primeiro = page.url.pathname.split("/")[1] ?? ""
		return SECOES_COM_COR.includes(primeiro) ? `secao-${primeiro}` : ""
	})
</script>

<a class="pular" href="#conteudo">{t("nav.pular")}</a>

<header>
	<div class="pagina barra">
		<a class="marca" href="/">
			<!-- Pokébola estilizada: marca própria, sem arte do material original. -->
			<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
				<circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="2" />
				<path d="M1.5 12h6a4.5 4.5 0 0 1 9 0h6" fill="none" stroke="currentColor" stroke-width="2" />
				<circle cx="12" cy="12" r="2.75" fill="currentColor" />
			</svg>
			<span class="marca-nome">{t("site.nome")}</span>
		</a>

		<nav aria-label={t("nav.principal")}>
			<ul>
				{#each secoes as secao (secao.href)}
					<li>
						<a href={secao.href} aria-current={ehSecaoAtual(secao.href) ? "page" : undefined}>
							{secao.rotulo}
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<AlternadorDeTema />
	</div>
</header>

<main id="conteudo" class={classeDaSecao}>
	<!--
		A faixa diagonal do topo, a marca registrada do poke5e. É decoração pura, então sai
		do fluxo e fica `aria-hidden`; a altura é pequena o bastante para não empurrar o
		conteúdo em telas baixas.
	-->
	<div class="faixa" aria-hidden="true"></div>

	{@render children()}
</main>

<footer>
	<div class="pagina">
		<p>{t("rodape.credito")}</p>
		<p class="aviso">{t("rodape.aviso")}</p>
	</div>
</footer>

<style>
	/* Só aparece ao receber foco pelo teclado. */
	.pular {
		position: absolute;
		top: 0;
		left: 50%;
		transform: translate(-50%, -110%);
		z-index: 10;
		padding: 0.6rem var(--espaco-6);
		background: var(--marca);
		color: var(--marca-contraste);
		border-radius: 0 0 var(--raio) var(--raio);
		font-weight: 600;
		text-decoration: none;
		transition: transform 120ms ease;
	}

	.pular:focus {
		transform: translate(-50%, 0);
	}

	/* Cromo escuro nos dois temas, como no poke5e: a barra emoldura o conteúdo em vez de
	   se misturar com ele. */
	header {
		position: sticky;
		top: 0;
		z-index: 5;
		background: color-mix(in oklab, var(--cromo) 92%, transparent);
		border-bottom: 1px solid oklch(0 0 0 / 0.3);
		backdrop-filter: blur(8px);
	}

	.barra {
		display: flex;
		gap: var(--espaco-6);
		align-items: center;
		min-height: 3.5rem;
	}

	.marca {
		display: flex;
		gap: var(--espaco-3);
		align-items: center;
		color: var(--secao);
		font-weight: 700;
		text-decoration: none;
	}

	.marca-nome {
		font-size: var(--txt-g);
		letter-spacing: -0.02em;
		color: var(--cromo-texto);
	}

	.marca:hover .marca-nome {
		color: var(--secao);
	}

	nav {
		margin-left: auto;
		/* A navegação rola sozinha quando as seções não cabem, em vez de esticar a barra e
		   fazer a PÁGINA rolar na horizontal. Com quatro seções cabia exatamente em 375px;
		   a quinta estourava, e ainda vêm Itens e Regras. */
		min-width: 0;
		overflow-x: auto;
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}

	nav::-webkit-scrollbar {
		display: none;
	}

	nav ul {
		display: flex;
		gap: 0.25rem;
		list-style: none;
		/* Sem isto os itens encolhem até quebrar o texto em vez de rolar. */
		width: max-content;
	}

	nav a {
		display: block;
		padding: var(--espaco-2) var(--espaco-4);
		border-radius: var(--raio);
		color: var(--cromo-texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		text-decoration: none;
		transition: background 150ms ease, color 150ms ease;
	}

	nav a:hover {
		background: oklch(1 0 0 / 0.1);
		color: var(--cromo-texto);
	}

	/* `aria-current` já carrega o estado - o estilo só o torna visível. A seção atual
	   acende na própria cor dela. */
	nav a[aria-current="page"] {
		background: var(--secao);
		color: var(--cromo-texto);
	}

	main {
		position: relative;
		min-height: 60vh;
		padding-block: 2rem 4rem;
		isolation: isolate;
	}

	/* A faixa diagonal: um bloco da cor da seção, cortado em diagonal e desbotando. */
	.faixa {
		position: absolute;
		inset: 0 0 auto 0;
		z-index: -1;
		height: 13rem;
		background: linear-gradient(
			to bottom,
			color-mix(in oklab, var(--secao) 16%, transparent),
			transparent
		);
		clip-path: polygon(0 0, 100% 0, 100% 62%, 0 100%);
	}

	footer {
		padding-block: 1.75rem;
		background: var(--cromo);
		color: var(--cromo-texto-suave);
		font-size: var(--txt-pequeno);
	}

	footer p {
		max-width: var(--largura-leitura);
	}

	footer .aviso {
		margin-top: var(--espaco-2);
		font-size: var(--txt-miudo);
	}

	@media (width < 30rem) {
		.marca-nome {
			/* Em telas estreitas o logotipo sozinho já identifica o site. */
			display: none;
		}
	}
</style>
