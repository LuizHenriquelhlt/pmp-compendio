import { describe, expect, it } from "vitest"
import {
	aparicaoDaCelulaDePreco, contaminacao, interpretarPreco, precoDivergente,
	referenciaDePagina, textoCortado, tituloDeSecao,
} from "../ferramentas/itens.mjs"

// As entradas destes testes são do corpus da v1.33.0, não inventadas. O pack de itens é o
// que tem a pior extração de PDF de todos: a tabela do livro vazou para dentro do texto da
// regra de quatro jeitos distintos, e cada um deles está aqui com um caso real.

describe("preço", () => {
	// As duas convenções de milhar convivem no pack: 150 itens escrevem à brasileira e 2 à
	// inglesa. Nenhum dos 343 tem centavos, então os dois separadores só podem ser milhar.
	it.each([
		[ "₽200", 200 ],
		[ "₽1.400", 1400 ],
		[ "₽12.000", 12000 ],
		[ "₽20,000", 20000 ],
		[ "₽12,500", 12500 ],
		// Razz Berry é o único sem separador nenhum.
		[ "₽1000", 1000 ],
		[ "₽25", 25 ],
	])("lê %j como %i", (bruto, valor) => {
		expect(interpretarPreco(bruto)).toBe(valor)
	})

	// 15 itens-chave do livro não são vendidos. "₽0" diria que são de graça.
	it.each([ "", "   ", null, undefined ])("devolve null para %j, e não zero", (bruto) => {
		expect(interpretarPreco(bruto)).toBe(null)
	})

	// Os dois erros reais do módulo: ele leu a vírgula de "₽20,000" como decimal.
	it("acusa os dois preços que o módulo errou por causa da vírgula", () => {
		expect(precoDivergente("₽20,000", 20)).toBe(true)
		expect(precoDivergente("₽12,500", 12)).toBe(true)
	})

	it("não acusa os 341 que batem", () => {
		expect(precoDivergente("₽200", 200)).toBe(false)
		expect(precoDivergente("₽1.400", 1400)).toBe(false)
	})

	// Sem texto não há com o que comparar: o campo é tudo o que existe.
	it("não acusa divergência quando o texto do preço está vazio", () => {
		expect(precoDivergente("", 0)).toBe(false)
	})
})

describe("célula de preço no fim", () => {
	// Prison Bottle, com priceRaw vazio: o "N/A" é a coluna de preço, não regra.
	it("apara o N/A do fim quando o item não tem preço", () => {
		const { descricao, aparado } = aparicaoDaCelulaDePreco("Permite que Hoopa mude de forma. N/A", false)

		expect(descricao).toBe("Permite que Hoopa mude de forma.")
		expect(aparado).toBe("N/A")
	})

	// Pedra-Chave: o rótulo veio inteiro e colado no fim.
	it("apara o 'Não vendido' do fim", () => {
		const { descricao } = aparicaoDaCelulaDePreco(
			'Permite que um Pokémon em seu último estágio "Mega Evolua" (veja abaixo). Não vendido', false)

		expect(descricao).toBe('Permite que um Pokémon em seu último estágio "Mega Evolua" (veja abaixo).')
	})

	// Lucky Punch custa ₽1.200 E tem um "N/A" no texto: ali o N/A veio do Memory Disc, o
	// item vizinho. Aparar esconderia a contaminação em vez de relatá-la.
	it("não apara nada de um item que tem preço próprio", () => {
		const texto = "Altera o tipo de Silvally e seu Move Multi Attack. N/A Memory Disc"
		const { descricao, aparado } = aparicaoDaCelulaDePreco(texto, true)

		expect(descricao).toBe(texto)
		expect(aparado).toBe(null)
	})

	it("não mexe num texto limpo", () => {
		const texto = "Uma mochila que pode suportar até 15kg."
		expect(aparicaoDaCelulaDePreco(texto, false).descricao).toBe(texto)
	})
})

describe("contaminação", () => {
	// Lustrous Orb e Adamant Orb: a célula entrou no MEIO da frase.
	it("acha a célula de preço no meio da frase", () => {
		expect(contaminacao("Role o dano duas N/A vezes, permitindo que você escolha o maior resultado."))
			.toBe("célula de preço no meio da frase")
	})

	// Com preço próprio, o N/A veio de outro item — a marca diz qual é o caso.
	it("distingue a célula que veio de outro item", () => {
		expect(contaminacao("Altera o tipo de Silvally. N/A Memory Disc", { temPreco: true }))
			.toBe("célula de preço de outro item")
	})

	// Mega Pedra: "Não" e "vendido" entraram em pontos diferentes. Lido como está, a regra
	// vira o oposto — "durante a não batalha".
	it("acha o rótulo de preço partido no meio da frase", () => {
		expect(contaminacao("Permite que ele Mega Evolua durante a Não batalha em resposta à "
			+ "Pedra-Chave de seu Treinador. vendido"))
			.toBe("rótulo de preço partido na frase")
	})

	// Water Gem termina com o nome do Arceus Plate, cuja descrição vazou junto.
	it("acha a descrição de outro item pelo nome no fim", () => {
		expect(contaminacao("Adiciona o bônus de proficiência ao dano dos Moves do mesmo tipo do Arceus Plate",
			{ outrosNomes: new Set([ "Arceus Plate", "Memory Disc" ]) }))
			.toBe("descrição de outro item")
	})

	// Balm Mushroom traz Pearl, Big Pearl e Pearl String emendados; a fórmula de venda
	// repetida é o que denuncia.
	it("acha vários itens emendados pela fórmula repetida", () => {
		expect(contaminacao("Pode ser vendido por um preço alto nas lojas. Pearl nas lojas. "
			+ "Big Pearl por um preço alto nas lojas."))
			.toBe("vários itens emendados")
	})

	// Guarda-corpo: a fórmula de venda aparece UMA vez em vários itens legítimos (Rare
	// Bone, Comet Shard). Uma ocorrência não é contaminação.
	it("não acusa o item que só menciona a venda uma vez", () => {
		expect(contaminacao("Um osso de valor para o estudo da arqueologia dos Pokémon. "
			+ "Pode ser vendido por um preço alto nas lojas."))
			.toBe(null)
	})

	it("não acusa um texto limpo", () => {
		expect(contaminacao("Tênis altos e resistentes que protegem os pés de terrenos perigosos."))
			.toBe(null)
	})
})

describe("referência à página do livro", () => {
	it.each([
		"Usado para pescar Pokémon (veja a página seguinte).",
		"Usado para registrar Pokémon (veja abaixo).",
	])("acha %j", (texto) => {
		expect(referenciaDePagina(texto)).toBe(true)
	})

	it("não acusa um texto sem referência", () => {
		expect(referenciaDePagina("Restaura 2d4+2 PV.")).toBe(false)
	})
})

describe("texto cortado", () => {
	// As cinco Berries que perderam justamente a palavra que as distingue.
	it("acha o corte das Berries de Natureza", () => {
		expect(textoCortado("Restaura 3d10+5 PV. Ativado quando o Pokémon cai abaixo de 25% de PV, "
			+ "mas causa confusão caso seja de Natureza")).toBe(true)
	})

	it.each([
		"Calças que fornecem liberdade de movimento. Fornece +1 em",
		"Tênis desenhados para reduzir o ruído ao caminhar. Fornece +1 em",
	])("acha o corte em %j", (texto) => {
		expect(textoCortado(texto)).toBe(true)
	})

	// As 20 Hortelãs terminam sem ponto final, mas a frase está COMPLETA: falta
	// pontuação, não conteúdo. Acusá-las encheria o relatório de ruído.
	//
	// É também o caso que prova por que a âncora é um espaço e não ``: com ``, o
	// padrão `/a\s*$/` casaria o "a" final de "Força", porque sem a flag `u` o "ç" não
	// é caractere de palavra e abre uma fronteira ali.
	it.each([
		"Altera sua Natureza para Preguiçoso, garantindo +2 em Constituição, -2 Força",
		"Altera sua Natureza para Astuto, garantindo +1 na CA, -2 Força",
		"Altera sua Natureza para Sereno, garantindo +2 em Constituição, -2 Destreza",
	])("não acusa a Hortelã %j, que só não tem ponto final", (texto) => {
		expect(textoCortado(texto)).toBe(false)
	})

	// Um corte que estas marcas NÃO pegam, porque termina em substantivo. Está aqui para
	// registrar o limite do parser: o relatório prefere estar certo no que lista.
	it("não pega o corte que termina em substantivo — limite declarado", () => {
		expect(textoCortado("Com uma ação, você pode gastar um uso")).toBe(false)
	})

	it("não acusa um texto terminado em ponto", () => {
		expect(textoCortado("Restaura 2d4+2 PV.")).toBe(false)
	})
})

describe("título de seção", () => {
	// A v1.34.0 acrescentou 77 itens (expansões de Galar e Paldea) e TODOS trazem o
	// cabeçalho da seção do livro como última linha. É vazamento de diagramação, mas ao
	// contrário da célula de preço ele carrega informação: vira a taxonomia que o pack não
	// tem, já que `folder` joga 259 itens num balde chamado "Itens".
	it.each([
		[ "Evolui Charcadet para Armarouge.", "Itens Evolutivos", "Expansão da Nona Geração (Paldea)" ],
		[ "Um broto de bambu raro.", "Tesouros e itens destinados à venda", "Expansão da Nona Geração (Paldea)" ],
		[ "Permite Terastalizar no tipo Aço.", "Lista de Tera Shards", "Expansão da Nona Geração (Paldea)" ],
		[ "Restaura PP.", "Consumíveis", "Expansão da Oitava Geração (Galar)" ],
	])("separa %j da seção %j", (texto, secao, expansao) => {
		const lido = tituloDeSecao(`${texto}
${secao} — ${expansao}`)

		expect(lido.descricao).toBe(texto)
		expect(lido.secao).toBe(secao)
		expect(lido.expansao).toBe(expansao)
	})

	// Quatro itens antigos têm segundo parágrafo legítimo (Fire Gem e as três
	// Incubadoras). O padrão exige o travessão e a forma "Expansão da … Geração (…)"
	// justamente para não comê-los.
	it("não toca em segundo parágrafo que não é título de seção", () => {
		const texto = `Esta Incubadora reduz o Tempo de Eclosão.
Um segundo parágrafo comum.`
		const lido = tituloDeSecao(texto)

		expect(lido.descricao).toBe(texto)
		expect(lido.secao).toBe(null)
	})

	// Os 343 itens da v1.33.0 são um parágrafo só.
	it("não mexe em descrição de uma linha", () => {
		const lido = tituloDeSecao("Restaura 2d4+2 PV.")

		expect(lido.descricao).toBe("Restaura 2d4+2 PV.")
		expect(lido.secao).toBe(null)
		expect(lido.expansao).toBe(null)
	})

	// O título pode vir depois de um texto de dois parágrafos (Dynamax Candy).
	it("pega o título mesmo quando o texto já tem dois parágrafos", () => {
		const lido = tituloDeSecao(`Aumenta o nível de Dynamax.
(Usado apenas na Opção 3.)
Consumíveis — Expansão da Oitava Geração (Galar)`)

		expect(lido.descricao).toBe(`Aumenta o nível de Dynamax.
(Usado apenas na Opção 3.)`)
		expect(lido.secao).toBe("Consumíveis")
	})
})
