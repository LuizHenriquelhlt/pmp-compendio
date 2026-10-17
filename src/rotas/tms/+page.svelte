<script lang="ts">
	import { t } from "$i18n"
	import { corresponde, normalizarParaBusca } from "$pmp/busca"
	import { nomeDoTipo } from "$pmp/tipos"
	import EmblemaTipo from "$ui/EmblemaTipo.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	let consulta = $state("")
	let tipo = $state("")

	// Como nas outras listagens, as chaves são calculadas uma vez por conjunto de dados e
	// não a cada tecla. O NÚMERO entra na chave: procurar "114" é tão natural aqui quanto
	// procurar "Grass Knot", e é a pergunta que só esta página responde.
	const chaves = $derived.by(() => new Map(data.tms.map((tm) =>
		[ tm.numero, [ tm.nome, `tm${tm.numero}`, String(tm.numero), tm.tipo ?? "" ].map(normalizarParaBusca).join(" ") ])))

	const tipos = $derived([ ...new Set(data.tms.map((tm) => tm.tipo).filter((x) => x != null)) ].sort())

	const filtrados = $derived(data.tms.filter((tm) => {
		if (tipo !== "" && tm.tipo !== tipo) return false
		return corresponde(chaves.get(tm.numero) ?? "", consulta)
	}))
</script>

<svelte:head>
	<title>{t("catalogoTms.titulo")} - {t("site.nome")}</title>
	<meta name="description" content={t("catalogoTms.descricao")} />
</svelte:head>

<div class="pagina">
	<header class="abertura">
		<h1>{t("catalogoTms.titulo")}</h1>
		<p class="chamada">{t("catalogoTms.descricao")}</p>
	</header>

	<div class="filtros">
		<label class="busca">
			<span class="rotulo">{t("buscaTms.rotulo")}</span>
			<input type="search" bind:value={consulta} placeholder={t("buscaTms.exemplo")} />
		</label>

		<label>
			<span class="rotulo">{t("filtro.tipo")}</span>
			<select bind:value={tipo}>
				<option value="">{t("filtro.tipo.todos")}</option>
				{#each tipos as id (id)}
					<option value={id}>{nomeDoTipo(id)}</option>
				{/each}
			</select>
		</label>
	</div>

	<p class="contagem" aria-live="polite">{t("catalogoTms.contagem", { n: filtrados.length, total: data.tms.length })}</p>

	{#if filtrados.length === 0}
		<p class="vazio">
			{t("catalogoTms.vazio")}
			<span class="dica">{t("catalogoTms.vazio.dica")}</span>
		</p>
	{:else}
		<!--
			Tabela, e não cartões: um TM tem quatro campos curtos e a comparação entre
			linhas é o que importa - "qual disco ensina um Move de Fogo com alcance?".
			Cartões espalhariam 321 discos por metros de rolagem.
		-->
		<div class="rolagem">
			<table class="tabela">
				<thead>
					<tr>
						<th scope="col" class="col-numero">{t("tm.disco")}</th>
						<th scope="col">{t("tm.move")}</th>
						<th scope="col">{t("tm.tipo")}</th>
						<th scope="col" class="col-numero">{t("tm.pp")}</th>
						<th scope="col">{t("tm.alcance")}</th>
					</tr>
				</thead>
				<tbody>
					{#each filtrados as tm (tm.numero)}
						<tr>
							<td class="numero disco">TM{tm.numero}</td>
							<td>
								{#if tm.id != null}
									<a href="/moves/{tm.id}">{tm.nome}</a>
								{:else}
									<!-- Nome que o disco traz mas que não casa com ficha nenhuma: o
									     conserto é na fonte, e `relatorio.json` tem a lista. -->
									<span class="sem-ficha" title={tm.nome}>{tm.nome}</span>
								{/if}
							</td>
							<td>{#if tm.tipo != null}<EmblemaTipo tipo={tm.tipo} tamanho="pequeno" />{/if}</td>
							<td class="numero">{tm.pp ?? "-"}</td>
							<td>{tm.alcance ?? "-"}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.abertura {
		padding-block: 2rem 1.25rem;
	}

	.chamada {
		max-width: var(--largura-leitura);
		margin-top: 0.5rem;
		color: var(--texto-suave);
	}

	.filtros {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		align-items: end;
		margin-bottom: 1rem;
	}

	.busca {
		flex: 1 1 18rem;
	}

	.filtros label {
		display: grid;
		gap: 0.3rem;
	}

	.rotulo {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
	}

	.contagem {
		margin-bottom: 0.75rem;
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	.vazio {
		display: grid;
		gap: 0.3rem;
		padding: 2rem 0;
		color: var(--texto-suave);
	}

	.dica {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	/* A tabela rola sozinha em telas estreitas, sem levar a página junto. */
	.rolagem {
		overflow-x: auto;
		margin-bottom: 2rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
	}

	.tabela {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--txt-pequeno);
	}

	.tabela th,
	.tabela td {
		padding: 0.5rem 0.9rem;
		text-align: left;
		white-space: nowrap;
	}

	.tabela thead th {
		position: sticky;
		top: 0;
		z-index: 1;
		background: var(--superficie-afundada);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	.tabela tbody tr + tr {
		border-top: 1px solid var(--borda);
	}

	.tabela tbody tr:hover {
		background: var(--superficie-realcada);
	}

	.col-numero {
		text-align: right;
	}

	.tabela td.numero {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	.disco {
		color: var(--texto-tenue);
		font-weight: 700;
	}

	.sem-ficha {
		color: var(--texto-tenue);
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}
</style>
