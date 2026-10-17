<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { corresponde, normalizarParaBusca } from "$pmp/busca"
	import CartaoItem from "$ui/CartaoItem.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	type Ordem = "nome" | "precoCrescente" | "precoDecrescente"
	type Uso = "" | "consumivel" | "equipamento" | "recipiente"
	type Preco = "" | "com" | "sem"

	let consulta = $state("")
	let grupo = $state("")
	let uso = $state<Uso>("")
	let preco = $state<Preco>("")
	let ordem = $state<Ordem>("nome")

	/** Quantos cartões já estão na tela. Cresce sob demanda. */
	const LOTE = 60
	let visiveis = $state(LOTE)

	// Como nas outras listagens: as chaves são calculadas uma vez por conjunto de dados,
	// não a cada tecla digitada. O grupo entra na chave porque é como se procura uma
	// família inteira - "berry" tem de trazer as 53, e "fósseis" os quatro de Galar.
	const chaves = $derived.by(() => new Map(data.itens.map((i) =>
		[ i.id, [ i.nome, i.grupo ?? "", i.secao ?? "" ].map(normalizarParaBusca).join(" ") ])))

	/** Os grupos que o catálogo tem, na ordem em que aparecem. */
	const grupos = $derived([ ...new Set(data.itens.map((i) => i.grupo).filter((g) => g != null)) ].sort())

	const filtrados = $derived.by(() => {
		const resultado = data.itens.filter((item) => {
			if (grupo !== "" && item.grupo !== grupo) return false
			if (uso === "consumivel" && !item.consumivel) return false
			if (uso === "recipiente" && !item.recipiente) return false
			if (uso === "equipamento" && (item.consumivel || item.recipiente)) return false
			if (preco === "com" && item.preco == null) return false
			if (preco === "sem" && item.preco != null) return false

			return corresponde(chaves.get(item.id) ?? "", consulta)
		})

		const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR")

		const comparar: Record<Ordem, (a: typeof resultado[number], b: typeof resultado[number]) => number> = {
			nome: porNome,
			// Os sem preço vão para o fim nas duas ordens: não são "de graça" nem "caríssimos",
			// é o livro que não os vende, e misturá-los com números mentiria nas duas pontas.
			precoCrescente: (a, b) =>
				(a.preco ?? Infinity) - (b.preco ?? Infinity) || porNome(a, b),
			precoDecrescente: (a, b) =>
				(b.preco ?? -Infinity) - (a.preco ?? -Infinity) || porNome(a, b),
		}

		return [ ...resultado ].sort(comparar[ordem])
	})

	const semPreco = $derived(data.itens.filter((i) => i.preco == null).length)
	const temFiltro = $derived(consulta !== "" || grupo !== "" || uso !== "" || preco !== "")

	// Qualquer mudança de filtro recomeça a contagem de cartões visíveis.
	$effect(() => {
		void consulta
		void grupo
		void uso
		void preco
		void ordem
		visiveis = LOTE
	})

	function limpar() {
		consulta = ""
		grupo = ""
		uso = ""
		preco = ""
	}
</script>

<svelte:head>
	<title>{t("catalogoItens.titulo")} - {t("site.nome")}</title>
	<meta name="description" content={t("catalogoItens.subtitulo", { n: String(data.itens.length) })} />
</svelte:head>

<div class="pagina">
	<header class="topo">
		<h1>{t("catalogoItens.titulo")}</h1>
		<p>{t("catalogoItens.subtitulo", { n: data.itens.length.toLocaleString("pt-BR") })}</p>
		<p class="nota">{t("catalogoItens.nota")}</p>
	</header>

	<section class="controles" aria-label={t("filtro.titulo")}>
		<div class="campo busca">
			<label for="busca">{t("buscaItens.rotulo")}</label>
			<input
				id="busca"
				type="search"
				bind:value={consulta}
				placeholder={t("buscaItens.exemplo")}
				autocomplete="off"
			/>
		</div>

		<div class="campo">
			<label for="grupo">{t("filtro.grupoDeItem")}</label>
			<select id="grupo" bind:value={grupo}>
				<option value="">{t("filtro.grupoDeItem.todos")}</option>
				{#each grupos as nome (nome)}
					<option value={nome}>{nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="uso">{t("filtro.usoDeItem")}</label>
			<select id="uso" bind:value={uso}>
				<option value="">{t("filtro.usoDeItem.todos")}</option>
				<option value="consumivel">{t("filtro.usoDeItem.consumivel")}</option>
				<option value="equipamento">{t("filtro.usoDeItem.equipamento")}</option>
				<option value="recipiente">{t("filtro.usoDeItem.recipiente")}</option>
			</select>
		</div>

		<div class="campo">
			<label for="preco">{t("filtro.precoDeItem")}</label>
			<select id="preco" bind:value={preco}>
				<option value="">{t("filtro.precoDeItem.todos")}</option>
				<option value="com">{t("filtro.precoDeItem.com")}</option>
				<option value="sem">{t("filtro.precoDeItem.sem")}</option>
			</select>
		</div>

		<div class="campo">
			<label for="ordem">{t("filtro.ordem")}</label>
			<select id="ordem" bind:value={ordem}>
				<option value="nome">{t("filtro.ordem.nome")}</option>
				<option value="precoCrescente">{t("filtro.ordem.preco")} ↑</option>
				<option value="precoDecrescente">{t("filtro.ordem.preco")} ↓</option>
			</select>
		</div>

		{#if temFiltro}
			<button type="button" class="limpar" onclick={limpar}>{t("filtro.limpar")}</button>
		{/if}
	</section>

	<p class="contagem" aria-live="polite">
		{tPlural(filtrados.length, "catalogoItens.resultado", "catalogoItens.resultados")}
		<span class="tenue">· {semPreco} {t("item.semPreco").toLowerCase()}</span>
	</p>

	{#if filtrados.length === 0}
		<div class="vazio">
			<p class="vazio-titulo">{t("catalogoItens.vazio")}</p>
			<p>{t("catalogoItens.vazio.dica")}</p>
		</div>
	{:else}
		<ul class="grade">
			{#each filtrados.slice(0, visiveis) as item (item.id)}
				<li><CartaoItem {item} /></li>
			{/each}
		</ul>

		{#if visiveis < filtrados.length}
			<div class="mais">
				<button type="button" onclick={() => visiveis += LOTE * 2}>
					{t("lista.mostrarMais")}
					<span class="restantes">
						({t("lista.mostrarMais.restantes", { n: (filtrados.length - visiveis).toLocaleString("pt-BR") })})
					</span>
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.topo {
		margin-bottom: var(--espaco-8);
	}

	.topo p {
		margin-top: var(--espaco-2);
		color: var(--texto-suave);
		max-width: var(--largura-leitura);
	}

	.topo .nota {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	.controles {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-5);
		align-items: end;
		padding: var(--espaco-6);
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	.campo {
		display: grid;
		gap: var(--espaco-1);
		min-width: 0;
	}

	.busca {
		flex: 1 1 16rem;
	}

	label {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	input, select {
		padding: var(--espaco-3) var(--espaco-4);
		background: var(--superficie-realcada);
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio);
		font-size: var(--txt-pequeno);
		/* Sem isto um `select` de rótulo longo estica a barra e faz a PÁGINA rolar na
		   horizontal em 375px. */
		max-width: 100%;
	}

	input {
		width: 100%;
	}

	input:focus, select:focus {
		border-color: var(--foco);
	}

	.limpar {
		padding: var(--espaco-3) 0.9rem;
		background: transparent;
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		cursor: pointer;
	}

	.limpar:hover {
		background: var(--superficie-afundada);
		color: var(--texto);
	}

	.contagem {
		margin-block: var(--espaco-7) var(--espaco-5);
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.tenue {
		color: var(--texto-tenue);
		font-weight: 600;
	}

	.grade {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 14rem), 1fr));
		gap: 0.75rem;
		list-style: none;
	}

	.vazio {
		padding: var(--espaco-9) var(--espaco-8);
		background: var(--superficie-afundada);
		border: 1px dashed var(--borda-forte);
		border-radius: var(--raio-grande);
		color: var(--texto-suave);
		text-align: center;
	}

	.vazio-titulo {
		color: var(--texto);
		font-size: var(--txt-g);
		font-weight: 650;
	}

	.mais {
		display: grid;
		place-items: center;
		margin-top: var(--espaco-8);
	}

	.mais button {
		padding: var(--espaco-4) 1.4rem;
		background: var(--superficie);
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio);
		font-size: var(--txt-pequeno);
		font-weight: 650;
		cursor: pointer;
		box-shadow: var(--sombra-1);
	}

	.mais button:hover {
		border-color: var(--marca);
		color: var(--marca);
	}

	.restantes {
		color: var(--texto-tenue);
		font-weight: 600;
	}
</style>
