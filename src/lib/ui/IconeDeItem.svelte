<script lang="ts">
	import type { ItemNoIndice } from "$pmp/item"
	import { TIPOS } from "$pmp/tipos"

	type Props = { item: Pick<ItemNoIndice, "nome" | "grupo" | "consumivel">, tamanho?: number }

	let { item, tamanho = 40 }: Props = $props()

	/**
	 * Os 124 itens sem sprite não são uma falha a consertar com outra fonte: a maioria é
	 * equipamento de aventura que o PMP inventou - Chaleira, Cantil, Bússola, Tenda -, e
	 * não existe arte oficial deles em fonte nenhuma. O que dá para fazer é desenhar um
	 * ícone que diga ao menos QUE COISA é, em vez de um retângulo cinza.
	 *
	 * O desenho é nosso, traçado simples em `currentColor`, por três razões: não acrescenta
	 * dependência nem arquivo para baixar, não levanta questão de licença de biblioteca de
	 * terceiros, e acompanha o tema claro/escuro sozinho.
	 *
	 * A escolha é por PALAVRA no nome, e não por pasta, porque a pasta não distingue: 310
	 * dos 420 itens caem num balde chamado "Itens". A ordem importa - "Kit de Mergulho"
	 * casaria tanto em `kit` quanto em nada, e o primeiro padrão que casar vence.
	 */
	const FAMILIAS: { glifo: Glifo, padrao: RegExp }[] = [
		{ glifo: "cristal", padrao: /tera shard/i },
		{ glifo: "folha", padrao: /hortel[ãa]/i },
		{ glifo: "mochila", padrao: /mochila/i },
		{ glifo: "maleta", padrao: /\bkit\b|pacote/i },
		{ glifo: "bicicleta", padrao: /bicicleta|rotom bike/i },
		{ glifo: "oculos", padrao: /[óo]culos|bin[óo]culos|respirador|filtro para/i },
		{ glifo: "roupa", padrao: /camisa|camiseta|casaco|capa|cal[çc]as|bandana|luvas|t[êe]nis|avental/i },
		{ glifo: "lanterna", padrao: /lanterna|lampi[ãa]o|carregador|c[ée]lula de energia|bateria|energizada/i },
		{ glifo: "tenda", padrao: /tenda|saco de dormir|acampamento/i },
		{ glifo: "panela", padrao: /chaleira|fog[ãa]o|cantil|garrafa|ra[çc][ãa]o|caneca|panela/i },
		{ glifo: "corda", padrao: /corda|arp[ée]u|algemas/i },
		{ glifo: "livro", padrao: /livro|mapa|pok[ée]dex|\bdex\b|book|disk|cat[áa]logo/i },
		{ glifo: "pedra", padrao: /pedra|stone|orbe|cristal|pulseira|bracelete|amuleto|broche|colar|pingente/i },
		{ glifo: "doce", padrao: /candy|doce/i },
		{ glifo: "faca", padrao: /canivete|faca|ferramenta|pederneira/i },
		{ glifo: "rel", padrao: /rel[óo]gio|b[úu]ssola|sensorial/i },
	]

	type Glifo =
		| "cristal" | "folha" | "mochila" | "maleta" | "bicicleta" | "oculos" | "roupa"
		| "lanterna" | "tenda" | "panela" | "corda" | "livro" | "pedra" | "doce" | "faca"
		| "rel" | "frasco" | "caixa"

	const glifo = $derived.by<Glifo>(() => {
		const achado = FAMILIAS.find((f) => f.padrao.test(item.nome))
		if (achado != null) return achado.glifo

		// Sem palavra conhecida: o frasco para consumível, a caixa para o resto. É o
		// mínimo honesto - diz se gasta no uso, que é a distinção que o jogador usa.
		return item.consumivel ? "frasco" : "caixa"
	})

	/**
	 * Os 19 Tera Shards trazem o tipo no nome ("Tera Shard do Tipo Aço"), e o compêndio já
	 * tem a cor de cada tipo em `ui/tipos.css`. O cristal sai tingido, e os 19 viram 19
	 * ícones diferentes em vez de 19 iguais.
	 *
	 * "Estelar" não está entre os 18 tipos do PMP e cai na cor neutra, como deve.
	 */
	/**
	 * "Terra" é o nome que o módulo dá ao tipo Terrestre neste pack.
	 *
	 * Mesma inconsistência que `habilidades.mjs` já tinha achado em Levitate ("Moves do
	 * tipo terra", onde o resto do corpus escreve "Terrestre"). Sem o apelido, o Tera
	 * Shard do Tipo Terra é o único dos 18 que sai cinza.
	 */
	const APELIDOS: Record<string, string> = { terra: "terrestre" }

	const classeDeTipo = $derived.by(() => {
		if (glifo !== "cristal") return ""

		const casa = item.nome.match(/tipo\s+([A-Za-zÀ-ÿ]+)\s*$/i)
		if (casa == null) return ""

		const escrito = casa[1].toLowerCase()
		const tipo = TIPOS.find((t) =>
			t.nome.toLowerCase() === escrito || t.id === (APELIDOS[escrito] ?? escrito))

		// "Estelar" não está entre os 18 tipos do PMP e cai na cor neutra, como deve.
		return tipo != null ? `tipo-${tipo.id}` : ""
	})
</script>

<svg
	class="icone {classeDeTipo}"
	width={tamanho}
	height={tamanho}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="1.5"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	{#if glifo === "cristal"}
		<path d="M12 2 7 9l5 13 5-13-5-7Z" />
		<path d="M7 9h10M12 2v20" />
	{:else if glifo === "folha"}
		<path d="M4 20c0-8 5-14 16-16 0 11-6 16-12 16H4Z" />
		<path d="M4 20c4-5 8-8 13-10" />
	{:else if glifo === "mochila"}
		<path d="M6 8a6 6 0 0 1 12 0v12H6V8Z" />
		<path d="M9 8V6a3 3 0 0 1 6 0v2M9 14h6" />
	{:else if glifo === "maleta"}
		<rect x="3" y="7" width="18" height="13" rx="2" />
		<path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2M3 13h18" />
	{:else if glifo === "bicicleta"}
		<circle cx="6" cy="16" r="4" />
		<circle cx="18" cy="16" r="4" />
		<path d="m6 16 4-8h6l-4 8M10 8h5" />
	{:else if glifo === "oculos"}
		<circle cx="6.5" cy="14" r="3.5" />
		<circle cx="17.5" cy="14" r="3.5" />
		<path d="M10 14h4M3 11l2-3M21 11l-2-3" />
	{:else if glifo === "roupa"}
		<path d="M9 3 4 6l2 4 2-1v12h8V9l2 1 2-4-5-3-3 2-3-2Z" />
	{:else if glifo === "lanterna"}
		<path d="M9 3h6v3H9zM7 6h10l-1 15H8L7 6Z" />
		<path d="M10 11h4" />
	{:else if glifo === "tenda"}
		<path d="M12 3 3 20h18L12 3Z" />
		<path d="M12 3v17M8 20l4-7 4 7" />
	{:else if glifo === "panela"}
		<path d="M4 9h14v7a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V9Z" />
		<path d="M18 11h2a2 2 0 0 1 0 4h-2M8 9V5M14 9V5" />
	{:else if glifo === "corda"}
		<circle cx="12" cy="12" r="8" />
		<circle cx="12" cy="12" r="4" />
		<path d="M12 4v4M20 12h-4" />
	{:else if glifo === "livro"}
		<path d="M4 4h12a2 2 0 0 1 2 2v14H6a2 2 0 0 1-2-2V4Z" />
		<path d="M4 17h14M8 8h6" />
	{:else if glifo === "pedra"}
		<path d="m12 3 7 5-2 11H7L5 8l7-5Z" />
		<path d="m5 8 7 4 7-4M12 12v7" />
	{:else if glifo === "doce"}
		<!-- Corpo redondo com os papéis em leque: num retângulo com abas, o glifo lia
		     como uma câmera no tamanho do cartão. -->
		<circle cx="12" cy="12" r="4.5" />
		<path d="M7.9 10.2 3.5 7v10l4.4-3.2M16.1 10.2 20.5 7v10l-4.4-3.2" />
	{:else if glifo === "faca"}
		<path d="M3 17 15 5l3 3L6 20H3v-3Z" />
		<path d="m13 7 4 4" />
	{:else if glifo === "rel"}
		<circle cx="12" cy="12" r="8" />
		<path d="M12 8v4l3 2" />
	{:else if glifo === "frasco"}
		<path d="M9 3h6M10 3v6l-4 8a3 3 0 0 0 3 4h6a3 3 0 0 0 3-4l-4-8V3" />
		<path d="M7.5 15h9" />
	{:else}
		<path d="M3 8l9-5 9 5v8l-9 5-9-5V8Z" />
		<path d="m3 8 9 5 9-5M12 13v8" />
	{/if}
</svg>

<style>
	.icone {
		/* A cor vem do tipo quando há um (Tera Shards) e do texto tênue no resto: o ícone
		   é um substituto de arte, não deve competir com o nome do item. */
		color: var(--tipo-cor, var(--texto-tenue));
		flex: none;
	}
</style>
