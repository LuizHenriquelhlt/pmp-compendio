/**
 * As regras do `squarecloud.app`, num módulo só porque dois caminhos de publicação
 * precisam delas: o pacote .zip (`publicar.mjs`) e o repositório de publicação
 * (`publicar-github.mjs`). Regra duplicada é regra que diverge.
 *
 * Conferimos aqui porque o host só as aplica DEPOIS do upload — e uma delas não tem
 * segunda chance: SUBDOMAIN é obrigatório no PRIMEIRO envio. Sem ele o deploy vira uma
 * aplicação comum, não um site, e não há conversão possível. DISPLAY_NAME só aceita letra
 * SEM acento, o que é fácil de esquecer num projeto escrito em português.
 *
 * Fonte: docs.squarecloud.app/en/getting-started/config-file
 */
import { readFileSync } from "node:fs"

export function lerCampos(texto) {
	const campos = {}
	for (const linha of texto.split("\n")) {
		const corte = linha.indexOf("=")
		if (corte > 0) campos[linha.slice(0, corte).trim()] = linha.slice(corte + 1).trim()
	}
	return campos
}

/** Devolve a lista de problemas; vazia quer dizer que passa. */
export function problemasNaConfiguracao(campos) {
	const problemas = []
	const { DISPLAY_NAME = "", SUBDOMAIN = "", VERSION = "", DESCRIPTION = "", MEMORY = "" } = campos

	if (!DISPLAY_NAME) problemas.push("DISPLAY_NAME é obrigatório")
	else if (DISPLAY_NAME.length > 32) problemas.push(`DISPLAY_NAME tem ${DISPLAY_NAME.length} caracteres (limite 32)`)
	else if (!/^[A-Za-z0-9 _-]+$/.test(DISPLAY_NAME)) {
		const fora = [...DISPLAY_NAME].filter((c) => !/[A-Za-z0-9 _-]/.test(c))
		problemas.push(`DISPLAY_NAME só aceita letra sem acento, dígito, espaço, - e _; achei ${fora.join(" ")}`)
	}

	if (!SUBDOMAIN) {
		problemas.push(
			"SUBDOMAIN está faltando. Ele TEM de ir no primeiro envio: sem ele o deploy vira\n" +
			"  aplicação em vez de site, e não dá para converter depois — só apagando e subindo de novo.",
		)
	} else if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(SUBDOMAIN.toLowerCase())) {
		problemas.push(`SUBDOMAIN inválido: "${SUBDOMAIN}" (letras, dígitos e hífen, sem começar nem terminar em hífen, até 63)`)
	}

	if (!["recommended", "latest"].includes(VERSION)) problemas.push(`VERSION é "recommended" ou "latest", não "${VERSION}"`)
	if (DESCRIPTION.length > 280) problemas.push(`DESCRIPTION tem ${DESCRIPTION.length} caracteres (limite 280)`)
	if (!/^\d+$/.test(MEMORY)) problemas.push(`MEMORY é um número em MB, não "${MEMORY}"`)

	return problemas
}

/** Lê, confere e devolve os campos. Encerra o processo se algo não passar. */
export function conferirArquivo(caminho) {
	const campos = lerCampos(readFileSync(caminho, "utf8"))
	const problemas = problemasNaConfiguracao(campos)
	if (problemas.length > 0) {
		console.error(`${caminho} não passa nas regras do Square Cloud:`)
		for (const problema of problemas) console.error(`- ${problema}`)
		process.exit(1)
	}
	return campos
}
