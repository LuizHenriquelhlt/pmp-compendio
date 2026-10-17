// Baixa a arte dos itens para `static/itens/` e grava o mapa que o pipeline lê.
//
// Uso: npm run dados:arte -- [dados]
//
// Duas coisas, e a segunda é a que importa:
//
// 1. **Acha o que falta.** O módulo preenche `img` com uma URL da PokéAPI em 230 dos 420
//    itens e deixa os outros 190 apontando para a biblioteca de ícones interna do Foundry
//    (`icons/equipment/…`), que não é publicada com o site. Boa parte desses 190 são itens
//    Pokémon de verdade que a PokéAPI tem — o módulo só não linkou.
//
// 2. **Para de depender do GitHub em tempo de visita.** Antes o site apontava direto para
//    `raw.githubusercontent.com`, e isso quebrava de forma intermitente: o endpoint `raw`
//    não é uma CDN, e com algumas dezenas de imagens pedidas de uma vez ele estrangula —
//    o leitor via o ícone de imagem quebrada em alguns cartões, sempre em cartões
//    diferentes. Baixando na geração, o site serve de si mesmo: nada quebra por rede, e o
//    container fica servível offline, que é como ele é usado na mesa.
//
// Os arquivos vão para `static/itens/`, FORA do git: são arte de terceiros, e vale a
// mesma regra de `dados/` — cada um gera na sua máquina.
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const [ dados = "dados" ] = process.argv.slice(2)
const PASTA = join("static", "itens")
const MAPA = join("ferramentas", "arte-de-item.json")
const SPRITE = (s) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${s}.png`

const slug = (texto) => texto
	.normalize("NFD").replace(/[̀-ͯ]/g, "")
	.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")

/**
 * Nome do item no PMP → nome na PokéAPI, para os casos em que o livro traduziu.
 *
 * A regra para entrar aqui é dura: a tradução tem de ser **inequívoca**, com um único
 * item Pokémon possível do outro lado. O sprite existir não basta como prova —
 * `timid-mint` existe, mas isso não torna "Hortelã da Astúcia" a Timid Mint.
 *
 * Por isso NÃO estão aqui, embora tenham sprite na PokéAPI:
 *
 *   - **As 20 Hortelãs.** O PMP renomeou as Naturezas e as remapeou para atributos de
 *     D&D; "Teimoso" e "Astuto" não têm correspondente entre as 25 Naturezas oficiais.
 *   - **Cristal-Z e Mega Pedra.** São genéricos no PMP; a PokéAPI só tem os específicos.
 *   - **Rotom Dex.** "Rotom Catalog" é o catálogo de eletrodomésticos, outro item.
 */
const TRADUCAO = {
	"Máscara Alicerce": "cornerstone-mask",
	"Máscara Fornalha": "hearthflame-mask",
	"Máscara Nascente": "wellspring-mask",
	"Nectar Amarelo": "yellow-nectar",
	"Nectar Rosa": "pink-nectar",
	"Nectar Roxo": "purple-nectar",
	"Nectar Vermelho": "red-nectar",
	"Orbe Tera": "tera-orb",
	"Pedra-Chave": "key-stone",
	"Bracelete-Z": "z-power-ring",
	"Pulseira Dynamax": "dynamax-band",
	"Mega Bracelete": "mega-bracelet",
}

/**
 * Sprites que a PokéAPI tem, mas que estão QUEBRADOS na origem.
 *
 * Os seis "doces de atributo" de Let's Go têm, no repositório da PokéAPI, um PNG de
 * 64×64 que não é um desenho: são quatro borrões de pixels coloridos espalhados. Os seis
 * compartilham exatamente 444–448 pixels opacos e a mesma distribuição — é a mesma imagem
 * defeituosa em matizes diferentes. Conferidos a olho (health, courage e quick).
 *
 * Baixar e publicar isso enche o cartão de sujeira colorida, que foi o que o usuário viu.
 * Recusados aqui, eles caem no ícone desenhado de `IconeDeItem.svelte`, que ao menos diz
 * "isto é um doce".
 *
 * A lista é curada, e não um limiar automático, de propósito: o sprite legítimo mais
 * esparso do catálogo (`tiny-bamboo-shoot`) fica a três pontos percentuais de densidade
 * dos quebrados, e qualquer corte estatístico aí recusaria arte boa.
 */
const QUEBRADOS_NA_ORIGEM = new Set([
	"health-candy", "courage-candy", "mighty-candy",
	"quick-candy", "smart-candy", "tough-candy",
])

if (!existsSync(join(dados, "itens.json"))) {
	console.error(`Não encontrei ${join(dados, "itens.json")}. Rode antes: npm run dados:construir`)
	process.exit(1)
}

const itens = JSON.parse(readFileSync(join(dados, "itens.json"), "utf8"))

/**
 * O `img` ORIGINAL de cada item, lido do pack cru e não de `dados/itens.json`.
 *
 * Isto é essencial e não é detalhe: depois da primeira execução, `dados/itens.json` já
 * traz o caminho LOCAL que esta ferramenta gerou (`/itens/x.png`), não a URL do módulo.
 * Lendo de lá, a segunda execução não encontraria mais nenhuma URL `http`, cairia no
 * palpite por nome e perderia a arte de todo item cujo nome não casa com a PokéAPI — a
 * cada ciclo um pouco mais. O pack cru é a única fonte que não se autodestrói.
 */
const CRU = join("dados-crus", "trainer-features.json")
const imgOriginal = new Map()

if (existsSync(CRU)) {
	for (const d of JSON.parse(readFileSync(CRU, "utf8"))) {
		if (d.flags?.["pokemon-mundo-perfeito"]?.category === "item-treinador") {
			imgOriginal.set(d.name, typeof d.img === "string" ? d.img : "")
		}
	}
} else {
	console.warn(`  (não achei ${CRU} — sem as URLs originais do módulo, só o palpite por nome)`)
}

// Pasta limpa a cada execução: um item que mudou de nome na fonte não pode deixar o
// arquivo velho para trás, servindo a arte de outra coisa.
if (existsSync(PASTA)) rmSync(PASTA, { recursive: true })
mkdirSync(PASTA, { recursive: true })

console.log(`${itens.length} itens. Procurando a arte de cada um…`)

const indice = await fetch("https://pokeapi.co/api/v2/item?limit=3000")
	.then((r) => r.json())
	.then((d) => new Set(d.results.map((x) => x.name)))
	.catch(() => new Set())

if (indice.size === 0) console.warn("  (não consegui consultar a PokéAPI — só a arte que o módulo já linka)")
else console.log(`  catálogo da PokéAPI: ${indice.size} itens`)

/**
 * De onde vem a arte deste item, ou `null`.
 *
 * A URL que o módulo já traz tem precedência: é a escolha de quem mantém o sistema. O
 * palpite por nome só entra onde o módulo não linkou nada publicável.
 */
function origem(item) {
	const doModulo = imgOriginal.get(item.nome)
	if (typeof doModulo === "string" && doModulo.startsWith("http")) {
		// Mesmo a URL que o módulo traz passa pela lista: Rare Candy é legítima, mas os
		// doces de atributo são os mesmos arquivos quebrados venham de onde vierem.
		const nomeDoSprite = doModulo.match(/items\/([^/]+)\.png$/)?.[1] ?? ""
		return QUEBRADOS_NA_ORIGEM.has(nomeDoSprite) ? null : doModulo
	}

	const alvo = TRADUCAO[item.nome] ?? slug(item.nome)
	if (QUEBRADOS_NA_ORIGEM.has(alvo)) return null

	return indice.has(alvo) ? SPRITE(alvo) : null
}

const comOrigem = itens.map((i) => ({ item: i, url: origem(i) })).filter((x) => x.url != null)
console.log(`  com arte a baixar: ${comOrigem.length}`)

const mapa = {}
const falhas = []

for (let k = 0; k < comOrigem.length; k += 12) {
	await Promise.all(comOrigem.slice(k, k + 12).map(async ({ item, url }) => {
		try {
			const resposta = await fetch(url)
			if (!resposta.ok) { falhas.push(`${item.nome} (${resposta.status})`); return }

			const bytes = Buffer.from(await resposta.arrayBuffer())

			// Confere a assinatura PNG antes de gravar. Um 200 com corpo errado — página de
			// erro, redirecionamento, resposta de estrangulamento — passaria por um HEAD, e
			// foi assim que imagens quebradas chegaram ao site da primeira vez.
			const ehPng = bytes.length > 8 && bytes.subarray(0, 8)
				.equals(Buffer.from([ 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a ]))

			if (!ehPng) { falhas.push(`${item.nome} (não é PNG, ${bytes.length} bytes)`); return }

			writeFileSync(join(PASTA, `${item.id}.png`), bytes)
			mapa[item.nome] = `/itens/${item.id}.png`
		} catch (erro) {
			falhas.push(`${item.nome} (${erro.message})`)
		}
	}))

	process.stdout.write(`\r  baixados: ${Object.keys(mapa).length}`)
}

const ordenado = Object.fromEntries(Object.keys(mapa).sort((a, b) => a.localeCompare(b, "pt-BR"))
	.map((n) => [ n, mapa[n] ]))

writeFileSync(MAPA, `${JSON.stringify(ordenado, null, 1)}\n`)

const total = readdirSync(PASTA).length
console.log(`\n\n${PASTA}/ — ${total} imagens`)
console.log(`${MAPA} — ${Object.keys(ordenado).length} itens com arte`)
if (falhas.length > 0) console.log(`  falharam: ${falhas.join(", ")}`)

console.log(`\nContinuam sem arte: ${itens.length - Object.keys(ordenado).length}.`)
console.log("  São, na maioria, equipamento de aventura que o PMP inventou (Chaleira, Cantil,")
console.log("  Bússola, Tenda…): não são itens Pokémon e não há arte oficial em fonte nenhuma.")
console.log("  O site desenha um ícone próprio para eles — ver `IconeDeItem.svelte`.")
