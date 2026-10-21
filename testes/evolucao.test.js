import { describe, expect, it } from "vitest"
import {
	alvoDaMesmaRegiao, criarInterpretadorDeEvolucao, regiaoDaForma,
} from "../ferramentas/evolucao.mjs"

// Vocabulário mínimo, com os nomes ordenados do mais longo para o mais curto - é
// assim que o pipeline os entrega, e a ordem importa para as formas regionais.
const interpretar = criarInterpretadorDeEvolucao({
	nomesDeEspecie: [
		"Raichu de Alola", "Weezing de Galar", "Meowstic Macho", "Meowstic Fêmea",
		"Charmeleon", "Charmander", "Butterfree", "Infernape", "Chimchar", "Monferno",
		"Vaporeon", "Jolteon", "Flareon", "Espeon", "Umbreon", "Sylveon",
		"Slowking", "Slowbro", "Slowpoke", "Caterpie", "Metapod", "Flapple", "Appletun",
		"Pikachu", "Raichu", "Applin", "Eevee", "Mew",
	].sort((a, b) => b.length - a.length),
	itensEvolutivos: [
		{ nome: "Thunder Stone" }, { nome: "Water Stone" }, { nome: "Fire Stone" },
		{ nome: "Tart Apple" }, { nome: "Sweet Apple" },
	].sort((a, b) => b.nome.length - a.nome.length),
	tipoPorChave: { fada: "fada", grama: "grama" },
})

describe("evolução para a frente", () => {
	it("lê alvo e nível", () => {
		expect(interpretar("Charmander pode evoluir para Charmeleon no nível 6 ou superior.", "Charmander"))
			.toEqual([ { para: "Charmeleon", paraId: null, nivel: 6 } ])
	})

	it("ignora a consequência depois de 'Quando evolui'", () => {
		const r = interpretar(
			"Charmander pode evoluir para Charmeleon no nível 6 ou superior. Quando evolui, seus pontos de vida aumentam no dobro do seu nível.",
			"Charmander",
		)
		expect(r).toHaveLength(1)
		expect(r[0].para).toBe("Charmeleon")
	})

	it("lê o item de evolução", () => {
		const r = interpretar("Pikachu pode evoluir para Raichu no nível 6 ou superior com a ajuda de uma Thunder Stone.", "Pikachu")
		expect(r[0]).toMatchObject({ para: "Raichu", nivel: 6, item: "Thunder Stone" })
	})

	it("prefere a forma regional ao nome base", () => {
		const r = interpretar("Pikachu pode evoluir para Raichu de Alola no nível 6 ou superior.", "Pikachu")
		expect(r[0].para).toBe("Raichu de Alola")
	})

	it("separa ramificações e suas condições", () => {
		const r = interpretar(
			"Eevee pode evoluir para Vaporeon no nível 6 ou superior com a ajuda de uma Water Stone, ou para Espeon no nível 6 ou superior quando sua Lealdade for +2 e apenas durante o dia.",
			"Eevee",
		)
		expect(r).toHaveLength(2)
		expect(r[0]).toMatchObject({ para: "Vaporeon", item: "Water Stone" })
		expect(r[1]).toMatchObject({ para: "Espeon", lealdade: 2, periodo: "dia" })
	})

	// O Applin é o único do livro em que "evoluir" e "para" ficam separados por vírgula.
	it("aceita 'evoluir, a partir do nível N, para X'", () => {
		const r = interpretar(
			"Applin pode evoluir, a partir do nível 6, para Flapple com uma Tart Apple e Appletun com uma Sweet Apple.",
			"Applin",
		)
		expect(r.map((e) => e.para)).toContain("Flapple")
		expect(r[0].nivel).toBe(6)
	})

	it("guarda como 'especial' a condição que não sabe estruturar", () => {
		const r = interpretar(
			"Slowpoke pode evoluir para Slowking no nível 13 ou superior enquanto segura uma King's Rock.",
			"Slowpoke",
		)
		expect(r[0].para).toBe("Slowking")
		expect(r[0].especial).toBeTruthy()
	})
})

describe("o alvo é quem vem depois de 'para'", () => {
	// A forma regional contém o nome da base, então "qualquer nome na frase" fazia
	// Corsola de Galar evoluir para Corsola.
	it("não confunde a forma regional com a espécie-base", () => {
		const nomes = [ "Corsola de Galar", "Corsola", "Cursola" ].sort((a, b) => b.length - a.length)
		const comCorsola = criarInterpretadorDeEvolucao({ nomesDeEspecie: nomes })
		const r = comCorsola("Corsola de Galar pode evoluir para Cursola a partir do nível 13.", "Corsola de Galar")
		expect(r.map((e) => e.para)).toEqual([ "Cursola" ])
	})

	// "Remoraid" é mais longo que "Mantine", e a lista é ordenada por tamanho.
	it("não toma por alvo a espécie citada como condição", () => {
		const nomes = [ "Mantyke", "Mantine", "Remoraid" ].sort((a, b) => b.length - a.length)
		const comMantyke = criarInterpretadorDeEvolucao({ nomesDeEspecie: nomes })
		const r = comMantyke(
			"Mantyke pode evoluir para Mantine no nível 11 ou superior ao entrar em contato com um Remoraid.",
			"Mantyke",
		)
		expect(r.map((e) => e.para)).toEqual([ "Mantine" ])
	})

	it("cláusula sem 'para' vira condição, não uma segunda evolução", () => {
		const nomes = [ "Karrablast", "Escavalier", "Shelmet" ].sort((a, b) => b.length - a.length)
		const comKarrablast = criarInterpretadorDeEvolucao({ nomesDeEspecie: nomes })
		const r = comKarrablast(
			"Karrablast pode evoluir para Escavalier no nível 10 ou superior, apenas na presença de um Shelmet.",
			"Karrablast",
		)
		expect(r.map((e) => e.para)).toEqual([ "Escavalier" ])
	})

	it("resolve a espécie-base para a forma, quando só a forma existe", () => {
		const nomes = [ "Meowstic Macho", "Meowstic Fêmea", "Espurr" ].sort((a, b) => b.length - a.length)
		const comEspurr = criarInterpretadorDeEvolucao({ nomesDeEspecie: nomes })
		const r = comEspurr("Espurr pode evoluir para Meowstic no nível 10 ou superior.", "Espurr")
		expect(r).toHaveLength(1)
		expect(r[0].para).toMatch(/^Meowstic /)
	})
})

describe("espécies que não evoluem", () => {
	// A regressão de verdade: 410 espécies do livro são "evolução final de X", e o
	// nome do antecessor na frase as fazia "evoluir" para trás.
	it("não inventa evolução para quem é evolução final", () => {
		expect(interpretar("Butterfree é a evolução final de Caterpie e Metapod.", "Butterfree")).toEqual([])
		expect(interpretar("Infernape é a evolução final de Chimchar e Monferno.", "Infernape")).toEqual([])
	})

	it("entende 'não possui evoluções conhecidas'", () => {
		expect(interpretar("Mew não possui evoluções conhecidas.", "Mew")).toEqual([])
	})

	it("aceita texto vazio", () => {
		expect(interpretar("", "Mew")).toEqual([])
	})
})

describe("regiaoDaForma", () => {
	it.each([
		[ "Growlithe de Hisui", "Hisui" ],
		[ "Ponyta de Galar", "Galar" ],
		[ "Raichu de Alola", "Alola" ],
		[ "Wooper de Paldea", "Paldea" ],
	])("lê a região de %j", (nome, esperado) => {
		expect(regiaoDaForma(nome)).toBe(esperado)
	})

	// O sufixo " de X" também nomeia formas que não são região. Tratá-las como regionais
	// faria o pipeline procurar "Mothim de Planta", que não existe.
	it.each([
		"Wormadam de Planta", "Wormadam de Areia", "Wormadam de Lixo",
		"Darmanitan de Gelo", "Arcanine", "Pikachu", "",
	])("não vê região em %j", (nome) => {
		expect(regiaoDaForma(nome)).toBe(null)
	})

	it.each([ undefined, null ])("aguenta %j", (nome) => {
		expect(regiaoDaForma(nome)).toBe(null)
	})
})

describe("alvoDaMesmaRegiao", () => {
	const CONHECIDOS = new Set([
		"Arcanine", "Arcanine de Hisui", "Zoroark", "Zoroark de Hisui",
		"Perrserker", "Sliggoo", "Sliggoo de Hisui", "Rapidash", "Rapidash de Galar",
	])

	// Os cinco casos do corpus da v1.35.0: o livro escreve o alvo sem a região.
	it.each([
		[ "Growlithe de Hisui", "Arcanine", "Arcanine de Hisui" ],
		[ "Ponyta de Galar", "Rapidash", "Rapidash de Galar" ],
		[ "Zorua de Hisui", "Zoroark", "Zoroark de Hisui" ],
	])("%s -> %s vira a forma da mesma região", (de, para, esperado) => {
		expect(alvoDaMesmaRegiao(de, para, CONHECIDOS)).toBe(esperado)
	})

	it("não mexe quando quem evolui não é forma regional", () => {
		expect(alvoDaMesmaRegiao("Growlithe", "Arcanine", CONHECIDOS)).toBe("Arcanine")
	})

	// Goomy não é regional, então Sliggoo de Hisui continua sem antecessor declarado - o
	// livro não o declara, e inventá-lo seria pior que a lacuna.
	it("não liga Goomy à forma de Hisui", () => {
		expect(alvoDaMesmaRegiao("Goomy", "Sliggoo", CONHECIDOS)).toBe("Sliggoo")
	})

	it("não mexe quando o alvo já traz a região - o livro foi explícito", () => {
		expect(alvoDaMesmaRegiao("Zorua de Hisui", "Zoroark de Hisui", CONHECIDOS))
			.toBe("Zoroark de Hisui")
	})

	// Meowth de Galar evolui para Perrserker, que não tem forma regional nenhuma.
	it("não mexe quando não existe forma da mesma região", () => {
		expect(alvoDaMesmaRegiao("Meowth de Galar", "Perrserker", CONHECIDOS)).toBe("Perrserker")
	})

	it("não confunde forma não regional com regional", () => {
		expect(alvoDaMesmaRegiao("Wormadam de Planta", "Arcanine", CONHECIDOS)).toBe("Arcanine")
	})

	it("sem vocabulário, devolve o que o livro escreveu", () => {
		expect(alvoDaMesmaRegiao("Growlithe de Hisui", "Arcanine")).toBe("Arcanine")
	})
})
