/**
 * Todas as frases aqui são do corpus de verdade: saíram de `dados-crus/pokedex.json`,
 * copiadas sem retoque. Teste de parser escrito com frase inventada testa o parser contra
 * a imaginação de quem o escreveu, não contra o dado que ele vai encontrar.
 */
import { describe, it, expect } from "vitest"
import { interpretarLinhaDeDefesa, interpretarDefesas } from "../ferramentas/defesas.mjs"

const tipos = (bruto) => interpretarLinhaDeDefesa(bruto).entradas.map((e) => e.tipo)

describe("interpretarLinhaDeDefesa", () => {
	it("lê a linha simples do Bulbasaur", () => {
		expect(tipos("Tipo Fogo; Tipo Gelo; Tipo Voador; Tipo Psíquico"))
			.toEqual([ "fogo", "gelo", "voador", "psiquico" ])
	})

	it("mantém o grau x1/4 junto do tipo, sem perder os vizinhos", () => {
		const { entradas } = interpretarLinhaDeDefesa("Tipo Água; Tipo Elétrico; Tipo Grama (x1/4); Tipo Lutador; Tipo Fada")
		expect(entradas).toEqual([
			{ tipo: "agua", grau: null },
			{ tipo: "eletrico", grau: null },
			{ tipo: "grama", grau: "x1/4" },
			{ tipo: "lutador", grau: null },
			{ tipo: "fada", grau: null },
		])
	})

	it("lê o x4 do Charizard, que é o outro marcador do corpus", () => {
		const { entradas } = interpretarLinhaDeDefesa("Tipo Água; Tipo Elétrico; Tipo Pedra (x4)")
		expect(entradas.at(-1)).toEqual({ tipo: "pedra", grau: "x4" })
	})

	it("aceita dois graus na mesma linha", () => {
		const { entradas } = interpretarLinhaDeDefesa("Tipo Grama; Tipo Venenoso (x1/4); Tipo Inseto (x1/4); Tipo Fada")
		expect(entradas.filter((e) => e.grau === "x1/4").map((e) => e.tipo)).toEqual([ "venenoso", "inseto" ])
	})

	it("resolve os acentos para o id sem acento", () => {
		expect(tipos("Tipo Água; Tipo Psíquico; Tipo Dragão; Tipo Aço; Tipo Elétrico"))
			.toEqual([ "agua", "psiquico", "dragao", "aco", "eletrico" ])
	})

	it("devolve lista vazia para a linha vazia, que 595 espécies têm em imunidades", () => {
		expect(interpretarLinhaDeDefesa("")).toEqual({ entradas: [], naoReconhecidas: [] })
		expect(interpretarLinhaDeDefesa(null)).toEqual({ entradas: [], naoReconhecidas: [] })
		expect(interpretarLinhaDeDefesa(undefined)).toEqual({ entradas: [], naoReconhecidas: [] })
	})

	it("não parte na vírgula: em português ela também separa decimal", () => {
		// Se um dia o módulo escrever "Tipo Fogo, Tipo Gelo", queremos ver isso no
		// relatório, não um tipo inventado a partir de metade da frase.
		const { entradas, naoReconhecidas } = interpretarLinhaDeDefesa("Tipo Fogo, Tipo Gelo")
		expect(entradas).toEqual([])
		expect(naoReconhecidas).toEqual([ "Tipo Fogo, Tipo Gelo" ])
	})

	it("devolve o que não reconhece em vez de adivinhar", () => {
		const { entradas, naoReconhecidas } = interpretarLinhaDeDefesa("Tipo Fogo; Tipo Luz; Dano de queda")
		expect(entradas).toEqual([ { tipo: "fogo", grau: null } ])
		expect(naoReconhecidas).toEqual([ "Tipo Luz", "Dano de queda" ])
	})

	it("ignora o ponto e vírgula final sem criar entrada vazia", () => {
		expect(tipos("Tipo Normal; Tipo Lutador;")).toEqual([ "normal", "lutador" ])
	})

	it("não trata um grau desconhecido como tipo", () => {
		const { naoReconhecidas } = interpretarLinhaDeDefesa("Tipo Fogo (x2)")
		expect(naoReconhecidas).toEqual([ "Tipo Fogo (x2)" ])
	})
})

describe("interpretarDefesas", () => {
	it("lê as três linhas do Charizard", () => {
		const { defesas } = interpretarDefesas({
			dv: { custom: "Tipo Água; Tipo Elétrico; Tipo Pedra (x4)" },
			dr: { custom: "Tipo Fogo; Tipo Grama (x1/4); Tipo Lutador; Tipo Inseto (x1/4); Tipo Aço; Tipo Fada" },
			di: { custom: "Tipo Terrestre" },
		})
		expect(defesas.vulnerabilidades.map((e) => e.tipo)).toEqual([ "agua", "eletrico", "pedra" ])
		expect(defesas.resistencias).toHaveLength(6)
		expect(defesas.imunidades).toEqual([ { tipo: "terrestre", grau: null } ])
	})

	it("lê as três imunidades do Sableye", () => {
		const { defesas } = interpretarDefesas({
			dv: { custom: "Tipo Fada" },
			dr: { custom: "Tipo Venenoso" },
			di: { custom: "Tipo Normal; Tipo Lutador; Tipo Psíquico" },
		})
		expect(defesas.imunidades.map((e) => e.tipo)).toEqual([ "normal", "lutador", "psiquico" ])
	})

	it("deixa a imunidade vazia como lista vazia quando há as outras duas", () => {
		const { defesas } = interpretarDefesas({
			dv: { custom: "Tipo Elétrico; Tipo Grama" },
			dr: { custom: "Tipo Fogo; Tipo Água; Tipo Gelo; Tipo Aço" },
			di: { custom: "" },
		})
		expect(defesas.imunidades).toEqual([])
	})

	it("devolve null quando o módulo não declarou nenhuma das três", () => {
		// `null` diz "não declarado"; três listas vazias diriam "não tem defesa nenhuma",
		// e essas são afirmações diferentes. Nove espécies caem aqui.
		expect(interpretarDefesas({}).defesas).toBeNull()
		expect(interpretarDefesas({ dv: { custom: "" }, dr: { custom: "" }, di: { custom: "" } }).defesas).toBeNull()
	})

	it("diz em qual das três linhas estava o texto ilegível", () => {
		const { naoReconhecidas } = interpretarDefesas({
			dv: { custom: "Tipo Fogo" },
			dr: { custom: "Tipo Luz" },
			di: { custom: "" },
		})
		expect(naoReconhecidas).toEqual([ { linha: "resistencias", texto: "Tipo Luz" } ])
	})
})
