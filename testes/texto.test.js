import { describe, expect, it } from "vitest"
import { interpretarDeslocamento, interpretarSentidos, numeroBR, slug, textoSimples } from "../ferramentas/texto.mjs"

describe("slug", () => {
	it("preserva a identidade em português", () => {
		expect(slug("Weezing de Galar")).toBe("weezing-de-galar")
		expect(slug("Wormadam Manto de Planta")).toBe("wormadam-manto-de-planta")
	})

	it("remove acentuação sem perder letras", () => {
		expect(slug("Evolução Mística")).toBe("evolucao-mistica")
	})

	it("traduz os símbolos de gênero do Nidoran", () => {
		expect(slug("Nidoran♀")).toBe("nidoran-f")
		expect(slug("Nidoran♂")).toBe("nidoran-m")
	})
})

describe("numeroBR", () => {
	it("lê a vírgula decimal", () => {
		expect(numeroBR("10,5")).toBe(10.5)
		expect(numeroBR("9")).toBe(9)
	})

	it("devolve null para o que não é número", () => {
		expect(numeroBR("caminhada")).toBeNull()
	})
})

describe("interpretarDeslocamento", () => {
	it("lê um único modo", () => {
		expect(interpretarDeslocamento("9m de caminhada")).toEqual({
			deslocamentos: [ { modo: "caminhada", metros: 9 } ],
			incompleto: false,
		})
	})

	// A regressão que motivou o parser global: a vírgula é separador de lista E
	// separador decimal, então dividir a string por vírgula corrompe "1,5m".
	it("não confunde vírgula decimal com separador de lista", () => {
		expect(interpretarDeslocamento("1,5m de caminhada, 7,5m de natação")).toEqual({
			deslocamentos: [
				{ modo: "caminhada", metros: 1.5 },
				{ modo: "natação", metros: 7.5 },
			],
			incompleto: false,
		})
	})

	it("reconhece voo por flutuação", () => {
		expect(interpretarDeslocamento("10,5m de voo (flutuação)")).toEqual({
			deslocamentos: [ { modo: "voo", metros: 10.5, flutuacao: true } ],
			incompleto: false,
		})
	})

	it("normaliza nado para natação", () => {
		const { deslocamentos } = interpretarDeslocamento("6m de nado")
		expect(deslocamentos).toEqual([ { modo: "natação", metros: 6 } ])
	})

	// 65 espécies da v1.33.0 do módulo têm esse campo cortado. Devolvemos o que é
	// legível e sinalizamos — nunca adivinhamos o modo que falta.
	it("marca truncamento sem inventar o modo perdido", () => {
		expect(interpretarDeslocamento("9m de caminhada, 9m de escalada, 9m de")).toEqual({
			deslocamentos: [
				{ modo: "caminhada", metros: 9 },
				{ modo: "escalada", metros: 9 },
			],
			incompleto: true,
		})
	})

	it("marca truncamento quando só o número sobrou", () => {
		const { deslocamentos, incompleto } = interpretarDeslocamento("12m de caminhada, 9m de natação, 12m")
		expect(deslocamentos).toHaveLength(2)
		expect(incompleto).toBe(true)
	})

	it("marca truncamento quando a vírgula final denuncia o corte", () => {
		const { deslocamentos, incompleto } = interpretarDeslocamento("9m de caminhada, 7,5m de escavação,")
		expect(deslocamentos).toHaveLength(2)
		expect(incompleto).toBe(true)
	})

	it("aceita campo vazio", () => {
		expect(interpretarDeslocamento("")).toEqual({ deslocamentos: [], incompleto: false })
	})
})

describe("interpretarSentidos", () => {
	it("separa nome e alcance", () => {
		expect(interpretarSentidos("Visão no Escuro 18m, Visão Verdadeira 4,5m")).toEqual([
			{ nome: "Visão no Escuro", metros: 18 },
			{ nome: "Visão Verdadeira", metros: 4.5 },
		])
	})

	it("aceita sentido sem alcance declarado", () => {
		expect(interpretarSentidos("Percepção às Cegas")).toEqual([
			{ nome: "Percepção às Cegas", metros: null },
		])
	})

	it("aceita campo vazio", () => {
		expect(interpretarSentidos("")).toEqual([])
	})
})

describe("textoSimples", () => {
	it("converte parágrafos em quebras de linha", () => {
		expect(textoSimples("<p>Primeiro</p><p>Segundo</p>")).toBe("Primeiro\nSegundo")
	})

	it("resolve entidades HTML", () => {
		expect(textoSimples("<p>Fogo&nbsp;&amp;&nbsp;Água</p>")).toBe("Fogo & Água")
	})

	it("marca itens de lista", () => {
		expect(textoSimples("<ul><li>Um</li><li>Dois</li></ul>")).toBe("• Um\n• Dois")
	})
})
