// Interpretação do preço e do texto de um item de treinador.
//
// Separado de `construir.mjs` pela mesma razão que `habilidades.mjs` e `megas.mjs`: lê
// prosa e números do livro, e um erro aqui não deixa um campo vazio - ele publica uma
// regra ou um preço errado.
//
// Os 343 itens vivem em `trainer-features.json`, não no pack chamado `items` (que tem
// DOIS documentos). Dos campos do documento só cinco variam: `name`, a descrição, o preço
// em número, o preço em texto e `img`. O resto é constante nos 343.
//
// Duas coisas exigem leitura, e as duas estão medidas na nota do pack:
//
//   1. O PREÇO. `system.price.value` está 1000x menor em dois itens porque o módulo leu a
//      vírgula de `"₽20,000"` como decimal - a armadilha de pt-BR que estas ferramentas
//      repetem desde o pack de Moves, desta vez cometida pela fonte.
//
//   2. A DESCRIÇÃO. A extração do PDF costurou colunas e linhas vizinhas ao texto da
//      regra: a célula de preço (`N/A`), o rótulo "Não vendido" partido no meio da frase,
//      e descrições inteiras de outros itens emendadas no fim.

/**
 * `"₽12.500"` → `12500`, `""` → `null`.
 *
 * Os dois separadores do pack são de MILHAR, e isso é afirmável e não suposto: nenhum dos
 * 343 preços tem centavos - não existe um só `₽N,NN` ou `₽N.NN` terminando em dois
 * dígitos. O pack mistura as duas convenções (150 itens escrevem `₽1.500` à brasileira e
 * 2 escrevem `₽20,000` à inglesa), então os dois caracteres somem antes da conversão.
 *
 * Devolve `null`, e não 0, para o campo vazio: 15 itens-chave do livro não são vendidos
 * (Mega Pedra, Pedra-Chave, Bracelete-Z…), e "₽0" diria que são de graça.
 */
export function interpretarPreco(bruto = "") {
	const digitos = String(bruto ?? "").replace(/[₽\s]/g, "").replace(/[.,]/g, "")
	if (digitos === "" || !/^\d+$/.test(digitos)) return null

	const valor = Number(digitos)
	return Number.isFinite(valor) ? valor : null
}

/**
 * O número que o módulo extraiu discorda do texto do livro.
 *
 * Só dois itens na v1.33.0 (Sacred Ash e Comet Shard), e nos dois o campo está 1000x
 * menor. Publicamos o valor do TEXTO, que é a fonte, e mandamos a divergência para o
 * relatório - o mesmo trato de `prioridadeDeMoveDivergente` nos Moves.
 */
export function precoDivergente(bruto, campo) {
	const doTexto = interpretarPreco(bruto)
	if (doTexto == null) return false

	return doTexto !== campo
}

// ------------------------------------------------------------------ Descrição
/**
 * O título da seção do livro, que a v1.34.0 anexou ao fim de cada item novo.
 *
 * Os 77 itens que a v1.34.0 acrescentou (as expansões de Galar e Paldea) trazem, como
 * ÚLTIMA LINHA da descrição, o cabeçalho da seção de onde vieram:
 *
 *     Itens Evolutivos - Expansão da Nona Geração (Paldea)
 *     Lista de Tera Shards - Expansão da Nona Geração (Paldea)
 *     Consumíveis - Expansão da Oitava Geração (Galar)
 *
 * É vazamento de diagramação como os outros - ninguém quer ler isso no meio da regra -,
 * mas ao contrário da célula de preço ele CARREGA informação: diz a seção do livro e a
 * expansão. Então em vez de descartar, extraímos: vira a taxonomia que o pack não tem
 * (`folder` joga 259 itens num balde chamado "Itens").
 *
 * O padrão é estreito de propósito - exige o travessão e a forma "Expansão da … Geração
 * (…)" na última linha -, porque quatro itens antigos têm segundo parágrafo legítimo
 * (Fire Gem e as três Incubadoras) e não podem perder nada.
 *
 * A seção sai como o livro a escreve, sem normalizar: ele mesmo alterna "Itens Seguráveis
 * consumíveis" e "Itens Seguráveis Consumíveis", e uniformizar a caixa seria corrigir a
 * fonte por conta própria. A divergência vai para o relatório.
 */
const TITULO_DE_SECAO = /^(.+?)\s+—\s+(Expansão da .+? Geração \([^)]+\))\s*$/

/**
 * Separa o título de seção do fim da descrição.
 *
 * @returns {{ descricao: string, secao: string | null, expansao: string | null }}
 */
export function tituloDeSecao(descricao = "") {
	const linhas = descricao.split(/\r?\n/)
	const casa = (linhas[linhas.length - 1] ?? "").match(TITULO_DE_SECAO)

	if (casa == null || linhas.length < 2) return { descricao, secao: null, expansao: null }

	return {
		descricao: linhas.slice(0, -1).join("\n").trim(),
		secao: casa[1].trim(),
		expansao: casa[2].trim(),
	}
}


/**
 * A célula de preço vazia da tabela, que a extração anexou ao fim do texto.
 *
 * Aparar é seguro aqui, e só aqui, porque **dois sinais independentes concordam**: o
 * token está no FIM do texto, e `priceRaw` do mesmo item está vazio. Um `N/A` no meio da
 * frase, ou num item que tem preço próprio, é outra coisa - ver `contaminacao`.
 */
const CELULA_DE_PRECO_NO_FIM = /\s*(?:N\/A|Não\s+vendido)\s*$/

/**
 * Remove a célula de preço que a tabela deixou no fim da descrição.
 *
 * @param {string} descricao Texto já em texto simples (ver `texto.mjs`).
 * @param {boolean} temPreco Se o item tem `priceRaw` preenchido.
 * @returns {{ descricao: string, aparado: string | null }}
 *
 * Com preço próprio não aparamos nada: um `N/A` ali veio do item vizinho (Lucky Punch, a
 * ₽1.200, carrega o `N/A` do Memory Disc), e isso é contaminação a relatar, não sobra a
 * limpar.
 */
export function aparicaoDaCelulaDePreco(descricao = "", temPreco = false) {
	if (temPreco) return { descricao, aparado: null }

	const casa = descricao.match(CELULA_DE_PRECO_NO_FIM)
	if (casa == null) return { descricao, aparado: null }

	return { descricao: descricao.slice(0, casa.index).trim(), aparado: casa[0].trim() }
}

/**
 * Marcas de que o texto do item carrega conteúdo que não é dele.
 *
 * Cada uma é uma estrutura que não pode aparecer numa descrição de regra. As quatro
 * pegam os 11 itens estragados da v1.33.0 e nenhum dos outros 332 - o `N/A` do fim já
 * saiu antes, por `aparicaoDaCelulaDePreco`, então o que sobrar está mesmo no lugar
 * errado.
 *
 * @param {string} descricao Texto JÁ aparado da célula do fim.
 * @param {{ temPreco?: boolean, outrosNomes?: Set<string> }} contexto
 */
export function contaminacao(descricao = "", { temPreco = false, outrosNomes = new Set() } = {}) {
	// 1. A célula de preço entrou no meio da frase: "o dano duas N/A vezes".
	if (/\bN\/A\b/.test(descricao)) {
		return temPreco ? "célula de preço de outro item" : "célula de preço no meio da frase"
	}

	// 2. "Não vendido" partido: o "Não" ficou no meio da frase e o "vendido" no fim. Lido
	//    como está, Mega Pedra diz "durante a não batalha" - o oposto da regra.
	if (/\bNão\b[\s\S]{4,}\bvendido\s*$/.test(descricao)) return "rótulo de preço partido na frase"

	// 3. A descrição de outro item emendada: o texto termina com o NOME dele.
	for (const nome of outrosNomes) {
		if (nome.length > 4 && descricao.trimEnd().endsWith(nome)) return "descrição de outro item"
	}

	// 4. Vários itens emendados num texto só: Balm Mushroom traz Pearl, Big Pearl e Pearl
	//    String juntos, e a repetição da fórmula de venda é o que denuncia.
	if ((descricao.match(/nas lojas\./g) ?? []).length > 1) return "vários itens emendados"

	return null
}

/**
 * O livro mandando virar a página.
 *
 * Seis itens dizem "(veja a página seguinte)" ou "(veja abaixo)". Não é defeito de
 * extração - é o livro falando de si -, mas num site não há página seguinte. Fica
 * visível, como o crédito de arte vazado em Swallow, e vai para o relatório.
 */
const REFERENCIA_DE_PAGINA = /\(veja\s+(?:a\s+página\s+seguinte|abaixo|a\s+seguir)\)/i

export function referenciaDePagina(descricao = "") {
	return REFERENCIA_DE_PAGINA.test(descricao)
}

/**
 * O texto foi cortado antes de dizer a coisa que importa.
 *
 * Duas marcas, e as duas estreitas de propósito - um falso positivo aqui acusa o livro de
 * um defeito que ele não tem:
 *
 *   1. A frase termina em preposição ou conjunção ("Fornece +1 em"). É o que um corte no
 *      meio da frase deixa para trás.
 *   2. A frase termina em "de Natureza". Esse é um fato do corpus, não um padrão geral:
 *      cinco Berries (Iapapa, Aguav, Wiki, Figy e Mago) compartilham uma descrição que
 *      acaba exatamente aí, e a Natureza que distingue uma da outra é o que sumiu.
 *
 * O que NÃO é cortado: as 20 Hortelãs terminam sem ponto final ("-2 Força") e estão
 * completas - falta pontuação, não conteúdo. E há cortes que estas marcas não pegam,
 * porque terminam em substantivo ("você pode gastar um uso"): o relatório prefere estar
 * certo no que lista a listar tudo.
 *
 * A âncora é um ESPAÇO antes da palavra, e não `\b`. Com `\b`, `/\ba\s*$/` casaria dentro
 * de "Força": sem a flag `u`, o `\w` do JavaScript é só ASCII, "ç" não é caractere de
 * palavra, e há fronteira entre "ç" e "a". É a mesma armadilha de pt-BR que faz
 * `\bvocê\b` nunca casar, só que ao contrário - aqui ela casa demais.
 */
const CORTES = [
	/(?:^|\s)(?:de|da|do|em|para|com|por|e|ou|que|sem|sobre|entre)\s*$/i,
	/(?:^|\s)de\s+Natureza\s*$/i,
]

export function textoCortado(descricao = "") {
	const limpo = descricao.trim()
	return CORTES.some((padrao) => padrao.test(limpo))
}

/**
 * O texto começa no MEIO de uma frase - o começo se perdeu na extração.
 *
 * Um item na v1.34.0: Extender, cuja descrição inteira no módulo é "tenham sido ativados
 * por ele, seja por Move ou por habilidade passiva." Lido na ficha, não dá para saber o
 * que é "ele" nem o que o item faz.
 *
 * O sinal é simples e seguro: em português a frase abre com maiúscula. Nenhuma das 410
 * descrições publicadas começa com minúscula a não ser essa, e nenhuma começa com
 * pontuação - os textos que abrem com número ou com "+" são legítimos ("+1 na CA").
 */
export function textoComecaNoMeio(descricao = "") {
	return /^[a-zà-ÿ]/.test(descricao.trim())
}
