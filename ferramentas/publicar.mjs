/**
 * Empacota o build para subir num host estático (Square Cloud, no caso).
 *
 * O Square Cloud recebe um .zip cuja RAIZ é a raiz do site: index.html e squarecloud.app
 * têm de estar no primeiro nível do arquivo, não dentro de uma pasta `build/`. É por isso
 * que este script zipa o CONTEÚDO de build/ e não a pasta - um zip com um nível a mais é
 * o erro mais comum e o painel só diz "não achei index.html".
 *
 * O squarecloud.app vive na raiz do projeto (é configuração versionada, não artefato) e é
 * copiado para dentro do pacote aqui.
 *
 * Requer um build já feito e já portátil: `npm run build` faz os dois.
 */
import { existsSync, copyFileSync, mkdirSync, rmSync, statSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join, resolve } from "node:path"
import { conferirArquivo } from "./configuracao-square.mjs"

const BUILD = "build"
const CONFIG = "squarecloud.app"
const SAIDA = join("publicacao", "compendio-pmp.zip")

function pare(mensagem) {
	console.error(mensagem)
	process.exit(1)
}

if (!existsSync(join(BUILD, "index.html"))) pare("Falta o build. Rode 'npm run build' antes.")
if (!existsSync(CONFIG)) pare(`Falta o ${CONFIG} na raiz do projeto.`)

// Um build sem o passo de portabilidade subiria e daria 404 em toda rota que não a raiz -
// e o 404 só apareceria depois do upload. Melhor falhar aqui.
if (existsSync(join(BUILD, "pokemon.html"))) {
	pare("O build está na forma pasta.html. Rode 'npm run build' (que termina em ferramentas/portatil.mjs).")
}
if (!existsSync(join(BUILD, "pokemon", "index.html"))) {
	pare(`Não achei ${BUILD}/pokemon/index.html - o build não parece completo.`)
}

const { SUBDOMAIN: subdominio } = conferirArquivo(CONFIG)

copyFileSync(CONFIG, join(BUILD, CONFIG))

mkdirSync("publicacao", { recursive: true })
rmSync(SAIDA, { force: true })

// Sem dependência de npm para zipar: no Windows o .NET já tem o compressor, e em
// qualquer outro lugar o `zip` do sistema resolve. `CreateFromDirectory` com
// `includeBaseDirectory` falso põe o conteúdo na raiz do arquivo, que é o que o host espera.
if (process.platform === "win32") {
	const ps = [
		"Add-Type -AssemblyName System.IO.Compression.FileSystem;",
		`[System.IO.Compression.ZipFile]::CreateFromDirectory('${resolve(BUILD)}', '${resolve(SAIDA)}', [System.IO.Compression.CompressionLevel]::Optimal, $false)`,
	].join(" ")
	execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { stdio: "inherit" })
} else {
	execFileSync("zip", ["-r", "-q", resolve(SAIDA), "."], { cwd: BUILD, stdio: "inherit" })
}

const mb = (statSync(SAIDA).size / 1024 / 1024).toFixed(1)
console.log(`pacote: ${SAIDA} (${mb} MB)`)
console.log(`o site vai atender em https://${subdominio.toLowerCase()}.squareweb.app`)
