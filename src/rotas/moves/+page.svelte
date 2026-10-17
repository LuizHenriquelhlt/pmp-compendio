<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { chaveDeBuscaDeMove, corresponde } from "$pmp/busca"
	import { MODOS_DE_ATIVACAO, RESOLUCOES, type IdModo, type IdResolucao } from "$pmp/move"
	import { TIPOS, type IdTipo } from "$pmp/tipos"
	import CartaoMove from "$ui/CartaoMove.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	type Ordem = "nome" | "pp" | "alcance"

	let consulta = $state("")
	let tipoEscolhido = $state<IdTipo | "">("")
	let modoEscolhido = $state<IdModo | "">("")
	let resolucaoEscolhida = $state<IdResolucao | "">("")
	let ordem = $state<Ordem>("nome")

	/** Quantos cartões já estão na tela. Cresce sob demanda. */
	const LOTE = 60
	let visiveis = $state(LOTE)

	// Como na listagem de espécies: as chaves de busca são calculadas uma vez por conjunto
	// de dados, não a cada tecla digitada.
	const chaves = $derived.by(() => new Map(data.moves.map((m) => [ m.id, chaveDeBuscaDeMove(m) ])))

	const filtrados = $derived.by(() => {
		const resultado = data.moves.filter((move) => {
			if (tipoEscolhido !== "" && move.tipo !== tipoEscolhido) return false
			if (modoEscolhido !== "" && !move.modos.includes(modoEscolhido)) return false
			if (resolucaoEscolhida !== "" && !move.resolucoes.includes(resolucaoEscolhida)) return false
			return corresponde(chaves.get(move.id) ?? "", consulta)
		})

		const comparar: Record<Ordem, (a: typeof resultado[number], b: typeof resultado[number]) => number> = {
			nome: (a, b) => a.nome.localeCompare(b.nome, "en"),
			// PP decrescente e alcance decrescente: nas duas consultas o que interessa é o
			// teto (o Move que dá para usar mais vezes, o que alcança mais longe).
			pp: (a, b) => (b.pp ?? Infinity) - (a.pp ?? Infinity) || a.nome.localeCompare(b.nome, "en"),
			alcance: (a, b) => b.metros - a.metros || a.nome.localeCompare(b.nome, "en"),
		}

		return [ ...resultado ].sort(comparar[ordem])
	})

	const temFiltro = $derived(
		consulta !== "" || tipoEscolhido !== "" || modoEscolhido !== "" || resolucaoEscolhida !== "",
	)

	// Qualquer mudança de filtro recomeça a contagem de cartões visíveis; sem isso, uma
	// busca feita depois de rolar muito renderizaria centenas de cartões de uma vez.
	$effect(() => {
		void consulta
		void tipoEscolhido
		void modoEscolhido
		void resolucaoEscolhida
		void ordem
		visiveis = LOTE
	})

	function limpar() {
		consulta = ""
		tipoEscolhido = ""
		modoEscolhido = ""
		resolucaoEscolhida = ""
	}
</script>

<svelte:head>
	<title>{t("catalogoMoves.titulo")} — {t("site.nome")}</title>
	<meta name="description" content={t("catalogoMoves.subtitulo", { n: String(data.moves.length) })} />
</svelte:head>

<div class="pagina">
	<header class="topo">
		<h1>{t("catalogoMoves.titulo")}</h1>
		<p>{t("catalogoMoves.subtitulo", { n: data.moves.length.toLocaleString("pt-BR") })}</p>
		<p class="nota">{t("catalogoMoves.nota")}</p>
	</header>

	<section class="controles" aria-label={t("filtro.titulo")}>
		<div class="campo busca">
			<label for="busca">{t("buscaMoves.rotulo")}</label>
			<input
				id="busca"
				type="search"
				bind:value={consulta}
				placeholder={t("buscaMoves.exemplo")}
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
			<label for="ativacao">{t("filtro.ativacao")}</label>
			<select id="ativacao" bind:value={modoEscolhido}>
				<option value="">{t("filtro.ativacao.todas")}</option>
				{#each MODOS_DE_ATIVACAO as modo (modo.id)}
					<option value={modo.id}>{modo.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="resolucao">{t("filtro.resolucao")}</label>
			<select id="resolucao" bind:value={resolucaoEscolhida}>
				<option value="">{t("filtro.resolucao.todas")}</option>
				{#each RESOLUCOES as resolucao (resolucao.id)}
					<option value={resolucao.id}>{resolucao.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="ordem">{t("filtro.ordem")}</label>
			<select id="ordem" bind:value={ordem}>
				<option value="nome">{t("filtro.ordem.nome")}</option>
				<option value="alcance">{t("filtro.ordem.alcance")}</option>
				<option value="pp">{t("filtro.ordem.pp")}</option>
			</select>
		</div>

		{#if temFiltro}
			<button type="button" class="limpar" onclick={limpar}>{t("filtro.limpar")}</button>
		{/if}
	</section>

	<p class="contagem" aria-live="polite">
		{tPlural(filtrados.length, "catalogoMoves.resultado", "catalogoMoves.resultados")}
	</p>

	{#if filtrados.length === 0}
		<div class="vazio">
			<p class="vazio-titulo">{t("catalogoMoves.vazio")}</p>
			<p>{t("catalogoMoves.vazio.dica")}</p>
		</div>
	{:else}
		<ul class="grade">
			{#each filtrados.slice(0, visiveis) as move (move.id)}
				<li><CartaoMove {move} /></li>
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
		padding: var(--espaco-3) var(--espaco-4);
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

	.grade {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 19rem), 1fr));
		gap: var(--espaco-5);
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
