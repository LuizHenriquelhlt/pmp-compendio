/**
 * Os trechos de HTML aqui saíram de `dados-crus/regras.json` sem retoque. Os casos de
 * conteúdo perigoso (script, onerror, img) NÃO existem no corpus - são o que a
 * sanitização promete impedir se a próxima versão do módulo os trouxer, e um teste é
 * onde essa promessa fica escrita.
 */
import { describe, it, expect } from "vitest"
import { sanitizar, interpretarEntrada, interpretarRegras } from "../ferramentas/regras.mjs"

describe("sanitizar", () => {
	it("mantém o parágrafo como o módulo escreve", () => {
		const bruto = "<p>O clima desempenha um grande papel no jogo - muitos Pokémon têm habilidades afetadas pelo clima.</p>"
		expect(sanitizar(bruto)).toBe(bruto)
	})

	it("mantém a tabela inteira, que é 27 das estruturas do corpus", () => {
		const bruto = "<table><thead><tr><th>Estação</th><th>1d100</th></tr></thead><tbody><tr><td>Verão</td><td>01-30</td></tr></tbody></table>"
		expect(sanitizar(bruto)).toBe(bruto)
	})

	it("rebaixa os títulos: o nome da página já é o h2 da ficha", () => {
		expect(sanitizar("<h2>Condições Gerais</h2>")).toBe("<h3>Condições Gerais</h3>")
		expect(sanitizar("<h3>Acúmulo</h3>")).toBe("<h4>Acúmulo</h4>")
	})

	it("traduz o único estilo do corpus para classe", () => {
		const bruto = '<p style="text-align:center"><strong>1d20 + 2 × Bônus de Proficiência + Bônus da Pokébola</strong></p>'
		expect(sanitizar(bruto)).toBe('<p class="centro"><strong>1d20 + 2 × Bônus de Proficiência + Bônus da Pokébola</strong></p>')
	})

	it("descarta qualquer outro atributo, inclusive numa tag permitida", () => {
		expect(sanitizar('<table style="font-size:0.72rem">')).toBe("<table>")
		expect(sanitizar('<p class="qualquer" id="x">texto</p>')).toBe("<p>texto</p>")
	})

	it("remove a tag não permitida e preserva o texto de dentro", () => {
		expect(sanitizar("<div>Regra<span> importante</span></div>")).toBe("Regra importante")
	})

	it("remove script, img e manipulador de evento", () => {
		// Nenhum existe no corpus hoje; o teste é a promessa de que continuarão fora.
		expect(sanitizar('<script>alert(1)</script>')).toBe("alert(1)")
		expect(sanitizar('<img src="x" onerror="alert(1)">')).toBe("")
		expect(sanitizar('<p onclick="alert(1)">texto</p>')).toBe("<p>texto</p>")
		expect(sanitizar('<a href="http://exemplo">link</a>')).toBe("link")
	})

	it("conta o que descartou, para o relatório", () => {
		const descartadas = []
		sanitizar("<div><p>fica</p><span>some</span></div>", descartadas)
		expect(descartadas).toEqual([ "div", "span", "span", "div" ])
	})

	it("aguenta vazio e nulo", () => {
		expect(sanitizar("")).toBe("")
		expect(sanitizar(null)).toBe("")
		expect(sanitizar(undefined)).toBe("")
	})
})

describe("interpretarEntrada", () => {
	it("gera id em pt-BR a partir do nome", () => {
		const { entrada } = interpretarEntrada({ name: "Cuidados do Pokémon", pages: [ { name: "p", text: { content: "<p>x</p>" } } ] })
		expect(entrada.id).toBe("cuidados-do-pokemon")
		expect(entrada.nome).toBe("Cuidados do Pokémon")
	})

	it("guarda o título de cada página, que é o que vira sumário", () => {
		const { entrada } = interpretarEntrada({
			name: "Condições",
			pages: [
				{ name: "Condições de Status (Pokémon)", text: { content: "<p>a</p>" } },
				{ name: "Condições Gerais", text: { content: "<p>b</p>" } },
			],
		})
		expect(entrada.paginas.map((p) => p.titulo)).toEqual([ "Condições de Status (Pokémon)", "Condições Gerais" ])
	})

	it("descarta página sem conteúdo em vez de publicar um título vazio", () => {
		const { entrada } = interpretarEntrada({ name: "X", pages: [ { name: "vazia", text: { content: "   " } }, { name: "cheia", text: { content: "<p>a</p>" } } ] })
		expect(entrada.paginas.map((p) => p.titulo)).toEqual([ "cheia" ])
	})
})

describe("interpretarRegras", () => {
	const pacote = [
		{ _id: "pastaA", name: "Regras" },
		{ _id: "pastaB", name: "Homebrews" },
		{ _id: "e1", name: "Clima", folder: "pastaA", pages: [ { name: "Clima", text: { content: "<p>a</p>" } } ] },
		{ _id: "e2", name: "Afinidade", folder: "pastaB", pages: [ { name: "Afinidade", text: { content: "<p>b</p>" } } ] },
	]

	it("tira o grupo da pasta do Foundry", () => {
		const { entradas } = interpretarRegras(pacote)
		expect(entradas.map((e) => [ e.nome, e.grupo ])).toEqual([ [ "Clima", "Regras" ], [ "Afinidade", "Homebrews" ] ])
	})

	it("não publica as pastas como entradas", () => {
		const { entradas } = interpretarRegras(pacote)
		expect(entradas.map((e) => e.nome)).not.toContain("Regras")
		expect(entradas).toHaveLength(2)
	})

	it("diz em qual entrada cada tag foi descartada", () => {
		const { descartadas } = interpretarRegras([
			{ _id: "p", name: "Regras" },
			{ _id: "e", name: "Clima", folder: "p", pages: [ { name: "Clima", text: { content: "<p>a</p><div>b</div>" } } ] },
		])
		expect(descartadas).toEqual([ { entrada: "Clima", tag: "div" }, { entrada: "Clima", tag: "div" } ])
	})

	it("entrada sem nenhuma página com conteúdo não é publicada", () => {
		const { entradas } = interpretarRegras([ { _id: "e", name: "Vazia", pages: [ { name: "x", text: { content: "" } } ] } ])
		expect(entradas).toEqual([])
	})
})
