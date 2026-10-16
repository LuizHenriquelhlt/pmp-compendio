<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { chaveDeBusca, corresponde } from "$pmp/busca"
	import { TIPOS, type IdTipo } from "$pmp/tipos"
	import CartaoEspecie from "$ui/CartaoEspecie.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	type Ordem = "numero" | "nome" | "sr"

	let consulta = $state("")
	let tipoEscolhido = $state<IdTipo | "">("")
	let geracaoEscolhida = $state<number | "">("")
	let ordem = $state<Ordem>("numero")

	/** Quantos cartões já estão na tela. Cresce sob demanda. */
	const LOTE = 60
	let visiveis = $state(LOTE)

	/*
	 * As chaves de busca são calculadas uma vez por conjunto de dados, não a cada
	 * tecla digitada — que seria o gargalo óbvio desta página com 1149 espécies.
	 * Derivado, e não constante, para continuar correto se a navegação trocar `data`.
	 */
	const chaves = $derived.by(() => new Map(data.especies.map((e) => [ e.id, chaveDeBusca(e) ])))

	const filtradas = $derived.by(() => {
		const resultado = data.especies.filter((especie) => {
			if (tipoEscolhido !== "" && !especie.tipos.includes(tipoEscolhido)) return false
			if (geracaoEscolhida !== "" && especie.geracao !== geracaoEscolhida) return false
			return corresponde(chaves.get(especie.id) ?? "", consulta)
		})

		const comparar: Record<Ordem, (a: typeof resultado[number], b: typeof resultado[number]) => number> = {
			numero: (a, b) => a.numero - b.numero || a.nome.localeCompare(b.nome, "pt-BR"),
			nome: (a, b) => a.nome.localeCompare(b.nome, "pt-BR"),
			// SR decrescente: numa consulta por SR o que interessa é o teto do desafio.
			sr: (a, b) => b.sr - a.sr || a.numero - b.numero,
		}

		return [ ...resultado ].sort(comparar[ordem])
	})

	const temFiltro = $derived(consulta !== "" || tipoEscolhido !== "" || geracaoEscolhida !== "")

	// Qualquer mudança de filtro recomeça a contagem de cartões visíveis; sem isso,
	// uma busca feita depois de rolar muito renderizaria centenas de cartões de uma vez.
	$effect(() => {
		void consulta
		void tipoEscolhido
		void geracaoEscolhida
		void ordem
		visiveis = LOTE
	})

	function limpar() {
		consulta = ""
		tipoEscolhido = ""
		geracaoEscolhida = ""
	}
</script>

<svelte:head>
	<title>{t("catalogo.titulo")} — {t("site.nome")}</title>
	<meta name="description" content={t("catalogo.subtitulo", { n: String(data.especies.length) })} />
</svelte:head>

<div class="pagina">
	<header class="topo">
		<h1>{t("catalogo.titulo")}</h1>
		<p>{t("catalogo.subtitulo", { n: data.especies.length.toLocaleString("pt-BR") })}</p>
	</header>

	<section class="controles" aria-label={t("filtro.titulo")}>
		<div class="campo busca">
			<label for="busca">{t("busca.rotulo")}</label>
			<input
				id="busca"
				type="search"
				bind:value={consulta}
				placeholder={t("busca.exemplo")}
				autocomplete="off"
			/>
		</div>

		<div class="campo">
			<label for="tipo">{t("filtro.tipo")}</label>
			<select id="tipo" bind:value={tipoEscolhido}>
				<option value="">{t("filtro.tipo.todos")}</option>
				{#each TIPOS as tipo (tipo.id)}
					<option value={tipo.id}>{tipo.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="geracao">{t("filtro.geracao")}</label>
			<select id="geracao" bind:value={geracaoEscolhida}>
				<option value="">{t("filtro.geracao.todas")}</option>
				{#each data.geracoes as geracao (geracao.numero)}
					<option value={geracao.numero}>
						{t("filtro.geracao.numero", { n: geracao.numero, regiao: geracao.regiao })}
					</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="ordem">{t("filtro.ordem")}</label>
			<select id="ordem" bind:value={ordem}>
				<option value="numero">{t("filtro.ordem.numero")}</option>
				<option value="nome">{t("filtro.ordem.nome")}</option>
				<option value="sr">{t("filtro.ordem.sr")}</option>
			</select>
		</div>

		{#if temFiltro}
			<button type="button" class="limpar" onclick={limpar}>{t("filtro.limpar")}</button>
		{/if}
	</section>

	<!--
		`aria-live="polite"` anuncia a contagem a quem usa leitor de tela: sem isso, a
		lista muda sob o cursor e nada informa que a busca surtiu efeito.
	-->
	<p class="contagem" aria-live="polite">
		{tPlural(filtradas.length, "catalogo.resultado", "catalogo.resultados")}
	</p>

	{#if filtradas.length === 0}
		<div class="vazio">
			<p class="vazio-titulo">{t("catalogo.vazio")}</p>
			<p>{t("catalogo.vazio.dica")}</p>
		</div>
	{:else}
		<ul class="grade">
			{#each filtradas.slice(0, visiveis) as especie, indice (especie.id)}
				<li>
					<CartaoEspecie {especie} prioridade={indice < 12} />
				</li>
			{/each}
		</ul>

		{#if visiveis < filtradas.length}
			<div class="mais">
				<button type="button" onclick={() => visiveis += LOTE * 2}>
					Mostrar mais ({(filtradas.length - visiveis).toLocaleString("pt-BR")} restantes)
				</button>
			</div>
		{/if}
	{/if}
</div>

<style>
	.topo {
		margin-bottom: 1.5rem;
	}

	.topo p {
		margin-top: 0.4rem;
		color: var(--texto-suave);
	}

	.controles {
		display: flex;
		flex-wrap: wrap;
		gap: 0.875rem;
		align-items: end;
		padding: 1rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	.campo {
		display: grid;
		gap: 0.3rem;
	}

	/* A busca é o controle principal: ocupa o espaço que sobra. */
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
		padding: 0.5rem 0.7rem;
		background: var(--superficie-realcada);
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio);
		font-size: var(--txt-pequeno);
	}

	input {
		width: 100%;
	}

	input:focus, select:focus {
		border-color: var(--foco);
	}

	.limpar {
		padding: 0.5rem 0.9rem;
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
		margin-block: 1.25rem 0.875rem;
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.grade {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
		gap: 0.875rem;
		list-style: none;
	}

	.vazio {
		padding: 3rem 1.5rem;
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
		margin-top: 1.5rem;
	}

	.mais button {
		padding: 0.7rem 1.4rem;
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
</style>
