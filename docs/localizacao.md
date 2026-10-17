# Localização

O Compêndio PMP nasce em **português do Brasil**. O PMP é um sistema brasileiro, e o
projeto adota os nomes em português como identidade do conteúdo — inclusive nos `id`
e nas URLs (`/pokemon/weezing-de-galar`, e não `/pokemon/galarian-weezing`).

Isso é uma escolha, com uma consequência: um idioma novo não herda os identificadores
de graça. O que segue descreve o que já está pronto para receber outro idioma e o que
custaria.

## O que já está preparado

### Interface

Nenhum texto de interface está escrito dentro de um componente. Tudo passa por `t()`:

```svelte
<script lang="ts">
	import { t } from "$i18n"
</script>

<h2>{t("especie.atributos")}</h2>
<p>{t("catalogo.subtitulo", { n: 1149 })}</p>
```

As chaves vivem em `mensagens/pt-br.json`, achatadas (`especie.atributos`, e não um
objeto aninhado), para que `keyof` as tipe uma a uma: escrever uma chave que não existe
é erro de compilação, não um buraco silencioso em produção.

`t()` interpola `{nome}` e, se a chave faltar, devolve **a própria chave**. Um texto
estranho na tela é notado e corrigido; uma string vazia passa despercebida.

### Vocabulário do jogo

Tipos, tamanhos e atributos estão em tabelas de domínio (`src/lib/pmp/`), separando
identidade (`id`) de rótulo (`nome`):

```ts
{ id: "fogo", nome: "Fogo" }
```

As cores dos tipos não estão nessas tabelas: ficam em `src/lib/ui/tipos.css`, como
classes `.tipo-<id>` que expõem `--tipo-cor` e `--tipo-contraste`. Trocar de idioma
não encosta nas cores.

## Para somar um idioma

### 1. Interface

Crie `mensagens/<locale>.json` com as mesmas chaves e registre-o:

```ts
// src/lib/i18n/index.ts
import en from "../../../mensagens/en.json"

const CATALOGOS = {
	"pt-br": ptBR,
	"en": en,
}
```

`ChaveDeMensagem` continua derivando do catálogo pt-BR, que é a base: um catálogo
novo com chave faltando cai no pt-BR em vez de quebrar.

### 2. Vocabulário do jogo

Acrescente o rótulo traduzido às tabelas de domínio. O `id` **não muda** — ele é a
identidade, não o texto:

```ts
{ id: "fogo", nome: "Fogo", nomeEn: "Fire" }
```

As tabelas são `TIPOS` (`pmp/tipos.ts`), `TAMANHOS` (`pmp/tamanhos.ts`), `ATRIBUTOS`
(`pmp/atributos.ts`), `STATUS`, `ATRIBUTOS_DE_ESTAGIO`, `RESOLUCOES` e
`MODOS_DE_ATIVACAO` (`pmp/move.ts`) e `CLIMAS` (`pmp/habilidade.ts`).

A fronteira entre esta seção e a anterior é a pergunta "quem nomeou isto?". Chuva e
Granizo são nomes do **sistema**, então vivem aqui; "Protege de" e "Interage com" são
leitura nossa do texto do livro, então são mensagens de interface.

### 3. Conteúdo

Aqui está o custo real. Nomes de espécie, descrições, textos de evolução e as regras
das Habilidades vêm do módulo Foundry em português.

O caminho previsto é uma **sobreposição por idioma**: `dados/<locale>/especies.json`
com apenas os campos que mudam, mesclado sobre o pt-BR por `id`, campo a campo. Vale
para `moves.json` e `habilidades.json` do mesmo jeito.

```json
[
	{ "id": "weezing-de-galar", "nome": "Galarian Weezing" },
	{ "id": "charmander", "descricao": "The Lizard Pokémon…" }
]
```

O que a sobreposição não declarar permanece em pt-BR — então um idioma pode começar
só com os nomes e ganhar descrições depois, sem etapa intermediária quebrada.

Vale guardar o nome original como apelido de busca ao mesclar, para que a listagem
continue encontrável nos dois idiomas.

### 4. Rotas

Como os `id` são em português, as URLs continuam as mesmas em qualquer idioma. Um
idioma novo é um prefixo de rota (`/en/pokemon/weezing-de-galar`), não um conjunto
novo de endereços — o que também evita quebrar links já compartilhados.

## Por que não Paraglide ou i18next

Com um idioma só, um gerador de código de i18n custaria mais do que entrega: mais uma
etapa de build, mais um formato de arquivo, mais uma dependência a atualizar.

A assinatura de `t(chave, valores)` é deliberadamente a mesma que essas bibliotecas
expõem. No dia em que houver dois ou três idiomas de verdade — com roteamento por
locale e necessidade de *tree-shaking* por idioma — a troca é mecânica: os catálogos
já estão no formato certo e as chamadas não mudam.
