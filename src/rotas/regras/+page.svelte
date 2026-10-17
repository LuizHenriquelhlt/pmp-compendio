<script lang="ts">
	import { t } from "$i18n"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	/**
	 * Sumário agrupado, no desenho do poke5e: as regras do livro primeiro, o que a mesa
	 * acrescentou depois.
	 *
	 * São 23 entradas - não há busca nem filtro aqui de propósito. Buscar faz sentido num
	 * catálogo de 833 Moves; num sumário que cabe numa tela, o campo de busca seria mais
	 * um passo entre a pessoa e o que ela já está vendo.
	 */
	const ORDEM = [ "Regras", "Homebrews" ]

	const grupos = $derived.by(() => {
		const porGrupo = new Map<string, typeof data.regras>()
		for (const regra of data.regras) {
			const chave = regra.grupo ?? ORDEM[0]
			porGrupo.set(chave, [ ...(porGrupo.get(chave) ?? []), regra ])
		}

		return [ ...porGrupo.entries() ]
			.sort(([ a ], [ b ]) => {
				const ia = ORDEM.indexOf(a)
				const ib = ORDEM.indexOf(b)
				// Grupo que o módulo venha a criar vai para o fim, em ordem alfabética,
				// em vez de sumir ou se misturar com os dois que conhecemos.
				return (ia === -1 ? ORDEM.length : ia) - (ib === -1 ? ORDEM.length : ib) || a.localeCompare(b, "pt-BR")
			})
			.map(([ nome, entradas ]) => ({
				nome,
				entradas: [ ...entradas ].sort((x, y) => x.nome.localeCompare(y.nome, "pt-BR")),
			}))
	})
</script>

<svelte:head>
	<title>{t("catalogoRegras.titulo")} - {t("site.nome")}</title>
	<meta name="description" content={t("catalogoRegras.descricao")} />
</svelte:head>

<div class="pagina">
	<header class="abertura">
		<h1>{t("catalogoRegras.titulo")}</h1>
		<p class="chamada">{t("catalogoRegras.descricao")}</p>
	</header>

	{#each grupos as grupo (grupo.nome)}
		<section class="grupo">
			<h2>
				{grupo.nome}
				<span class="quantidade">({grupo.entradas.length})</span>
			</h2>

			{#if grupo.nome === "Homebrews"}
				<p class="aviso">{t("regra.homebrew")}</p>
			{/if}

			<ul class="lista">
				{#each grupo.entradas as regra (regra.id)}
					<li>
						<a class="cartao" href="/regras/{regra.id}">
							<span class="nome">{regra.nome}</span>
							{#if regra.paginas > 1}
								<span class="paginas">{t("regra.paginas", { n: regra.paginas })}</span>
							{/if}
							<span class="resumo">{regra.resumo}…</span>
						</a>
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>

<style>
	.abertura {
		padding-block: 2rem 1rem;
	}

	.chamada {
		max-width: var(--largura-leitura);
		margin-top: 0.5rem;
		color: var(--texto-suave);
	}

	.grupo {
		margin-bottom: 2.5rem;
	}

	.grupo h2 {
		margin-bottom: 0.4rem;
	}

	.quantidade {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 500;
	}

	.aviso {
		max-width: var(--largura-leitura);
		margin-bottom: 0.9rem;
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	.lista {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 20rem), 1fr));
		gap: 0.75rem;
		margin: 0.9rem 0 0;
		padding: 0;
		list-style: none;
	}

	/* O cartão inteiro é o link, como nas outras listagens: a área de toque é o retângulo
	   todo, e o leitor de tela anuncia um alvo em vez de três. */
	.cartao {
		display: grid;
		gap: 0.3rem;
		height: 100%;
		padding: 0.9rem 1.1rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-left: 4px solid var(--secao);
		border-radius: var(--raio-grande);
		color: inherit;
		text-decoration: none;
		box-shadow: var(--sombra-1);
		transition: box-shadow 150ms ease, transform 150ms ease, border-color 150ms ease;
	}

	.cartao:hover {
		border-color: var(--secao);
		box-shadow: var(--sombra-2);
		transform: translateY(-2px);
	}

	.nome {
		font-weight: 700;
	}

	.cartao:hover .nome {
		color: var(--secao);
	}

	.paginas {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
	}

	.resumo {
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		line-height: 1.45;
	}
</style>
