// Converte os compêndios LevelDB do módulo Foundry "pokemon-mundo-perfeito" em JSON cru.
//
// Uso: npm run dados:desempacotar -- "<pasta-do-módulo>" [saída=dados-crus]
//
// Só lê os arquivos do banco - nada do módulo é executado. Os packs são copiados para
// uma pasta temporária antes de abrir, porque abrir um LevelDB escreve LOCK/LOG no
// diretório e isso sujaria o módulo original.
import { ClassicLevel } from "classic-level"
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

const [ pastaDoModulo, saida = "dados-crus" ] = process.argv.slice(2)

if (pastaDoModulo == null) {
	console.error("Uso: npm run dados:desempacotar -- \"<pasta-do-módulo>\" [saída=dados-crus]")
	process.exit(1)
}

const pastaDePacks = join(pastaDoModulo, "packs")
if (!existsSync(pastaDePacks)) {
	console.error(`Não encontrei "packs" em ${pastaDoModulo}. Aponte para a raiz do módulo extraído.`)
	process.exit(1)
}

mkdirSync(saida, { recursive: true })

for (const pack of readdirSync(pastaDePacks)) {
	const temporaria = mkdtempSync(join(tmpdir(), `pmp-${pack}-`))
	cpSync(join(pastaDePacks, pack), temporaria, { recursive: true })

	const banco = new ClassicLevel(temporaria, { valueEncoding: "json" })
	const documentos = {}
	for await (const [ chave, valor ] of banco.iterator()) documentos[chave] = valor
	await banco.close()
	rmSync(temporaria, { recursive: true, force: true })

	// `!actors!<id>` são documentos de topo; `!actors.items!<id>.<itemId>` são embutidos
	// e precisam ser costurados de volta no array correspondente do dono.
	const topo = Object.entries(documentos).filter(([ c ]) => /^![a-z]+!/.test(c)).map(([ , v ]) => v)
	const embutidos = Object.entries(documentos).filter(([ c ]) => /^![a-z]+\.[a-z]+!/.test(c))

	for (const documento of topo) {
		for (const [ chave, valor ] of embutidos) {
			const [ , colecao, caminho ] = chave.match(/^![a-z]+\.([a-z]+)!(.+)$/)
			if (!caminho.startsWith(`${documento._id}.`)) continue

			const indice = documento[colecao]?.indexOf?.(valor._id)
			if (indice != null && indice >= 0) documento[colecao][indice] = valor
		}
	}

	writeFileSync(join(saida, `${pack}.json`), JSON.stringify(topo))
	console.log(`${pack}: ${topo.length} documentos`)
}

console.log(`\nPronto. Agora rode: npm run dados:construir`)
