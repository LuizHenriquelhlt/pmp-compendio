// Procura arte de item na PokéAPI e grava o que ENCONTROU em `arte-de-item.json`.
//
// Uso: npm run dados:arte -- [dados]
//
// Por que existe: o módulo preenche a arte de 230 dos 420 itens com uma URL da PokéAPI e
// deixa os outros 190 apontando para a biblioteca de ícones interna do Foundry
// (`icons/equipment/…`), que não é publicada com o site. Destes 190, boa parte são itens
// Pokémon de verdade que a PokéAPI tem — o módulo só não preencheu a URL.
//
// Esta ferramenta roda à parte do pipeline, e de propósito: ela faz rede, e
// `construir.mjs` precisa ser offline e determinístico. O resultado é um arquivo de
// mapeamento que o pipeline lê como qualquer outro dado.
//
// **Só entra no arquivo o que foi CONFERIDO.** Cada candidato leva um pedido HEAD, e o
// que não responder 200 fica de fora — é o que impede o site de voltar a mostrar 404 no
// lugar de um ícone, que foi exatamente o defeito que originou esta ferramenta.
import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { slug } from "./texto.mjs"

const [ dados = "dados" ] = process.argv.slice(2)
const SAIDA = join("ferramentas", "arte-de-item.json")
const SPRITE = (s) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${s}.png`

/**
 * Nome do item no PMP → nome na PokéAPI, para os casos em que o livro traduziu.
 *
 * A regra para entrar aqui é dura: a tradução tem de ser **inequívoca**, com um único
 * item Pokémon possível do outro lado. O sprite existir não basta como prova — `timid-mint`
 * existe, mas isso não torna "Hortelã da Astúcia" a Timid Mint.
 *
 * Por isso NÃO estão aqui, embora tenham sprite na PokéAPI:
 *
 *   - **As 20 Hortelãs.** O PMP renomeou as Naturezas e as remapeou para atributos de
 *     D&D; "Teimoso" e "Astuto" não têm correspondente entre as 25 Naturezas oficiais, e
 *     casar por semelhança publicaria uma associação que o livro não faz.
 *   - **Cristal-Z e Mega Pedra.** São genéricos no PMP; a PokéAPI só tem os específicos
 *     (um Cristal-Z por tipo, uma Mega Pedra por espécie).
 *   - **Rotom Dex.** "Rotom Catalog" é o catálogo de eletrodomésticos, outro item.
 */
const TRADUCAO = {
	// As três máscaras de Ogerpon: nomes oficiais, sem outro candidato possível.
	"Máscara Alicerce": "cornerstone-mask",
	"Máscara Fornalha": "hearthflame-mask",
	"Máscara Nascente": "wellspring-mask",
	// Os quatro Nectares, idem.
	"Nectar Amarelo": "yellow-nectar",
	"Nectar Rosa": "pink-nectar",
	"Nectar Roxo": "purple-nectar",
	"Nectar Vermelho": "red-nectar",
	// Itens-chave de mecânica, um para um.
	"Orbe Tera": "tera-orb",
	"Pedra-Chave": "key-stone",
	"Bracelete-Z": "z-power-ring",
	"Pulseira Dynamax": "dynamax-band",
	"Mega Bracelete": "mega-bracelet",
}

if (!existsSync(join(dados, "itens.json"))) {
	console.error(`Não encontrei ${join(dados, "itens.json")}. Rode antes: npm run dados:construir`)
	process.exit(1)
}

const itens = JSON.parse(readFileSync(join(dados, "itens.json"), "utf8"))
const semArte = itens.filter((i) => i.imagem == null)

console.log(`${itens.length} itens, ${semArte.length} sem arte publicável.`)
console.log("Consultando a PokéAPI…")

const indice = await fetch("https://pokeapi.co/api/v2/item?limit=3000")
	.then((r) => r.json())
	.then((d) => new Set(d.results.map((x) => x.name)))

console.log(`  catálogo da PokéAPI: ${indice.size} itens`)

// Candidato por item: a tradução quando existe, senão o slug do próprio nome. O índice
// filtra antes do pedido HEAD, para não bater na rede atrás do que já se sabe que não há.
const candidatos = semArte
	.map((item) => ({ item, alvo: TRADUCAO[item.nome] ?? slug(item.nome) }))
	.filter(({ alvo }) => indice.has(alvo))

console.log(`  candidatos no catálogo: ${candidatos.length}`)
console.log("Conferindo os sprites…")

const achados = {}
const semSprite = []

for (let k = 0; k < candidatos.length; k += 15) {
	await Promise.all(candidatos.slice(k, k + 15).map(async ({ item, alvo }) => {
		try {
			const resposta = await fetch(SPRITE(alvo), { method: "HEAD" })
			if (resposta.ok) achados[item.nome] = SPRITE(alvo)
			else semSprite.push(`${item.nome} (${alvo})`)
		} catch {
			semSprite.push(`${item.nome} (${alvo}) — falha de rede`)
		}
	}))
}

// Ordenado por nome para o arquivo ter diff estável entre execuções.
const ordenado = Object.fromEntries(Object.keys(achados).sort((a, b) => a.localeCompare(b, "pt-BR"))
	.map((n) => [ n, achados[n] ]))

writeFileSync(SAIDA, `${JSON.stringify(ordenado, null, 1)}\n`)

console.log(`\n${SAIDA} — ${Object.keys(ordenado).length} itens ganharam arte`)
if (semSprite.length > 0) console.log(`  no catálogo mas sem sprite: ${semSprite.join(", ")}`)

const restam = semArte.length - Object.keys(ordenado).length
console.log(`\nContinuam sem arte: ${restam}.`)
console.log("  A maior parte é equipamento de aventura que o PMP inventou (Chaleira, Cantil,")
console.log("  Bússola, Tenda…): não são itens Pokémon, e não há arte oficial em fonte nenhuma.")
console.log("  Rode de novo depois de `npm run dados:construir` quando o módulo for atualizado.")
