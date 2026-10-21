# Histórico desta evolução

## 1.5.0 — Rosto vivo em microcubos

- Adicionada uma piscada breve e sincronizada dos cubos dos dois olhos no fim de cada ciclo de 10 segundos.
- A região superior/inferior da boca agora se separa e se aproxima ritmicamente para sugerir fala contínua; é animação visual, sem voz ou áudio.
- As máscaras faciais são calculadas uma vez a partir das posições UV do atlas. Em cada quadro, apenas posição/escala dos cubos de olhos e boca mudam; não são criadas malhas, sprites, texturas ou partículas.
- Incluídos testes para período da piscada, pulsação labial e seleção dos cubos das regiões faciais.

## 1.4.0 — Rosto reconstruído somente com cubos

- Substituída a geometria facial procedural usada no palco por 88.000 amostras frontais extraídas da referência: cada instância recebe uma coordenada XY e RGB; a cena desenha somente cubos `BoxGeometry`, sem textura, foto, sprite, plano facial ou malha de rosto.
- Incluídos um atlas binário leve e o gerador Python reproduzível. A imagem original é lida apenas offline para derivar os dados e não é carregada na cena.
- Os comandos que pedem semelhança exata/fidelidade à referência escolhem automaticamente 88.000 slots, a menos que o usuário informe outra população; os comandos comuns continuam preservando a população corrente.
- Travada a paleta da referência enquanto o rosto está ativo; fundos e cubos periféricos visíveis também vêm do atlas. Nenhuma população orbital adicional é criada.
- A face é uma aproximação frontal voxelizada em 384×384, não pixel-a-pixel nem uma cabeça 360° volumétrica. Mantidos os IDs químicos determinísticos por slot.
- Adicionados testes do atlas, do servidor estático, da escolha de população, e do modo cube-only; ensaio Chromium/SwiftShader validou 88.000 `BoxGeometry`, `MeshBasicMaterial`, ausência de imagens no palco e nenhum erro de console.

## 1.3.0 — Perfil JSON humanoide configurável

- Adicionado suporte de servidor para `object: "grid_soul_humanoid"` e configuração aninhada de geometria, grade, materiais, face, mesh, partículas, iluminação e render.
- Mantida compatibilidade com o formato plano anterior e normalização segura de tipos, valores, cores, enumerações e limites de população.
- A população explícita de perfil é aplicada; nos comandos comuns a ponte continua preservando a população corrente.
- Conectados à geometria/renderizador os detalhes e simetria da face, expressão/orientação, distribuição de densidade, tamanho dos cubos, quantidade/dispersão/tamanho/cores dos orbitais, materiais, cores da iluminação, contraste, energia e fundo.
- Corrigido o extrator JSON para retornar o objeto raiz em respostas aninhadas, evitando substituir o plano por um subobjeto.
- A interface informa quando bloom, sombras reais, DOF, LOD, qualidade ultra, acabamento/continuidade avançados, spacing independente e transparência são solicitados mas não implementados.
- Adicionado o perfil de exemplo enviado pelo usuário em `docs/EXEMPLO-PERFIL-ROSTO.json`.
- Ampliada a suíte para 13 testes, cobrindo 88.000 slots, 1.800 orbitais e o fluxo HTTP do formato canônico.

## 1.2.0 — Rosto humanoide por microcubos

- Implementado cálculo procedural local de superfície facial, cavidades oculares, sobrancelhas, nariz, lábios, queixo, concha posterior e cubos orbitais usando exclusivamente slots da população existente.
- Adicionada a paleta de apresentação **Rosto holográfico** com ênfase de olhos e lábios; a identidade química persistente por slot e o catálogo dos 118 elementos permanecem intactos.
- A ponte continua usando o contrato JSON existente, agora pode usar `paletteMode=face` e recebe a população corrente; o servidor conserva essa população salvo pedido explícito de alteração.
- Corrigidos o reenquadramento inicial da face, a atualização de cores após expansão da capacidade e a limpeza de foco atômico ao receber um plano sem foco.
- Criados testes determinísticos de geometria, relevo do nariz, paleta holográfica, integração HTTP e contrato estático da interface.
- Incluídas a imagem de referência fornecida pelo usuário e uma captura da execução de teste no Chromium/WebGL de software.

## 1.1.1 — Abertura direta da demonstração

- A instalação limpa inicia com 2.000 microcubos, paleta química e catálogo dos 118 elementos expandido.
- `/?demo=1` e o botão **Abrir demonstração química** recuperam o enquadramento de exemplo mesmo se houver memória antiga; a memória original não é apagada nem regravada.
- O README instrui extrair em pasta nova e abrir a URL correta, evitando servir por engano uma cópia antiga ou abrir o HTML fora do servidor.
- Incluída captura de referência em `docs/EXEMPLO-DE-ABERTURA.png`.

## 1.1.0 — Identidade química persistente

- Preservado o motor Three.js e suas formas existentes: nuvem, esfera, toro, espiral, onda, terreno, rosto e formas personalizadas; mantidos animação, controles de população/energia, memória local, seleção atômica e integração opcional com ChatGPT.
- Introduzida identidade química determinística por slot (`Z = slot mod 118 + 1`) em todos os modos, sem reatribuição ao mudar forma ou ampliar a população.
- Criadas 118 cores próprias, estáveis e verificadas; adicionado painel de catálogo periódico com foco/destaque por elemento e zoom responsivo dos microcubos.
- Corrigido o evento duplicado de seleção da tabela 3D e reforçada a espera pelo catálogo periódico.
- Corrigidas as rotas que faltavam no servidor para a extensão Chrome (`/api/extension/next` e `/api/extension/result`); a seleção `GRID_SOUL_CHATGPT_BRIDGE=extension` agora oferece alternativa à conexão CDP existente.
- Preferências de cor e número atômico em destaque são validadas no servidor e persistidas junto ao plano.
- Substituído o teste-placeholder por testes unitários dos 118 elementos e de integração HTTP da API/ponte.
- Atualizada a documentação para refletir que a ponte existente é com ChatGPT via CDP/extensão; as variáveis Gemini antigas não são necessárias para esse servidor.
- Mantidas as versões de código antigas recebidas em `historico/originais/`; o ZIP não inclui `.env`, dados de autenticação do Chrome, `.git`, `node_modules` nem histórico pessoal de comandos/memória.

## Validação

Os resultados da versão atual e as limitações verificadas estão em `RELATORIO-TESTES.md`.
