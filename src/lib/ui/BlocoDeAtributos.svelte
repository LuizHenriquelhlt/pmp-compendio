<script lang="ts">
	import { ATRIBUTOS, formatarModificador, type IdAtributo } from "$pmp/atributos"

	type Props = {
		atributos: Record<IdAtributo, number>
	}

	let { atributos }: Props = $props()
</script>

<!--
	Uma `dl` e não uma tabela: são seis pares rótulo/valor, não dados tabulares com
	eixos. O modificador fica dentro do mesmo `dd` porque é derivado do valor, não
	um dado independente.
-->
<dl class="bloco">
	{#each ATRIBUTOS as atributo (atributo.id)}
		<div class="atributo">
			<dt title={atributo.nome}>
				{atributo.abrev}
				<span class="apenas-leitor-de-tela">— {atributo.nome}</span>
			</dt>
			<dd>
				<span class="valor numero">{atributos[atributo.id]}</span>
				<span class="modificador numero">{formatarModificador(atributos[atributo.id])}</span>
			</dd>
		</div>
	{/each}
</dl>

<style>
	.bloco {
		display: grid;
		grid-template-columns: repeat(6, 1fr);
		gap: var(--espaco-3);
		margin: 0;
	}

	.atributo {
		display: grid;
		gap: 0.1rem;
		padding: 0.6rem var(--espaco-2);
		background: var(--superficie-afundada);
		border: 1px solid var(--borda);
		border-radius: var(--raio);
		text-align: center;
	}

	dt {
		color: var(--texto-tenue);
		font-size: var(--txt-miudo);
		font-weight: 700;
		letter-spacing: 0.04em;
		/* `help` seria enganoso: o title só expande a abreviação. */
		cursor: default;
	}

	dd {
		display: grid;
		gap: 0.05rem;
		margin: 0;
	}

	.valor {
		font-size: var(--txt-gg);
		font-weight: 650;
		line-height: 1.1;
	}

	.modificador {
		color: var(--texto-suave);
		font-size: var(--txt-pequeno);
		font-weight: 600;
	}

	/* Em telas estreitas, duas fileiras de três leem melhor que seis colunas apertadas. */
	@media (width < 34rem) {
		.bloco {
			grid-template-columns: repeat(3, 1fr);
		}
	}
</style>
