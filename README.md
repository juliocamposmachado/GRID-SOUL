# GRID SOUL — Rosto de referência em cubos

[Screencast from 2026-10-20 22-19-57.webm](https://github.com/user-attachments/assets/6b08fba7-b142-42ed-b52a-13cc526da467)

**O ChatGPT planeja; no rosto, somente instâncias cúbicas formam a imagem.**

GRID SOUL é uma aplicação 3D local em Three.js, Node.js e Express. A versão 1.5.0 conserva as formas, a identidade química por slot e a ponte opcional com ChatGPT. O modo facial foi trocado por uma reconstrução voxel frontal da referência: posições e valores RGB são amostrados de uma grade 384×384 e cada amostra se torna um cubo no `InstancedMesh`.

A fotografia não é carregada ou desenhada no palco: não há imagem, sprite, textura facial, plano, malha de rosto nem população orbital adicional. O material do enxame facial é `MeshBasicMaterial` e a geometria é `BoxGeometry`; somente as cores e posições amostradas alimentam as instâncias. O arquivo binário contém 88.000 registros compactos, não pixels exibidos como textura.

## O que esta versão oferece

- Face frontal reconstruída por 88.000 cubos, incluindo cubos coloridos espalhados ao redor, conforme aparecem na referência.
- IDs químicos determinísticos e persistentes por slot: `Z = (slot mod 118) + 1`.
- Animação curta até os destinos amostrados; depois, os próprios cubos das regiões dos olhos piscam a cada 10 segundos e os da boca se movem em pulsos contínuos, sem áudio nem geometria extra.
- O modo facial não adiciona deriva, orbita cubos fora do atlas nem muda suas cores por uma paleta concorrente; as animações só deslocam/comprimem os cubos já amostrados.
- Esfera, toro, espiral, onda, nuvem, terreno, formas personalizadas, controles de câmera/zoom, população/energia, memória local e catálogo dos 118 elementos preservados.
- Solicitação de correspondência exata com a referência escolhe automaticamente 88.000 slots, a menos que outra população seja informada explicitamente.

A imagem-fonte enviada permanece no projeto em [referencia-rosto-humanoide.png](referencia-rosto-humanoide.png), apenas para que o atlas possa ser regenerado. A execução usa o binário [public/assets/humanoid_face_88000.bin](public/assets/humanoid_face_88000.bin). A captura do ensaio WebGL está em [docs/ROSTO-3D-PREVIA.png](docs/ROSTO-3D-PREVIA.png); o perfil JSON original está em [docs/EXEMPLO-PERFIL-ROSTO.json](docs/EXEMPLO-PERFIL-ROSTO.json).

## Instalação

Requisitos: Node.js 20+, npm e navegador recente com WebGL. A interface busca Three.js/OrbitControls do CDN jsDelivr.

Extraia o ZIP em uma pasta nova; não misture arquivos com uma versão antiga e não abra o HTML diretamente.

```bash
npm ci
npm start
google-chrome --remote-debugging-port=9222 --user-data-dir="$HOME/.config/gridsoul-chrome"

```

Abra [http://127.0.0.1:8765/?demo=1](http://127.0.0.1:8765/?demo=1). O servidor fica limitado ao loopback; não o exponha publicamente. A renderização facial funciona sem sessão de IA; para enviar comandos ao ChatGPT, configure CDP local ou a extensão Chrome conforme abaixo.

## Formar o rosto da referência

No campo de comando, use, por exemplo:

> Reconstrua o rosto do anexo exatamente igual usando somente cubos.

A ponte identifica o pedido de fidelidade e seleciona 88.000 slots. O servidor aceita tanto o formato plano legado quanto o perfil canônico `object: "grid_soul_humanoid"`, `geometry.type: "human_face"`. Se escrever outra quantidade explicitamente, ela é respeitada. Em pedidos comuns sem solicitação de correspondência exata, os comandos mantêm a população corrente.

Após formar a face, ela pisca automaticamente uma vez a cada 10 segundos (a primeira piscada ocorre aproximadamente no fim do primeiro ciclo) e mantém um movimento labial rítmico para sugerir fala. É animação visual: não sintetiza voz nem analisa áudio.

O seletor de paleta fica travado em **Rosto — cores da referência** enquanto a face está ativa; isso evita que a coloração química ou uma paleta alternativa descaracterize o atlas. Ao sair da face, as opções normais voltam a funcionar. Os slots continuam com a mesma identidade química mesmo quando sua cor visual vem da referência.

## Limite de fidelidade e profundidade

O código aproxima a referência como uma imagem frontal voxelizada em cubos, mas **não garante igualdade pixel a pixel**: são 88.000 amostras em uma grade 384×384, renderizadas em um palco 3D com perspectiva, antialiasing e tamanhos de tela variáveis. A referência contém apenas uma vista frontal; o resultado é um relevo 2.5D raso, não uma cabeça volumétrica completa que reproduz igualmente todos os ângulos. Rotacionar a câmera mostra esse relevo de lado.

Amostras RGB e posições vêm da referência original, reduzida deterministicamente. Bloom, sombras reais, profundidade de campo, LOD, qualidade ultra, conectividade física entre cubos, transparência e efeitos PBR declarados no JSON não são renderizados como recursos separados; o motor usa a cor amostrada diretamente e material não sombreado para preservar a aparência frontal. A interface indica os efeitos pedidos que não estão implementados.

Para regenerar o atlas após trocar a fonte, mantenha o PNG no caminho acima e execute com Pillow instalado:

```bash
python3 scripts/generate_reference_voxels.py
```

A etapa offline descarta o fundo escuro, seleciona 88.000 amostras de cor/posição e grava o binário. O app em execução lê somente esse binário; nunca aplica o PNG como material.

## Ponte com ChatGPT

O `.env.example` contém apenas valores de configuração não secretos. Sem `.env`, o servidor usa CDP e a porta `8765`. Para usar a extensão, defina `GRID_SOUL_CHATGPT_BRIDGE=extension`, reinicie o servidor, carregue `chrome-extension/` em `chrome://extensions` e atualize a aba normal do ChatGPT. Para CDP, use um perfil Chrome dedicado sob seu controle com depuração remota em `127.0.0.1:9222`; não copie um perfil autenticado existente.

Não distribua `.env`, perfis/cookies ou dados pessoais do navegador. A conversa de IA é processada pelo ChatGPT conforme a conta e suas configurações; o servidor local permanece no loopback.

## Testes

```bash
npm ci
npm test
npm run check
```

A suíte verifica a identidade dos 118 elementos, integridade e mapeamento do atlas, temporização da piscada de 10 s, oscilação labial, regiões de cubos dos olhos/boca, plano JSON, seleção automática de 88.000 cubos para pedido exato, inicialização, memória e ponte simulada. O teste visual em Chromium/SwiftShader verifica 88.000 `BoxGeometry` com `MeshBasicMaterial`, 88.000 amostras, ausência de imagens no palco e erros de navegador. Isso não é benchmark de GPU nem valida uma sessão autenticada do ChatGPT.

## Privacidade e arquivos

`data/gridsoul-memory.json` é local e não é empacotado. Backups recebidos permanecem em `historico/originais/`, mas não são carregados pela aplicação. O ZIP exclui `node_modules`, `.git`, `.env`, memória, cookies e perfis do navegador.


---

# GRID-SOUL
