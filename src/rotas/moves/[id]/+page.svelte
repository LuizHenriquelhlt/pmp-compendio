<script lang="ts">
	import { t, tPlural } from "$i18n"
	import BotaoVoltar from "$ui/BotaoVoltar.svelte"
	import {
		descreverEfeito, formatarEscalonamento, formatarPP, nomeDaResolucao, nomeDoModo,
	} from "$pmp/move"
	import EmblemaTipo from "$ui/EmblemaTipo.svelte"
	import type { PageData } from "./$types"

	let { data }: { data: PageData } = $props()

	const move = $derived(data.move)

	/** Ficha de identidade: só as linhas que o Move realmente tem. */
	const ficha = $derived.by(() => {
		const linhas: { rotulo: string, valor: string }[] = [
			{ rotulo: t("move.poder"), valor: move.poder.texto },
			{ rotulo: t("move.duracao"), valor: move.duracao.texto },
		]

		if (move.prioridade !== 0) {
			linhas.push({ rotulo: t("move.prioridade"), valor: String(move.prioridade) })
		}

		linhas.push({
			rotulo: t("move.resolucao"),
			valor: move.resolucoes.map(nomeDaResolucao).join(", "),
		})

		if (move.ativacao.modos.length > 0) {
			linhas.push({ rotulo: t("move.ativacao"), valor: move.ativacao.modos.map(nomeDoModo).join(" / ") })
		}

		return linhas
	})

	/** As marcas que o livro acrescenta ao modo de uso, quando acrescenta. */
	const marcas = $derived([
		move.ativacao.recarga ? t("move.ativacao.recarga") : null,
		move.ativacao.carga ? t("move.ativacao.carga") : null,
		move.duracao.concentracao ? t("move.duracao.concentracao") : null,
	].filter((m) => m != null))

	/**
	 * Os dois escalonamentos possíveis, cada um com o rótulo que diz DE QUE ele é.
	 * O módulo guarda dano e cura no mesmo campo (`damage.scaling`) e dezesseis Moves
	 * escalonam cura — publicá-los sob o rótulo de dano inventaria uma regra.
	 */
	const escalonamentos = $derived([
		{ rotulo: t("move.escalonamento.dano"), dados: move.dano },
		{ rotulo: t("move.escalonamento.cura"), dados: move.cura },
	].flatMap(({ rotulo, dados }) => dados?.escalonamento != null ? [ { rotulo, dados } ] : []))

	const grupos = $derived([
		{ rotulo: t("move.usadoPor.nivel"), especies: data.quemAprende.nivel },
		{ rotulo: t("move.usadoPor.tm"), especies: data.quemAprende.tm },
		{ rotulo: t("move.usadoPor.ovo"), especies: data.quemAprende.ovo },
	].filter((g) => g.especies.length > 0))

	const paragrafos = (texto: string) => texto.split("\n").filter((p) => p !== "")
</script>

<svelte:head>
	<title>{move.nome} — {t("site.nome")}</title>
	<meta name="description" content={paragrafos(move.descricao)[0] ?? move.nome} />
</svelte:head>

<article class="pagina">
	<BotaoVoltar href="/moves" texto={t("move.voltar")} />

	<header class="cabecalho {move.tipo != null ? `tipo-${move.tipo}` : 'sem-tipo'}">
		<div class="identidade">
			<h1>{move.nome}</h1>
			<div class="tipos">
				{#if move.tipo != null}
					<EmblemaTipo tipo={move.tipo} tamanho="grande" />
				{:else}
					<span class="etiqueta">{t("move.tipo.variavel")}</span>
				{/if}

				{#each marcas as marca (marca)}
					<span class="etiqueta">{marca}</span>
				{/each}
			</div>
		</div>
	</header>

	<!-- Os quatro números que o Mestre consulta no meio de uma batalha. -->
	<section class="combate" aria-label="{t('move.ativacao')}, {t('move.alcance')}, {t('move.pp')}">
		<div class="destaque">
			<span class="rotulo">{t("move.ativacao")}</span>
			<span class="valor">{move.ativacao.texto}</span>
		</div>
		<div class="destaque">
			<span class="rotulo">{t("move.alcance")}</span>
			<span class="valor">{move.alcance.texto}</span>
		</div>
		<div class="destaque">
			<span class="rotulo">{t("move.pp")}</span>
			<span class="valor numero">{formatarPP(move.pp)}</span>
		</div>
		<!--
			Dano, cura ou poder, nessa ordem: doze Moves escalonam dados sem declarar a base
			(o livro põe o valor só na prosa), e um bloco "Cura —" diria menos que o Poder do
			Move. O escalonamento continua no painel ao lado, com o rótulo certo.
		-->
		{#if move.dano?.base != null}
			<div class="destaque">
				<span class="rotulo">{t("move.dano")}</span>
				<span class="valor numero">{move.dano.base}</span>
			</div>
		{:else if move.cura?.base != null}
			<div class="destaque">
				<span class="rotulo">{t("move.cura")}</span>
				<span class="valor numero">{move.cura.base}</span>
			</div>
		{:else}
			<div class="destaque">
				<span class="rotulo">{t("move.poder")}</span>
				<span class="valor">{move.poder.texto}</span>
			</div>
		{/if}
	</section>

	<!--
		Os dois avisos de qualidade da fonte, no mesmo padrão do deslocamento truncado da
		ficha de espécie: mostramos o que o módulo tem e dizemos o que o livro diz, em vez
		de escolher um dos dois em silêncio.
	-->
	{#if move.alcance.truncado}
		<p class="ressalva">{t("aviso.alcanceTruncado", { bruto: move.alcance.bruto })}</p>
	{/if}

	{#if move.prioridadeNoTexto != null}
		<p class="ressalva">
			{t("aviso.prioridadeDivergente", { campo: move.prioridade, texto: move.prioridadeNoTexto })}
		</p>
	{/if}

	<div class="colunas">
		<div class="coluna">
			<section class="painel">
				<h2>{t("move.descricao")}</h2>
				{#each paragrafos(move.descricao) as paragrafo (paragrafo)}
					<p>{paragrafo}</p>
				{/each}
			</section>

			{#if move.niveisSuperiores !== ""}
				<section class="painel">
					<h2>{t("move.niveisSuperiores")}</h2>
					{#each paragrafos(move.niveisSuperiores) as paragrafo (paragrafo)}
						<p>{paragrafo}</p>
					{/each}
				</section>
			{/if}

			{#if move.observacoes !== ""}
				<section class="painel">
					<h2>{t("move.observacoes")}</h2>
					{#each paragrafos(move.observacoes) as paragrafo (paragrafo)}
						<p>{paragrafo}</p>
					{/each}
				</section>
			{/if}

			{#if move.zPower != null}
				<section class="painel">
					<h2>{t("move.zPower")}</h2>
					<p>{move.zPower}</p>
				</section>
			{/if}
		</div>

		<div class="coluna">
			<section class="painel ficha-identidade">
				<dl class="ficha">
					{#each ficha as linha (linha.rotulo)}
						<dt>{linha.rotulo}</dt>
						<dd>{linha.valor}</dd>
					{/each}
				</dl>
			</section>

			{#each escalonamentos as bloco (bloco.rotulo)}
				<section class="painel">
					<h2>{bloco.rotulo}</h2>
					<p class="numero">{formatarEscalonamento(bloco.dados)}</p>
				</section>
			{/each}

			{#if move.efeitos.length > 0}
				<section class="painel">
					<h2>{t("move.efeitos")}</h2>
					<ul class="efeitos">
						{#each move.efeitos as efeito, indice (indice)}
							{@const descricao = descreverEfeito(efeito)}
							<li>
								<span class="oque">{descricao.oque}</span>
								{#if descricao.dequem != null}
									<span class="condicao">{descricao.dequem}</span>
								{/if}
								{#if descricao.quando != null}
									<span class="condicao">{descricao.quando}</span>
								{/if}
							</li>
						{/each}
					</ul>
					<!--
						O resumo é leitura automática da descrição, e o livro é mais rico que
						qualquer leitura automática. Dizer isso na página evita que alguém o
						trate como a regra.
					-->
					<p class="tenue">{t("move.efeitos.nota")}</p>
				</section>
			{/if}

			<section class="painel">
				<h2>{t("move.usadoPor")}</h2>

				{#if grupos.length === 0}
					<p class="tenue">{t("move.usadoPor.nenhuma")}</p>
				{:else}
					{#each grupos as grupo (grupo.rotulo)}
						<details>
							<summary>
								{grupo.rotulo}
								<span class="quantidade">
									{tPlural(grupo.especies.length, "move.usadoPor.contagem", "move.usadoPor.contagens")}
								</span>
							</summary>
							<p class="lista-larga">
								{#each grupo.especies as especie, indice (especie.id)}
									<a href="/pokemon/{especie.id}">{especie.nome}</a>{indice < grupo.especies.length - 1 ? ", " : ""}
								{/each}
							</p>
						</details>
					{/each}
				{/if}
			</section>
		</div>
	</div>
</article>

<style>


	.cabecalho {
		padding: 1.5rem;
		/* Mesma mistura da ficha de espécie: a cor do tipo tinge o cabeçalho de leve,
		   partindo sempre da superfície vigente para continuar legível nos dois temas. */
		background: color-mix(in oklab, var(--tipo-cor) 10%, var(--superficie));
		border: 1px solid color-mix(in oklab, var(--tipo-cor) 25%, var(--borda));
		border-radius: var(--raio-grande);
	}

	/* Natural Gift e Judgment mudam de tipo em jogo: sem cor de tipo para mostrar. */
	.sem-tipo {
		--tipo-cor: var(--borda-forte);
	}

	.identidade {
		min-width: 0;
	}

	h1 {
		margin-bottom: 0.7rem;
		overflow-wrap: break-word;
	}

	.tipos {
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

	.combate {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 0.75rem;
		margin-top: 1rem;
	}

	.destaque {
		display: grid;
		gap: 0.15rem;
		align-content: start;
		padding: 0.875rem 0.5rem;
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
		font-size: var(--txt-g);
		font-weight: 650;
		line-height: 1.2;
		overflow-wrap: break-word;
	}

	.colunas {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-top: 1rem;
		align-items: start;
	}

	.coluna {
		display: grid;
		gap: 1rem;
		/* Sem isso, a lista de espécies estica a coluna e desalinha a outra. */
		min-width: 0;
	}



	.painel p {
		color: var(--texto-suave);
	}

	.painel p + p {
		margin-top: 0.6rem;
	}

	.ressalva {
		margin-top: 1rem;
		padding: 0.6rem 0.75rem;
		background: var(--superficie-afundada);
		border-left: 3px solid var(--borda-forte);
		border-radius: 0 var(--raio) var(--raio) 0;
		color: var(--texto-tenue);
		font-size: var(--txt-pequeno);
	}

	.tenue {
		margin-top: 0.75rem;
		color: var(--texto-tenue) !important;
		font-size: var(--txt-miudo);
	}

	.ficha {
		display: grid;
		grid-template-columns: auto 1fr;
		gap: 0.4rem 1.25rem;
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

	.efeitos {
		display: grid;
		gap: 0.5rem;
		list-style: none;
	}

	.efeitos li {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		align-items: center;
		padding: 0.5rem 0.7rem;
		background: var(--superficie-afundada);
		border-radius: var(--raio);
	}

	.oque {
		font-weight: 650;
	}

	.condicao {
		padding: 0.15em 0.55em;
		background: var(--superficie);
		border: 1px solid var(--borda);
		border-radius: var(--raio-pilula);
		color: var(--texto-suave);
		font-size: var(--txt-miudo);
	}

	details + details {
		margin-top: 0.5rem;
	}

	summary {
		padding: 0.3rem 0;
		font-size: var(--txt-pequeno);
		font-weight: 650;
		cursor: pointer;
	}

	.quantidade {
		color: var(--texto-tenue);
		font-weight: 600;
	}

	.lista-larga {
		margin-top: 0.4rem;
		font-size: var(--txt-pequeno);
		line-height: 1.7;
	}

	@media (width < 54rem) {
		.colunas {
			grid-template-columns: 1fr;
		}
	}

	@media (width < 34rem) {
		.combate {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
