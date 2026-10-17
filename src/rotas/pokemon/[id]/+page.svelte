<script lang="ts">
	import { t } from "$i18n"
	import BotaoVoltar from "$ui/BotaoVoltar.svelte"
	import { formatarDeslocamentos, formatarGenero, formatarSentido } from "$pmp/especie"
	import { descreverCondicoes } from "$pmp/evolucao"
	import { nomeDoTamanho } from "$pmp/tamanhos"
	import BlocoDeAtributos from "$ui/BlocoDeAtributos.svelte"
	import EmblemaTipo from "$ui/EmblemaTipo.svelte"
	import ListaDeMoves from "$ui/ListaDeMoves.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const especie = $derived(data.especie)
	const numeroFormatado = $derived(String(especie.numero).padStart(3, "0"))

	/** Ficha de identidade: só as linhas que a espécie realmente tem. */
	const ficha = $derived.by(() => {
		const linhas: { rotulo: string, valor: string }[] = [
			{ rotulo: t("especie.tamanho"), valor: nomeDoTamanho(especie.tamanho) },
		]

		if (especie.alturaM != null) {
			linhas.push({
				rotulo: t("especie.altura"),
				valor: `${especie.alturaM.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}m`,
			})
		}

		linhas.push(
			{ rotulo: t("especie.nivelMinimo"), valor: String(especie.nivelMinimo) },
			{ rotulo: t("especie.genero"), valor: formatarGenero(especie.genero) },
			{
				rotulo: t("especie.estagio"),
				valor: t("especie.estagio.valor", { atual: especie.estagio.atual, total: especie.estagio.total }),
			},
		)

		if (especie.gruposDeOvo.length > 0) {
			linhas.push({ rotulo: t("especie.gruposDeOvo"), valor: especie.gruposDeOvo.join(", ") })
		}

		if (especie.regiao != null && especie.geracao != null) {
			linhas.push({
				rotulo: t("especie.procedencia"),
				valor: t("especie.procedencia.valor", { regiao: especie.regiao, geracao: especie.geracao }),
			})
		}

		return linhas
	})

	const pericias = $derived(
		especie.todasAsPericias
			? t("especie.pericias.todas")
			: especie.pericias.length > 0
				? especie.pericias.join(", ")
				: t("especie.pericias.nenhuma"),
	)
</script>

<svelte:head>
	<title>{especie.nome} — {t("site.nome")}</title>
	<meta name="description" content={especie.descricao} />
</svelte:head>

<article class="pagina">
	<BotaoVoltar href="/pokemon" texto={t("especie.voltar")} />

	<header class="cabecalho tipo-{especie.tipos[0]}">
		<div class="arte">
			{#if especie.imagem != null}
				<img src={especie.imagem} alt={especie.nome} width="200" height="200" />
			{/if}
		</div>

		<div class="identidade">
			<p class="numero cadastro">{t("especie.numero", { n: numeroFormatado })}</p>
			<h1>{especie.nome}</h1>

			<div class="tipos">
				{#each especie.tipos as tipo (tipo)}
					<EmblemaTipo {tipo} tamanho="grande" />
				{/each}
			</div>

			{#if especie.descricao !== ""}
				<p class="descricao">{especie.descricao}</p>
			{/if}
		</div>
	</header>

	<!-- Os quatro números que o Mestre consulta no meio de uma batalha. -->
	<section class="combate" aria-label="{t('especie.sr')}, {t('especie.ca')}, {t('especie.pv')}">
		<div class="destaque">
			<span class="rotulo">{t("especie.sr")}</span>
			<span class="valor numero">{especie.srTexto}</span>
		</div>
		<div class="destaque">
			<span class="rotulo">{t("especie.ca")}</span>
			<span class="valor numero">{especie.ca}</span>
		</div>
		<div class="destaque">
			<span class="rotulo">{t("especie.pv")}</span>
			<span class="valor numero">{especie.pv}</span>
		</div>
		<div class="destaque">
			<span class="rotulo">{t("especie.dadoDeVida")}</span>
			<span class="valor numero">{especie.dadoDeVida}</span>
		</div>
	</section>

	<div class="colunas">
		<div class="coluna">
			<section class="painel">
				<h2>{t("especie.atributos")}</h2>
				<BlocoDeAtributos atributos={especie.atributos} />
			</section>

			<section class="painel">
				<h2>{t("especie.deslocamento")}</h2>
				{#if especie.deslocamentos.length > 0}
					<p>{formatarDeslocamentos(especie.deslocamentos)}</p>
				{/if}

				<!--
					O módulo de origem trunca este campo em 66 espécies. Avisamos em vez de
					adivinhar o modo que falta — e mostramos o texto original, para que quem
					tem o livro possa conferir.
				-->
				{#if especie.deslocamentoIncompleto}
					<p class="ressalva">{t("aviso.deslocamentoIncompleto", { bruto: especie.deslocamentoBruto })}</p>
				{/if}
			</section>

			{#if especie.sentidos.length > 0}
				<section class="painel">
					<h2>{t("especie.sentidos")}</h2>
					<p>{especie.sentidos.map(formatarSentido).join(", ")}</p>
				</section>
			{/if}

			<section class="painel">
				<h2>{t("especie.pericias")}</h2>
				<p>{pericias}</p>
			</section>

			<section class="painel">
				<h2>{t("especie.habilidades")}</h2>
				<!--
					O nome vira link para a ficha da habilidade, no mesmo padrão da
					ListaDeMoves: entrada sem `id` sai como texto, para que a lista do livro
					não encurte por causa de um defeito da fonte. Na v1.33.0 as 2.662
					referências casam, mas a página não supõe isso.
				-->
				<dl class="habilidades">
					{#each data.habilidades as habilidade (habilidade.nome)}
						<dt>
							{#if habilidade.id != null}
								<a href="/habilidades/{habilidade.id}">{habilidade.nome}</a>
							{:else}
								<span class="sem-ficha">{habilidade.nome}</span>
							{/if}
							{#if habilidade.oculta}
								<span class="etiqueta">{t("especie.habilidade.oculta")}</span>
							{/if}
						</dt>
						<!--
							74 habilidades não têm regra no módulo, e todas têm portador: aqui o
							aviso é texto de interface, não a nota de extração que o módulo
							gravou no campo de descrição.
						-->
						<dd class:tenue={habilidade.semRegra}>
							{habilidade.semRegra ? t("especie.habilidade.semRegra") : habilidade.texto}
						</dd>
					{/each}
				</dl>
			</section>

			{#if data.megas.length > 0}
				<section class="painel">
					<h2>{t("especie.megas")}</h2>
					<ul class="lista-larga">
						{#each data.megas as mega (mega.id)}
							<li><a href="/megas/{mega.id}">{mega.nome}</a> <span class="tenue">({mega.pedra})</span></li>
						{/each}
					</ul>
				</section>
			{/if}

			{#if especie.defesasAlteradas != null}
				<section class="painel">
					<h2>{t("especie.defesas")}</h2>
					<dl class="ficha">
						{#each Object.entries(especie.defesasAlteradas) as [ chave, valor ] (chave)}
							<dt>{chave}</dt>
							<dd>{valor}</dd>
						{/each}
					</dl>
				</section>
			{/if}
		</div>

		<div class="coluna">
			<section class="painel">
				<h2>{t("especie.evolucao")}</h2>

				{#if data.anteriores.length > 0}
					<p class="de">
						{t("especie.evoluiDe")}:
						{#each data.anteriores as anterior, indice (anterior.id)}
							<a href="/pokemon/{anterior.id}">{anterior.nome}</a>{indice < data.anteriores.length - 1 ? ", " : ""}
						{/each}
					</p>
				{/if}

				{#if especie.evolucoes.length > 0}
					<ul class="evolucoes">
						{#each especie.evolucoes as evolucao (evolucao.para)}
							<li>
								{#if evolucao.paraId != null}
									<a class="alvo" href="/pokemon/{evolucao.paraId}">{evolucao.para}</a>
								{:else}
									<span class="alvo">{evolucao.para}</span>
								{/if}
								<span class="condicoes">
									{#each descreverCondicoes(evolucao) as condicao (condicao.texto)}
										<!-- A condição que nomeia um item vira link para a ficha dele. -->
										{#if condicao.itemId != null}
											<a class="condicao" href="/itens/{condicao.itemId}">{condicao.texto}</a>
										{:else}
											<span class="condicao">{condicao.texto}</span>
										{/if}
									{/each}
								</span>
							</li>
						{/each}
					</ul>
				{:else if data.anteriores.length === 0}
					<p class="tenue">{t("especie.evolucao.semEvolucao")}</p>
				{/if}

				{#if especie.evolucao !== ""}
					<p class="texto-do-livro">{especie.evolucao}</p>
				{/if}
			</section>

			{#if data.movesPorNivel.length > 0}
				<section class="painel">
					<h2>{t("especie.moves")}</h2>
					<table>
						<thead>
							<tr>
								<th scope="col" class="col-nivel">{t("especie.moves.nivel")}</th>
								<th scope="col">{t("especie.moves.adquiridos")}</th>
							</tr>
						</thead>
						<tbody>
							{#each data.movesPorNivel as linha (linha.nivel)}
								<tr>
									<th scope="row" class="numero col-nivel">{linha.nivel}</th>
									<td><ListaDeMoves moves={linha.moves} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</section>
			{/if}

			{#if data.tms.length > 0}
				<section class="painel">
					<h2>{t("especie.tms")} <span class="quantidade">({data.tms.length})</span></h2>
					<p class="lista-larga"><ListaDeMoves moves={data.tms} /></p>
				</section>
			{/if}

			{#if data.movesDeOvo.length > 0}
				<section class="painel">
					<h2>{t("especie.movesDeOvo")} <span class="quantidade">({data.movesDeOvo.length})</span></h2>
					<p class="lista-larga"><ListaDeMoves moves={data.movesDeOvo} /></p>
				</section>
			{/if}
		</div>
	</div>

	<section class="painel ficha-identidade">
		<dl class="ficha">
			{#each ficha as linha (linha.rotulo)}
				<dt>{linha.rotulo}</dt>
				<dd>{linha.valor}</dd>
			{/each}
		</dl>
	</section>
</article>

<style>


	.cabecalho {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--espaco-8);
		align-items: center;
		padding: var(--espaco-8);
		/* A cor do tipo primário tinge o cabeçalho de leve — identidade sem ruído.
		   `color-mix` mantém a mistura legível nos dois temas, porque parte sempre
		   da superfície vigente. */
		background: color-mix(in oklab, var(--tipo-cor) 10%, var(--superficie));
		border: 1px solid color-mix(in oklab, var(--tipo-cor) 25%, var(--borda));
		border-radius: var(--raio-grande);
	}

	.arte {
		display: grid;
		place-items: center;
		width: 9rem;
		height: 9rem;
		background: var(--superficie);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	.arte img {
		width: 8rem;
		height: 8rem;
		object-fit: contain;
	}

	.identidade {
		min-width: 0;
	}

	.cadastro {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 650;
	}

	h1 {
		margin-block: 0.15rem var(--espaco-4);
		overflow-wrap: break-word;
	}

	.tipos {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-2);
	}

	.descricao {
		max-width: var(--largura-leitura);
		margin-top: var(--espaco-5);
		color: var(--texto-suave);
	}

	.combate {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
		margin-top: var(--espaco-6);
	}

	.destaque {
		display: grid;
		gap: 0.15rem;
		padding: var(--espaco-5) var(--espaco-3);
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio);
		text-align: center;
		box-shadow: var(--sombra-1);
	}

	.destaque .rotulo {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.destaque .valor {
		font-size: var(--txt-ggg);
		font-weight: 650;
		line-height: 1.1;
	}

	.colunas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--espaco-6);
		margin-top: var(--espaco-6);
		align-items: start;
	}

	.coluna {
		display: grid;
		gap: var(--espaco-6);
		/* Sem isso, uma lista longa de TMs estica a coluna e desalinha a outra. */
		min-width: 0;
	}



	.quantidade {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.painel p {
		color: var(--texto-suave);
	}

	.ressalva {
		margin-top: 0.6rem;
		padding: 0.6rem 0.75rem;
		background: var(--superficie-afundada);
		border-left: 3px solid var(--borda-forte);
		border-radius: 0 var(--raio) var(--raio) 0;
		color: var(--texto-tenue) !important;
		font-size: var(--txt-pequeno);
	}

	.tenue {
		color: var(--texto-tenue) !important;
		font-size: var(--txt-pequeno);
	}

	.lista-larga {
		font-size: var(--txt-pequeno);
		line-height: 1.7;
	}

	.habilidades {
		display: grid;
		gap: var(--espaco-5);
		margin: 0;
	}

	.habilidades dt {
		font-weight: 650;
	}

	.habilidades dd {
		margin: 0.15rem 0 0;
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
	}

	/* Mesmo sinal da ListaDeMoves: nome que veio da fonte sem corresponder a uma ficha. */
	.habilidades .sem-ficha {
		color: var(--texto-tenue);
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}

	.etiqueta {
		display: inline-block;
		margin-left: var(--espaco-2);
		padding: 0.1em 0.5em;
		background: var(--marca-suave);
		border-radius: var(--raio-pilula);
		color: var(--marca);
		font-size: var(--txt-miudo);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		vertical-align: 0.1em;
	}

	.ficha {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: var(--espaco-2) var(--espaco-7);
		margin: 0;
		font-size: var(--txt-pequeno);
	}

	.ficha dt {
		color: var(--texto-tenue);
		font-weight: 650;
	}

	.ficha dd {
		margin: 0;
		color: var(--texto-suave);
	}

	.ficha-identidade {
		margin-top: var(--espaco-6);
	}

	.de {
		margin-bottom: 0.75rem;
		font-size: var(--txt-pequeno);
	}

	.evolucoes {
		display: grid;
		gap: 0.6rem;
		list-style: none;
	}

	.evolucoes li {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-2);
		align-items: center;
		padding: 0.6rem 0.75rem;
		background: var(--superficie-afundada);
		border-radius: var(--raio);
	}

	.alvo {
		font-weight: 650;
	}

	.condicoes {
		display: flex;
		flex-wrap: wrap;
		gap: var(--espaco-1);
	}

	.condicao {
		padding: 0.15em 0.55em;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		color: var(--texto-suave);
		font-size: var(--txt-miudo);
	}

	.texto-do-livro {
		margin-top: var(--espaco-5);
		padding-top: var(--espaco-5);
		border-top: 1px solid var(--borda);
		font-size: var(--txt-pequeno);
		font-style: italic;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--txt-pequeno);
	}

	th, td {
		padding: var(--espaco-2) var(--espaco-3);
		text-align: left;
		vertical-align: top;
	}

	thead th {
		border-bottom: 1px solid var(--borda-forte);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	tbody tr:not(:last-child) th, tbody tr:not(:last-child) td {
		border-bottom: 1px solid var(--borda);
	}

	tbody th {
		color: var(--texto);
		font-weight: 650;
	}

	tbody td {
		color: var(--texto-suave);
	}

	.col-nivel {
		width: 4rem;
	}

	@media (width < 54rem) {
		.colunas {
			grid-template-columns: 1fr;
		}
	}

	@media (width < 34rem) {
		.cabecalho {
			grid-template-columns: 1fr;
			justify-items: center;
			text-align: center;
		}

		.tipos {
			justify-content: center;
		}

		.combate {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
