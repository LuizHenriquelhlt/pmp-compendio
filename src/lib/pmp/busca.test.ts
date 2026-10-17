import { describe, expect, it } from "vitest"
import { chaveDeBusca, chaveDeBuscaDeHabilidade, corresponde, normalizarParaBusca } from "./busca"

describe("normalizarParaBusca", () => {
	it("ignora acento e caixa", () => {
		expect(normalizarParaBusca("Pokémon")).toBe("pokemon")
		expect(normalizarParaBusca("PSÍQUICO")).toBe("psiquico")
	})

	it("traduz os símbolos de gênero", () => {
		expect(normalizarParaBusca("Nidoran♀")).toBe("nidoran f")
	})

	it("transforma pontuação em espaço, sem colar palavras", () => {
		expect(normalizarParaBusca("Ho-Oh")).toBe("ho oh")
		expect(normalizarParaBusca("Farfetch'd")).toBe("farfetch d")
	})
})

describe("chaveDeBusca", () => {
	it("inclui o número cru e com três dígitos", () => {
		const chave = chaveDeBusca({ nome: "Charmander", numero: 4, regiao: "Kanto" })
		expect(chave).toContain("charmander")
		expect(chave.split(" ")).toContain("4")
		expect(chave.split(" ")).toContain("004")
		expect(chave).toContain("kanto")
	})

	it("aceita espécie sem região", () => {
		expect(chaveDeBusca({ nome: "Mew", numero: 151, regiao: null })).toBe("mew 151 151")
	})
})

describe("chaveDeBuscaDeHabilidade", () => {
	// Os nomes de habilidade são em inglês, mas a mecânica se procura em português.
	it("acha pela condição de status, em português", () => {
		const limber = chaveDeBuscaDeHabilidade({
			nome: "Limber",
			imunidadesDeStatus: [ "paralisado" ],
			imunidadesDeTipo: [],
			climas: [],
		})

		expect(corresponde(limber, "paralisado")).toBe(true)
		expect(corresponde(limber, "limber")).toBe(true)
	})

	it("acha pelo tipo e pelo clima, ignorando acento", () => {
		const voltAbsorb = chaveDeBuscaDeHabilidade({
			nome: "Volt Absorb",
			imunidadesDeStatus: [],
			imunidadesDeTipo: [ "eletrico" ],
			climas: [],
		})
		const swiftSwim = chaveDeBuscaDeHabilidade({
			nome: "Swift Swim",
			imunidadesDeStatus: [],
			imunidadesDeTipo: [],
			climas: [ "chuva" ],
		})

		expect(corresponde(voltAbsorb, "elétrico")).toBe(true)
		expect(corresponde(voltAbsorb, "eletrico")).toBe(true)
		expect(corresponde(swiftSwim, "chuva")).toBe(true)
	})

	it("não inventa correspondência para quem não tem a faceta", () => {
		const adaptability = chaveDeBuscaDeHabilidade({
			nome: "Adaptability",
			imunidadesDeStatus: [],
			imunidadesDeTipo: [],
			climas: [],
		})

		expect(corresponde(adaptability, "chuva")).toBe(false)
		expect(corresponde(adaptability, "adapt")).toBe(true)
	})
})

describe("corresponde", () => {
	const weezing = chaveDeBusca({ nome: "Weezing de Galar", numero: 110, regiao: "Galar/Hisui" })
	const charmander = chaveDeBusca({ nome: "Charmander", numero: 4, regiao: "Kanto" })

	it("acha por nome parcial", () => {
		expect(corresponde(charmander, "char")).toBe(true)
	})

	it("acha por número, com ou sem zeros à esquerda", () => {
		expect(corresponde(charmander, "4")).toBe(true)
		expect(corresponde(charmander, "004")).toBe(true)
	})

	it("ignora acento na consulta", () => {
		expect(corresponde(charmander, "KÂNTO")).toBe(true)
	})

	// Exigir todos os termos é o que separa "galar weezing" de "tudo que é de Galar".
	it("exige todos os termos, em qualquer ordem", () => {
		expect(corresponde(weezing, "galar weezing")).toBe(true)
		expect(corresponde(weezing, "weezing galar")).toBe(true)
		expect(corresponde(charmander, "galar charmander")).toBe(false)
	})

	it("consulta vazia aceita tudo", () => {
		expect(corresponde(charmander, "")).toBe(true)
		expect(corresponde(charmander, "   ")).toBe(true)
	})

	it("não casa quem não tem o termo", () => {
		expect(corresponde(charmander, "pikachu")).toBe(false)
	})
})
