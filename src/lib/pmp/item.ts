/**
 * Um item de treinador como o compêndio o consome. Deriva de `trainer-features.json` via
 * `ferramentas/construir.mjs`.
 *
 * Repare no pack de origem: os itens NÃO estão no pack chamado `items`, que tem dois
 * documentos. Os 343 estão no pack de treinador, junto de talentos, naturezas e classes.
 *
 * Os nomes ficam como o módulo os publica — a maioria em inglês (Thunder Stone, Oran
 * Berry), alguns em português (Mega Pedra, Pedra-Chave, Tênis Reforçados). É a mesma
 * decisão dos nomes de Move e de Habilidade: o livro mistura, e o compêndio não traduz.
 */
export type Item = {
	/** Slug do nome: `thunder-stone`, `pedra-chave`. */
	id: string
	nome: string
	/**
	 * O texto da regra, já sem a célula de preço que a tabela do PDF anexou ao fim.
	 *
	 * Vazia nos 10 itens em que a extração costurou conteúdo de outro item dentro — ver
	 * `textoContaminado`.
	 */
	descricao: string
	/**
	 * A extração do PDF juntou texto que não é deste item.
	 *
	 * Dez na v1.33.0, em quatro padrões: a célula de preço no meio da frase ("o dano duas
	 * N/A vezes"), o rótulo "Não vendido" partido ("durante a **Não** batalha … **vendido**",
	 * que inverte a regra de Mega Pedra), a descrição de outro item emendada, e três itens
	 * fundidos num texto só (Balm Mushroom). Publicar seria atribuir ao item regra alheia.
	 */
	textoContaminado: boolean
	/**
	 * O módulo tem só um pedaço da regra.
	 *
	 * Nove itens na v1.34.0: oito cortados no fim (cinco Berries param em "caso seja de
	 * Natureza", três em "Fornece +1 em") e um cortado no começo — a descrição inteira do
	 * Extender é "tenham sido ativados por ele…", e sem o início não dá para saber o que
	 * é "ele". O texto é publicado assim mesmo, com a ressalva ao lado: é o que o livro
	 * tem, e metade da regra ainda ajuda quem conhece o item.
	 */
	textoIncompleto: boolean
	/**
	 * Preço em Pokédólares, ou `null` quando o livro não vende o item.
	 *
	 * `null` e não 0 de propósito: 15 itens-chave (Mega Pedra, Pedra-Chave, Bracelete-Z,
	 * Cristal-Z…) não têm preço, e "₽0" diria que são de graça.
	 *
	 * Vem do TEXTO do livro, não do número que o módulo extraiu: em dois itens o módulo
	 * leu a vírgula de "₽20,000" como decimal e gravou 20 — mil vezes menos.
	 */
	preco: number | null
	/** O preço como o livro imprime, incluindo o símbolo: `"₽1.400"`. Vazio quando não há. */
	precoTexto: string
	/**
	 * A pasta do módulo, que é a única taxonomia que o pack oferece — e cobre um quarto
	 * dele: 259 dos 343 caem em "Itens", e Berries, Hortelãs, Doces e Poções dividem 84.
	 *
	 * Fica como o nome que o módulo dá, e não um `id` nosso, pela mesma razão que `regiao`
	 * na ficha de espécie: é conteúdo do livro, não vocabulário do sistema.
	 */
	grupo: string | null
	/**
	 * A seção do livro de onde o item vem, quando ele a declara.
	 *
	 * Os 77 itens que a v1.34.0 acrescentou (as expansões de Galar e Paldea) trazem o
	 * cabeçalho da seção anexado ao fim da descrição — vazamento de diagramação que, ao
	 * contrário da célula de preço, carrega informação. Extraído, vira a taxonomia que a
	 * pasta não dá: "Itens Evolutivos", "Fósseis", "Lista de Tera Shards", "Itens-Chave".
	 *
	 * `null` nos 343 da v1.33.0, que não declaram seção.
	 *
	 * Sai como o livro escreve, sem uniformizar a caixa: ele mesmo alterna "Itens
	 * Seguráveis consumíveis" e "Itens Seguráveis Consumíveis".
	 */
	secao: string | null
	/** A expansão de onde o item vem: `"Expansão da Nona Geração (Paldea)"`. */
	expansao: string | null
	/** Gasta-se no uso (128 dos 343). */
	consumivel: boolean
	/** Carrega outros itens — só Mochila e Mochila Energizada. */
	recipiente: boolean
	/**
	 * A subdivisão do dnd5e: `trinket`, `food` ou `potion`.
	 *
	 * Junto com `consumivel`, é o que separa os 343 onde a pasta não separa.
	 */
	especie: string | null
	imagem: string | null
}

/** A fatia de Item que a listagem e a busca consomem. Sem o texto da regra. */
export type ItemNoIndice = Omit<Item, "descricao">

export type ItemBuscavel = Pick<Item, "nome" | "grupo">

/**
 * `20000` → `"₽20.000"`.
 *
 * O separador sai em pt-BR mesmo quando o livro escreveu à inglesa: o pack mistura as
 * duas convenções ("₽1.400" em 150 itens, "₽20,000" em 2), e mostrar as duas lado a lado
 * numa listagem faria o leitor duvidar de qual é milhar e qual é decimal — que é
 * exatamente o erro em que o módulo caiu.
 */
export function formatarPreco(preco: number | null): string | null {
	return preco == null ? null : `₽${preco.toLocaleString("pt-BR")}`
}
