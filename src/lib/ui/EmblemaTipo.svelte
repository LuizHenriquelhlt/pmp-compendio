<script lang="ts">
	import { nomeDoTipo, type IdTipo } from "$pmp/tipos"

	type Props = {
		tipo: IdTipo
		/** `pequeno` para listagens densas; `grande` para o cabeçalho da espécie. */
		tamanho?: "pequeno" | "normal" | "grande"
	}

	let { tipo, tamanho = "normal" }: Props = $props()
</script>

<!--
	A classe `tipo-<id>` vem de `ui/tipos.css` e só define `--tipo-cor` e
	`--tipo-contraste`. O emblema consome as duas e não sabe nada sobre cores.
-->
<span class="emblema tipo-{tipo} {tamanho}">{nomeDoTipo(tipo)}</span>

<style>
	.emblema {
		display: inline-block;
		background: var(--tipo-cor);
		color: var(--tipo-contraste);
		border-radius: var(--raio-pilula);
		font-weight: 600;
		line-height: 1;
		white-space: nowrap;
		/* Maiúsculas pequenas pedem um pouco de ar entre as letras. */
		letter-spacing: 0.02em;
	}

	.pequeno {
		padding: 0.25em 0.6em;
		font-size: var(--txt-miudo);
		text-transform: uppercase;
	}

	.normal {
		padding: 0.35em 0.8em;
		font-size: var(--txt-pequeno);
	}

	.grande {
		padding: 0.45em 1em;
		font-size: var(--txt-base);
	}
</style>
