<script lang="ts">
	import type { MoveReferenciado } from "$dados/carregar.server"

	type Props = {
		moves: MoveReferenciado[]
		/**
		 * `corrida` separa por vírgula, como o livro imprime; `grade` põe um por célula,
		 * em colunas e linhas.
		 *
		 * A escolha é por tamanho, e foi medida: a lista de TMs tem mediana de 56 nomes e
		 * chega a 309, e em corrida vira um bloco de texto que ninguém varre com o olho.
		 * Moves de Ovo têm mediana 0 e no máximo 20, e os por nível, mediana 1 dentro de
		 * uma célula de tabela - nesses, a grade só desperdiçaria largura.
		 */
		disposicao?: "corrida" | "grade"
	}

	let { moves, disposicao = "corrida" }: Props = $props()
</script>

<!--
	Entrada sem `id` sai como texto, não como link - é o que o pipeline não conseguiu casar
	com o compêndio e preservou como estava (tabela de defesas vazada para dentro da lista
	de TMs, na v1.33.0). Mostrar o texto mantém a lista do livro completa; o conserto é na
	fonte, e `relatorio.json` tem a lista.

	O número do TM vem antes do nome, como o livro imprime ("TM114: Grass Knot"), num
	`<span>` próprio para ter peso e cor diferentes sem duplicar o link. Só a lista de TMs
	traz número: a tabela por nível e os Moves de Ovo são os mesmos Moves sem disco nenhum.
-->
{#if disposicao === "grade"}
	<ul class="grade">
		{#each moves as move (move.nome)}
			<li>
				{#if move.tm != null}<span class="tm numero">TM{move.tm}</span>{/if}
				{#if move.id != null}
					<a href="/moves/{move.id}">{move.nome}</a>
				{:else}
					<span class="sem-ficha" title={move.nome}>{move.nome}</span>
				{/if}
			</li>
		{/each}
	</ul>
{:else}
	<span class="lista">
		{#each moves as move, indice (move.nome)}
			{#if move.tm != null}<span class="tm numero">TM{move.tm}</span>{/if}
			{#if move.id != null}
				<a href="/moves/{move.id}">{move.nome}</a>
			{:else}
				<span class="sem-ficha" title={move.nome}>{move.nome}</span>
			{/if}
			{#if indice < moves.length - 1}<span class="separador">, </span>{/if}
		{/each}
	</span>
{/if}

<style>
	.lista {
		overflow-wrap: break-word;
	}

	/*
	 * `auto-fill` com `minmax`: o número de colunas sai da largura disponível, sem ponto
	 * de quebra escrito à mão. 13rem é o que cabe "TM321" mais um nome longo como
	 * "Hidden Power" sem partir; `min(100%, …)` garante uma coluna só em 375px.
	 */
	.grade {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(min(100%, 13rem), 1fr));
		gap: 0.1rem 1.25rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.grade li {
		display: flex;
		gap: 0.45rem;
		align-items: baseline;
		min-width: 0;
	}

	/* Número à direita de uma coluna de largura fixa: é o que alinha todos os nomes na
	   mesma vertical, em vez de cada um começar onde o número anterior terminou. */
	.grade .tm {
		flex: none;
		min-width: 3.1rem;
		margin-right: 0;
		text-align: right;
	}

	.grade a,
	.grade .sem-ficha {
		min-width: 0;
		overflow-wrap: break-word;
	}

	.sem-ficha {
		color: var(--texto-tenue);
		/* Sublinhado pontilhado: sinaliza que o texto veio da fonte sem corresponder a
		   nenhuma ficha, sem parecer um link quebrado. */
		text-decoration: underline dotted;
		text-decoration-color: var(--borda-forte);
	}

	.separador {
		color: var(--texto-tenue);
	}

	.tm {
		margin-right: 0.2rem;
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 700;
	}
</style>
