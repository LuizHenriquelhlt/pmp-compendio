<script lang="ts">
	import { t } from "$i18n"
</script>

<svelte:head>
	<title>{t("nav.sobre")} - {t("site.nome")}</title>
</svelte:head>

<div class="pagina leitura">
	<h1>{t("nav.sobre")}</h1>

	<section>
		<h2>O que é isto</h2>
		<p>
			O <strong>{t("site.nome")}</strong> é uma referência de consulta para o sistema de RPG
			<strong>Pokémon Mundo Perfeito</strong> (PMP): statblocks de espécies, regras e tabelas,
			em português do Brasil, organizados para serem consultados no meio de uma sessão.
		</p>
	</section>

	<section>
		<h2>Créditos e direitos</h2>
		<p>
			O sistema Pokémon Mundo Perfeito e todo o seu texto de regras são obra da
			<strong>comunidade autora do PMP</strong>. Este site é uma ferramenta de consulta
			construída sobre esse material, não uma publicação dele.
		</p>
		<p>
			Por isso o conteúdo do sistema <strong>não acompanha o código</strong>: o repositório
			carrega apenas o programa, e os dados são gerados na máquina de quem o executa, a partir
			do módulo Foundry do PMP e dos livros em PDF. Quem não tem o material não recebe o
			material.
		</p>
		<p>
			As artes das espécies vêm da <a href="https://pokeapi.co" rel="noreferrer">PokéAPI</a>.
			Pokémon é marca registrada de Nintendo, Game Freak e The Pokémon Company; este é um
			projeto de fã, sem vínculo nem endosso de nenhuma delas, e sem fim lucrativo.
		</p>
	</section>

	<section>
		<h2>De onde vêm os dados</h2>
		<p>
			O compêndio lê o módulo Foundry <code>pokemon-mundo-perfeito</code>, que guarda cada
			espécie com seus campos já estruturados. Um pipeline em duas etapas converte os
			compêndios do módulo em JSON e os normaliza para o formato que o site consome.
		</p>
		<p>
			O pipeline <strong>não inventa dado</strong>. Quando o material de origem está ambíguo ou
			truncado, o registro é marcado e listado em um relatório de qualidade, para ser corrigido
			na fonte - e a página exibe a ressalva em vez de um valor adivinhado.
		</p>
	</section>

	<section>
		<h2>Outros idiomas</h2>
		<p>
			O PMP é um sistema brasileiro, então o compêndio nasce em português e os identificadores
			do conteúdo são os nomes em português. Ainda assim, nenhum texto de interface está
			escrito dentro dos componentes: tudo vem de um catálogo de mensagens por idioma. Somar
			um idioma novo é acrescentar um catálogo e um arquivo de sobreposição de conteúdo, sem
			mexer nas páginas.
		</p>
	</section>
</div>

<style>
	.leitura {
		max-width: var(--largura-leitura);
	}

	h1 {
		margin-bottom: var(--espaco-3);
	}

	section {
		margin-top: 2rem;
	}

	h2 {
		margin-bottom: 0.6rem;
		font-size: var(--txt-gg);
	}

	p {
		margin-top: 0.75rem;
		color: var(--texto-suave);
	}

	code {
		padding: 0.1em 0.35em;
		background: var(--superficie-afundada);
		border-radius: 4px;
		font-family: var(--fonte-numeros);
		font-size: 0.9em;
	}
</style>
