# Compêndio PMP

*Referência do sistema **Pokémon Mundo Perfeito**, em português do Brasil.*

Site estático de consulta para o PMP: statblocks de espécies e fichas de Move, com busca
e filtros, pensado para ser aberto no meio de uma sessão. Construído em
[SvelteKit](https://svelte.dev/docs/kit), sem servidor e sem banco — tudo é gerado no build.

## Conteúdo não acompanha o código

O sistema Pokémon Mundo Perfeito é obra da sua comunidade autora. Este repositório
carrega **apenas o programa**: `dados/` e `dados-crus/` estão no `.gitignore`, e o
conteúdo é gerado na máquina de quem executa, a partir do módulo Foundry do PMP.

Sem essa etapa, o site não constrói — por desenho.

## Rodando

Pré-requisitos: Node.js 20+ (testado no 24) e o módulo Foundry
`pokemon-mundo-perfeito` extraído em algum lugar.

```bash
npm install

# 1. Converte os compêndios LevelDB do módulo em JSON cru (dados-crus/)
npm run dados:desempacotar -- "../pokemon-mundo-perfeito-v1.33.0"

# 2. Normaliza para o formato do site (dados/)
npm run dados:construir

# 3. Sobe o site em http://localhost:5173
npm run dev
```

Os dois passos de dados juntos: `npm run dados`.

Se você já tem os packs desempacotados em outro lugar, aponte o segundo passo para lá:

```bash
npm run dados:construir -- ../pmp-rpg/data/raw dados
```

### Outros comandos

| Comando | O que faz |
|---|---|
| `npm run build` | Gera o site estático em `build/` (uma página por espécie) |
| `npm run preview` | Serve o build de produção |
| `npm run teste` | Roda a suíte de testes |
| `npm run verificar` | Checagem de tipos (`svelte-check`) |

## Como os dados chegam aqui

```
módulo Foundry          dados-crus/*.json          dados/*.json              build/
(packs LevelDB)   ──→   (documentos crus)   ──→    (formato do site)   ──→   (HTML assado)
               desempacotar.mjs          construir.mjs              vite build
```

O módulo guarda cada espécie em `flags["pokemon-mundo-perfeito"].species` e cada Move em
`flags["pokemon-mundo-perfeito"].move`, já com os campos tipados (`dexNumber`,
`armorClass`, `moveTable`, `moveType`, `pp`, `range`…). O pipeline lê desses campos e só
interpreta texto onde o módulo guarda prosa — ou onde o campo não quer dizer o que o
nome promete:

| Campo do módulo | Por que não dá para usar direto |
|---|---|
| `damage.baseFormula`, `damage.scaling` | São "os dados do Move", não "os dados de dano": Recover guarda 2d6 de **cura** ali, e 16 Moves escalonam cura |
| `category` | String vazia nos 833 Moves — a categoria de resolução só existe no texto |
| `system.activities[].type` | É a modelagem do Foundry: 75 Moves marcados como `attack` são **disputas** no livro |
| `activation.type` | Guarda só o primeiro modo: os 18 Moves de "1 ação / reação" ficam como `action` |
| `priority` | Zerado em 3 Moves que declaram prioridade no próprio texto |

**O pipeline não inventa dado.** O que não for possível interpretar com segurança vai
para `dados/relatorio.json`, com o texto original, para conferência no livro e correção
na fonte. O relatório cobre:

| Campo | O que lista |
|---|---|
| `deslocamentoIncompleto` | Espécies cujo deslocamento está truncado no módulo (66 na v1.33.0) |
| `movesNaoResolvidos` | Entradas das listas de Move das fichas que o reparo não reconheceu (29 na v1.33.0) |
| `evolucoesNaoResolvidas` | Evoluções cujo alvo não existe no compêndio |
| `evolucoesSuspeitas` | Evoluções em que o estágio não aumenta |
| `formasOrfas` | Formas de estágio >1 para as quais nenhuma espécie evolui (23 na v1.33.0) |
| `tiposDesconhecidos`, `tamanhosDesconhecidos`, `tiposDeMoveDesconhecidos` | Valores fora do vocabulário esperado |
| `alcanceDeMoveTruncado` | Moves com o campo de alcance cortado na fonte (1 na v1.33.0) |
| `prioridadeDeMoveDivergente` | Moves em que o campo `priority` discorda do texto (3 na v1.33.0) |
| `dadosDeMoveNaoClassificados` | Moves cujos dados não deu para dizer se são de dano ou de cura (1 na v1.33.0) |
| `efeitosDeMoveNaoInterpretados` | Frases que **declaram** um efeito mecânico que o parser não estruturou (24 na v1.33.0) |
| `textosDeMoveContaminados` | Texto de regra com conteúdo vazado de outro lugar, como crédito de arte (1 na v1.33.0) |

Boa parte dessas categorias aponta lacunas no texto do próprio livro, não falhas do
pipeline — são a lista de trabalho para melhorar o módulo.

`efeitosDeMoveNaoInterpretados` merece nota: cada família de efeito tem um detector de
**sinal** (largo) e um extrator (estreito), e só vai para o relatório a frase que declara
o efeito sem que nada tenha sido extraído. É o que separa "o livro não declara isso" de
"o livro declara e eu não entendi" — sem os dois limiares, a segunda some em silêncio.

## Estrutura

```
ferramentas/        pipeline de dados (Node puro, fora do app)
  desempacotar.mjs    packs LevelDB → JSON cru
  construir.mjs       JSON cru → formato do site
  evolucao.mjs        interpretação do texto de evolução (isolada por ser frágil)
  moves.mjs           alcance, ativação, resolução, dados e reparo de nomes de Move
  efeitos.mjs         efeitos mecânicos do texto do Move (a parte mais frágil de todas)
  texto.mjs           HTML→texto, slug, deslocamento, sentidos
mensagens/          catálogos de interface, um por idioma
src/
  lib/pmp/            domínio: tipos, atributos, tamanhos, busca, espécie, move
  lib/dados/          leitura dos JSONs durante o prerender (só servidor)
  lib/i18n/           acesso às mensagens
  lib/ui/             design system e componentes
  rotas/              páginas (SvelteKit)
testes/             testes do pipeline
```

Os três módulos de interpretação (`evolucao`, `moves`, `efeitos`) são separados de
`construir.mjs` pela mesma razão: leem prosa do livro, cada padrão novo é uma chance de
ler errado, e isolados cada padrão vira um teste. As entradas dos testes são frases do
corpus real, não inventadas.

Os dados são lidos de `dados/` **durante o prerender** e ficam assados em cada página.
Eles não vão para `static/`: o site publicado contém as páginas renderizadas, não um
dump do conteúdo do sistema.

## Idiomas

O compêndio nasce em pt-BR e os identificadores do conteúdo são os nomes em português
(`/pokemon/weezing-de-galar`). Ainda assim nenhum texto de interface está escrito dentro
dos componentes. Ver [docs/localizacao.md](docs/localizacao.md) para o que é preciso
para somar um idioma.

## Créditos

- **Sistema Pokémon Mundo Perfeito** — comunidade autora do PMP.
- **Módulo Foundry** [`pokemon-mundo-perfeito`](https://github.com/LuizHenriquelhlt/pokemon-mundo-perfeito), origem dos dados.
- **Artes** — [PokéAPI](https://pokeapi.co).

Projeto de fã, sem fim lucrativo. Pokémon é marca registrada de Nintendo, Game Freak e
The Pokémon Company; não há vínculo nem endosso de nenhuma delas, nem da Wizards of the
Coast.
