import { describe, expect, it } from "vitest"
import {
	chaveDeBusca, chaveDeBuscaDeHabilidade, chaveDeBuscaDeMega, corresponde, normalizarParaBusca,
} from "./busca"

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

describe("chaveDeBuscaDeMega", () => {
	// Dados reais da v1.33.0. Mega Charizard X é o caso que exercita as quatro entradas da
	// chave de uma vez: a forma, a pedra, a espécie-base e um tipo que ela PASSA a ter.
	const charizardX = chaveDeBuscaDeMega({
		nome: "Mega Charizard X",
		pedra: "Charizardite X",
		especie: "Charizard",
		tipos: [ "fogo", "dragao" ],
		habilidades: [ { nome: "Tough Claws", id: "tough-claws" } ],
	})

	it("acha pela forma", () => {
		expect(corresponde(charizardX, "mega charizard x")).toBe(true)
	})

	// Quem tem a pedra na mão procura por ela, não pelo nome da forma.
	it("acha pela pedra", () => {
		expect(corresponde(charizardX, "charizardite")).toBe(true)
	})

	// Nenhuma das 93 formas Mega existe como espécie na Pokédex do módulo: procurar
	// "charizard" na listagem de Megas tem de achar as duas formas dele.
	it("acha pela espécie-base", () => {
		expect(corresponde(charizardX, "charizard")).toBe(true)
	})

	// Mesma decisão de `chaveDeBuscaDeMove`: os nomes de forma são em inglês, mas quem
	// consulta pensa o tipo em português.
	it("acha pelo nome do tipo em português, com acento ou sem", () => {
		expect(corresponde(charizardX, "dragão")).toBe(true)
		expect(corresponde(charizardX, "dragao")).toBe(true)
	})

	it("acha pela habilidade que a pedra concede", () => {
		expect(corresponde(charizardX, "tough claws")).toBe(true)
	})

	// O tipo que a forma NÃO passa a ter não entra na chave: Mega Charizard X troca Voador
	// por Dragão, e procurar "voador" não deve trazê-la.
	it("não acha pelo tipo que a forma deixa de ter", () => {
		expect(corresponde(charizardX, "voador")).toBe(false)
	})

	// Groudon Primal não começa com "Mega", e a habilidade dela não tem ficha no pack
	// (`id: null`) - o nome ainda tem de entrar na chave.
	it("inclui a habilidade sem ficha e a forma que não começa com Mega", () => {
		const groudon = chaveDeBuscaDeMega({
			nome: "Groudon Primal",
			pedra: "Red Orb",
			especie: "Groudon",
			tipos: [ "terrestre", "fogo" ],
			habilidades: [ { nome: "Desolate Land", id: null } ],
		})

		expect(corresponde(groudon, "primal")).toBe(true)
		expect(corresponde(groudon, "red orb")).toBe(true)
		expect(corresponde(groudon, "desolate")).toBe(true)
	})

	// As 74 que não trocam de tipo têm `tipos: []` - a chave não pode quebrar sem eles.
	it("funciona sem tipos e sem habilidade", () => {
		const latias = chaveDeBuscaDeMega({
			nome: "Mega Latias",
			pedra: "Latiasite",
			especie: "Latias",
			tipos: [],
			habilidades: [],
		})

		expect(corresponde(latias, "latias")).toBe(true)
		expect(corresponde(latias, "latiasite")).toBe(true)
	})
})
