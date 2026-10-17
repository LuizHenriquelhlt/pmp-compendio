import { t } from "$i18n"
import { ATRIBUTOS, type IdAtributo } from "./atributos"
import type { Deslocamento } from "./especie"
import { type IdTamanho } from "./tamanhos"
import type { IdTipo } from "./tipos"

/**
 * Uma Mega Evolução como o compêndio a consome. Deriva do pack `mega-evolutions` via
 * `ferramentas/construir.mjs`.
 *
 * O `id` é o slug da FORMA, não da pedra (`/megas/mega-charizard-x`). Os dois campos dão
 * 93 slugs distintos, mas a forma é o que se procura e o que a ficha descreve — a pedra é
 * o requisito para chegar nela —, e a forma gera URL legível onde a pedra não
 * (`/megas/rayquazanite-nao-requer-mega-pedra`).
 *
 * Os nomes de forma e de pedra ficam em inglês, como os de Move e de Habilidade: é assim
 * que o PMP os publica. Repare que **nem toda forma começa com "Mega"** — Groudon Primal e
 * Kyogre Primal não são Mega Evoluções, e montar o nome como `"Mega " + espécie` erraria
 * nos dois.
 */
export type Mega = {
	id: string
	nome: string
	/** Nome da Mega Pedra. Nas três especiais ela não é requisito — ver `categoria`. */
	pedra: string
	especie: string
	/**
	 * `null` quando o nome da espécie-base não casa com a Pokédex, que publica algumas
	 * formas separadas: Eternal Flower Floette, Meowstic e Tatsugiri na v1.33.0. O nome
	 * continua visível, sem link.
	 */
	especieId: string | null
	/** Número da espécie-base na Pokédex; 0 nas três sem base resolvida. */
	numero: number
	categoria: CategoriaDeMega
	/**
	 * Os tipos que a forma passa a ter, ou lista vazia quando ela não troca de tipo (74 das
	 * 93). Um tipo só é MONOTIPO, não dado faltando: Mega Aggron vem de Aço/Pedra e fica
	 * Aço puro, e o módulo renderiza "Tipo muda para Aço".
	 */
	tipos: IdTipo[]
	/** O tamanho que a forma assume, ou `null` quando não muda (69 das 93). */
	tamanho: IdTamanho | null
	/**
	 * Delta de CA, que pode ser **negativo** (Mega Diancie perde 2, Mega Hawlucha 1).
	 *
	 * `null` só quando o módulo não gravou o campo — distinto de 0, que é o delta de 11
	 * pedras e significa "a CA não muda".
	 */
	deltaCA: number | null
	/** Deltas de atributo, na ordem canônica. Podem ser negativos. */
	atributos: DeltaDeAtributo[]
	/**
	 * Bônus que o JOGADOR distribui — não é escolha de Habilidade.
	 *
	 * `mega.abilityChoices` no módulo guarda `{ options: ["str","dex"], delta: 5 }`: é o
	 * *ability score* do dnd5e, ou seja ATRIBUTO. O próprio módulo confirma na frase que
	 * gera: "+5 em FOR ou DES (à escolha do jogador)".
	 *
	 * Soma-se a `atributos` em vez de substituir: em Mega Hawlucha as duas opções também
	 * têm delta fixo, e são dois fatos, não um repetido.
	 */
	escolhasDeAtributo: EscolhaDeAtributo[]
	/**
	 * As habilidades que a forma concede — 0, 1 ou 2.
	 *
	 * Vêm de DOIS campos do módulo: `passiveAbility` e `otherEffects`. Quatro pedras têm
	 * `passiveAbility` vazia e duas delas declaram a habilidade só na prosa — Mega Floette
	 * ganha Fairy Aura, que existe no pack.
	 */
	habilidades: HabilidadeDeMega[]
	/**
	 * O módulo gravou `"[ainda a ser lançada]"` onde deveria estar o nome da habilidade.
	 *
	 * É marca de trabalho a fazer na fonte, não nome: publicá-la como nome criaria uma
	 * ficha chamada "[ainda a ser lançada]". Convive com `habilidades` preenchido — Mega
	 * Hawlucha tem No Guard **e** uma segunda habilidade pendente.
	 */
	habilidadePendente: boolean
	/**
	 * Bônus em **todos** os deslocamentos, em metros, ou `null` quando não há.
	 *
	 * Em metros e não em pés: o módulo grava `movementBonusFeet`, mas a Pokédex grava
	 * deslocamento em metros em 1.148 das 1.149 espécies, e mostrar "+20" ao lado de
	 * "9m de caminhada" misturaria as duas unidades na mesma tela.
	 */
	deslocamentoBonusM: number | null
	deslocamentosConcedidos: DeslocamentoConcedido[]
	/** O deslocamento cai à metade (Mega Abomasnow). Proporção, que nenhum campo expressa. */
	deslocamentoMetade: boolean
	/** Modos que a forma PERDE (Mega Golisopod perde a natação). */
	deslocamentosPerdidos: Deslocamento["modo"][]
	/**
	 * A prosa de `otherEffects` que nenhuma família leu.
	 *
	 * São as regras de ativação das três pedras especiais — nível mínimo, usos por
	 * descanso, condição de obediência — e a frase que o parser não estruturou. Exibidas,
	 * continuam sendo a regra inteira.
	 */
	outrosTextos: string[]
	/**
	 * Prosa de sabor, sem a deixa que o módulo repete nas 93 ("<espécie> recebe os
	 * seguintes benefícios:").
	 *
	 * Vazia nas quatro em que o módulo gravou texto de outra entrada — ver
	 * `descricaoContaminada`.
	 */
	descricao: string
	/**
	 * O módulo gravou, no campo de descrição, texto que pertence a outro documento.
	 *
	 * Quatro das 93 na v1.33.0, e não é um resto de linha: a de Mega Delphox carrega um
	 * bloco de estatísticas de espécie inteiro (o de Eternal Flower Floette, com CA, PV,
	 * atributos e duas habilidades com regra completa). Publicada, a ficha mostraria
	 * "CA: 17" como se fosse de Mega Delphox, e não há como o leitor saber onde a
	 * descrição dela acaba.
	 */
	descricaoContaminada: boolean
	/** Arte da forma (PokéAPI). Falta em duas das 93 — Mega Meowstic e Mega Tatsugiri. */
	imagem: string | null
}

export type DeltaDeAtributo = { id: IdAtributo, delta: number }

export type EscolhaDeAtributo = { opcoes: IdAtributo[], delta: number }

/** Uma habilidade que a Mega concede; `id` é `null` quando o nome não tem ficha no pack. */
export type HabilidadeDeMega = { nome: string, id: string | null }

/**
 * Um deslocamento que a forma ganha.
 *
 * `metros` e `igualA` são exclusivos porque o módulo declara o valor de dois jeitos, em
 * dois lugares: `movementGrants` diz "igual ao de caminhada" e a prosa de `otherEffects`
 * diz "de 40 pés (12 metros)". A união os mantém exclusivos em vez de deixar os dois
 * campos opcionais e as duas ausências possíveis — a mesma decisão das duas variantes de
 * `imunidade` em `habilidade.ts`.
 *
 * `flutuacao` vem junto porque a Pokédex nunca usa a palavra como modo sozinho: ela
 * escreve "6m de voo (flutuação)" em 98 espécies, sempre como qualificador do voo.
 */
export type DeslocamentoConcedido =
	& { modo: Deslocamento["modo"], flutuacao?: boolean }
	& ({ metros: number, igualA?: never } | { igualA: Deslocamento["modo"] | null, metros?: never })

/**
 * O que a pedra é, segundo `flags[…].category` — um dos raríssimos campos de categoria do
 * módulo que de fato variam (90 `mega-stone`, 3 `mega-stone-especial`).
 *
 * `especial` **não** quer dizer "Primal": são duas Reversões Primal (Groudon, Kyogre) mais
 * um Pokémon que Mega Evolui sem pedra nenhuma (Rayquaza, ao aprender Dragon Ascent). O
 * que as três têm em comum é não seguir a regra comum da Mega Pedra, e a regra de cada uma
 * está em `outrosTextos`. Rotular as três de "Primal" erraria em uma.
 */
export type CategoriaDeMega = "mega" | "especial" | "desconhecida"

/** A fatia de Mega que a listagem e a busca consomem. Enxuta por desenho. */
export type MegaNoIndice = Omit<
	Mega,
	"descricao" | "descricaoContaminada" | "outrosTextos"
	| "deslocamentoBonusM" | "deslocamentosConcedidos" | "deslocamentoMetade" | "deslocamentosPerdidos"
> & {
	/**
	 * Os atributos que a forma AUMENTA, achatados para o filtro.
	 *
	 * Só os positivos: "aumenta FOR" não deve trazer Mega Hawlucha, que perde 2 de FOR. As
	 * opções de `escolhasDeAtributo` entram porque são aumento possível — é a escolha do
	 * jogador, e o cartão marca a diferença.
	 */
	atributosAumentados: IdAtributo[]
	/** Soma dos deltas fixos, com sinal, para ordenar por "quanto a forma ganha". */
	totalDeAtributos: number
	trocaDeTipo: boolean
}

export type MegaBuscavel = Pick<Mega, "nome" | "pedra" | "especie" | "tipos" | "habilidades">

/**
 * Número com sinal explícito, como uma ficha imprime: `+2`, `−1`, `+0`.
 *
 * Usa o sinal de menos tipográfico (−), igual a `formatarModificador` em `atributos.ts`, e
 * não o hífen: alinha melhor em coluna e não quebra linha no meio do número. A vírgula
 * decimal vem do `toLocaleString` porque os deltas de deslocamento têm meio metro
 * (`movementBonusFeet` de 15 pés dá 4,5m).
 */
export function formatarDelta(valor: number): string {
	const numero = Math.abs(valor).toLocaleString("pt-BR", { maximumFractionDigits: 1 })
	return valor < 0 ? `−${numero}` : `+${numero}`
}

/** Abreviação do atributo como o Livro de Regras a imprime: `FOR`, `DES`. */
export function abreviacaoDeAtributo(id: IdAtributo): string {
	return ATRIBUTOS.find((a) => a.id === id)?.abrev ?? id
}

/** `{ opcoes: ["str","dex"], delta: 5 }` → `"+5 em FOR ou DES"`. */
export function descreverEscolhaDeAtributo(escolha: EscolhaDeAtributo): string {
	return t("mega.escolha.valor", {
		delta: formatarDelta(escolha.delta),
		atributos: escolha.opcoes.map(abreviacaoDeAtributo).join(t("mega.escolha.ou")),
	})
}

/**
 * Os fatos de deslocamento como frases curtas, para exibir em sequência.
 *
 * Uma função só, e não quatro no componente, porque as quatro formas vêm de dois campos do
 * módulo e de uma leitura de prosa: quem monta a tela não deveria precisar saber de onde
 * cada uma veio. A ordem é a do ganho para a perda — primeiro o que a forma recebe.
 */
export function descreverDeslocamentoDeMega(mega: Pick<
	Mega,
	"deslocamentoBonusM" | "deslocamentosConcedidos" | "deslocamentoMetade" | "deslocamentosPerdidos"
>): string[] {
	const frases: string[] = []

	if (mega.deslocamentoBonusM != null) {
		frases.push(t("mega.deslocamento.bonus", {
			n: formatarDelta(mega.deslocamentoBonusM).replace(".", ","),
		}))
	}

	for (const concedido of mega.deslocamentosConcedidos) {
		const modo = concedido.flutuacao === true
			? t("mega.deslocamento.flutuacao", { modo: concedido.modo })
			: concedido.modo

		frases.push(concedido.metros != null
			? t("mega.deslocamento.concedeMetros", {
				modo,
				n: concedido.metros.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
			})
			: t("mega.deslocamento.concedeIgual", { modo, base: concedido.igualA ?? "" }))
	}

	if (mega.deslocamentoMetade) frases.push(t("mega.deslocamento.metade"))

	for (const modo of mega.deslocamentosPerdidos) {
		frases.push(t("mega.deslocamento.perde", { modo }))
	}

	return frases
}

/**
 * Uma linha da tabela de atributos da ficha: o valor da espécie, o delta e o resultado.
 *
 * O resultado é publicado porque é o que a mesa precisa no meio de uma sessão — o livro
 * imprime o statblock da espécie-base e o delta da pedra, e somar os dois é o que qualquer
 * jogador faz na hora. Mostrar `antes` ao lado deixa a conta à vista em vez de afirmar um
 * número sem procedência, e nas três Megas sem espécie-base resolvida `antes` e `depois`
 * vêm `null`: sem o statblock da base, só o delta é verdade.
 */
export type LinhaDeAtributo = {
	id: IdAtributo
	abrev: string
	antes: number | null
	delta: number
	depois: number | null
	/**
	 * O atributo é uma das opções de `escolhasDeAtributo`, e por isso pode receber MAIS
	 * que o delta fixo — quanto, só o jogador decide. O resultado mostrado é o do delta
	 * fixo, e a ficha avisa à parte.
	 */
	naEscolha: boolean
}

/**
 * Os atributos que a pedra mexe, na ordem canônica, com o antes e o depois.
 *
 * Lista só os atributos que a pedra toca — um quadro com os seis, quatro deles sem delta,
 * faria a tela parecer um statblock completo da forma, que o módulo não publica. Mega
 * Hawlucha é o caso que exige as duas colunas: `str: -2` fixo E `str` entre as opções de
 * escolha, dois fatos que se somam.
 */
export function linhasDeAtributo(
	mega: Pick<Mega, "atributos" | "escolhasDeAtributo">,
	base: Partial<Record<IdAtributo, number>> | null,
): LinhaDeAtributo[] {
	const nasEscolhas = new Set(mega.escolhasDeAtributo.flatMap((e) => e.opcoes))
	const deltas = new Map(mega.atributos.map((a) => [ a.id, a.delta ]))

	return ATRIBUTOS
		.filter((atributo) => deltas.has(atributo.id) || nasEscolhas.has(atributo.id))
		.map((atributo) => {
			const delta = deltas.get(atributo.id) ?? 0
			const antes = base?.[atributo.id] ?? null

			return {
				id: atributo.id,
				abrev: atributo.abrev,
				antes,
				delta,
				depois: antes != null ? antes + delta : null,
				naEscolha: nasEscolhas.has(atributo.id),
			}
		})
}
