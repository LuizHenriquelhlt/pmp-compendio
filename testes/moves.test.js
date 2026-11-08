import { describe, expect, it } from "vitest"
import {
	classificarResolucao, criarReparadorDeMoves, emMetros, interpretarAlcance, interpretarAtivacao,
	interpretarDados, interpretarDuracao, normalizarMove, prioridadeDeclarada, vazamentoNoTextoDeMove,
} from "../ferramentas/moves.mjs"

// Como em `efeitos.test.js`, as entradas vêm do corpus da v1.33.0.

describe("alcance em metros", () => {
	it.each([
		[ "40 pés (12 metros)", "12m" ],
		[ "15 pés (4,5 metros)", "4,5m" ],
		[ "Pessoal (cone de 40 pés / 12 metros)", "Pessoal (cone de 12m)" ],
		[ "Corpo a corpo / 40 pés (12 metros)", "Corpo a corpo / 12m" ],
		// Sem espaço na barra, e com a ordem invertida: as duas formas estão no módulo.
		[ "Pessoal (raio de 60 pés/18 metros)", "Pessoal (raio de 18m)" ],
		[ "Pessoal (20 pés / 6 metros de raio)", "Pessoal (6m de raio)" ],
		[ "Corpo a corpo (alcance de 15 pés / 4,5 metros)", "Corpo a corpo (alcance de 4,5m)" ],
		[ "Pessoal (semicírculo de 10 pés / 3 metros)", "Pessoal (semicírculo de 3m)" ],
		// Nada de número para converter: fica como está.
		[ "Corpo a corpo", "Corpo a corpo" ],
		[ "Pessoal", "Pessoal" ],
		[ "Variável", "Variável" ],
		[ "Corpo a Corpo / alcance de deslocamento", "Corpo a Corpo / alcance de deslocamento" ],
	])("%j → %j", (bruto, esperado) => {
		expect(emMetros(bruto)).toBe(esperado)
	})

	it("estrutura o corpo a corpo", () => {
		expect(interpretarAlcance("Corpo a corpo", 0, true)).toMatchObject({
			texto: "Corpo a corpo", metros: 0, corpoACorpo: true, pessoal: false, forma: null, truncado: false,
		})
	})

	it("estrutura a área pessoal, separando o alcance da forma", () => {
		// Sem `forma`, "12m" e "cone de 12m" ficariam iguais na tela - a diferença entre
		// atingir um alvo e atingir todo mundo na frente.
		expect(interpretarAlcance("Pessoal (cone de 40 pés / 12 metros)", 12, false)).toMatchObject({
			texto: "Pessoal (cone de 12m)", metros: 12, pessoal: true, forma: "cone",
		})
	})

	it("marca o alcance variável", () => {
		expect(interpretarAlcance("Variável", 0, false)).toMatchObject({ variavel: true, metros: 0 })
	})

	it("acusa o alcance truncado na fonte", () => {
		const teraStarstorm = "50 pés (15 metros) / Corpo a Corpo / cone (50 pés / 15"
		expect(interpretarAlcance(teraStarstorm, 15, true).truncado).toBe(true)
	})

	// Teleport na edição revisada (v1.37.0 do módulo): todos os pés convertidos, e a frase
	// para em "de" - falta "modificador de Sabedoria".
	it("acusa o alcance que termina no meio da frase", () => {
		const teleport = "30 pés (9 metros) + 5 pés (1,5 metros) para cada ponto de"
		expect(interpretarAlcance(teleport, 9, false).truncado).toBe(true)
	})

	it.each([ "40 pés (12 metros)", "Pessoal (cone de 15 pés (4,5 metros))", "Variável", "Toque" ])(
		"não acusa o alcance inteiro %j",
		(bruto) => {
			expect(interpretarAlcance(bruto, 0, false).truncado).toBe(false)
		},
	)
})

describe("ativação", () => {
	it("lê os dois modos de um Move que serve nas duas horas", () => {
		// `activation.type` do módulo diz só `action` nestes 18 Moves.
		expect(interpretarAtivacao("1 ação / reação").modos).toEqual([ "reacao", "acao" ])
	})

	it("não conta ação bônus como ação", () => {
		expect(interpretarAtivacao("1 ação bônus").modos).toEqual([ "bonus" ])
	})

	it("lê ação e ação bônus na mesma entrada", () => {
		expect(interpretarAtivacao("1 ação / ação bônus").modos.sort()).toEqual([ "acao", "bonus" ])
	})

	it.each([ "reação", "Reação", "1 reação" ])("normaliza %j como reação", (bruto) => {
		expect(interpretarAtivacao(bruto).modos).toEqual([ "reacao" ])
	})

	it("separa recarga e carga do modo de ativação", () => {
		expect(interpretarAtivacao("1 ação, recarga")).toMatchObject({ modos: [ "acao" ], recarga: true, carga: false })
		expect(interpretarAtivacao("1 ação, carga")).toMatchObject({ modos: [ "acao" ], carga: true, recarga: false })
	})
})

describe("duração", () => {
	it("tira o ponto final que o módulo deixou solto", () => {
		expect(interpretarDuracao("Instantânea, 3 rodadas.").texto).toBe("Instantânea, 3 rodadas")
	})

	it("marca concentração", () => {
		expect(interpretarDuracao("1 rodada, Concentração")).toMatchObject({ concentracao: true, instantanea: false })
	})

	it("marca instantânea", () => {
		expect(interpretarDuracao("Instantânea")).toMatchObject({ instantanea: true, concentracao: false })
	})
})

describe("categoria de resolução", () => {
	it("lê ataque", () => {
		expect(classificarResolucao("Faça um ataque corpo a corpo -2 contra uma criatura, causando 3d8 + MOVE de dano de grama."))
			.toEqual([ "ataque" ])
	})

	it("lê salvaguarda", () => {
		expect(classificarResolucao("Todas as criaturas na área devem fazer um teste de CON contra sua CD de Move."))
			.toEqual([ "salvaguarda" ])
	})

	// O caso que justifica ler do texto: 75 Moves assim estão marcados como `attack` no
	// Foundry, porque o Foundry não tem disputa como primitiva.
	it("lê disputa, que o módulo grava como ataque", () => {
		expect(classificarResolucao("Role 1d20 + MOVE + 4 e compare o resultado com 10 + CAR do alvo."))
			.toEqual([ "disputa" ])
	})

	it.each([
		"Este Move é garantido de acertar, causando 2d8 + MOVE de dano de aço.",
		"Você dispara até 2 projéteis em qualquer criatura que possa ver dentro do alcance, com acerto garantido.",
		"Este Move sempre acerta, causando 2d6 + MOVE de dano elétrico.",
		"Você lança uma bola de aço que busca uma criatura dentro do alcance, nunca errando o alvo.",
	])("lê acerto garantido em %j", (descricao) => {
		expect(classificarResolucao(descricao)).toContain("automatico")
	})

	it("acumula ataque e salvaguarda quando o Move pede os dois", () => {
		const mudShot = "Faça um ataque à distância contra um alvo. Em um acerto, o alvo deve fazer "
			+ "um teste de FOR contra sua CD de Move, ou ter sua Velocidade reduzida em 1 estágio."

		expect(classificarResolucao(mudShot).sort()).toEqual([ "ataque", "salvaguarda" ])
	})

	it("não chama de acerto garantido o Move cujos golpes EXTRA acertam sozinhos", () => {
		const armThrust = "Faça um ataque corpo a corpo em uma criatura, causando 1d4 + MOVE de dano lutador "
			+ "em um acerto. Para cada golpe adicional, você pode imediatamente realizar um novo ataque "
			+ "contra o mesmo alvo com acerto garantido, causando 1d4 + MOVE de dano lutador."

		expect(classificarResolucao(armThrust)).toEqual([ "ataque" ])
	})

	it("diz 'nenhuma' quando o Move não pede rolagem, em vez de adivinhar", () => {
		expect(classificarResolucao("Você gera uma energia de cura para recuperar 2d6 + MOVE pontos de vida."))
			.toEqual([ "nenhuma" ])
	})

	// Aurora Veil na edição revisada (v1.37.0 do módulo): o Move SE DEFENDE de ataques.
	it("não chama de ataque o 'dano recebido de ataques corpo a corpo'", () => {
		const auroraVeil = "Enquanto estiver protegido por ele, o dano recebido de ataques corpo a corpo e à "
			+ "distância é reduzido pela metade durante cinco rodadas."

		expect(classificarResolucao(auroraVeil)).toEqual([ "nenhuma" ])
	})

	it.each([
		"Quando sujeito a um ataque corpo a corpo, você pode gastar sua reação para aumentar sua Defesa.",
		"Se uma criatura direcionar um ataque corpo a corpo a você ou tentar agarrá-lo, ela sofre 1d8 de dano.",
		"Se algum ataque corpo a corpo for direcionado a você durante o efeito, o atacante tem a Defesa reduzida.",
	])("não chama de ataque o Move que se defende de um em %j", (descricao) => {
		expect(classificarResolucao(descricao)).toEqual([ "nenhuma" ])
	})

	it.each([
		"Você pode se mover até 15 pés (4,5 metros) e fazer um ataque corpo a corpo contra um alvo.",
		"Você pode usar sua reação para desferir um ataque corpo a corpo contra a criatura que o atingiu.",
		"Você salta no ar e, no seu próximo turno, desce em um ataque corpo a corpo com vantagem.",
		"Faça até três ataques corpo a corpo -1, um depois do outro.",
	])("continua lendo o ataque que o Move faz em %j", (descricao) => {
		expect(classificarResolucao(descricao)).toEqual([ "ataque" ])
	})
})

describe("texto de outro documento num campo de Move", () => {
	// Nihil Light na v1.36.0: os Níveis Superiores levaram o capítulo de Mega Evoluções.
	it("acusa o capítulo de Mega Evoluções", () => {
		const nihilLight = "Os dados de dano para este Move mudam para 6d10 no nível 5, 8d10 no nível 10 e 10d10 "
			+ "no nível 17. Crabominite Permite que Crabominable Mega Evolua para Mega Crabominable enquanto "
			+ "estiver segurando esta pedra."

		expect(vazamentoNoTextoDeMove(nihilLight)).toBe("capitulo-de-mega")
	})

	it.each([
		"Os dados de dano para este Move mudam para 3d10 no nível 5, 4d10 no nível 10 e 5d10 no nível 17. A rte feita por freqrexy",
		"Os dados de dano mudam para 4d10 no nível 5 e 6d10 no nível 17. Overheat Art e f e i t a p or (Superaquecimento) 1 3 a l r o g",
		"Swallow não pode ser escolhido pelo Move Assist. Arte feita por alguém",
		"Os dados de dano para este Move mudam para 2d10 no nível 5, 4d6 no nível 10 e 4d8 no nível 17. Feito por Yusiso",
		"Os dados de dano mudam para 3d6 no nível 5, 3d8 no nível 10 e 5d6 no nível 17. fei ta por muds aw",
	])("acusa o crédito de arte com as letras separadas em %j", (texto) => {
		expect(vazamentoNoTextoDeMove(texto)).toBe("credito-de-arte")
	})

	it.each([
		"Os dados de dano para este Move mudam para 4d6 no nível 5, 4d8 no nível 10 e 4d10 no nível 17. po r",
		"Em uma falha, o alvo fica Queimado. Cri",
		"Os dados de dano mudam para 2d10 no nível 5 e 6d6 no nível 17. (Descansar) amemoriii",
	])("acusa a sobra de crédito no fim em %j", (texto) => {
		expect(vazamentoNoTextoDeMove(texto)).toBe("sobra-no-fim")
	})

	it.each([
		"Você ataca com a parte por baixo da carapaça.",
		"Este Move permite que o usuário Mega Evoluído mantenha o tipo.",
		"Os dados de dano para este Move mudam para 2d8 no nível 5.",
		"Impõe desvantagem em qualquer ataque à distância feito por uma criatura mirando em outra.",
		"O alvo recupera pontos de vida (mínimo 1)",
	])("deixa em paz o texto legítimo %j", (texto) => {
		expect(vazamentoNoTextoDeMove(texto)).toBe(null)
	})
})

describe("dados de dano e de cura", () => {
	// O módulo nomeia o campo `level`, e é assim que ele chega do pack.
	it("lê dano quando o bloco de níveis fala de dano, renomeando level → nivel", () => {
		expect(interpretarDados({
			base: "3d8",
			escalonamento: [ { level: 5, formula: "6d6" }, { level: 10, formula: "6d8" } ],
			niveisSuperiores: "Os dados de dano para este Move mudam para 6d6 no nível 5 e 6d8 no nível 10.",
			descricao: "causando 3d8 + MOVE de dano de grama em um acerto",
		})).toEqual({
			dano: { base: "3d8", escalonamento: [ { nivel: 5, formula: "6d6" }, { nivel: 10, formula: "6d8" } ] },
			cura: null,
			naoClassificado: null,
		})
	})

	// O erro que o módulo convida a cometer: os 16 Moves que escalonam CURA guardam o
	// escalonamento em `damage.scaling`, e publicá-lo como dano é inventar uma regra.
	it("não chama de dano o escalonamento de cura", () => {
		const roost = interpretarDados({
			base: "",
			escalonamento: [ { level: 5, formula: "2d10" }, { level: 10, formula: "4d8" } ],
			niveisSuperiores: "Os dados de cura para este Move mudam para 2d10 no nível 5 e 4d8 no nível 10.",
			descricao: "Ao fazer isso, recupere imediatamente 2d6 + MOVE pontos de vida.",
		})

		expect(roost.dano).toBeNull()
		expect(roost.cura.escalonamento).toHaveLength(2)
	})

	it("reconhece cura quando a base está em damage.baseFormula", () => {
		// Recover guarda 2d6 de cura no campo de dano.
		expect(interpretarDados({
			base: "2d6",
			escalonamento: [],
			niveisSuperiores: "Os dados de cura para este Move mudam para 2d10 no nível 5.",
			descricao: "Você gera uma energia de cura para recuperar 2d6 + MOVE pontos de vida.",
		})).toMatchObject({ dano: null, cura: { base: "2d6" } })
	})

	it("usa a descrição quando não há bloco de níveis", () => {
		expect(interpretarDados({
			base: "1d4",
			escalonamento: [],
			niveisSuperiores: "",
			descricao: "causando 1d4 + MOVE de dano do tipo inseto em um acerto",
		})).toMatchObject({ dano: { base: "1d4" } })
	})

	it("sobrevive ao erro de digitação 'de dado' no lugar de 'de dano'", () => {
		// Sete Moves do corpus escrevem assim; o bloco de níveis desfaz a dúvida.
		expect(interpretarDados({
			base: "1d8",
			escalonamento: [ { nivel: 5, formula: "1d10" } ],
			niveisSuperiores: "O dado de dano para este Move muda para 1d10 no nível 5.",
			descricao: "causando 1d8 + MOVE de dado do tipo fogo em um acerto",
		})).toMatchObject({ dano: { base: "1d8" } })
	})

	it("lê o escalonamento de valor fixo, que o módulo não estrutura", () => {
		// Sonic Boom e Dragon Rage escalonam um número, e `damage.scaling` só aceita NdM.
		expect(interpretarDados({
			base: "",
			escalonamento: [],
			niveisSuperiores: "O dano deste Move muda para 6 no nível 5, 8 no nível 10 e 10 no nível 17.",
			descricao: "causando 4 de dano fixo do tipo normal em um acerto",
		}).dano.escalonamento).toEqual([
			{ nivel: 5, formula: "6" },
			{ nivel: 10, formula: "8" },
			{ nivel: 17, formula: "10" },
		])
	})

	it("não atribui nada quando o assunto não é dano nem cura", () => {
		// Helping Hand escalona um "dado de ajuda", que não é nenhum dos dois.
		const helpingHand = interpretarDados({
			base: "",
			escalonamento: [],
			niveisSuperiores: "O dado de ajuda para este Move muda para d8 no nível 5, d10 no nível 10, e d12 no nível 17.",
			descricao: "Você encoraja um aliado.",
		})

		expect(helpingHand.dano).toBeNull()
		expect(helpingHand.cura).toBeNull()
		expect(helpingHand.naoClassificado).toContain("dado de ajuda")
	})

	it("não inventa bloco para Move sem dados", () => {
		expect(interpretarDados({ base: "", escalonamento: [], niveisSuperiores: "", descricao: "Você se concentra." }))
			.toEqual({ dano: null, cura: null, naoClassificado: null })
	})
})

describe("prioridade declarada no texto", () => {
	it("lê a prioridade que o Move declara de si", () => {
		expect(prioridadeDeclarada("Este Move é classificado como Prioridade 3. Caso outra criatura utilize um Move de Prioridade 3…"))
			.toBe(3)
	})

	// Quick Guard cita as prioridades de que PROTEGE; um padrão solto leria 3 (ela é 1).
	it("não confunde a prioridade dos outros com a própria", () => {
		const quickGuard = "Quando você ou um aliado dentro do alcance for alvo de um Move danoso de "
			+ "Prioridade 1 ou 2, ou de Prioridade 3 (havendo desempate pela Destreza), você pode usar sua reação."

		expect(prioridadeDeclarada(quickGuard)).toBeNull()
	})
})

describe("reparo de nomes de Move das fichas", () => {
	const reparador = criarReparadorDeMoves([
		"Take Down", "Flamethrower", "Vine Whip", "Focus Energy", "Flash Cannon", "Double-Edge",
		"U-turn", "Will-O-Wisp", "Self-Destruct", "Substitute", "Protect", "Rest", "Round",
		"Poison Jab", "Work Up", "Zen Headbutt", "Acid Armor", "Growl",
	])

	it("conserta as letras espaçadas", () => {
		expect(reparador.resolverLista([ "T a k e D o w n", "S u b s ti tu t e" ]).resolvidos)
			.toEqual([ "Take Down", "Substitute" ])
	})

	it.each([
		[ "Double- Edge", "Double-Edge" ],
		[ "U- turn", "U-turn" ],
		[ "Will-O- Wisp", "Will-O-Wisp" ],
		[ "Will- O-Wisp", "Will-O-Wisp" ],
		[ "Self- Destruct", "Self-Destruct" ],
	])("conserta o hífen partido em %j", (bruto, esperado) => {
		expect(reparador.resolverLista([ bruto ]).resolvidos).toEqual([ esperado ])
	})

	it("separa nomes mesclados numa entrada só", () => {
		expect(reparador.resolverLista([ "Vine Whip Focus Energy" ]).resolvidos)
			.toEqual([ "Vine Whip", "Focus Energy" ])
	})

	it("devolve, sem descartar, o que não resolve", () => {
		const { resolvidos, naoResolvidos } = reparador.resolverLista([
			"Protect",
			"Este Pokémon não possui TMs nem Tutor Moves.",
			"Work Up Def esa s d e T ipo : ½ ½ x2 x2 0 x2 0",
		])

		expect(resolvidos).toEqual([ "Protect" ])
		expect(naoResolvidos).toHaveLength(2)
	})

	it("não repete o mesmo Move", () => {
		expect(reparador.resolverLista([ "Protect", "P r o t ec t" ]).resolvidos).toEqual([ "Protect" ])
	})

	it("junta o nome partido entre duas linhas da tabela", () => {
		// "Take" no nível 4 e "Down Flamethrower" no nível 8: o primeiro Move do resultado
		// pertence à linha anterior.
		const { tabela, reparados } = reparador.repararTabela([
			{ level: 4, moves: [ "Growl", "Take" ] },
			{ level: 8, moves: [ "Down Flamethrower" ] },
		])

		expect(tabela).toEqual([
			{ nivel: 4, moves: [ "Growl", "Take Down" ] },
			{ nivel: 8, moves: [ "Flamethrower" ] },
		])
		expect(reparados).toBe(1)
	})

	it("descarta os travessões de célula vazia", () => {
		expect(reparador.repararTabela([ { level: 1, moves: [ "—", "Growl" ] } ]).tabela)
			.toEqual([ { nivel: 1, moves: [ "Growl" ] } ])
	})

	it("omite o nível sem Move nenhum", () => {
		expect(reparador.repararTabela([ { level: 1, moves: [] }, { level: 4, moves: [ "Growl" ] } ]).tabela)
			.toEqual([ { nivel: 4, moves: [ "Growl" ] } ])
	})

	it("relata o nome que não existe no compêndio", () => {
		const { tabela, naoResolvidos } = reparador.repararTabela([ { level: 1, moves: [ "Nome Inexistente" ] } ])
		expect(tabela).toEqual([])
		expect(naoResolvidos).toEqual([ "nomeinexistente" ])
	})
})

describe("normalização de nome de Move", () => {
	it.each([
		[ "Will-O-Wisp", "willowisp" ],
		[ "T a k e D o w n", "takedown" ],
		[ "Double- Edge", "doubleedge" ],
		[ "King's Shield", "king'sshield" ],
		// O módulo usa o apóstrofo tipográfico em alguns nomes e o reto em outros.
		[ "King’s Shield", "king'sshield" ],
	])("%j → %j", (bruto, esperado) => {
		expect(normalizarMove(bruto)).toBe(esperado)
	})
})
