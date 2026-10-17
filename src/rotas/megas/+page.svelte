<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { ATRIBUTOS, type IdAtributo } from "$pmp/atributos"
	import { chaveDeBuscaDeMega, corresponde } from "$pmp/busca"
	import type { CategoriaDeMega } from "$pmp/mega"
	import { TAMANHOS, type IdTamanho } from "$pmp/tamanhos"
	import { TIPOS, type IdTipo } from "$pmp/tipos"
	import CartaoMega from "$ui/CartaoMega.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	type Ordem = "numero" | "nome" | "atributos" | "ca"
	/** `troca` é opção de tipo porque 19 formas trocam, e cada tipo sozinho traz uma ou duas. */
	type EscolhaDeTipo = "" | IdTipo | "troca"

	let consulta = $state("")
	let tipoEscolhido = $state<EscolhaDeTipo>("")
	let atributoEscolhido = $state<IdAtributo | "">("")
	let tamanhoEscolhido = $state<IdTamanho | "">("")
	let categoria = $state<CategoriaDeMega | "">("")
	let ordem = $state<Ordem>("numero")

	/** Quantos cartões já estão na tela. Cresce sob demanda. */
	const LOTE = 60
	let visiveis = $state(LOTE)

	// Como nas outras listagens: as chaves de busca são calculadas uma vez por conjunto de
	// dados, não a cada tecla digitada.
	const chaves = $derived.by(() =>
		new Map(data.megas.map((m) => [ m.id, chaveDeBuscaDeMega(m) ])))

	/**
	 * Só os tipos que alguma forma passa a ter.
	 *
	 * Montados a partir dos dados e não dos 18 do sistema, como as imunidades na listagem
	 * de Habilidades: apenas 19 das 93 trocam de tipo, e oferecer os 18 seria oferecer
	 * filtros que não devolvem nada.
	 */
	const tiposPresentes = $derived.by(() => {
		const presentes = new Set(data.megas.flatMap((m) => m.tipos))
		return TIPOS.filter((tipo) => presentes.has(tipo.id))
	})

	/** Mesma regra: `con` não aparece em nenhuma das 93 pedras. */
	const atributosPresentes = $derived.by(() => {
		const presentes = new Set(data.megas.flatMap((m) => m.atributosAumentados))
		return ATRIBUTOS.filter((atributo) => presentes.has(atributo.id))
	})

	/** Mesma regra: a escala tem seis degraus e as formas assumem quatro. */
	const tamanhosPresentes = $derived.by(() => {
		const presentes = new Set(data.megas.map((m) => m.tamanho))
		return TAMANHOS.filter((tamanho) => presentes.has(tamanho.id))
	})

	const filtradas = $derived.by(() => {
		const resultado = data.megas.filter((mega) => {
			if (categoria !== "" && mega.categoria !== categoria) return false
			if (tipoEscolhido === "troca" && !mega.trocaDeTipo) return false
			if (tipoEscolhido !== "" && tipoEscolhido !== "troca"
				&& !mega.tipos.includes(tipoEscolhido)) return false
			if (atributoEscolhido !== "" && !mega.atributosAumentados.includes(atributoEscolhido)) return false
			if (tamanhoEscolhido !== "" && mega.tamanho !== tamanhoEscolhido) return false

			return corresponde(chaves.get(mega.id) ?? "", consulta)
		})

		const porNome = (a: { nome: string }, b: { nome: string }) => a.nome.localeCompare(b.nome, "pt-BR")

		const comparar: Record<Ordem, (a: typeof resultado[number], b: typeof resultado[number]) => number> = {
			// As três sem espécie-base resolvida têm número 0 e vão para o fim, não para o
			// começo: são as de dado incompleto, e abrir a lista com elas as apresentaria
			// como as principais.
			numero: (a, b) =>
				(a.numero || Number.MAX_SAFE_INTEGER) - (b.numero || Number.MAX_SAFE_INTEGER) || porNome(a, b),
			nome: porNome,
			// Decrescente: quem ordena por isso quer ver as formas que mais ganham.
			atributos: (a, b) => b.totalDeAtributos - a.totalDeAtributos || porNome(a, b),
			ca: (a, b) => (b.deltaCA ?? 0) - (a.deltaCA ?? 0) || porNome(a, b),
		}

		return [ ...resultado ].sort(comparar[ordem])
	})

	const temFiltro = $derived(
		consulta !== "" || tipoEscolhido !== "" || atributoEscolhido !== ""
		|| tamanhoEscolhido !== "" || categoria !== "",
	)

	// Qualquer mudança de filtro recomeça a contagem de cartões visíveis.
	$effect(() => {
		void consulta
		void tipoEscolhido
		void atributoEscolhido
		void tamanhoEscolhido
		void categoria
		void ordem
		visiveis = LOTE
	})

	function limpar() {
		consulta = ""
		tipoEscolhido = ""
		atributoEscolhido = ""
		tamanhoEscolhido = ""
		categoria = ""
	}
</script>

<svelte:head>
	<title>{t("catalogoMegas.titulo")} — {t("site.nome")}</title>
	<meta
		name="description"
		content={t("catalogoMegas.subtitulo", { n: String(data.megas.length) })}
	/>
</svelte:head>

<div class="pagina">
	<header class="topo">
		<h1>{t("catalogoMegas.titulo")}</h1>
		<p>{t("catalogoMegas.subtitulo", { n: data.megas.length.toLocaleString("pt-BR") })}</p>
		<!--
			A ressalva fica no subtítulo, não escondida numa ficha: nenhuma das 93 formas
			Mega existe como espécie na Pokédex do módulo, e quem chega aqui procurando
			"Mega Charizard X" na listagem de Pokémon precisa saber por que não achou.
		-->
		<p class="nota">{t("catalogoMegas.nota")}</p>
	</header>

	<section class="controles" aria-label={t("filtro.titulo")}>
		<div class="campo busca">
			<label for="busca">{t("buscaMegas.rotulo")}</label>
			<input
				id="busca"
				type="search"
				bind:value={consulta}
				placeholder={t("buscaMegas.exemplo")}
				autocomplete="off"
			/>
		</div>

		<div class="campo">
			<label for="tipo">{t("filtro.tipoDaMega")}</label>
			<select id="tipo" bind:value={tipoEscolhido}>
				<option value="">{t("filtro.tipoDaMega.todos")}</option>
				<option value="troca">{t("filtro.tipoDaMega.troca")}</option>
				{#each tiposPresentes as tipo (tipo.id)}
					<option value={tipo.id}>{tipo.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="atributo">{t("filtro.atributoDaMega")}</label>
			<select id="atributo" bind:value={atributoEscolhido}>
				<option value="">{t("filtro.atributoDaMega.todos")}</option>
				{#each atributosPresentes as atributo (atributo.id)}
					<option value={atributo.id}>{atributo.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="tamanho">{t("filtro.tamanhoDaMega")}</label>
			<select id="tamanho" bind:value={tamanhoEscolhido}>
				<option value="">{t("filtro.tamanhoDaMega.todos")}</option>
				{#each tamanhosPresentes as tamanho (tamanho.id)}
					<option value={tamanho.id}>{tamanho.nome}</option>
				{/each}
			</select>
		</div>

		<div class="campo">
			<label for="categoria">{t("filtro.categoriaDeMega")}</label>
			<select id="categoria" bind:value={categoria}>
				<option value="">{t("filtro.categoriaDeMega.todas")}</option>
				<option value="mega">{t("filtro.categoriaDeMega.mega")}</option>
				<option value="especial">{t("filtro.categoriaDeMega.especial")}</option>
			</select>
		</div>

		<div class="campo">
			<label for="ordem">{t("filtro.ordem")}</label>
			<select id="ordem" bind:value={ordem}>
				<option value="numero">{t("filtro.ordem.numeroDaBase")}</option>
				<option value="nome">{t("filtro.ordem.nome")}</option>
				<option value="atributos">{t("filtro.ordem.atributos")}</option>
				<option value="ca">{t("mega.ca")}</option>
			</select>
		</div>

		{#if temFiltro}
			<button type="button" class="limpar" onclick={limpar}>{t("filtro.limpar")}</button>
		{/if}
	</section>

	<p class="contagem" aria-live="polite">
		{tPlural(filtradas.length, "catalogoMegas.resultado", "catalogoMegas.resultados")}
	</p>

	{#if filtradas.length === 0}
		<div class="vazio">
			<p class="vazio-titulo">{t("catalogoMegas.vazio")}</p>
			<p>{t("catalogoMegas.vazio.dica")}</p>
		</div>
	{:else}
		<ul class="grade">
			{#each filtradas.slice(0, visiveis) as mega (mega.id)}
				<li><CartaoMega {mega} /></li>
			{/each}
		</ul>

		{#if visiveis < filtradas.length}
			<div class="mais">
				<button type="button" onclick={() => visiveis += LOTE * 2}>
					{t("lista.mostrarMais")}
					<span class="restantes">
						({t("lista.mostrarMais.restantes", { n: (filtradas.length - visiveis).toLocaleString("pt-BR") })})
					</span>
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
		max-width: var(--largura-leitura);
	}

	.topo .nota {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
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
		min-width: 0;
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
		/* Sem isto um `select` com rótulo longo estica a barra e faz a PÁGINA rolar na
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

	.restantes {
		color: var(--texto-tenue);
		font-weight: 600;
	}
</style>
