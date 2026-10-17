<script lang="ts">
	import { t, tPlural } from "$i18n"
	import { chaveDeBuscaDeHabilidade, corresponde } from "$pmp/busca"
	import { CLIMAS, type IdClima } from "$pmp/habilidade"
	import { STATUS, type IdStatus } from "$pmp/move"
	import { TIPOS, type IdTipo } from "$pmp/tipos"
	import CartaoHabilidade from "$ui/CartaoHabilidade.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	type Ordem = "nome" | "portadores"
	type Regra = "" | "com" | "sem"
	/** `suprime` é opção de clima porque Air Lock e Cloud Nine não nomeiam nenhum. */
	type EscolhaDeClima = "" | IdClima | "suprime"

	let consulta = $state("")
	let imunidadeEscolhida = $state<IdStatus | IdTipo | "">("")
	let climaEscolhido = $state<EscolhaDeClima>("")
	let regra = $state<Regra>("")
	let ordem = $state<Ordem>("nome")

	/** Quantos cartões já estão na tela. Cresce sob demanda. */
	const LOTE = 60
	let visiveis = $state(LOTE)

	// Como nas outras listagens: as chaves de busca são calculadas uma vez por conjunto de
	// dados, não a cada tecla digitada.
	const chaves = $derived.by(() =>
		new Map(data.habilidades.map((h) => [ h.id, chaveDeBuscaDeHabilidade(h) ])))

	/**
	 * As imunidades que o catálogo realmente tem, agrupadas.
	 *
	 * Montadas a partir dos dados e não do vocabulário inteiro: das quinze condições de
	 * status do PMP só sete aparecem como imunidade de habilidade, e oferecer as outras
	 * oito seria oferecer oito filtros que não devolvem nada.
	 */
	const imunidades = $derived.by(() => {
		const status = new Set(data.habilidades.flatMap((h) => h.imunidadesDeStatus))
		const tipos = new Set(data.habilidades.flatMap((h) => h.imunidadesDeTipo))

		return {
			status: STATUS.filter((s) => status.has(s.id)),
			tipos: TIPOS.filter((tipo) => tipos.has(tipo.id)),
		}
	})

	const climasPresentes = $derived.by(() => {
		const presentes = new Set(data.habilidades.flatMap((h) => h.climas))
		return CLIMAS.filter((c) => presentes.has(c.id))
	})

	const filtradas = $derived.by(() => {
		const resultado = data.habilidades.filter((habilidade) => {
			if (regra === "com" && habilidade.semRegra) return false
			if (regra === "sem" && !habilidade.semRegra) return false

			if (imunidadeEscolhida !== ""
				&& !habilidade.imunidadesDeStatus.includes(imunidadeEscolhida as IdStatus)
				&& !habilidade.imunidadesDeTipo.includes(imunidadeEscolhida as IdTipo)) return false

			if (climaEscolhido === "suprime" && !habilidade.suprimeClima) return false
			if (climaEscolhido !== "" && climaEscolhido !== "suprime"
				&& !habilidade.climas.includes(climaEscolhido)) return false

			return corresponde(chaves.get(habilidade.id) ?? "", consulta)
		})

		const comparar: Record<Ordem, (a: typeof resultado[number], b: typeof resultado[number]) => number> = {
			nome: (a, b) => a.nome.localeCompare(b.nome, "en"),
			// Portadores em ordem decrescente: quem ordena por isso quer saber quais
			// habilidades aparecem mais na Pokédex, não quais aparecem menos.
			portadores: (a, b) => b.portadores - a.portadores || a.nome.localeCompare(b.nome, "en"),
		}

		return [ ...resultado ].sort(comparar[ordem])
	})

	const semRegra = $derived(data.habilidades.filter((h) => h.semRegra).length)

	const temFiltro = $derived(
		consulta !== "" || imunidadeEscolhida !== "" || climaEscolhido !== "" || regra !== "",
	)

	// Qualquer mudança de filtro recomeça a contagem de cartões visíveis.
	$effect(() => {
		void consulta
		void imunidadeEscolhida
		void climaEscolhido
		void regra
		void ordem
		visiveis = LOTE
	})

	function limpar() {
		consulta = ""
		imunidadeEscolhida = ""
		climaEscolhido = ""
		regra = ""
	}
</script>

<svelte:head>
	<title>{t("catalogoHabilidades.titulo")} - {t("site.nome")}</title>
	<meta
		name="description"
		content={t("catalogoHabilidades.subtitulo", { n: String(data.habilidades.length) })}
	/>
</svelte:head>

<div class="pagina">
	<header class="topo">
		<h1>{t("catalogoHabilidades.titulo")}</h1>
		<p>{t("catalogoHabilidades.subtitulo", { n: data.habilidades.length.toLocaleString("pt-BR") })}</p>
		<!--
			A contagem de habilidades sem regra fica no subtítulo, não escondida num filtro:
			quando existe, quem consulta merece saber antes de procurar uma regra que o
			módulo não tem. Some quando não há nenhuma - a v1.35.0 do módulo zerou as 74, e
			"0 não têm a regra" é uma frase que só confunde.
		-->
		{#if semRegra > 0}
			<p class="nota">{t("catalogoHabilidades.nota", { n: semRegra.toLocaleString("pt-BR") })}</p>
		{/if}
	</header>

	<section class="controles" aria-label={t("filtro.titulo")}>
		<div class="campo busca">
			<label for="busca">{t("buscaHabilidades.rotulo")}</label>
			<input
				id="busca"
				type="search"
				bind:value={consulta}
				placeholder={t("buscaHabilidades.exemplo")}
				autocomplete="off"
			/>
		</div>

		<div class="campo">
			<label for="imunidade">{t("filtro.imunidade")}</label>
			<!--
				Agrupados porque são duas mecânicas diferentes com os mesmos rótulos curtos:
				numa lista corrida, "Água" logo depois de "Atordoado" parece mais uma
				condição de status.
			-->
			<select id="imunidade" bind:value={imunidadeEscolhida}>
				<option value="">{t("filtro.imunidade.todas")}</option>
				<optgroup label={t("filtro.imunidade.condicoes")}>
					{#each imunidades.status as status (status.id)}
						<option value={status.id}>{status.nome}</option>
					{/each}
				</optgroup>
				<optgroup label={t("filtro.imunidade.tipos")}>
					{#each imunidades.tipos as tipo (tipo.id)}
						<option value={tipo.id}>{tipo.nome}</option>
					{/each}
				</optgroup>
			</select>
		</div>

		<div class="campo">
			<label for="clima">{t("filtro.clima")}</label>
			<select id="clima" bind:value={climaEscolhido}>
				<option value="">{t("filtro.clima.todos")}</option>
				{#each climasPresentes as clima (clima.id)}
					<option value={clima.id}>{clima.nome}</option>
				{/each}
				<option value="suprime">{t("filtro.clima.suprime")}</option>
			</select>
		</div>

		<!--
			O filtro só existe quando há o que filtrar, como as outras listagens fazem com
			tipo e atributo: sem nenhuma habilidade sem regra, as três opções devolveriam
			sempre o mesmo conjunto.
		-->
		{#if semRegra > 0}
			<div class="campo">
				<label for="regra">{t("filtro.regra")}</label>
				<select id="regra" bind:value={regra}>
					<option value="">{t("filtro.regra.todas")}</option>
					<option value="com">{t("filtro.regra.com")}</option>
					<option value="sem">{t("filtro.regra.sem")}</option>
				</select>
			</div>
		{/if}

		<div class="campo">
			<label for="ordem">{t("filtro.ordem")}</label>
			<select id="ordem" bind:value={ordem}>
				<option value="nome">{t("filtro.ordem.nome")}</option>
				<option value="portadores">{t("filtro.ordem.portadores")}</option>
			</select>
		</div>

		{#if temFiltro}
			<button type="button" class="limpar" onclick={limpar}>{t("filtro.limpar")}</button>
		{/if}
	</section>

	<p class="contagem" aria-live="polite">
		{tPlural(filtradas.length, "catalogoHabilidades.resultado", "catalogoHabilidades.resultados")}
	</p>

	{#if filtradas.length === 0}
		<div class="vazio">
			<p class="vazio-titulo">{t("catalogoHabilidades.vazio")}</p>
			<p>{t("catalogoHabilidades.vazio.dica")}</p>
		</div>
	{:else}
		<ul class="grade">
			{#each filtradas.slice(0, visiveis) as habilidade (habilidade.id)}
				<li><CartaoHabilidade {habilidade} portadores={habilidade.portadores} /></li>
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
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 17rem), 1fr));
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
