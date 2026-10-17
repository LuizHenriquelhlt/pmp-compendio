import { describe, expect, it } from "vitest"
import { interpretarEfeitos } from "../ferramentas/efeitos.mjs"

// As frases destes testes são do corpus da v1.33.0, não inventadas. É o que dá valor a
// eles: cada caso aqui é uma construção que o livro realmente usa, e vários são erros que
// a implementação de referência (`parseEffects` do build-data.mjs) comete.

const efeitos = (texto) => interpretarEfeitos(texto).efeitos
const naoLido = (texto) => interpretarEfeitos(texto).naoInterpretado

describe("condições de status", () => {
	it("lê a construção dominante, com o limiar natural", () => {
		expect(efeitos("Em um resultado natural de 19 ou 20 no acerto, o alvo fica paralisado."))
			.toEqual([ { tipo: "status", status: "paralisado", alvo: "alvo", gatilho: { tipo: "natural", minimo: 19 } } ])
	})

	it.each([
		[ "o alvo recebe o status Atordoado", "atordoado" ],
		[ "o alvo é envenenado", "envenenado" ],
		[ "a criatura se torna queimada", "queimado" ],
		[ "o alvo ficará congelado", "congelado" ],
		[ "faça com que o alvo fique confuso", "confuso" ],
		[ "deixando o alvo queimado", "queimado" ],
		[ "ficando paralisado em caso de falha", "paralisado" ],
	])("reconhece %j", (frase, status) => {
		expect(efeitos(`Em um acerto, ${frase}.`).map((e) => e.status)).toContain(status)
	})

	it("distingue envenenamento grave do comum", () => {
		expect(efeitos("Em um acerto, o alvo fica gravemente envenenado.")[0].status)
			.toBe("gravemente-envenenado")
	})

	it("atribui ao usuário quando é ele que sofre", () => {
		expect(efeitos("Quando este Move termina após a última rodada, você fica confuso."))
			.toEqual([ { tipo: "status", status: "confuso", alvo: "usuario" } ])
	})

	// As três armadilhas de citação: condição, imunidade e cura da condição.
	it.each([
		"Se você estiver congelado, ainda pode usar este Move, sendo descongelado imediatamente antes de realizar o ataque.",
		"Caso você esteja congelado, Burn Up irá derreter o gelo imediatamente ao ser ativado.",
		"Além disso, ele concede imunidade a condições negativas e impede a redução de Mudança de Status.",
		"Se o alvo estiver paralisado, dobre os dados de dano, e a paralisia dele é curada.",
		"Por 5 rodadas, nenhuma criatura no chão dentro da área pode estar Sonolenta ou Dormindo.",
	])("não impõe condição em %j", (frase) => {
		expect(efeitos(frase)).toEqual([])
	})

	it("não reporta nada quando toda menção é citação", () => {
		expect(naoLido("Se você estiver congelado, ainda pode usar este Move.")).toEqual([])
	})

	it("reporta a tabela de d6 em vez de escolher um status", () => {
		const texto = "Em um resultado natural de 17 ou mais no acerto, o alvo deve rolar um d6, "
			+ "ganhando a condição de status conforme a seguir: 1-2: queimado / 3-4: congelado / 5-6: paralisado."

		expect(efeitos(texto)).toEqual([])
		expect(naoLido(texto)).toEqual([ { familia: "status", frase: texto } ])
	})

	it("não repete a condição anunciada na narração e declarada na regra", () => {
		const lovelyKiss = "Você manda um beijo para uma criatura dentro do alcance, tentando deixá-la sonolenta. "
			+ "Role 1d20 + MOVE + 4 e compare o resultado com 10 + CAR do alvo. "
			+ "Em um resultado maior ou igual, o alvo fica Sonolento."

		expect(efeitos(lovelyKiss))
			.toEqual([ { tipo: "status", status: "sonolento", alvo: "alvo", gatilho: { tipo: "disputa" } } ])
	})
})

describe("limiar de rolagem natural", () => {
	// Piso e teto trocados transformam um efeito de 10% num que acontece sempre.
	it("lê piso quando o dado é de quem usa o Move", () => {
		expect(efeitos("Em um resultado natural de 15 ou mais no acerto, o alvo fica queimado.")[0].gatilho)
			.toEqual({ tipo: "natural", minimo: 15 })
	})

	it("lê teto quando o dado é de quem resiste", () => {
		expect(efeitos("Qualquer criatura que rolar um resultado natural de 4 ou menos no teste ficará queimada.")[0].gatilho)
			.toEqual({ tipo: "natural", maximo: 4 })
	})

	it("lê piso no par alto do acerto", () => {
		expect(efeitos("Em um resultado natural de 19 ou 20 no acerto, o alvo fica confuso.")[0].gatilho)
			.toEqual({ tipo: "natural", minimo: 19 })
	})

	it("lê teto no par baixo do teste", () => {
		expect(efeitos("Qualquer criatura que rolar um resultado natural de 1 ou 2 no teste fica queimada.")[0].gatilho)
			.toEqual({ tipo: "natural", maximo: 2 })
	})

	it("escolhe o primeiro gatilho, não o mais estreito, numa alternativa", () => {
		// Escolher o natural faria o efeito parecer dez vezes mais raro do que é.
		const heatWave = "Qualquer criatura que falhar no teste por 5 ou mais, "
			+ "ou rolar um resultado natural de 1 ou 2 no teste, se torna queimada."

		expect(efeitos(heatWave)[0].gatilho).toEqual({ tipo: "falha" })
	})
})

describe("mudanças de estágio", () => {
	it("lê atributo, sinal, alvo e limite", () => {
		const razorShell = "Em um resultado natural de 19 ou 20 no acerto, a Defesa do alvo é reduzida "
			+ "em 1 estágio, podendo ser acumulado em até -6 estágios."

		expect(efeitos(razorShell)).toEqual([ {
			tipo: "estagio",
			atributo: "defesa",
			delta: -1,
			alvo: "alvo",
			limite: -6,
			gatilho: { tipo: "natural", minimo: 19 },
		} ])
	})

	// O erro concreto da implementação de referência: ela vê "perde" e "aumentam" na
	// mesma frase e grava -2 onde o livro diz +2.
	it("não troca o sinal quando a frase tem dois verbos opostos", () => {
		const filletAway = "Ao usar este Move, você perde 50% dos seus pontos de vida máximos "
			+ "(arredondado para baixo), mas seu Ataque, Ataque Especial e Velocidade aumentam "
			+ "em 2 estágios, podendo ser acumulados em até 6 estágios."

		const mudancas = efeitos(filletAway).filter((e) => e.tipo === "estagio")
		expect(mudancas).toHaveLength(3)
		expect(mudancas.every((e) => e.delta === 2 && e.alvo === "usuario")).toBe(true)
		expect(mudancas.map((e) => e.atributo).sort())
			.toEqual([ "ataque", "ataque-especial", "velocidade" ])
	})

	it("não confunde Ataque Especial com Ataque", () => {
		expect(efeitos("Ao acertar, o Ataque Especial do alvo é reduzido em 1 estágio.").map((e) => e.atributo))
			.toEqual([ "ataque-especial" ])
	})

	it("separa os dois atributos de uma frase só", () => {
		const closeCombat = "Ao realizar este ataque, sua Defesa e Defesa Especial são reduzidas "
			+ "em 1 estágio, podendo ser acumulado em até -6 estágios cada."

		expect(efeitos(closeCombat).map((e) => e.atributo).sort()).toEqual([ "defesa", "defesa-especial" ])
	})

	it("entende 'dele' como o alvo", () => {
		const spicyExtract = "O Ataque dele é aumentado em 2 estágios, e a Defesa dele é reduzida em 2 estágios."
		expect(efeitos(spicyExtract).map((e) => [ e.atributo, e.delta, e.alvo ]))
			.toEqual([ [ "ataque", 2, "alvo" ], [ "defesa", -2, "alvo" ] ])
	})

	it("reporta a tabela de ambientes em vez de somar os efeitos dela", () => {
		// Secret Power tem uma condição por ambiente; extrair as quatro mudanças diria que
		// o Move faz todas de uma vez.
		const secretPower = "Ambiente Condição Construção, estrada, terreno Paralisia plano e Electric Terrain "
			+ "Caverna Atordoamento Areia, terra e pedra Reduz Precisão em um estágio Água Reduz Ataque "
			+ "em um estágio Neve e gelo Congelamento Vulcão Reduz Defesa em um estágio Pântano Reduz Velocidade em um estágio."

		expect(efeitos(secretPower).filter((e) => e.tipo === "estagio")).toEqual([])
		expect(naoLido(secretPower).map((n) => n.familia)).toContain("estagio")
	})

	it("lê a quantidade escrita por extenso", () => {
		const stockpile = "Cada vez que ativar este Move, você aumenta sua Defesa e Defesa Especial em um estágio cada."
		expect(efeitos(stockpile).every((e) => e.delta === 1)).toBe(true)

		const decorate = "Você enfeita o alvo com adereços energizados, elevando o Ataque e Ataque Especial dele em dois estágios."
		expect(efeitos(decorate).every((e) => e.delta === 2 && e.alvo === "alvo")).toBe(true)
	})

	it("lê a construção sem preposição", () => {
		const scaleShot = "Após realizar todos os golpes, sua Velocidade aumenta 1 estágio e "
			+ "sua Defesa diminui 1 estágio, podendo acumular até +6 e -6 estágios, respectivamente."

		expect(efeitos(scaleShot).map((e) => [ e.atributo, e.delta ]))
			.toEqual([ [ "velocidade", 1 ], [ "defesa", -1 ] ])
	})

	it("lê o atributo quando ele vem depois da quantidade", () => {
		const syrupBomb = "Se acertar, o alvo fica coberto por xarope pegajoso e passa a perder "
			+ "1 estágio de Velocidade ao final de cada turno pelos próximos 3 turnos."

		expect(efeitos(syrupBomb).filter((e) => e.tipo === "estagio"))
			.toEqual([ { tipo: "estagio", atributo: "velocidade", delta: -1, alvo: "alvo", gatilho: { tipo: "acerto" } } ])
	})

	it("marca como de todos quando o Move afeta a mesa inteira", () => {
		const flowerShield = "Grandes flores brotam de quaisquer Pokémon do tipo grama em alcance, "
			+ "incluindo você, aliados e inimigos, aumentando a Defesa de todos em 1 estágio, "
			+ "podendo ser acumulado em até 6 estágios."

		expect(efeitos(flowerShield)[0].alvo).toBe("todos")
	})

	it("usa o limiar mais próximo quando a frase declara dois", () => {
		const tripleArrows = "Além disso, em um resultado natural de 15 ou mais no acerto, o alvo fica Atordoado, "
			+ "e um resultado natural de 11 ou mais reduz a Defesa do alvo em 1 estágio, "
			+ "podendo ser acumulado em até -6 estágios."

		const estagio = efeitos(tripleArrows).find((e) => e.tipo === "estagio")
		const status = efeitos(tripleArrows).find((e) => e.tipo === "status")
		expect(estagio.gatilho).toEqual({ tipo: "natural", minimo: 11 })
		expect(status.gatilho).toEqual({ tipo: "natural", minimo: 15 })
	})

	it("não confunde a cláusula de limite com uma mudança", () => {
		const texto = "A Defesa do alvo é reduzida em 1 estágio, podendo ser acumulado em até -6 estágios."
		expect(efeitos(texto)).toHaveLength(1)
	})

	it.each([
		"Para cada estágio positivo que você tiver no aumento de qualquer Mudança de Status, acrescente mais um dado de dano.",
		"Ao usar este Move, suas Mudança de Status são redefinidas, e você copia todos os estágios de Mudança de Status de um alvo.",
		"Este bônus pode ser acumulado até um máximo de 6 estágios para cada.",
	])("não extrai mudança de frase que só lê estágios: %j", (frase) => {
		expect(efeitos(frase)).toEqual([])
		expect(naoLido(frase)).toEqual([])
	})
})

describe("dreno", () => {
	it.each([
		"Metade do dano causado retorna como cura ao usuário (arredondado para baixo).",
		"Metade do dano causado é convertido em cura para o usuário (arredondado para cima).",
		"Faça um ataque corpo a corpo, ganhando metade do dano causado (arredondado para baixo) em pontos de vida.",
	])("lê a fração em %j", (frase) => {
		expect(efeitos(frase))
			.toEqual([ { tipo: "dreno", fracao: { numerador: 1, denominador: 2 } } ])
	})

	it("lê a fração em algarismos", () => {
		const oblivionWing = "Faça um ataque à distância contra uma criatura, causando 4d4 + MOVE de dano "
			+ "voador em um acerto, recuperando 3/4 do dano causado como pontos de vida."

		expect(efeitos(oblivionWing))
			.toEqual([ { tipo: "dreno", fracao: { numerador: 3, denominador: 4 } } ])
	})

	// "Drenar" no livro também significa ficar sem ação e perder PP - nada disso cura.
	it.each([
		"Este Move drena sua energia, e você não pode realizar outra ação padrão ou reação até o final do seu próximo turno.",
		"Quando for atingido por um Move, você pode gastar sua reação para tentar drenar os PP do atacante.",
		"Você ataca o alvo com um banho de água gelada que drena suas forças.",
	])("ignora o falso dreno em %j", (frase) => {
		expect(efeitos(frase)).toEqual([])
		expect(naoLido(frase)).toEqual([])
	})

	it("reporta o dreno sem fração declarada", () => {
		const leechSeed = "O dano causado retorna como cura ao usuário, ou qualquer outra criatura ativa que o treinador tenha na batalha."
		expect(efeitos(leechSeed)).toEqual([])
		expect(naoLido(leechSeed).map((n) => n.familia)).toContain("dreno")
	})
})

describe("recuo", () => {
	// O corpus escreve a fração em algarismos; a implementação de referência só lê por
	// extenso, e por isso encontra 2 dos 13 Moves de recuo.
	it("lê a fração em algarismos", () => {
		const doubleEdge = "Faça um ataque corpo a corpo contra um alvo, causando 3d8 + MOVE de dano normal "
			+ "em um acerto, mas sofrendo 1/3 do dano causado (arredondado para baixo) em recuo de dano sem tipo."

		expect(efeitos(doubleEdge))
			.toEqual([ { tipo: "recuo", fracao: { numerador: 1, denominador: 3 } } ])
	})

	it("lê a fração por extenso", () => {
		expect(efeitos("Em um acerto, o usuário sofre metade do dano causado como recuo sem tipo."))
			.toEqual([ { tipo: "recuo", fracao: { numerador: 1, denominador: 2 } } ])
	})

	it("distingue recuo sobre a vida máxima de recuo sobre o dano", () => {
		expect(efeitos("Após isso, você perde metade de sua vida máxima como dano de recuo."))
			.toEqual([ { tipo: "recuo", fracaoDeVida: { numerador: 1, denominador: 2 } } ])
	})

	it("ignora a enumeração de fontes de dano", () => {
		const assurance = "Isso inclui dano autoinfligido e dano indireto, como dano de um Life Orb, recuo, condição de status, clima, entre outros."
		expect(efeitos(assurance)).toEqual([])
		expect(naoLido(assurance)).toEqual([])
	})

	it("reporta o recuo que não é fração", () => {
		const steelBeam = "Após ativar este Move, você recebe um dano de recuo sem tipo igual ao dano máximo rolado."
		expect(efeitos(steelBeam)).toEqual([])
		expect(naoLido(steelBeam).map((n) => n.familia)).toContain("recuo")
	})
})

describe("cura", () => {
	it("lê os dados e o bônus de MOVE", () => {
		expect(efeitos("Você gera uma energia de cura para recuperar 2d6 + MOVE pontos de vida."))
			.toEqual([ { tipo: "cura", dados: "2d6", comMove: true, alvo: "usuario" } ])
	})

	it("sabe quando a cura é do alvo, não de quem usa", () => {
		const healPulse = "Escolha um alvo dentro do alcance (não pode ser você mesmo). O alvo recupera 2d6 + MOVE pontos de vida."
		expect(efeitos(healPulse)[0]).toMatchObject({ tipo: "cura", alvo: "alvo" })
	})

	it("lê a restauração total", () => {
		const lunarDance = "Ao ativar este Move, o usuário desmaia, mas a próxima criatura libertada "
			+ "por seu treinador tem sua vida completamente restaurada."

		expect(efeitos(lunarDance)).toEqual([ { tipo: "cura", total: true, alvo: "alvo" } ])
	})

	it("não conta o dreno duas vezes", () => {
		const gigaDrain = "Faça um ataque à distância em uma criatura, causando 2d8 + MOVE de dano de grama "
			+ "em um acerto. Metade do dano causado retorna como cura ao usuário (arredondado para baixo)."

		expect(efeitos(gigaDrain)).toEqual([ { tipo: "dreno", fracao: { numerador: 1, denominador: 2 } } ])
		expect(naoLido(gigaDrain)).toEqual([])
	})

	it("reporta a cura que remete a uma tabela", () => {
		const synthesis = "Veja a tabela abaixo para a quantidade de dados de cura + MOVE que você recupera."
		expect(efeitos(synthesis)).toEqual([])
		expect(naoLido(synthesis)).toEqual([ { familia: "cura", frase: synthesis } ])
	})

	it("ignora a negação de cura", () => {
		const psychicNoise = "Caso acerte, o alvo se torna incapaz de recuperar pontos de vida nesta e nas próximas duas rodadas."
		expect(efeitos(psychicNoise)).toEqual([])
		expect(naoLido(psychicNoise)).toEqual([])
	})
})

describe("descrição sem efeito mecânico", () => {
	it("não inventa nada", () => {
		const powerWhip = "Você gira violentamente seus tentáculos ou cipós em direção a um alvo. "
			+ "Faça um ataque corpo a corpo -2 contra uma criatura, causando 3d8 + MOVE de dano de grama em um acerto."

		expect(interpretarEfeitos(powerWhip)).toEqual({ efeitos: [], naoInterpretado: [] })
	})

	it("aceita descrição vazia", () => {
		expect(interpretarEfeitos()).toEqual({ efeitos: [], naoInterpretado: [] })
	})
})
