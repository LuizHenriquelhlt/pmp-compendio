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
		{ href: "/sobre", rotulo: t("nav.sobre") },
	]

	/** `/pokemon/charmander` mantém "Pokémon" marcado como seção atual. */
	function ehSecaoAtual(href: string): boolean {
		if (href === "/") return page.url.pathname === "/"
		return page.url.pathname === href || page.url.pathname.startsWith(`${href}/`)
	}
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

<main id="conteudo">
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
		padding: 0.6rem 1rem;
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

	header {
		position: sticky;
		top: 0;
		z-index: 5;
		background: color-mix(in oklab, var(--superficie) 88%, transparent);
		border-bottom: 1px solid var(--borda);
		backdrop-filter: blur(8px);
	}

	.barra {
		display: flex;
		gap: 1rem;
		align-items: center;
		min-height: 3.5rem;
	}

	.marca {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		color: var(--marca);
		font-weight: 700;
		text-decoration: none;
	}

	.marca-nome {
		font-size: var(--txt-g);
		letter-spacing: -0.02em;
		color: var(--texto);
	}

	.marca:hover .marca-nome {
		color: var(--marca);
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
		padding: 0.4rem 0.7rem;
		border-radius: var(--raio);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		text-decoration: none;
		transition: background 150ms ease, color 150ms ease;
	}

	nav a:hover {
		background: var(--superficie-afundada);
		color: var(--texto);
	}

	/* `aria-current` já carrega o estado — o estilo só o torna visível. */
	nav a[aria-current="page"] {
		background: var(--marca-suave);
		color: var(--marca);
	}

	main {
		min-height: 60vh;
		padding-block: 2rem 4rem;
	}

	footer {
		padding-block: 1.75rem;
		border-top: 1px solid var(--borda);
		background: var(--superficie-afundada);
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	footer p {
		max-width: var(--largura-leitura);
	}

	footer .aviso {
		margin-top: 0.4rem;
		font-size: var(--txt-miudo);
	}

	@media (width < 30rem) {
		.marca-nome {
			/* Em telas estreitas o logotipo sozinho já identifica o site. */
			display: none;
		}
	}
</style>
