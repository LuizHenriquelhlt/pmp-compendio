<script lang="ts">
	import type { MoveReferenciado } from "$dados/carregar.server"

	type Props = { moves: MoveReferenciado[] }

	let { moves }: Props = $props()
</script>

<!--
	Separador por vírgula em vez de lista com marcadores: é como o livro imprime estas
	listas, e para as fichas com 200 TMs uma lista vertical seria impraticável.

	Entrada sem `id` sai como texto, não como link - é o que o pipeline não conseguiu casar
	com o compêndio e preservou como estava (tabela de defesas vazada para dentro da lista
	de TMs, na v1.33.0). Mostrar o texto mantém a lista do livro completa; o conserto é na
	fonte, e `relatorio.json` tem a lista.
-->
<span class="lista">
	{#each moves as move, indice (move.nome)}
		<!--
			O número do TM vem antes do nome, como o livro imprime ("TM114: Grass Knot"), num
			`<span>` próprio para ter peso e cor diferentes sem duplicar o link. Só a lista de
			TMs traz número: a tabela por nível e os Moves de Ovo são os mesmos Moves sem
			disco nenhum.
		-->
		{#if move.tm != null}<span class="tm numero">TM{move.tm}</span>{/if}
		{#if move.id != null}
			<a href="/moves/{move.id}">{move.nome}</a>
		{:else}
			<span class="sem-ficha" title={move.nome}>{move.nome}</span>
		{/if}
		{#if indice < moves.length - 1}<span class="separador">, </span>{/if}
	{/each}
</span>

<style>
	.lista {
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
