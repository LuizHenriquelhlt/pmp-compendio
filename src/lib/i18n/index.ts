/**
 * Mensagens da interface.
 *
 * O compêndio nasce em português do Brasil — o PMP é um sistema brasileiro, e os `id`
 * do conteúdo são os nomes em português. Mesmo assim nenhum texto de interface fica
 * escrito direto no componente: tudo passa por `t()`, lendo de `mensagens/<locale>.json`.
 *
 * Isso mantém o caminho para outros idiomas aberto a um custo baixo:
 *
 *   - interface: acrescentar `mensagens/<locale>.json` e registrá-lo em `CATALOGOS`;
 *   - conteúdo: um arquivo de sobreposição por locale, mesclado por `id` com fallback
 *     campo a campo para o pt-BR (ver `docs/localizacao.md`).
 *
 * Deliberadamente sem dependência externa: com um único idioma, um gerador de código
 * de i18n custaria mais do que entrega. A assinatura de `t()` é a mesma que um
 * Paraglide ou i18next exporia, então trocar depois é mecânico.
 */
import ptBR from "../../../mensagens/pt-br.json"

export const LOCALE_BASE = "pt-br"

const CATALOGOS: Record<string, Record<string, string>> = {
	"pt-br": ptBR,
}

export const LOCAIS_DISPONIVEIS = Object.keys(CATALOGOS)

export type ChaveDeMensagem = keyof typeof ptBR

/**
 * Texto de uma chave, com interpolação de `{nome}`.
 *
 * Uma chave ausente devolve a própria chave em vez de string vazia: o texto errado
 * aparece na tela e é corrigido, enquanto um vazio passa despercebido.
 */
export function t(
	chave: ChaveDeMensagem,
	valores?: Record<string, string | number>,
	locale: string = LOCALE_BASE,
): string {
	const catalogo = CATALOGOS[locale] ?? CATALOGOS[LOCALE_BASE]
	const texto = catalogo[chave] ?? CATALOGOS[LOCALE_BASE][chave] ?? chave

	if (valores == null) return texto

	return texto.replace(/\{(\w+)\}/g, (original, nome: string) => {
		const valor = valores[nome]
		return valor != null ? String(valor) : original
	})
}

/** Plural simples: escolhe entre duas chaves conforme a quantidade. */
export function tPlural(
	quantidade: number,
	chaveSingular: ChaveDeMensagem,
	chavePlural: ChaveDeMensagem,
	valores?: Record<string, string | number>,
): string {
	const chave = quantidade === 1 ? chaveSingular : chavePlural
	return t(chave, { n: quantidade.toLocaleString("pt-BR"), ...valores })
}
