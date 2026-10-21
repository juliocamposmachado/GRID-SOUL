# Relatório de implementação e testes — GRID SOUL 1.5.0

**Data:** 20 de outubro de 2026. Alterações aplicadas na cópia de trabalho; o ZIP recebido originalmente foi preservado.

## Resultado

| Verificação | Resultado |
|---|---|
| Suíte automatizada | 20 testes aprovados; nenhum falhou. |
| Atlas | Cabeçalho e 88.000 registros XY/RGB válidos, derivados em grade de 384×384; mapeamento determinístico testado. |
| API | Plano humanoide aninhado reconhecido; pedido de fidelidade exata a rosto/referência escolhe 88.000 se nenhuma outra população foi pedida; comando comum preserva a população atual. |
| Animação facial | Testes cobrem um piscar de 300 ms no ciclo de 10 s, pulsação variável da boca e seleção dos cubos amostrados nas duas regiões. Máscaras UV são pré-calculadas por slot. |
| Renderer Chromium/SwiftShader | Cena facial com 88.000 instâncias `BoxGeometry`, `MeshBasicMaterial` não sombreado, 88.000 amostras carregadas, zero elementos `<img>` no palco, 73.348 cores distintas entre as amostras utilizadas e nenhum erro JavaScript/console. Temporização e máscaras foram cobertas separadamente nos testes unitários. |
| Convergência | Após 30 s no teste visual, distância média cubo-alvo abaixo de `3×10⁻⁹` unidades. A captura foi feita na vista frontal após convergência. |
| Captura | [`docs/ROSTO-3D-PREVIA.png`](docs/ROSTO-3D-PREVIA.png), 1440 × 1000 px. |
| Desempenho em GPU física | Não medido; o teste SwiftShader não é benchmark e não garante FPS no computador do usuário. |
| ChatGPT autenticado | Não exercitado; o plano foi interceptado/simulado no teste. |

## Implementação

A face renderizada não usa a fotografia como superfície. O PNG é lido pelo script offline `scripts/generate_reference_voxels.py`; ele descarta o fundo escuro, amostra a fonte em 384×384 e grava em `public/assets/humanoid_face_88000.bin` um cabeçalho e 88.000 registros compactos (posição XY e RGB). No navegador, cada registro vira um destino e a cor de uma instância cúbica. O palco não carrega o PNG, textura, sprite nem malha facial. Os cubos periféricos coloridos da referência também estão no atlas; não é acrescentada uma população orbital à parte.

A aplicação usa somente `BoxGeometry` no enxame facial, conserva o mapeamento químico por slot `Z = (slot mod 118) + 1` e fixa a vista frontal para pedidos de correspondência exata. Para evitar discrepâncias, o RGB do atlas prevalece sobre a coloração química e sobre iluminação/material PBR do perfil, e os controles de paleta ficam bloqueados durante a face. Uma solicitação explícita de correspondência à referência seleciona 88.000 slots, salvo quantidade alternativa solicitada.

Os utilitários `face_expression.js` pré-calculam, para cada slot, pesos suaves dos olhos e da boca via UV. Um pulso fecha os olhos comprimindo os cubos por 300 ms, ao fim de cada período de 10 segundos; pulsos sobrepostos afastam/aproximam os cubos das partes superior e inferior da boca. A expressão é visual e não usa áudio; as cores e a contagem dos cubos não mudam.

## Limites da correspondência

O resultado é uma reconstrução frontal voxelizada, não igualdade pixel a pixel: usa 88.000 cubos/amostras a partir de uma imagem de 1.254×1.254 pixels e depende da projeção, perspectiva, antialiasing e tamanho do palco. A fonte oferece uma só vista; portanto, os cubos descrevem um relevo 2.5D raso, não uma cabeça volumétrica completa que conserve o mesmo aspecto em 360°. O teste visual confirma execução e convergência dos cubos, não identidade visual absoluta.

Bloom, sombras reais, profundidade de campo, LOD, qualidade ultra, acabamento PBR/iluminação da face, textura, transparência, conectividade física de cubos, spacing independente e orbitais procedurais extras não são simulados. A interface lista os efeitos não implementados e usa as cores amostradas diretamente.

## Cobertura automatizada

Além do catálogo e das identidades químicas, os testes cobrem determinismo e limites da antiga geometria auxiliar; período de piscada, variação labial e máscaras faciais; parsing do atlas e resolução reduzida; coordenadas, cores e orientação; sintaxe do módulo HTML; entrega HTTP do binário; memória e fluxo de extensão; normalização canônica `grid_soul_humanoid`; preservação da população em comandos comuns; e seleção automática de 88.000 diante de um pedido de fidelidade exata.

## Arquivos principais

- `public/assets/humanoid_face_88000.bin` e `public/components/reference_face_voxels.js` — atlas e leitor para instâncias cúbicas.
- `public/components/face_expression.js` — temporização de piscadas/fala e pesos das regiões.
- `scripts/generate_reference_voxels.py` — gerador offline reproduzível a partir do PNG de referência.
- `public/index.html` — seleção de material/cores e morph só de cubos no modo facial; demais formas preservam o motor anterior.
- `server.js` — prompt e regra de população para pedido exato.
- `test/face_expression.test.js`, `test/reference_face_voxels.test.js`, `test/frontend.test.js`, `test/server.test.js` — animação, atlas e regressões.
- `docs/ROSTO-3D-PREVIA.png` — captura do cenário WebGL.
- `README.md`, `docs/IDENTIDADE-QUIMICA.md`, `CHANGELOG.md` — documentação atualizada.

O pacote exclui `.env`, memória local, dependências instaladas, perfis/cookies do navegador, caches e `.git`. Reinstale dependências com `npm ci`.
