<script lang="ts">
	import { t } from "$i18n"
	import { formatarDeslocamentos } from "$pmp/especie"
	import {
		descreverDeslocamentoDeMega, descreverEscolhaDeAtributo, formatarDelta, linhasDeAtributo,
	} from "$pmp/mega"
	import { nomeDoTamanho } from "$pmp/tamanhos"
	import EmblemaTipo from "$ui/EmblemaTipo.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const mega = $derived(data.mega)
	const base = $derived(data.base)

	const atributos = $derived(linhasDeAtributo(mega, base?.atributos ?? null))
	const deslocamento = $derived(descreverDeslocamentoDeMega(mega))

	/**
	 * A CA entra no painel só quando MUDA.
	 *
	 * Onze pedras gravam `armorClassDelta: 0`, e "17 → 17 (+0)" sob o título "o que muda"
	 * é ruído. A distinção entre 0 e ausente continua valendo nos dados — 0 é "o módulo
	 * disse que não muda" e `null` é "o módulo não gravou" —, mas na tela as duas dão no
	 * mesmo: nada a mostrar.
	 */
	const mudaCA = $derived(mega.deltaCA != null && mega.deltaCA !== 0)

	/** A CA resultante, quando há espécie-base para somar. */
	const ca = $derived(
		!mudaCA || base == null
			? null
			: { antes: base.ca, depois: base.ca + (mega.deltaCA ?? 0) },
	)

	const paragrafos = (texto: string) => texto.split("\n").filter((p) => p !== "")
</script>

<svelte:head>
	<title>{mega.nome} — {t("site.nome")}</title>
	<meta
		name="description"
		content={paragrafos(mega.descricao)[0]
			?? t("catalogoMegas.subtitulo", { n: String(93) })}
	/>
</svelte:head>

<article class="pagina">
	<a class="voltar" href="/megas">← {t("mega.voltar")}</a>

	<header class="cabecalho {mega.tipos.length > 0 ? `tipo-${mega.tipos[0]}` : 'sem-tipo'}">
		{#if mega.imagem != null}
			<img src={mega.imagem} alt="" width="120" height="120" />
		{/if}

		<div class="identidade">
			<p class="pedra">{t("mega.pedra")}: <strong>{mega.pedra}</strong></p>
			<h1>{mega.nome}</h1>

			<div class="emblemas">
				{#each mega.tipos as tipo (tipo)}
					<EmblemaTipo {tipo} tamanho="normal" />
				{/each}

				{#if mega.categoria === "especial"}
					<!--
						As três que não seguem a regra comum da Mega Pedra: duas Reversões Primal
						e Mega Rayquaza, que não precisa de pedra. O rótulo é neutro de propósito
						— chamar as três de "Primal" erraria em uma, e a regra de cada uma está
						no painel de outras regras.
					-->
					<span class="etiqueta aviso">{t("mega.especial")}</span>
				{:else if mega.categoria === "desconhecida"}
					<span class="etiqueta aviso">{t("mega.categoriaDesconhecida")}</span>
				{/if}
			</div>
		</div>
	</header>

	<div class="colunas">
		<div class="coluna">
			<section class="painel">
				<h2>{t("mega.muda")}</h2>

				<dl class="mudancas">
					{#if mega.tipos.length > 0}
						<div>
							<dt>{t("mega.tipo")}</dt>
							<dd class="linha-tipos">
								{#if base != null}
									<span class="antes">
										{#each base.tipos as tipo (tipo)}
											<EmblemaTipo {tipo} tamanho="pequeno" />
										{/each}
									</span>
									<span class="seta" aria-hidden="true">→</span>
								{/if}
								<span>
									{#each mega.tipos as tipo (tipo)}
										<EmblemaTipo {tipo} tamanho="pequeno" />
									{/each}
								</span>
							</dd>
							<!--
								Um tipo só, vindo de dois, é MONOTIPO e não dado faltando: Mega Aggron
								vem de Aço/Pedra e fica Aço puro. A nota existe porque a tabela sem ela
								parece ter perdido o segundo emblema.
							-->
							{#if mega.tipos.length === 1 && (base?.tipos.length ?? 0) > 1}
								<dd class="tenue">{t("mega.tipo.monotipo")}</dd>
							{/if}
						</div>
					{/if}

					{#if mega.tamanho != null}
						<div>
							<dt>{t("mega.tamanho")}</dt>
							<dd>
								{#if base != null}
									<span class="antes">{nomeDoTamanho(base.tamanho)}</span>
									<span class="seta" aria-hidden="true">→</span>
								{/if}
								<strong>{nomeDoTamanho(mega.tamanho)}</strong>
							</dd>
						</div>
					{/if}

					{#if mudaCA && mega.deltaCA != null}
						<div>
							<dt>{t("mega.ca")}</dt>
							<dd class="numero">
								{#if ca != null}
									<span class="antes">{ca.antes}</span>
									<span class="seta" aria-hidden="true">→</span>
									<strong>{ca.depois}</strong>
									<span class="delta">({formatarDelta(mega.deltaCA)})</span>
								{:else}
									<strong>{formatarDelta(mega.deltaCA)}</strong>
								{/if}
							</dd>
						</div>
					{/if}
				</dl>

				{#if mega.tipos.length === 0 && mega.tamanho == null && !mudaCA}
					<p class="tenue">{t("mega.semMudanca")}</p>
				{/if}
			</section>

			{#if atributos.length > 0}
				<section class="painel">
					<h2>{t("mega.atributos")}</h2>

					<table>
						<thead>
							<tr>
								<!-- O cabeçalho da coluna existe para o leitor de tela; na tela ele
								     repetiria o título do painel. -->
								<th scope="col"><span class="so-leitor">{t("mega.atributo")}</span></th>
								{#if base != null}<th scope="col" class="num">{base.nome}</th>{/if}
								<th scope="col" class="num">{mega.nome}</th>
							</tr>
						</thead>
						<tbody>
							{#each atributos as linha (linha.id)}
								<tr>
									<th scope="row">
										{linha.abrev}
										{#if linha.naEscolha}<span class="marca-escolha" aria-hidden="true">*</span>{/if}
									</th>
									{#if base != null}<td class="num antes">{linha.antes}</td>{/if}
									<td class="num">
										{#if linha.depois != null}
											<strong>{linha.depois}</strong>
										{/if}
										<span class="delta">{formatarDelta(linha.delta)}</span>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>

					{#if mega.escolhasDeAtributo.length > 0}
						<!--
							`mega.abilityChoices` no módulo NÃO é escolha de Habilidade: o conteúdo é
							`{ options: ["str","dex"], delta: 5 }`, o ability score do dnd5e — ou seja,
							atributo. O próprio módulo escreve "à escolha do jogador".
						-->
						<div class="escolhas">
							<p class="rotulo-escolha">
								<span class="marca-escolha" aria-hidden="true">*</span>
								{t("mega.escolha")}
							</p>
							<ul>
								{#each mega.escolhasDeAtributo as escolha, indice (indice)}
									<li class="numero">{descreverEscolhaDeAtributo(escolha)}</li>
								{/each}
							</ul>
							<p class="tenue">{t("mega.escolha.nota")}</p>
						</div>
					{/if}
				</section>
			{/if}

			{#if deslocamento.length > 0}
				<section class="painel">
					<h2>{t("mega.deslocamento")}</h2>

					{#if base != null && base.deslocamentos.length > 0}
						<p class="antes">{formatarDeslocamentos(base.deslocamentos)}</p>
					{/if}

					<ul class="fatos">
						{#each deslocamento as frase (frase)}
							<li>{frase}</li>
						{/each}
					</ul>
				</section>
			{/if}

			<section class="painel">
				<h2>{t("mega.descricao")}</h2>

				<!--
					Quatro das 93 descrições carregam texto de outro documento do livro — a de
					Mega Delphox traz um bloco de estatísticas de espécie inteiro. Publicá-las
					atribuiria a esta forma regras que não são dela, e o leitor não teria como
					saber onde a descrição acaba. A página diz o que aconteceu, com texto de
					interface, e o original fica no relatório de qualidade dos dados.
				-->
				{#if mega.descricaoContaminada}
					<p class="ressalva">{t("mega.descricaoContaminada")}</p>
				{:else if mega.descricao === ""}
					<p class="tenue">{t("mega.semDescricao")}</p>
				{:else}
					{#each paragrafos(mega.descricao) as paragrafo (paragrafo)}
						<p>{paragrafo}</p>
					{/each}
				{/if}
			</section>
		</div>

		<div class="coluna">
			<section class="painel">
				<h2>{t("mega.especie")}</h2>

				{#if base != null}
					<a class="especie" href="/pokemon/{base.id}">
						{#if base.imagem != null}
							<img src={base.imagem} alt="" width="48" height="48" loading="lazy" />
						{/if}
						<span>
							<span class="especie-nome">{base.nome}</span>
							<span class="tenue">nº {String(base.numero).padStart(3, "0")}</span>
						</span>
					</a>
				{:else}
					<!--
						Três pedras nomeiam a espécie-base de um jeito que a Pokédex não publica:
						"Eternal Flower Floette", "Meowstic" (a Pokédex tem Macho e Fêmea) e
						"Tatsugiri" (tem as três formas). O nome continua visível, sem link —
						escolher uma das formas por semelhança seria adivinhar.
					-->
					<p class="sem-ficha">{mega.especie}</p>
					<p class="tenue">{t("mega.especie.semFicha")}</p>
				{/if}
			</section>

			<section class="painel">
				<h2>{mega.habilidades.length > 1 ? t("mega.habilidades") : t("mega.habilidade")}</h2>

				{#if mega.habilidades.length > 0}
					<ul class="habilidades">
						{#each mega.habilidades as habilidade (habilidade.nome)}
							<li>
								{#if habilidade.id != null}
									<a href="/habilidades/{habilidade.id}">{habilidade.nome}</a>
								{:else}
									<!--
										O módulo nomeia 8 habilidades que não existem no pack (Piercing
										Drill, Eelevate, Desolate Land…) e grava uma truncada ("Snow
										Warning (torna-se Snow"). O nome fica, sem link: a pedra declara
										a habilidade, e calar a declaração encurtaria o que o livro diz.
									-->
									<span class="sem-ficha">{habilidade.nome}</span>
									<p class="tenue">{t("mega.habilidade.semFicha")}</p>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}

				{#if mega.habilidadePendente}
					<!--
						Dez pedras gravam `"[ainda a ser lançada]"` no lugar do nome, e Mega
						Hawlucha grava isso numa SEGUNDA habilidade, além do No Guard que ela já
						tem. Publicar a string como nome criaria uma ficha chamada "[ainda a ser
						lançada]".
					-->
					<p class="ressalva">{t("mega.habilidadePendente.nota")}</p>
				{/if}

				{#if mega.habilidades.length === 0 && !mega.habilidadePendente}
					<p class="tenue">{t("mega.habilidade.nenhuma")}</p>
				{/if}
			</section>

			{#if mega.outrosTextos.length > 0}
				<section class="painel">
					<h2>{t("mega.outrosEfeitos")}</h2>
					<!--
						A prosa de `otherEffects` que nenhuma família do parser leu: as regras de
						ativação das três especiais (nível mínimo, usos por descanso, condição de
						obediência) e a frase que o parser não estruturou. Exibidas como estão,
						continuam sendo a regra inteira.
					-->
					<ul class="fatos">
						{#each mega.outrosTextos as texto (texto)}
							<li>{texto}</li>
						{/each}
					</ul>
				</section>
			{/if}
		</div>
	</div>
</article>

<style>
	.voltar {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
		text-decoration: none;
	}

	.voltar:hover {
		color: var(--marca);
	}

	.cabecalho {
		display: flex;
		flex-wrap: wrap;
		gap: 1.25rem;
		align-items: center;
		padding: 1.5rem;
		/* A tinta vem do tipo que a forma PASSA A TER; nas 74 que não trocam de tipo,
		   `--tipo-cor` não existe e a marca faz o papel, como no cabeçalho de habilidade. */
		background: color-mix(in oklab, var(--tipo-cor, var(--marca)) 10%, var(--superficie));
		border: 1px solid color-mix(in oklab, var(--tipo-cor, var(--marca)) 25%, var(--borda));
		border-radius: var(--raio-grande);
	}

	.cabecalho img {
		flex: none;
		width: 7.5rem;
		height: 7.5rem;
		object-fit: contain;
	}

	.identidade {
		min-width: 0;
	}

	.pedra {
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.pedra strong {
		color: var(--texto);
	}

	h1 {
		margin-block: 0.2rem 0.6rem;
		overflow-wrap: break-word;
	}

	.emblemas {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
	}

	.etiqueta {
		padding: 0.35em 0.8em;
		background: var(--superficie);
		border: 1px solid var(--borda-forte);
		border-radius: var(--raio-pilula);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.etiqueta.aviso {
		border-style: dashed;
	}

	.colunas {
		display: grid;
		grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		gap: 1rem;
		margin-top: 1rem;
		align-items: start;
	}

	.coluna {
		display: grid;
		gap: 1rem;
		min-width: 0;
	}

	.painel {
		padding: 1.25rem;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-grande);
		box-shadow: var(--sombra-1);
	}

	.painel h2 {
		margin-bottom: 0.7rem;
		font-size: var(--txt-pequeno);
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--texto-tenue);
	}

	.painel p {
		max-width: var(--largura-leitura);
	}

	.painel p + p {
		margin-top: 0.7rem;
	}

	.ressalva {
		padding: 0.7rem 0.875rem;
		background: var(--superficie-afundada);
		border-left: 3px solid var(--borda-forte);
		border-radius: var(--raio);
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
	}

	.tenue {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
	}

	.painel .tenue {
		margin-top: 0.4rem;
	}

	.antes {
		color: var(--texto-tenue);
	}

	.seta {
		margin-inline: 0.15rem;
		color: var(--texto-tenue);
	}

	.delta {
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.numero, .num {
		font-family: var(--fonte-numeros);
	}

	/* ------------------------------------------------------------------ mudanças */

	.mudancas {
		display: grid;
		gap: 0.6rem;
		margin: 0;
	}

	.mudancas dt {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.mudancas dd {
		margin: 0.15rem 0 0;
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	/* Os dois grupos de emblemas — o antes e o depois — e a própria linha. Sem o `span`
	   genérico aqui, os emblemas do DEPOIS saem colados ("TerrestreFogo"). */
	.linha-tipos, .linha-tipos span {
		display: inline-flex;
		flex-wrap: wrap;
		gap: 0.3rem;
		align-items: center;
	}

	/* ------------------------------------------------------------------ atributos */

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--txt-pequeno);
	}

	thead th {
		padding-bottom: 0.35rem;
		border-bottom: 1px solid var(--borda);
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
		text-align: left;
		/* O nome da forma e o da base são longos: sem isto a coluna estoura em 375px. */
		overflow-wrap: break-word;
	}

	thead th.num, tbody td.num {
		text-align: right;
	}

	tbody th {
		padding-block: 0.3rem;
		font-weight: 650;
		text-align: left;
	}

	tbody td {
		padding-block: 0.3rem;
	}

	tbody tr + tr th, tbody tr + tr td {
		border-top: 1px solid var(--borda);
	}

	.marca-escolha {
		color: var(--marca);
		font-weight: 700;
	}

	/* Fora da tela, mas lido: o cabeçalho da primeira coluna da tabela de atributos. */
	.so-leitor {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		padding: 0;
		overflow: hidden;
		clip-path: inset(50%);
		white-space: nowrap;
	}

	.escolhas {
		margin-top: 0.875rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--borda);
	}

	.rotulo-escolha {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.escolhas ul {
		margin-top: 0.3rem;
		list-style: none;
	}

	.escolhas li {
		font-size: var(--txt-pequeno);
		font-weight: 650;
	}

	/* ------------------------------------------------------------------ listas */

	.fatos {
		display: grid;
		gap: 0.4rem;
		list-style: none;
	}

	.fatos li {
		font-size: var(--txt-pequeno);
		line-height: 1.55;
	}

	.habilidades {
		display: grid;
		gap: 0.5rem;
		list-style: none;
	}

	.habilidades li {
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	.especie {
		display: flex;
		gap: 0.6rem;
		align-items: center;
		color: inherit;
		text-decoration: none;
	}

	.especie img {
		flex: none;
		width: 3rem;
		height: 3rem;
		object-fit: contain;
	}

	.especie span {
		display: grid;
		min-width: 0;
	}

	.especie-nome {
		font-size: var(--txt-g);
		font-weight: 650;
	}

	.especie:hover .especie-nome {
		color: var(--marca);
	}

	/* Mesmo sinal da ListaDeMoves: texto que veio da fonte sem corresponder a uma ficha. */
	.sem-ficha {
		color: var(--texto-tenue);
		font-weight: 650;
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}

	/* Mesmo ponto de quebra das fichas de Move e de Habilidade, para as três empilharem
	   juntas. */
	@media (width < 54rem) {
		.colunas {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	@media (width < 30rem) {
		.cabecalho img {
			width: 5rem;
			height: 5rem;
		}
	}
</style>
