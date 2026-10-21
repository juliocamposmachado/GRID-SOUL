# Identidade química dos microcubos

## Regra estável

A versão `cube-slot-modulo-118-v1` atribui a cada slot do `InstancedMesh` um identificador determinístico:

```text
Z = (slot mod 118) + 1
```

O slot é a identidade física do microcubo. Ao mudar forma, cor, zoom ou população, os slots que continuam ativos mantêm o mesmo número atômico. Aumentar a população acrescenta slots seguindo a mesma sequência; reconstruir o mesmo número de cubos em outra sessão gera a mesma atribuição.

A população mínima aceita pelo motor (1.000) é maior que 118; por isso, todas as espécies estão representadas. A divisão pode diferir por no máximo um cubo entre elementos. A lista de símbolos, nomes, números atômicos e massas vem de `public/components/periodic_table.js`.

## Cores

`public/components/chemistry.js` calcula uma cor hexadecimal reprodutível a partir de Z. A paleta `chemical` é padrão nas formas comuns; cor única, arco-íris, plasma, fogo, verde, ciano e destaque por elemento continuam disponíveis.

No modo de rosto da referência, cada cubo usa o RGB amostrado de sua posição correspondente. A cor de referência é somente aparência visual: **não** altera elemento, número atômico, símbolo, massa ou catálogo. A identidade química continua vinculada ao slot mesmo se o RGB visível vier do atlas.

## Rosto somente com cubos

O rosto é reconstruído por 88.000 instâncias de `BoxGeometry` em um `InstancedMesh`, usando `MeshBasicMaterial` sem textura. O arquivo `public/assets/humanoid_face_88000.bin` armazena, por amostra, posição XY e RGB; o cliente o transforma em destinos e cores dos cubos. O PNG de referência permanece no projeto apenas como fonte para regeneração offline do atlas. A interface não carrega o PNG, sprite, fotografia como plano nem malha facial no palco.

A amostragem usa uma grade de 384×384 e escolhe 88.000 posições/cor. O fundo escuro não é convertido em um plano: ele corresponde ao fundo da cena; cubos coloridos periféricos presentes na imagem fazem parte das próprias amostras. A identidade química permanece na ordem dos slots, mas a paleta fica travada à referência enquanto a face está ativa para não descaracterizar o resultado.

Depois de formada, a região dos olhos comprime os mesmos cubos brevemente uma vez a cada 10 segundos; a região superior/inferior da boca move os cubos em pulsos contínuos para sugerir fala. Máscaras UV são calculadas uma vez por slot e a animação altera apenas posição/escala: não adiciona objetos, não modifica RGB nem muda a identidade química. Não há voz ou áudio.

A resposta é uma aproximação frontal em cubos, não igualdade pixel a pixel. Com uma única imagem de frente, os pontos formam um relevo 2.5D raso; girar a câmera não revela uma cabeça volumétrica completa. Os campos JSON de materiais PBR, iluminação física e 1.800 partículas orbitais não criam camadas extras no modo de referência: RGB e cubos periféricos já vêm do atlas. Recursos não implementados são informados pela interface.

## Catálogo e limite do modelo químico

A interface HTML apresenta os 118 elementos com cor, símbolo e número atômico. O catálogo 3D de repouso mantém legendas e seleção de elemento. A identidade química visual não simula ligações, valência, distribuição eletrônica completa ou propriedades de materiais; a representação de átomo de Bohr existente é explicitamente didática.

## Perfil JSON `grid_soul_humanoid`

O servidor aceita o objeto aninhado de geometria, grade, materiais, face, malha, partículas, iluminação e render; valida valores, cores, enumerações e limites e normaliza o contrato plano legado. O exemplo original do usuário está em `EXEMPLO-PERFIL-ROSTO.json`. A fidelidade explicitamente pedida para o rosto seleciona 88.000 slots, salvo população alternativa informada pelo usuário; outros comandos mantêm a população corrente.
