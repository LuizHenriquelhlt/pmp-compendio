import { describe, expect, it } from "vitest"
import {
	contaminacaoNaDescricao, habilidadePendente, interpretarDeslocamentoConcedido,
	interpretarOutrosEfeitos, pesEmMetros, prosaDaDescricao,
} from "../ferramentas/megas.mjs"

// As frases destes testes são as DEZ entradas reais de `otherEffects` da v1.33.0 - o corpus
// inteiro da família, não uma amostra - mais as aberturas e as contaminações reais de
// `description`. É o que lhes dá valor: cada uma destas entradas contradiz um campo
// estruturado da própria pedra, e é por isso que o pipeline lê o texto aqui.

const efeitos = (...entradas) => interpretarOutrosEfeitos(entradas).efeitos
const textos = (...entradas) => interpretarOutrosEfeitos(entradas).textos
const naoLido = (...entradas) => interpretarOutrosEfeitos(entradas).naoInterpretado

describe("habilidade concedida", () => {
	// Mega Floette tem `passiveAbility: ""` e a habilidade só aqui - e Fairy Aura EXISTE no
	// pack. Quem lê só o campo publica "sem habilidade" e a ficha de Fairy Aura nunca
	// descobre que uma Mega a concede.
	it("lê a habilidade que só o texto declara", () => {
		expect(efeitos("Ganha a habilidade Fairy Aura")).toEqual([
			{ tipo: "habilidadeConcedida", nome: "Fairy Aura" },
		])
	})

	// Mega Abomasnow, com `passiveAbility: ""`: a fonte cortou a frase no meio do
	// parêntese. "Snow Warning" existe no pack, mas o nome capturado inclui o fragmento.
	// Aparar no "(" devolveria o nome certo por sorte - marcamos o corte e deixamos o
	// relatório pedir a correção na fonte.
	it("marca o nome truncado na fonte em vez de aparar o fragmento", () => {
		expect(efeitos("Mantém a habilidade Snow Warning (torna-se Snow")).toEqual([
			{ tipo: "habilidadeConcedida", nome: "Snow Warning (torna-se Snow", truncado: true },
		])
	})

	// Mega Hawlucha já tem No Guard em `passiveAbility`: esta é uma SEGUNDA habilidade, e
	// é a marca de pendência do módulo. Lida como nome, viraria uma ficha chamada
	// "[ainda a ser lançada]".
	it("trata a marca de pendência como ausência sinalizada, não como nome", () => {
		expect(efeitos("Ganha a habilidade [ainda a ser lançada]")).toEqual([
			{ tipo: "habilidadePendente" },
		])
	})

	it("reconhece a marca de pendência isolada", () => {
		expect(habilidadePendente("[ainda a ser lançada]")).toBe(true)
		expect(habilidadePendente("Fairy Aura")).toBe(false)
		expect(habilidadePendente("")).toBe(false)
	})
})

describe("tamanho", () => {
	// A única frase da família no corpus, e ela NÃO casa: a escala do PMP é Minúsculo,
	// Pequeno, Médio, Grande, Enorme e Gigantesco - `huge` é "Enorme". "Imenso" é uma
	// sétima palavra, e mapeá-la para `huge` por parecença seria adivinhar um degrau da
	// escala. Mega Hawlucha tem `size: null` no campo, então o tamanho só existe aqui.
	it("não adivinha um degrau da escala para uma palavra fora do vocabulário", () => {
		const frase = "Aumenta de tamanho para Imenso"

		expect(efeitos(frase)).toEqual([])
		expect(naoLido(frase)).toEqual([ { familia: "tamanho", frase } ])
	})

	// A frase continua visível: o relatório é para corrigir a fonte, e quem consulta no
	// meio de uma sessão precisa da regra do livro mesmo sem a pílula de resumo.
	it("mantém a frase visível mesmo sem conseguir estruturá-la", () => {
		expect(textos("Aumenta de tamanho para Imenso")).toEqual([ "Aumenta de tamanho para Imenso" ])
	})

	// Guarda-corpo: se a fonte for corrigida para uma palavra da escala, a família lê.
	it("lê um tamanho que esteja na escala do PMP", () => {
		expect(efeitos("Aumenta de tamanho para Enorme")).toEqual([ { tipo: "tamanho", chave: "huge" } ])
	})
})

describe("deslocamento", () => {
	// Mega Delphox e Mega Tatsugiri têm `movementGrants: []` e o valor é ABSOLUTO (40 pés),
	// ao contrário do `equalTo: "caminhada"` que o campo usa nas cinco que o preenchem.
	it("lê o voo concedido que o campo não traz", () => {
		expect(efeitos("Ganha deslocamento de voo de 40 pés (12 metros)")).toEqual([
			{ tipo: "deslocamentoConcedido", modo: "voo", metros: 12 },
		])
	})

	// "flutuação" não é modo na Pokédex: ela escreve "6m de voo (flutuação)" em 98
	// espécies e nunca a palavra sozinha. Entra como voo + flutuação, que é a forma que
	// `interpretarDeslocamento` produz para as espécies.
	it("lê flutuação como voo com a marca de flutuação", () => {
		expect(efeitos("Ganha deslocamento de flutuação de 40 pés (12 metros)")).toEqual([
			{ tipo: "deslocamentoConcedido", modo: "voo", flutuacao: true, metros: 12 },
		])
	})

	// Mega Eelektross: `movementBonusFeet` é **0** e o bônus só existe no texto. Repare no
	// ESPAÇO depois do `+` - um `/^\+\d+/` não casa.
	it("lê o bônus com espaço depois do sinal, que o campo zerado esconde", () => {
		expect(efeitos("+ 10 pés (3 metros) em todos os seus deslocamentos")).toEqual([
			{ tipo: "deslocamentoBonus", metros: 3 },
		])
	})

	// Mega Abomasnow: metade não é delta fixo, e nenhum campo do módulo expressa proporção.
	it("lê a redução pela metade, que nenhum campo expressa", () => {
		expect(efeitos("Seu deslocamento é reduzido pela metade")).toEqual([
			{ tipo: "deslocamentoMetade" },
		])
	})

	// Mega Golisopod: nenhum campo do módulo expressa remoção. "nado" é como a fonte
	// escreve; o compêndio chama de "natação".
	it("lê a perda de um modo e normaliza o nome do modo", () => {
		expect(efeitos("Perde seu deslocamento de nado")).toEqual([
			{ tipo: "deslocamentoPerdido", modo: "natação" },
		])
	})

	it("não confunde conceder com perder", () => {
		expect(efeitos("Perde seu deslocamento de nado", "Ganha deslocamento de voo de 40 pés (12 metros)"))
			.toEqual([
				{ tipo: "deslocamentoPerdido", modo: "natação" },
				{ tipo: "deslocamentoConcedido", modo: "voo", metros: 12 },
			])
	})
})

describe("pés em metros", () => {
	// O fator não é escolha nossa: o corpus declara os dois lados três vezes, sempre
	// 0,3 m/pé - a convenção do dnd5e em português (1,5 m por 5 pés). A Pokédex grava
	// deslocamento em metros em 1.148 das 1.149, sem uma única ocorrência de "pés".
	it.each([
		[ 40, 12 ],
		[ 10, 3 ],
		[ 20, 6 ],
		[ 15, 4.5 ],
		[ 5, 1.5 ],
		// `movementBonusFeet` é negativo em cinco pedras (Mega Darkrai e Mega Scolipede
		// perdem 15 pés): o campo é delta, não total.
		[ -15, -4.5 ],
	])("%i pés = %s metros", (pes, metros) => {
		expect(pesEmMetros(pes)).toBe(metros)
	})
})

describe("deslocamento concedido pelo campo", () => {
	it("traduz as cinco entradas de movementGrants do corpus", () => {
		expect(interpretarDeslocamentoConcedido({ type: "voo", equalTo: "caminhada" }))
			.toEqual({ modo: "voo", igualA: "caminhada" })
		expect(interpretarDeslocamentoConcedido({ type: "flutuação", equalTo: "caminhada" }))
			.toEqual({ modo: "voo", flutuacao: true, igualA: "caminhada" })
	})

	// Modo fora do vocabulário não vira dado - `construir.mjs` o manda para o relatório.
	it("devolve nada para um modo que o compêndio não conhece", () => {
		expect(interpretarDeslocamentoConcedido({ type: "teletransporte", equalTo: "caminhada" })).toBe(null)
	})
})

describe("as três pedras especiais", () => {
	// Sem sinal de família nenhuma: são regras de ATIVAÇÃO, não deltas. Estruturá-las seria
	// modelar um vocabulário a partir de três frases; exibidas, continuam sendo a regra
	// inteira. O relatório não deve listá-las - elas não declaram um efeito que o parser
	// deixou passar.
	it.each([
		"Reversão Primal, não Mega Evolução: nível mínimo 10, 1 uso por descanso (2 usos a partir do "
			+ "nível 15), exige segurar a Red Orb. Mesmas regras de obediência/lealdade do Kyogre Primal.",
		"Reversão Primal, não Mega Evolução: nível mínimo 10, 1 uso por descanso (2 usos a partir do "
			+ "nível 15), exige segurar a Blue Orb. Não depende de Treinador ou lealdade — Pokémon Primal "
			+ "sem lealdade máxima não obedece comandos e ataca ameaças percebidas por conta própria.",
		"Rayquaza pode Mega Evoluir assim que aprende o Move Dragon Ascent, sem precisar de Mega Pedra "
			+ "(o Mestre pode exigir um Meteorite ou inventar uma Rayquazanite).",
	])("mantém a regra de ativação como prosa, sem relatar", (frase) => {
		expect(efeitos(frase)).toEqual([])
		expect(textos(frase)).toEqual([ frase ])
		expect(naoLido(frase)).toEqual([])
	})
})

describe("as duas entradas de Mega Hawlucha juntas", () => {
	// A pedra com mais texto do pack: uma habilidade pendente (além do No Guard que o campo
	// já traz) e um tamanho fora da escala. Uma estrutura, a outra vai para o relatório.
	it("estrutura o que dá e relata o que não dá, na mesma pedra", () => {
		const entradas = [ "Ganha a habilidade [ainda a ser lançada]", "Aumenta de tamanho para Imenso" ]
		const lido = interpretarOutrosEfeitos(entradas)

		expect(lido.efeitos).toEqual([ { tipo: "habilidadePendente" } ])
		expect(lido.naoInterpretado).toEqual([ { familia: "tamanho", frase: "Aumenta de tamanho para Imenso" } ])
		expect(lido.textos).toEqual([ "Aumenta de tamanho para Imenso" ])
	})
})

describe("prosa da descrição", () => {
	// A forma canônica, 66 das 93.
	it("remove a deixa com sujeito", () => {
		expect(prosaDaDescricao("Victreebel recebe os seguintes benefícios: Devido ao ácido transbordando "
			+ "dentro do corpo de Mega Victreebel, ele não captura mais presas."))
			.toBe("Devido ao ácido transbordando dentro do corpo de Mega Victreebel, ele não captura mais presas.")
	})

	// 11 descrições perderam o sujeito na extração e começam direto na deixa (Mega Glalie,
	// Absol, Golurk, Altaria, Pyroar, Scizor, Steelix, Absol Z, Latias, Latios, Pinsir).
	it("remove a deixa mesmo quando a fonte perdeu o sujeito", () => {
		expect(prosaDaDescricao("recebe os seguintes benefícios: Mega Glalie pode liberar nevascas "
			+ "intermináveis a partir de sua boca quebrada."))
			.toBe("Mega Glalie pode liberar nevascas intermináveis a partir de sua boca quebrada.")
	})

	// Três trazem um "Evoluir," colado na frente (Kangaskhan, Crabominable, Abomasnow).
	it("remove a deixa com fragmento colado na frente", () => {
		expect(prosaDaDescricao("Evoluir, Mega Kangaskhan recebe os seguintes benefícios: A mãe e o "
			+ "filhote lutam juntos."))
			.toBe("A mãe e o filhote lutam juntos.")
	})

	// As 3 especiais têm abertura própria, que NÃO é deixa e precisa sobreviver inteira.
	it("não toca a abertura própria das pedras especiais", () => {
		const groudon = "Groudon não Mega Evolui — passa pela Reversão Primal, retornando a um poder que "
			+ "já teve ao absorver a força da natureza ao redor."

		expect(prosaDaDescricao(groudon)).toBe(groudon)
	})
})

describe("contaminação da descrição", () => {
	// Mega Pinsir: a entrada da pedra Aerodactylite vazou para dentro. Aerodactylite não
	// está no pack - é texto de Mega que o módulo não publica, na descrição de outra.
	it("acha a entrada de outra pedra", () => {
		expect(contaminacaoNaDescricao("Mega Pinsir consegue erguer oponentes com até 10 vezes o seu "
			+ "próprio peso. Aerodactylite Permite que Aerodactyl Mega Evolua para Mega Aerodactyl "
			+ "enquanto estiver segurando a pedra."))
			.toBe("entrada de outra pedra")
	})

	// Mega Delphox: um bloco de estatísticas de espécie INTEIRO (o de Eternal Flower
	// Floette). Publicada como está, a ficha mostraria "CA: 17" e a regra de Flower Veil
	// como se fossem de Mega Delphox.
	it("acha o bloco de estatísticas de espécie", () => {
		expect(contaminacaoNaDescricao("Os dois galhos em chamas se movem sozinhos. Bloco de estatísticas "
			+ "Tipo: Fada SR: 15 Tamanho: Pequeno CA: 17 Pontos de Vida: 161 Dado de Vida: d8"))
			.toBe("bloco de estatísticas de espécie")
	})

	// Mega Hawlucha: o statblock do Move Nihil Light, com níveis superiores e observações.
	it("acha o statblock de Move", () => {
		expect(contaminacaoNaDescricao("Ele gosta de exibir sua força recém-adquirida. Nihil Light (Luz do "
			+ "Vazio) Tipo: Dragão Poder do Move: FOR/SAB Tempo de Execução: 1 ação PP: 5"))
			.toBe("statblock de Move")
	})

	it("acha o segundo lead-in quando duas descrições foram unidas", () => {
		expect(contaminacaoNaDescricao("Hawlucha recebe os seguintes benefícios: A Mega Evolução aumenta "
			+ "suas capacidades. Mega Zygarde recebe os seguintes benefícios: nasce das emoções das pessoas."))
			.toBe("segunda descrição de Mega")
	})

	// As 89 limpas não podem casar. Esta é a maior delas, até o fim - se as marcas fossem
	// largas, a descrição mais longa seria a primeira a cair.
	it("não acusa a maior descrição limpa do corpus", () => {
		expect(contaminacaoNaDescricao("Meganium recebe os seguintes benefícios: O aroma que emana das "
			+ "pétalas de Mega Meganium acalma. Diz-se que a Mega Evolução tornou seu estilo de luta mais "
			+ "ousado, mas isso também o fez ficar mais descuidado em certas situações."))
			.toBe(null)
	})

	// Guarda-corpo do sinal mais arriscado: "Mega Evolua" aparece em prosa legítima de
	// várias descrições, e só a frase de abertura de OUTRA pedra ("Permite que X Mega
	// Evolua") é contaminação.
	it("não confunde falar de Mega Evolução com a abertura de outra pedra", () => {
		expect(contaminacaoNaDescricao("Quando Mega Evolui, Pinsir fica em um estado constante de "
			+ "agitação, e raramente toca o chão devido à sua capacidade de voar."))
			.toBe(null)
	})
})
