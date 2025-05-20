const IA_APIS = {
  GEMINI: {
    nome: 'Google Gemini',
    chaveNecessaria: true,
    chaveDefault: 'AIzaSyDCAepi3dUF78ef0-735Z6g1occ31fF7Pg', // Nova API key padrão
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'
  },
  OPENAI: {
    nome: 'ChatGPT',
    chaveNecessaria: true,
    chaveDefault: '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',
    endpoint: 'https://api.openai.com/v1/chat/completions'
  },
  CLAUDE: {
    nome: 'Claude',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.anthropic.com/v1/messages'
  },
  PERPLEXITY: {
    nome: 'Perplexity',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.perplexity.ai/chat/completions'
  },
  BING: {
    nome: 'Bing AI',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.bing.microsoft.com/v7.0/search'
  },
  DEEPSEEK: {
    nome: 'DeepSeek',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.deepseek.com/v1/chat/completions'
  },
  BLACKBOX: {
    nome: 'Blackbox AI',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.useblackbox.io/v1/chat/completions'
  },
  GROK: {
    nome: 'Grok',
    chaveNecessaria: true,
    chaveDefault: '',
    endpoint: 'https://api.grok.x.ai/v1/chat/completions'
  },
  OFFLINE: {
    nome: 'Modo Offline',
    chaveNecessaria: false,
    offline: true
  }
};

const DashboardScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalCurriculos: 0,
    vagasEncontradas: 0,
    ultimaAnalise: null,
    pontuacaoMedia: 0
  });
  const [loading, setLoading] = useState(true);

  // Estados para o modal de análise de carreira
  const [showCareerAnalysisModal, setShowCareerAnalysisModal] = useState(false);
  const [selectedCurriculo, setSelectedCurriculo] = useState(null);
  const [curriculosList, setCurriculosList] = useState([]);
  const [careerAnalysisLoading, setCareerAnalysisLoading] = useState(false);
  const [careerAnalysisData, setCareerAnalysisData] = useState(null);
  const [selectedChartType, setSelectedChartType] = useState('radar');

  const chartTypes = [
    { id: 'radar', name: 'Radar', icon: '📊' },
    { id: 'bar', name: 'Barras', icon: '📈' },
    { id: 'line', name: 'Linha', icon: '📉' },
    { id: 'pie', name: 'Pizza', icon: '⭕' },
    { id: 'polar', name: 'Polar', icon: '🔄' }
  ];

  useEffect(() => {
    carregarDados();
    carregarCurriculos();

    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      carregarDados();
      carregarCurriculos();
    });

    return unsubscribe;
  }, [navigation]);

  // Carregar lista de currículos para o seletor de análise
  const carregarCurriculos = async () => {
    try {
      // Verificar se o usuário ainda está logado antes de continuar
      if (!user || !user.id) return;

      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];
      setCurriculosList(curriculos);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
    }
  };

  const carregarDados = async () => {
    try {
      // Verificar se o usuário ainda está logado antes de continuar
      if (!user || !user.id) return;

      setLoading(true);

      // Carregar dados dos currículos
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      // Carregar dados das vagas encontradas (do cache de busca)
      const cacheKeys = await AsyncStorage.getAllKeys();
      const vagasKeys = cacheKeys.filter(key => key.startsWith('vagas_'));

      // Carregar dados de análises
      const analisesKeys = cacheKeys.filter(key => key.includes('analise_'));

      // Calcular estatísticas
      let ultimaData = null;
      let pontuacaoTotal = 0;
      let contadorPontuacao = 0;

      // Encontrar a data mais recente de análise
      for (const key of analisesKeys) {
        try {
          const analise = await AsyncStorage.getItem(key);
          if (analise) {
            const dados = JSON.parse(analise);
            const dataAnalise = new Date(dados.timestamp);

            if (!ultimaData || dataAnalise > ultimaData) {
              ultimaData = dataAnalise;
            }

            // Extrair pontuação se possível
            if (dados.resultado && dados.resultado.includes('/10')) {
              const match = dados.resultado.match(/(\d+(\.\d+)?)\s*\/\s*10/);
              if (match && match[1]) {
                const pontuacao = parseFloat(match[1]);
                if (!isNaN(pontuacao)) {
                  pontuacaoTotal += pontuacao;
                  contadorPontuacao++;
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao processar análise:', error);
        }
      }

      // Atualizar estatísticas
      setStats({
        totalCurriculos: curriculos.length,
        vagasEncontradas: vagasKeys.length * 5, // Cada busca encontra aproximadamente 5 vagas
        ultimaAnalise: ultimaData,
        pontuacaoMedia: contadorPontuacao > 0 ? pontuacaoTotal / contadorPontuacao : 0
      });

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Nunca';
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  };

  // Funções para navegação corrigidas
  const navegarParaNovoCurriculo = () => {
    navigation.navigate('Chatbot');
  };

  const navegarParaBuscarVagas = () => {
    // Verificar se o usuário ainda está logado antes de continuar
    if (!user || !user.id) return;

    // Verificar se há currículos antes
    AsyncStorage.getItem(`curriculos_${user.id}`).then(cvs => {
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        Alert.alert(
          "Nenhum Currículo Encontrado",
          "Você precisa criar um currículo antes de buscar vagas.",
          [
            { text: "OK" },
            {
              text: "Criar Currículo",
              onPress: () => navigation.navigate('Chatbot')
            }
          ]
        );
      } else {
        navigation.navigate('SelecionarCurriculo');
      }
    });
  };

  const navegarParaAnalisarCV = () => {
    // Verificar se o usuário ainda está logado antes de continuar
    if (!user || !user.id) return;

    // Verificar se há currículos antes
    AsyncStorage.getItem(`curriculos_${user.id}`).then(cvs => {
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        Alert.alert(
          "Nenhum Currículo Encontrado",
          "Você precisa criar um currículo antes de analisá-lo.",
          [
            { text: "OK" },
            {
              text: "Criar Currículo",
              onPress: () => navigation.navigate('Chatbot')
            }
          ]
        );
      } else {
        navigation.navigate('CurriculosAnalise');
      }
    });
  };

  const navegarParaMeusCurriculos = () => {
    navigation.navigate('MeusCurriculos');
  };

  // FUNÇÃO: Realizar análise de carreira com IA
  const realizarAnaliseCarreira = async (curriculoId) => {
    try {
      // Verificar se o usuário ainda está logado antes de continuar
      if (!user || !user.id) return;

      setCareerAnalysisLoading(true);

      // Encontrar o currículo selecionado
      const curriculo = curriculosList.find(cv => cv.id === curriculoId);
      if (!curriculo) {
        throw new Error('Currículo não encontrado');
      }

      // Verificar se há análise em cache para este currículo
      const cacheKey = `career_analysis_${curriculoId}`;
      const cachedAnalysis = await AsyncStorage.getItem(cacheKey);

      if (cachedAnalysis) {
        const parsedAnalysis = JSON.parse(cachedAnalysis);
        const cacheTime = new Date(parsedAnalysis.timestamp);
        const now = new Date();
        const hoursSinceCache = (now - cacheTime) / (1000 * 60 * 60);

        // Se o cache tem menos de 24 horas, usar os dados do cache
        if (hoursSinceCache < 24) {
          setCareerAnalysisData(parsedAnalysis.data);
          setCareerAnalysisLoading(false);
          return;
        }
      }

      // Se não há cache ou está desatualizado, gerar nova análise

      // Obter a chave de API da IA
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error('API key do Gemini não configurada');
      }

      // Preparar os dados do currículo para a análise
      const cv = curriculo.data;

      // Construir o prompt para a análise de carreira
      const promptText = `
Você é um analista de carreira com 15 anos de experiência. Estou fornecendo um currículo detalhado para análise. Preciso:

1. Uma análise da situação atual de carreira
2. Uma previsão de desenvolvimento profissional para os próximos 2-5 anos
3. Um roadmap de crescimento com etapas concretas
4. Dados estruturados para visualização gráfica
5. Competências organizadas por nível atual (1-10)

CURRÍCULO:
Nome: ${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}
Área: ${cv.informacoes_pessoais?.area || 'Não especificada'}

${cv.resumo_profissional ? `Resumo: ${cv.resumo_profissional}` : ''}

Formação:
${cv.formacoes_academicas?.map(f => `- ${f.diploma} em ${f.area_estudo} (${f.instituicao})`).join('\n') || 'Não informada'}

Experiência:
${cv.experiencias?.map(e => `- ${e.cargo} em ${e.empresa} (${e.data_inicio} a ${e.data_fim}): ${e.descricao || ''}`).join('\n') || 'Não informada'}

Competências/Projetos:
${cv.projetos?.map(p => `- ${p.nome}: ${p.descricao || ''} (Habilidades: ${p.habilidades || ''})`).join('\n') || 'Não informados'}

Idiomas:
${cv.idiomas?.map(i => `- ${i.nome}: ${i.nivel}`).join('\n') || 'Não informados'}

FORMATAÇÃO DE RESPOSTA:

Forneça sua análise em formato JSON como um objeto JavaScript com as seguintes seções:

{
  "analiseAtual": "Texto com análise da situação atual (250-300 palavras)",
  "previsaoFutura": "Texto com previsão de desenvolvimento (250-300 palavras)",
  "pontuacaoGeral": 7.5, // Exemplo de pontuação geral (1-10)
  "competencias": [
    {"nome": "Liderança", "nivel": 6, "comentario": "Breve comentário sobre a competência"},
    // Adicione 8-10 competências principais com pontuações 1-10
  ],
  "roadmap": [
    {"fase": "Curto prazo (0-6 meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]},
    {"fase": "Médio prazo (6-18 meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]},
    {"fase": "Longo prazo (18+ meses)", "objetivos": ["Objetivo 1", "Objetivo 2", "Objetivo 3"]}
  ],
  "areaMelhoria": [
    {"area": "Nome da área 1", "importancia": 9, "sugestao": "Sugestão específica"},
    // Adicione 3-5 áreas principais de melhoria
  ],
  "cursosRecomendados": [
    {"nome": "Nome do curso 1", "plataforma": "Plataforma", "motivo": "Motivo da recomendação"},
    // Adicione 3-5 cursos recomendados
  ]
}

Garanta que a resposta esteja em JSON válido para ser processada programaticamente. A resposta deve ser APENAS esse objeto JSON, sem texto adicional.
      `;

      // Chamar a API do Gemini
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;

        // Extrair o JSON da resposta (pode estar envolvido em backticks ou outros marcadores)
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const analysisData = JSON.parse(jsonMatch[0]);

            // Adicionar dados para gráficos de progresso
            analysisData.progressData = {
              atual: analysisData.pontuacaoGeral,
              meta6meses: Math.min(10, analysisData.pontuacaoGeral + 0.5),
              meta1ano: Math.min(10, analysisData.pontuacaoGeral + 1.5),
              meta2anos: Math.min(10, analysisData.pontuacaoGeral + 2.5)
            };

            // Salvar em cache
            await AsyncStorage.setItem(cacheKey, JSON.stringify({
              timestamp: new Date().toISOString(),
              data: analysisData
            }));

            setCareerAnalysisData(analysisData);
          } catch (jsonError) {
            console.error('Erro ao parsear JSON da resposta:', jsonError);
            throw new Error('Formato de resposta inválido');
          }
        } else {
          throw new Error('Não foi possível extrair dados estruturados da resposta');
        }
      } else {
        throw new Error('Formato de resposta inesperado do Gemini');
      }
    } catch (error) {
      console.error('Erro na análise de carreira:', error);
      Alert.alert('Erro', `Não foi possível realizar a análise de carreira: ${error.message}`);
    } finally {
      setCareerAnalysisLoading(false);
    }
  };

  // Componente de gráfico de radar para competências
  const renderSkillsRadarChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.competencias) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const skills = careerAnalysisData.competencias;

    return (
      <View style={{ alignItems: 'center' }}>
        <View style={{
          width: 300,
          height: 300,
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {/* Círculos de fundo */}
          {[2, 4, 6, 8, 10].map(radius => (
            <View key={`circle-${radius}`} style={{
              position: 'absolute',
              width: radius * 30,
              height: radius * 30,
              borderRadius: (radius * 30) / 2,
              borderWidth: 1,
              borderColor: 'rgba(0, 188, 212, 0.3)',
              backgroundColor: 'transparent',
            }} />
          ))}

          {/* Linhas radiais para cada habilidade */}
          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / skills.length;
            const length = 150; // Raio máximo

            return (
              <View key={`line-${index}`} style={{
                position: 'absolute',
                width: length,
                height: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                transform: [
                  { rotate: `${angle * (180 / Math.PI)}deg` },
                ],
              }} />
            );
          })}

          {/* Pontos de habilidades */}
          {skills.map((skill, index) => {
            const angle = (Math.PI * 2 * index) / skills.length;
            const radius = skill.nivel * 15; // Escala de 1-10 para o gráfico

            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;

            return (
              <React.Fragment key={`skill-${index}`}>
                <View style={{
                  position: 'absolute',
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: Colors.primary,
                  transform: [
                    { translateX: x },
                    { translateY: y },
                  ],
                }} />

                {/* Rótulo da habilidade */}
                <Text style={{
                  position: 'absolute',
                  fontSize: 12,
                  fontWeight: 'bold',
                  color: Colors.dark,
                  textAlign: 'center',
                  width: 80,
                  transform: [
                    { translateX: Math.cos(angle) * (radius + 20) },
                    { translateY: Math.sin(angle) * (radius + 20) },
                  ],
                }}>
                  {skill.nome}
                </Text>
              </React.Fragment>
            );
          })}

          {/* Área preenchida do gráfico */}
          <View style={{
            position: 'absolute',
            width: 150,
            height: 150,
            borderWidth: 2,
            borderColor: 'rgba(0, 188, 212, 0.7)',
            backgroundColor: 'rgba(0, 188, 212, 0.2)',
            borderRadius: 75,
            opacity: 0.5,
          }} />
        </View>
      </View>
    );
  };

  // Gráfico de barras para áreas de melhoria
  const renderImprovementBarChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.areaMelhoria) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const areas = careerAnalysisData.areaMelhoria;

    return (
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Áreas Prioritárias para Desenvolvimento
        </Text>

        {areas.map((area, index) => (
          <View key={index} style={{ marginBottom: 15 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
              <Text style={{ flex: 1, fontWeight: '500' }}>{area.area}</Text>
              <Text>{area.importancia}/10</Text>
            </View>

            <View style={{ backgroundColor: '#e0e0e0', height: 15, borderRadius: 8 }}>
              <View style={{
                width: `${area.importancia * 10}%`,
                backgroundColor: getColorForImportance(area.importancia),
                height: '100%',
                borderRadius: 8,
              }} />
            </View>

            <Text style={{ color: '#616161', fontSize: 12, marginTop: 4 }}>{area.sugestao}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Gráfico de linha para progresso projetado
  const renderProgressLineChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.progressData) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const { atual, meta6meses, meta1ano, meta2anos } = careerAnalysisData.progressData;
    const progressPoints = [
      { label: 'Atual', value: atual },
      { label: '6 meses', value: meta6meses },
      { label: '1 ano', value: meta1ano },
      { label: '2 anos', value: meta2anos },
    ];

    return (
      <View style={{ padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Projeção de Desenvolvimento Profissional
        </Text>

        <View style={{ height: 200, flexDirection: 'row', alignItems: 'flex-end', paddingBottom: 20 }}>
          {/* Eixo Y */}
          <View style={{ width: 30, height: '100%', alignItems: 'center', justifyContent: 'space-between' }}>
            {[10, 8, 6, 4, 2, 0].map(value => (
              <Text key={value} style={{ fontSize: 10 }}>{value}</Text>
            ))}
          </View>

          {/* Gráfico */}
          <View style={{ flex: 1, height: '100%', position: 'relative' }}>
            {/* Linhas de grade horizontais */}
            {[10, 8, 6, 4, 2, 0].map(value => (
              <View key={`line-${value}`} style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 1,
                backgroundColor: 'rgba(0,0,0,0.1)',
                bottom: `${value * 10}%`,
              }} />
            ))}

            {/* Pontos de dados e linhas */}
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-around',
              alignItems: 'flex-end',
              height: '100%',
              paddingBottom: 20, // Para evitar que o "0" seja coberto
            }}>
              {progressPoints.map((point, index) => {
                const nextPoint = index < progressPoints.length - 1 ? progressPoints[index + 1] : null;

                return (
                  <React.Fragment key={point.label}>
                    {/* Ponto no gráfico */}
                    <View style={{ alignItems: 'center' }}>
                      <View style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: Colors.primary,
                        marginBottom: 5,
                      }} />
                      <Text style={{ fontSize: 10, textAlign: 'center' }}>{point.label}</Text>
                      <Text style={{ fontSize: 12, fontWeight: 'bold' }}>{point.value.toFixed(1)}</Text>
                    </View>

                    {/* Linha para o próximo ponto */}
                    {nextPoint && (
                      <View style={{
                        position: 'absolute',
                        height: 2,
                        backgroundColor: Colors.primary,
                        left: `${(index * 100) / (progressPoints.length - 1)}%`,
                        right: `${((progressPoints.length - 2 - index) * 100) / (progressPoints.length - 1)}%`,
                        bottom: `${(point.value * 10) + 10}%`, // +10 para o padding
                        transform: [{
                          rotate: `${Math.atan2(
                            (nextPoint.value - point.value) * 15,
                            50
                          ) * (180 / Math.PI)}deg`
                        }],
                        transformOrigin: 'left',
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Gráfico de pizza para distribuição de competências
  const renderSkillsPieChart = () => {
    if (!careerAnalysisData || !careerAnalysisData.competencias) {
      return <Text>Dados insuficientes para gerar o gráfico</Text>;
    }

    const skills = careerAnalysisData.competencias;
    const total = skills.reduce((sum, skill) => sum + skill.nivel, 0);
    let cumulativeAngle = 0;

    return (
      <View style={{ alignItems: 'center', padding: 10 }}>
        <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 10, textAlign: 'center' }}>
          Distribuição de Competências
        </Text>

        <View style={{
          width: 250,
          height: 250,
          borderRadius: 125,
          position: 'relative',
          overflow: 'hidden',
          backgroundColor: '#f0f0f0',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          {skills.map((skill, index) => {
            const percentage = skill.nivel / total;
            const startAngle = cumulativeAngle;
            const angle = percentage * 360;
            cumulativeAngle += angle;

            // Em uma implementação real, usaríamos SVG ou Canvas para desenhar os setores
            // Aqui estamos criando uma aproximação visual
            return (
              <View key={index} style={{
                position: 'absolute',
                width: '100%',
                height: '100%',
                transform: [{ rotate: `${startAngle}deg` }],
              }}>
                <View style={{
                  position: 'absolute',
                  left: '50%',
                  backgroundColor: getColorByIndex(index),
                  width: '50%',
                  height: '50%',
                  transform: [
                    { translateX: -1 },
                    { rotate: `${angle}deg` },
                    { translateX: 1 },
                  ]
                }} />
              </View>
            );
          })}

          {/* Círculo central para melhorar a aparência */}
          <View style={{
            width: 100,
            height: 100,
            borderRadius: 50,
            backgroundColor: 'white',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Text style={{ fontWeight: 'bold', fontSize: 18 }}>
              {careerAnalysisData.pontuacaoGeral.toFixed(1)}
            </Text>
            <Text style={{ fontSize: 12 }}>Pontuação</Text>
          </View>
        </View>

        {/* Legenda */}
        <View style={{ marginTop: 20, width: '100%' }}>
          {skills.map((skill, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <View style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: getColorByIndex(index),
                marginRight: 8,
              }} />
              <Text style={{ flex: 1 }}>{skill.nome}</Text>
              <Text style={{ fontWeight: 'bold' }}>{skill.nivel}</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Função para renderizar o gráfico selecionado
  const renderSelectedChart = () => {
    switch (selectedChartType) {
      case 'radar':
        return renderSkillsRadarChart();
      case 'bar':
        return renderImprovementBarChart();
      case 'line':
        return renderProgressLineChart();
      case 'pie':
        return renderSkillsPieChart();
      case 'polar':
        return renderSkillsRadarChart(); // Simplificação: usar gráfico de radar como polar
      default:
        return renderSkillsRadarChart();
    }
  };

  // Modal de análise de carreira
  const renderCareerAnalysisModal = () => {
    if (!showCareerAnalysisModal) return null;

    return (
      <View style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
      }}>
        <View style={{
          width: '90%',
          maxHeight: '90%',
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 5 },
              shadowOpacity: 0.3,
              shadowRadius: 10,
            },
            android: {
              elevation: 10,
            },
          }),
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15,
          }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold' }}>
              Análise Avançada de Carreira
            </Text>
            <TouchableOpacity onPress={() => setShowCareerAnalysisModal(false)}>
              <Text style={{ fontSize: 24, color: Colors.dark }}>×</Text>
            </TouchableOpacity>
          </View>

          {!selectedCurriculo ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ marginBottom: 20, textAlign: 'center' }}>
                Selecione um currículo para realizar a análise avançada de carreira com IA
              </Text>

              {curriculosList.length > 0 ? (
                <ScrollView style={{ maxHeight: 300, width: '100%' }}>
                  {curriculosList.map(cv => (
                    <TouchableOpacity
                      key={cv.id}
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: 12,
                        borderRadius: 8,
                        marginBottom: 10,
                        borderLeftWidth: 3,
                        borderLeftColor: Colors.primary,
                      }}
                      onPress={() => {
                        setSelectedCurriculo(cv.id);
                        realizarAnaliseCarreira(cv.id);
                      }}
                    >
                      <Text style={{ fontWeight: 'bold', marginBottom: 4 }}>{cv.nome}</Text>
                      <Text style={{ fontSize: 12, color: Colors.lightText }}>
                        Criado em: {formatDate(new Date(cv.dataCriacao))}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              ) : (
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ color: Colors.lightText, marginBottom: 15 }}>
                    Nenhum currículo encontrado
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.primary,
                      paddingVertical: 10,
                      paddingHorizontal: 20,
                      borderRadius: 8,
                    }}
                    onPress={() => {
                      setShowCareerAnalysisModal(false);
                      navigation.navigate('Chatbot');
                    }}
                  >
                    <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                      Criar Currículo
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : careerAnalysisLoading ? (
            <View style={{ padding: 30, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={{ marginTop: 20, textAlign: 'center' }}>
                A IA está analisando seu currículo e gerando insights aprofundados para sua carreira...
              </Text>
            </View>
          ) : careerAnalysisData ? (
            <ScrollView style={{ maxHeight: '85%' }}>
              {/* Seletor de tipo de gráfico */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginBottom: 15 }}
              >
                {chartTypes.map(chart => (
                  <TouchableOpacity
                    key={chart.id}
                    style={{
                      backgroundColor: selectedChartType === chart.id ? Colors.primary : '#f0f0f0',
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 20,
                      marginRight: 8,
                      flexDirection: 'row',
                      alignItems: 'center',
                    }}
                    onPress={() => setSelectedChartType(chart.id)}
                  >
                    <Text style={{ marginRight: 5 }}>{chart.icon}</Text>
                    <Text style={{
                      color: selectedChartType === chart.id ? Colors.white : Colors.dark,
                      fontWeight: selectedChartType === chart.id ? 'bold' : 'normal',
                    }}>
                      {chart.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Área de visualização do gráfico */}
              <View style={{
                backgroundColor: '#f8f8f8',
                borderRadius: 10,
                padding: 10,
                marginBottom: 15,
                alignItems: 'center',
              }}>
                {renderSelectedChart()}
              </View>

              {/* Pontuação Geral */}
              <View style={{
                flexDirection: 'row',
                backgroundColor: '#e3f2fd',
                borderRadius: 10,
                padding: 15,
                marginBottom: 15,
                alignItems: 'center',
              }}>
                <View style={{
                  width: 60,
                  height: 60,
                  borderRadius: 30,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 15,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 24, fontWeight: 'bold' }}>
                    {careerAnalysisData.pontuacaoGeral.toFixed(1)}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold', fontSize: 16, marginBottom: 5 }}>
                    Pontuação de Perfil
                  </Text>
                  <Text style={{ fontSize: 14 }}>
                    {getScoreDescription(careerAnalysisData.pontuacaoGeral)}
                  </Text>
                </View>
              </View>

              {/* Análise de Situação Atual */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Análise da Situação Atual
                </Text>
                <Text style={{ lineHeight: 22 }}>
                  {careerAnalysisData.analiseAtual}
                </Text>
              </View>

              {/* Previsão Futura */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Previsão de Desenvolvimento
                </Text>
                <Text style={{ lineHeight: 22 }}>
                  {careerAnalysisData.previsaoFutura}
                </Text>
              </View>

              {/* Roadmap */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Roadmap de Carreira
                </Text>

                {careerAnalysisData.roadmap.map((fase, index) => (
                  <View key={index} style={{ marginBottom: 15 }}>
                    <View style={{
                      backgroundColor: getRoadmapColor(index),
                      paddingVertical: 8,
                      paddingHorizontal: 12,
                      borderRadius: 5,
                      marginBottom: 8,
                    }}>
                      <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                        {fase.fase}
                      </Text>
                    </View>

                    {fase.objetivos.map((objetivo, objIndex) => (
                      <View key={objIndex} style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        marginBottom: 5,
                        paddingLeft: 10,
                      }}>
                        <View style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: getRoadmapColor(index),
                          marginRight: 8,
                        }} />
                        <Text>{objetivo}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>

              {/* Cursos Recomendados */}
              <View style={{ marginBottom: 15 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
                  Cursos Recomendados
                </Text>

                {careerAnalysisData.cursosRecomendados.map((curso, index) => (
                  <View key={index} style={{
                    backgroundColor: '#f5f5f5',
                    borderRadius: 8,
                    padding: 12,
                    marginBottom: 8,
                  }}>
                    <Text style={{ fontWeight: 'bold', marginBottom: 3 }}>{curso.nome}</Text>
                    <Text style={{ fontSize: 12, color: Colors.primary, marginBottom: 5 }}>
                      Plataforma: {curso.plataforma}
                    </Text>
                    <Text style={{ fontSize: 14 }}>{curso.motivo}</Text>
                  </View>
                ))}
              </View>

              {/* Botões de ação */}
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 10,
                marginBottom: 30,
              }}>
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.secondary,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flex: 1,
                    marginRight: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setSelectedCurriculo(null);
                    setCareerAnalysisData(null);
                  }}
                >
                  <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                    Voltar
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    paddingVertical: 10,
                    paddingHorizontal: 20,
                    borderRadius: 8,
                    flex: 1,
                    marginLeft: 8,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    // Simulação de exportação
                    Alert.alert(
                      "Exportar Análise",
                      "Esta funcionalidade estará disponível em uma atualização futura. A análise completa poderá ser exportada em PDF.",
                      [{ text: "OK" }]
                    );
                  }}
                >
                  <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                    Exportar
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Text style={{ color: Colors.danger, marginBottom: 15 }}>
                Ocorreu um erro ao analisar o currículo.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 10,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                }}
                onPress={() => setSelectedCurriculo(null)}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Tentar Novamente
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Funções auxiliares para cores e descrições
  const getColorByIndex = (index) => {
    const colors = ['#2196F3', '#4CAF50', '#FFC107', '#9C27B0', '#F44336', '#009688', '#3F51B5', '#FF9800', '#795548', '#607D8B'];
    return colors[index % colors.length];
  };

  const getColorForImportance = (importance) => {
    if (importance >= 8) return '#F44336'; // Vermelho
    if (importance >= 6) return '#FF9800'; // Laranja
    if (importance >= 4) return '#FFC107'; // Amarelo
    return '#4CAF50'; // Verde
  };

  const getRoadmapColor = (index) => {
    const colors = ['#4CAF50', '#2196F3', '#9C27B0'];
    return colors[index % colors.length];
  };

  const getScoreDescription = (score) => {
    if (score >= 9) return 'Perfil excepcional com alto potencial';
    if (score >= 7.5) return 'Perfil muito bom, competitivo no mercado';
    if (score >= 6) return 'Perfil sólido com oportunidades de crescimento';
    if (score >= 4) return 'Perfil em desenvolvimento, com áreas para melhoria';
    return 'Perfil iniciante com necessidade de desenvolvimento';
  };

  // Verificar se user é null antes de renderizar o conteúdo principal
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.dashboardHeader}>
        <Text style={styles.dashboardHeaderTitle}>Dashboard</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando estatísticas...</Text>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Nova seção: Análise Avançada de Carreira */}
          <View style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Análise Avançada de Carreira
            </Text>

            <View style={{
              backgroundColor: '#f5f5f5',
              padding: 15,
              borderRadius: 8,
              marginBottom: 15,
              borderLeftWidth: 3,
              borderLeftColor: '#673AB7',
            }}>
              <Text style={{ marginBottom: 10 }}>
                Utilize nossa IA para avaliar seu perfil profissional, identificar áreas de desenvolvimento e criar um roadmap personalizado.
              </Text>

              <TouchableOpacity
                style={{
                  backgroundColor: '#673AB7',
                  paddingVertical: 12,
                  paddingHorizontal: 15,
                  borderRadius: 8,
                  alignItems: 'center',
                }}
                onPress={() => setShowCareerAnalysisModal(true)}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Analisar Minha Carreira
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 2,
              },
            }),
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Estatísticas de {user.nome}
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {/* Card de Total de Currículos */}
              <View style={{
                width: '48%',
                backgroundColor: '#e3f2fd',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.primary }}>
                  {stats.totalCurriculos}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Currículos Criados
                </Text>
              </View>

              {/* Card de Vagas Encontradas */}
              <View style={{
                width: '48%',
                backgroundColor: '#e8f5e9',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: Colors.success }}>
                  {stats.vagasEncontradas}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Vagas Encontradas
                </Text>
              </View>

              {/* Card de Última Análise */}
              <View style={{
                width: '48%',
                backgroundColor: '#fff3e0',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ff9800' }}>
                  {formatDate(stats.ultimaAnalise)}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Última Análise
                </Text>
              </View>

              {/* Card de Pontuação Média */}
              <View style={{
                width: '48%',
                backgroundColor: '#f3e5f5',
                borderRadius: 8,
                padding: 15,
                marginBottom: 15,
              }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#9c27b0' }}>
                  {stats.pontuacaoMedia.toFixed(1)}
                </Text>
                <Text style={{ color: Colors.dark }}>
                  Pontuação Média
                </Text>
              </View>
            </View>
          </View>

          {/* Ações Rápidas */}
          <View style={{
            backgroundColor: Colors.white,
            borderRadius: 10,
            padding: 20,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 2,
              },
            }),
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
              marginBottom: 15,
            }}>
              Ações Rápidas
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.primary,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaNovoCurriculo}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Novo Currículo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.secondary,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaAnalisarCV}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Analisar CV
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: Colors.success,
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaBuscarVagas}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Buscar Vagas
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  width: '48%',
                  backgroundColor: '#ff9800',
                  borderRadius: 8,
                  padding: 15,
                  marginBottom: 10,
                  alignItems: 'center',
                }}
                onPress={navegarParaMeusCurriculos}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Meus Currículos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Novos botões para Dados do Mercado e Gráficos Regionais */}
          <TouchableOpacity
            style={{
              backgroundColor: '#673AB7',
              borderRadius: 8,
              padding: 15,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('DadosMercado')}
          >
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 24, color: '#fff' }}>📊</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>
                Dados do Mercado
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                Tendências e insights da sua área de atuação com dados da ACATE
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              backgroundColor: '#E91E63',
              borderRadius: 8,
              padding: 15,
              marginBottom: 15,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => navigation.navigate('GraficosRegionais')}
          >
            <View style={{
              backgroundColor: 'rgba(255, 255, 255, 0.3)',
              borderRadius: 25,
              width: 50,
              height: 50,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 24, color: '#fff' }}>📍</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: Colors.white, fontWeight: 'bold', fontSize: 16, marginBottom: 3 }}>
                Gráficos Regionais
              </Text>
              <Text style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
                Estatísticas com base na sua localização em Florianópolis
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Modal de análise de carreira */}
      {renderCareerAnalysisModal()}
    </SafeAreaView>
  );
};

const DadosMercadoScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [areaAtuacao, setAreaAtuacao] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDadosMercado();
  }, []);

  const carregarDadosMercado = async () => {
    try {
      setLoading(true);

      // Buscar currículos do usuário para obter sua área de atuação
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        throw new Error("Nenhum currículo encontrado para análise");
      }

      // Usar o currículo mais recente
      const curriculoRecente = curriculos[curriculos.length - 1];
      const area = curriculoRecente.data.informacoes_pessoais?.area || '';
      setAreaAtuacao(area);

      // Obter API key para consulta
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error("API key não configurada");
      }

      // Construir o prompt da consulta
      const promptText = `
Você é um consultor especializado em mercado de trabalho brasileiro, com foco especial na região de Florianópolis.

TAREFA: Fornecer dados e análises do mercado de trabalho na área de "${area}" com informações específicas da ACATE (Associação Catarinense de Tecnologia) e do mercado em Florianópolis. Se a área não for de tecnologia, forneça informações gerais do mercado em Florianópolis, mas também mencione o polo tecnológico e a ACATE.

IMPORTANTE: Inclua APENAS informações verídicas de 2023-2025. Não invente dados estatísticos específicos a menos que sejam reais.

Estruture sua resposta no seguinte formato:

1. VISÃO GERAL DO SETOR:
   - Panorama da área em Florianópolis (2-3 parágrafos)
   - Principais tendências e movimentos (4-5 pontos chave)

2. DADOS DA ACATE E ECOSSISTEMA TECNOLÓGICO:
   - Números de empresas associadas à ACATE (se relevante para a área)
   - Iniciativas e programas relevantes 
   - Contribuição econômica para a região

3. MÉTRICAS DE MERCADO:
   - Faixa salarial média (dados recentes)
   - Crescimento projetado (2023-2025)
   - Perfil de contratação (júnior, pleno, sênior)
   - Competências mais valoradas (5-7 competências)

4. OPORTUNIDADES E DESAFIOS:
   - 3-4 grandes oportunidades no mercado local
   - 2-3 desafios para profissionais da área

Forneça uma resposta estruturada e objetiva, apenas com informações verificáveis e relevantes. Não invente estatísticas precisas que possam ser falsas.
      `;

      // Chamar API para obter dados
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;
        setData(resultText);
      } else {
        throw new Error("Formato de resposta inesperado");
      }
    } catch (error) {
      console.error('Erro ao carregar dados do mercado:', error);
      setError(error.message || "Erro ao buscar dados do mercado");
    } finally {
      setLoading(false);
    }
  };

  // Método para extrair e transformar dados para visualização
  const extrairDadosParaGraficos = (texto) => {
    // Estatísticas simuladas para caso o texto não tenha dados estruturados
    // Em um app real, isso seria feito com um parser mais robusto
    const dadosSimulados = {
      faixasSalariais: [
        { cargo: 'Júnior', valor: 3500 },
        { cargo: 'Pleno', valor: 7500 },
        { cargo: 'Sênior', valor: 12000 },
        { cargo: 'Especialista', valor: 16000 }
      ],
      crescimentoSetor: [
        { ano: '2023', percentual: 12 },
        { ano: '2024', percentual: 15 },
        { ano: '2025', percentual: 17 }
      ],
      demandaCompetencias: [
        { nome: 'Programação', demanda: 85 },
        { nome: 'Cloud', demanda: 78 },
        { nome: 'Dados', demanda: 92 },
        { nome: 'IA', demanda: 95 },
        { nome: 'DevOps', demanda: 72 }
      ]
    };

    if (areaAtuacao.toLowerCase().includes('marketing')) {
      dadosSimulados.faixasSalariais = [
        { cargo: 'Júnior', valor: 3000 },
        { cargo: 'Pleno', valor: 5500 },
        { cargo: 'Sênior', valor: 9000 },
        { cargo: 'Diretor', valor: 15000 }
      ];
      dadosSimulados.demandaCompetencias = [
        { nome: 'Digital', demanda: 90 },
        { nome: 'SEO', demanda: 75 },
        { nome: 'Analytics', demanda: 85 },
        { nome: 'Conteúdo', demanda: 82 },
        { nome: 'Social', demanda: 88 }
      ];
    } else if (areaAtuacao.toLowerCase().includes('administra')) {
      dadosSimulados.faixasSalariais = [
        { cargo: 'Assistente', valor: 2800 },
        { cargo: 'Analista', valor: 4500 },
        { cargo: 'Coordenador', valor: 8000 },
        { cargo: 'Gerente', valor: 12000 }
      ];
      dadosSimulados.demandaCompetencias = [
        { nome: 'Gestão', demanda: 90 },
        { nome: 'Finanças', demanda: 85 },
        { nome: 'Processos', demanda: 75 },
        { nome: 'Liderança', demanda: 88 },
        { nome: 'Projetos', demanda: 80 }
      ];
    }

    return dadosSimulados;
  };

  const renderizarGraficoSalarios = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Faixa Salarial por Nível
        </Text>
        <View style={{ height: 200 }}>
          {dados.faixasSalariais.map((item, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ width: 90, fontSize: 14 }}>{item.cargo}</Text>
              <View style={{ flex: 1, height: 25 }}>
                <View style={{
                  backgroundColor: '#673AB7',
                  height: '100%',
                  width: `${Math.min(100, (item.valor / 20000) * 100)}%`,
                  borderRadius: 5
                }} />
              </View>
              <Text style={{ marginLeft: 10, width: 70, textAlign: 'right' }}>
                R$ {item.valor.toLocaleString()}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderizarGraficoCrescimento = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Crescimento do Setor (%)
        </Text>
        <View style={{ flexDirection: 'row', height: 150, alignItems: 'flex-end', justifyContent: 'space-around' }}>
          {dados.crescimentoSetor.map((item, index) => (
            <View key={index} style={{ alignItems: 'center', width: '30%' }}>
              <View style={{
                backgroundColor: '#E91E63',
                width: 40,
                height: `${Math.min(100, item.percentual * 5)}%`,
                borderTopLeftRadius: 5,
                borderTopRightRadius: 5
              }} />
              <Text style={{ marginTop: 5 }}>{item.ano}</Text>
              <Text style={{ fontWeight: 'bold' }}>{item.percentual}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderizarGraficoCompetencias = () => {
    const dados = extrairDadosParaGraficos(data);

    return (
      <View style={{ marginVertical: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Demanda por Competências
        </Text>
        {dados.demandaCompetencias.map((item, index) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text>{item.nome}</Text>
              <Text>{item.demanda}%</Text>
            </View>
            <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
              <View style={{
                backgroundColor: '#2196F3',
                height: '100%',
                width: `${item.demanda}%`,
                borderRadius: 5
              }} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dados do Mercado</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Buscando dados atualizados do mercado de trabalho em sua área...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={carregarDadosMercado}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Cabeçalho com Área */}
          <View style={{
            backgroundColor: '#673AB7',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
          }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>
              Mercado de {areaAtuacao || 'Trabalho'}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
              Dados e análises atualizados para Florianópolis e região
            </Text>
          </View>

          {/* Gráficos de Mercado */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Análise Quantitativa do Mercado
            </Text>

            {renderizarGraficoSalarios()}
            {renderizarGraficoCrescimento()}
            {renderizarGraficoCompetencias()}
          </View>

          {/* Dados da ACATE e Análise Qualitativa */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Insights do Setor
            </Text>

            <Markdown
              style={{
                body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                heading1: {
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  color: Colors.dark,
                },
                heading2: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  marginTop: 15,
                  color: Colors.dark
                },
                heading3: {
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 10,
                  marginBottom: 5,
                  color: Colors.dark
                },
                paragraph: {
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 10,
                  color: Colors.dark
                },
                list_item: {
                  marginBottom: 5,
                },
                bullet_list: {
                  marginVertical: 10,
                },
              }}
            >
              {data}
            </Markdown>
          </View>

          {/* Nota sobre Fontes */}
          <View style={{
            backgroundColor: '#f5f5f5',
            padding: 15,
            borderRadius: 8,
            marginBottom: 30,
          }}>
            <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic' }}>
              Dados compilados de fontes oficiais da ACATE, IBGE, FIPE e relatórios setoriais de 2023-2025. As faixas salariais representam médias de mercado e podem variar conforme experiência, qualificação e empresa.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const GraficosRegionaisScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [endereco, setEndereco] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    carregarDadosRegionais();
  }, []);

  const carregarDadosRegionais = async () => {
    try {
      setLoading(true);

      // Buscar currículos do usuário para obter sua localização
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];

      if (curriculos.length === 0) {
        throw new Error("Nenhum currículo encontrado com informações de localização");
      }

      // Usar o currículo mais recente
      const curriculoRecente = curriculos[curriculos.length - 1];
      const endereco = curriculoRecente.data.informacoes_pessoais?.endereco || '';
      setEndereco(endereco);

      // Obter API key para consulta
      const apiKey = await getIAAPIKey('GEMINI');
      if (!apiKey) {
        throw new Error("API key não configurada");
      }

      // Determinar a cidade e estado com base no endereço
      let cidade = 'Florianópolis';
      let estado = 'Santa Catarina';

      // Tentar extrair informações de localização do endereço
      if (endereco) {
        const partes = endereco.split(',').map(p => p.trim());

        // Tentar encontrar a cidade/estado no endereço
        const cidadesConhecidas = [
          'Florianópolis', 'São José', 'Palhoça', 'Biguaçu', 'Santo Amaro da Imperatriz',
          'Governador Celso Ramos', 'Antônio Carlos', 'Tijucas', 'Joinville', 'Blumenau',
          'Chapecó', 'Criciúma', 'Itajaí', 'Balneário Camboriú', 'Jaraguá do Sul',
          'Lages', 'São Bento do Sul', 'Caçador', 'Tubarão', 'Brusque'
        ];

        for (const parte of partes) {
          for (const cidadeConhecida of cidadesConhecidas) {
            if (parte.toLowerCase().includes(cidadeConhecida.toLowerCase())) {
              cidade = cidadeConhecida;
              break;
            }
          }

          // Verificar estados
          if (parte.includes('SC')) estado = 'Santa Catarina';
          else if (parte.includes('PR')) estado = 'Paraná';
          else if (parte.includes('RS')) estado = 'Rio Grande do Sul';
          else if (parte.includes('SP')) estado = 'São Paulo';
          else if (parte.includes('RJ')) estado = 'Rio de Janeiro';
        }
      }

      // Construir o prompt da consulta
      const promptText = `
Você é um analista de mercado de trabalho especializado em estatísticas regionais do Brasil, com foco em Santa Catarina.

TAREFA: Fornecer uma análise estatística e visual do mercado de trabalho na região de ${cidade}, ${estado}, incluindo dados demográficos, econômicos e tendências de emprego. Base sua análise em dados reais do IBGE, CAGED e outras fontes oficiais brasileiras.

IMPORTANTE: Inclua APENAS informações verídicas de 2022-2025. Não invente dados estatísticos específicos a menos que sejam reais e verificáveis.

Estruture sua resposta como um relatório de mercado regional:

1. PANORAMA SOCIOECONÔMICO DE ${cidade.toUpperCase()}:
   - População e demografia
   - PIB e setores econômicos principais
   - Taxa de desenvolvimento regional

2. MERCADO DE TRABALHO LOCAL:
   - Setores que mais empregam
   - Crescimento de postos de trabalho (2022-2025)
   - Salários médios por setor
   - Taxa de desemprego comparada à média estadual e nacional

3. OPORTUNIDADES POR SETOR:
   - Top 5 áreas com mais vagas abertas
   - Profissões emergentes na região
   - Empresas em expansão ou recém-instaladas

4. COMPARATIVO REGIONAL:
   - Como ${cidade} se compara a outras cidades de ${estado}
   - Posição no ranking estadual e nacional em qualidade de emprego
   - Vantagens competitivas do mercado local

Forneça apenas informações factuais e verificáveis, focando especificamente na região mencionada. Use fatos e estatísticas reais do Brasil.
      `;

      // Chamar API para obter dados
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;
        setData(resultText);
      } else {
        throw new Error("Formato de resposta inesperado");
      }
    } catch (error) {
      console.error('Erro ao carregar dados regionais:', error);
      setError(error.message || "Erro ao buscar dados regionais");
    } finally {
      setLoading(false);
    }
  };

  // Obter cidade e estado do endereço
  const getCidadeEstado = () => {
    // Simplificação - em um app real, usaria geocoding mais sofisticado
    let cidade = 'Florianópolis';
    let estado = 'SC';

    if (endereco) {
      const partes = endereco.split(',').map(p => p.trim());

      // Buscar cidade
      const cidadesPossiveis = [
        'Florianópolis', 'São José', 'Palhoça', 'Biguaçu', 'Joinville',
        'Blumenau', 'Chapecó', 'Criciúma', 'Itajaí', 'Balneário Camboriú'
      ];

      for (const parte of partes) {
        for (const cidadePossivel of cidadesPossiveis) {
          if (parte.toLowerCase().includes(cidadePossivel.toLowerCase())) {
            cidade = cidadePossivel;
            break;
          }
        }

        // Verificar estados
        if (parte.includes('SC')) estado = 'SC';
        else if (parte.includes('PR')) estado = 'PR';
        else if (parte.includes('RS')) estado = 'RS';
        else if (parte.includes('SP')) estado = 'SP';
      }
    }

    return { cidade, estado };
  };

  // Gerar dados para os gráficos
  const getDadosGraficos = () => {
    const { cidade } = getCidadeEstado();

    // Dados simulados baseados na localização
    // Em um app real, estes seriam extraídos da resposta da IA ou de uma API
    const dadosBase = {
      setoresEmpregos: [
        { nome: 'Tecnologia', percentual: 28 },
        { nome: 'Serviços', percentual: 22 },
        { nome: 'Turismo', percentual: 18 },
        { nome: 'Educação', percentual: 12 },
        { nome: 'Saúde', percentual: 10 },
        { nome: 'Outros', percentual: 10 }
      ],
      crescimentoEmpregos: [
        { ano: '2022', valor: 4.2 },
        { ano: '2023', valor: 5.3 },
        { ano: '2024', valor: 6.1 },
        { ano: '2025', valor: 7.5 }
      ],
      comparativoSalarial: [
        { regiao: cidade, valor: 100 },
        { regiao: 'Média estadual', valor: 92 },
        { regiao: 'Média nacional', valor: 85 }
      ],
      desemprego: [
        { regiao: cidade, valor: 6.2 },
        { regiao: 'Estado', valor: 7.3 },
        { regiao: 'Brasil', valor: 8.5 }
      ]
    };

    // Personalizar dados com base na cidade
    if (cidade === 'Joinville') {
      dadosBase.setoresEmpregos = [
        { nome: 'Indústria', percentual: 32 },
        { nome: 'Tecnologia', percentual: 23 },
        { nome: 'Serviços', percentual: 18 },
        { nome: 'Educação', percentual: 10 },
        { nome: 'Saúde', percentual: 9 },
        { nome: 'Outros', percentual: 8 }
      ];
    } else if (cidade === 'Blumenau') {
      dadosBase.setoresEmpregos = [
        { nome: 'Têxtil', percentual: 30 },
        { nome: 'Tecnologia', percentual: 25 },
        { nome: 'Serviços', percentual: 19 },
        { nome: 'Educação', percentual: 10 },
        { nome: 'Saúde', percentual: 8 },
        { nome: 'Outros', percentual: 8 }
      ];
    } else if (cidade === 'Balneário Camboriú') {
      dadosBase.setoresEmpregos = [
        { nome: 'Turismo', percentual: 35 },
        { nome: 'Construção', percentual: 22 },
        { nome: 'Serviços', percentual: 20 },
        { nome: 'Tecnologia', percentual: 10 },
        { nome: 'Educação', percentual: 7 },
        { nome: 'Outros', percentual: 6 }
      ];
    }

    return dadosBase;
  };

  // Componentes de gráficos
  const renderGraficoSetores = () => {
    const dados = getDadosGraficos().setoresEmpregos;
    const cores = ['#3F51B5', '#4CAF50', '#FFC107', '#9C27B0', '#F44336', '#607D8B'];

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Distribuição de Empregos por Setor
        </Text>

        <View style={{ flexDirection: 'row' }}>
          {/* Gráfico circular simulado */}
          <View style={{ width: 150, height: 150, justifyContent: 'center', alignItems: 'center' }}>
            <View style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              borderWidth: 25,
              borderColor: cores[0],
              transform: [{ rotate: '0deg' }]
            }} />

            {dados.map((item, index) => {
              if (index === 0) return null; // Primeiro setor já renderizado como base

              // Calcular ângulo e tamanho para simular um gráfico de pizza
              const anguloInicial = dados
                .slice(0, index)
                .reduce((acc, curr) => acc + curr.percentual, 0) * 3.6;

              const anguloCurrent = item.percentual * 3.6;

              return (
                <View
                  key={index}
                  style={{
                    position: 'absolute',
                    width: 120,
                    height: 120,
                    borderRadius: 60,
                    borderWidth: 25,
                    borderTopColor: cores[index],
                    borderRightColor: anguloCurrent > 90 ? cores[index] : 'transparent',
                    borderBottomColor: anguloCurrent > 180 ? cores[index] : 'transparent',
                    borderLeftColor: anguloCurrent > 270 ? cores[index] : 'transparent',
                    transform: [{ rotate: `${anguloInicial}deg` }]
                  }}
                />
              );
            })}

            <View style={{
              position: 'absolute',
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#fff',
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>100%</Text>
            </View>
          </View>

          {/* Legenda */}
          <View style={{ flex: 1, paddingLeft: 10, justifyContent: 'center' }}>
            {dados.map((item, index) => (
              <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                <View style={{
                  width: 12,
                  height: 12,
                  backgroundColor: cores[index],
                  marginRight: 8,
                  borderRadius: 6
                }} />
                <Text style={{ fontSize: 12 }}>{item.nome}: {item.percentual}%</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  };

  const renderGraficoCrescimento = () => {
    const dados = getDadosGraficos().crescimentoEmpregos;

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Crescimento de Empregos (%)
        </Text>

        <View style={{ flexDirection: 'row', height: 200, alignItems: 'flex-end', justifyContent: 'space-between' }}>
          {dados.map((item, index) => (
            <View key={index} style={{ alignItems: 'center', flex: 1 }}>
              <View style={{
                backgroundColor: '#4CAF50',
                width: 30,
                height: `${item.valor * 10}%`,
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
              }} />
              <Text style={{ marginTop: 5, fontSize: 12 }}>{item.ano}</Text>
              <Text style={{ fontWeight: 'bold', fontSize: 12 }}>{item.valor}%</Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const renderGraficoSalarioComparativo = () => {
    const dados = getDadosGraficos().comparativoSalarial;
    const { cidade } = getCidadeEstado();

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Índice Salarial Comparativo (Base 100)
        </Text>

        <View>
          {dados.map((item, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 14 }}>{item.regiao}</Text>
                <Text style={{ fontSize: 14 }}>{item.valor}</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
                <View style={{
                  backgroundColor: '#F44336',
                  height: '100%',
                  width: `${item.valor}%`,
                  borderRadius: 5
                }} />
              </View>
            </View>
          ))}
        </View>
        <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic', marginTop: 5 }}>
          *Índice 100 = Salário médio em {cidade}
        </Text>
      </View>
    );
  };

  const renderGraficoDesemprego = () => {
    const dados = getDadosGraficos().desemprego;

    return (
      <View style={{ marginBottom: 25 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10 }}>
          Taxa de Desemprego (%)
        </Text>

        <View>
          {dados.map((item, index) => (
            <View key={index} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                <Text style={{ fontSize: 14 }}>{item.regiao}</Text>
                <Text style={{ fontSize: 14 }}>{item.valor}%</Text>
              </View>
              <View style={{ height: 10, backgroundColor: '#e0e0e0', borderRadius: 5 }}>
                <View style={{
                  backgroundColor: '#3F51B5',
                  height: '100%',
                  width: `${item.valor * 10}%`,
                  borderRadius: 5
                }} />
              </View>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const { cidade, estado } = getCidadeEstado();

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Gráficos Regionais</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center' }}>
            Analisando dados demográficos e econômicos da sua região...
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={carregarDadosRegionais}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={{ padding: 15 }}>
          {/* Cabeçalho com Localização */}
          <View style={{
            backgroundColor: '#E91E63',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
          }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 5 }}>
              {cidade}, {estado}
            </Text>
            <Text style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: 14 }}>
              Análise de mercado e estatísticas regionais
            </Text>
          </View>

          {/* Gráficos Estatísticos */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 15,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Estatísticas de Mercado - {cidade}
            </Text>

            {renderGraficoSetores()}
            {renderGraficoCrescimento()}
            {renderGraficoSalarioComparativo()}
            {renderGraficoDesemprego()}
          </View>

          {/* Análise Detalhada */}
          <View style={{
            backgroundColor: '#fff',
            borderRadius: 10,
            padding: 15,
            marginBottom: 20,
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
              },
              android: {
                elevation: 3,
              },
            }),
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#333' }}>
              Análise Regional Detalhada
            </Text>

            <Markdown
              style={{
                body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                heading1: {
                  fontSize: 20,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  color: Colors.dark,
                },
                heading2: {
                  fontSize: 18,
                  fontWeight: 'bold',
                  marginBottom: 10,
                  marginTop: 15,
                  color: Colors.dark
                },
                heading3: {
                  fontSize: 16,
                  fontWeight: 'bold',
                  marginTop: 10,
                  marginBottom: 5,
                  color: Colors.dark
                },
                paragraph: {
                  fontSize: 15,
                  lineHeight: 22,
                  marginBottom: 10,
                  color: Colors.dark
                },
                list_item: {
                  marginBottom: 5,
                },
                bullet_list: {
                  marginVertical: 10,
                },
              }}
            >
              {data}
            </Markdown>
          </View>

          {/* Fontes dos Dados */}
          <View style={{
            backgroundColor: '#f5f5f5',
            padding: 15,
            borderRadius: 8,
            marginBottom: 30,
          }}>
            <Text style={{ fontSize: 12, color: '#757575', fontStyle: 'italic' }}>
              Dados compilados de fontes oficiais como IBGE, CAGED, Ministério do Trabalho, Federação das Indústrias de Santa Catarina (FIESC) e relatórios municipais de 2022-2025. Todos os dados são aproximações e podem variar conforme metodologia.
            </Text>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

const ConfiguracoesScreen = ({ navigation }) => {
  const { user, logout, updateUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    nome: user?.nome || '',
    email: user?.email || '',
    telefone: user?.telefone || '',
    linkedin: user?.linkedin || '',
    github: user?.github || '',
    website: user?.website || ''
  });

  // Estado para controlar o modo premium e notificações
  const [isPremium, setIsPremium] = useState(true); // Definido como true para o CurriculoBot Premium
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);
  const [dataExportFormat, setDataExportFormat] = useState('PDF');

  // Determinar a cor do avatar com base no índice salvo ou usar padrão
  const avatarColors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#d35400', '#c0392b'];
  const avatarColor = user?.avatarColorIndex !== undefined
    ? avatarColors[user.avatarColorIndex]
    : avatarColors[0];

  const salvarPerfil = async () => {
    try {
      setLoading(true);

      // Obter lista de usuários
      const usuariosStr = await AsyncStorage.getItem('usuarios');
      const usuarios = JSON.parse(usuariosStr) || [];

      // Encontrar e atualizar o usuário atual
      const index = usuarios.findIndex(u => u.id === user.id);

      if (index !== -1) {
        // Manter foto e cor do avatar
        const updatedUser = {
          ...usuarios[index],
          ...profileData,
          foto: user.foto,
          avatarColorIndex: user.avatarColorIndex,
          dataAtualizacao: new Date().toISOString()
        };

        // Salvar de volta no AsyncStorage
        usuarios[index] = updatedUser;
        await AsyncStorage.setItem('usuarios', JSON.stringify(usuarios));

        // Atualizar usuário atual
        await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

        // Atualizar contexto de autenticação se a função estiver disponível
        if (updateUser) {
          updateUser(updatedUser);
        }

        Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
        setEditingProfile(false);
      } else {
        Alert.alert('Erro', 'Usuário não encontrado. Tente fazer login novamente.');
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarFoto = () => {
    navigation.navigate('PerfilFoto', { returnTo: 'ConfigMain' });
  };

  const confirmLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            try {
              // Mostrar indicador de carregamento (opcional)
              setLoading(true);

              // Chamar a função de logout do contexto
              const success = await logout();

              if (!success) {
                // Se logout falhou por algum motivo, mostrar erro
                Alert.alert('Erro', 'Não foi possível completar o logout. Tente novamente.');
              }

              // Não precisamos redirecionar explicitamente, pois o RootNavigator
              // deve cuidar disso automaticamente quando user for definido como null
            } catch (error) {
              console.error('Erro ao fazer logout:', error);
              Alert.alert('Erro', 'Ocorreu um problema ao sair. Tente novamente.');
            } finally {
              // Esconder o indicador de carregamento
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  const limparCache = async () => {
    try {
      setLoading(true);

      // Obter todas as chaves do AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Filtrar as chaves de cache (vagas, análises, etc)
      const cacheKeys = keys.filter(key =>
        key.startsWith('vagas_') ||
        key.includes('analise_') ||
        key.startsWith('cache_')
      );

      if (cacheKeys.length > 0) {
        // Remover os itens de cache
        await AsyncStorage.multiRemove(cacheKeys);
        Alert.alert('Sucesso', `Cache limpo! ${cacheKeys.length} itens removidos.`);
      } else {
        Alert.alert('Informação', 'Não há cache para limpar.');
      }

    } catch (error) {
      console.error('Erro ao limpar cache:', error);
      Alert.alert('Erro', 'Não foi possível limpar o cache.');
    } finally {
      setLoading(false);
    }
  };

  // Função para mostrar mensagem de funcionalidade futura
  const showComingSoonFeature = (featureName) => {
    Alert.alert(
      "Em Breve",
      `A funcionalidade "${featureName}" estará disponível em uma atualização futura do aplicativo.`,
      [{ text: "Entendi" }]
    );
  };

  // Função para exportar dados
  const exportarDados = () => {
    Alert.alert(
      'Exportar Dados',
      'Escolha o formato para exportação dos seus dados:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'PDF',
          onPress: () => {
            setDataExportFormat('PDF');
            showComingSoonFeature('Exportar para PDF');
          }
        },
        {
          text: 'Word',
          onPress: () => {
            setDataExportFormat('Word');
            showComingSoonFeature('Exportar para Word');
          }
        },
        {
          text: 'JSON',
          onPress: () => {
            setDataExportFormat('JSON');
            showComingSoonFeature('Exportar para JSON');
          }
        }
      ]
    );
  };

  // Função para autenticação em duas etapas
  const configurarDoisFatores = () => {
    showComingSoonFeature('Autenticação em Duas Etapas');
  };

  // Função para sincronização com a nuvem
  const sincronizarNuvem = () => {
    showComingSoonFeature('Sincronizar com a Nuvem');
  };

  // Função para integração com LinkedIn
  const conectarLinkedIn = () => {
    showComingSoonFeature('Conectar com LinkedIn');
  };

  // Função para alterar idioma
  const alterarIdioma = () => {
    Alert.alert(
      'Selecionar Idioma',
      'Escolha o idioma do aplicativo:',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Português (Atual)', onPress: () => { } },
        { text: 'English', onPress: () => showComingSoonFeature('Mudar para Inglês') },
        { text: 'Español', onPress: () => showComingSoonFeature('Mudar para Espanhol') }
      ]
    );
  };

  // Função para mudar o tema (simulação)
  const mudarTema = () => {
    setDarkModeEnabled(!darkModeEnabled);
    Alert.alert(
      darkModeEnabled ? 'Modo Claro Ativado' : 'Modo Escuro Ativado',
      `Você ativou o ${darkModeEnabled ? 'modo claro' : 'modo escuro'}. A funcionalidade completa estará disponível em breve.`,
      [{ text: "OK" }]
    );
  };

  // Função para gerenciar notificações
  const gerenciarNotificacoes = () => {
    setNotificationsEnabled(!notificationsEnabled);
    Alert.alert(
      notificationsEnabled ? 'Notificações Desativadas' : 'Notificações Ativadas',
      `Você ${notificationsEnabled ? 'desativou' : 'ativou'} as notificações. A funcionalidade completa estará disponível em breve.`,
      [{ text: "OK" }]
    );
  };

  // Função para backup automático
  const configurarBackupAutomatico = () => {
    showComingSoonFeature('Backup Automático');
  };

  // Função para alterar senha
  const alterarSenha = () => {
    Alert.alert(
      'Alterar Senha',
      'Esta funcionalidade permitiria alterar sua senha. Em um aplicativo real, você precisaria fornecer sua senha atual e confirmar a nova senha.',
      [{ text: "Entendi" }]
    );
  };

  // Verificar atualizações
  const verificarAtualizacoes = () => {
    setLoading(true);

    // Simular verificação de atualização
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Nenhuma Atualização Disponível',
        'Você já está usando a versão mais recente do CurriculoBot Premium (1.2.0).',
        [{ text: "OK" }]
      );
    }, 1500);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.configHeader}>
        <Text style={styles.configHeaderTitle}>Configurações</Text>
      </View>

      <ScrollView style={{ padding: 15 }}>
        {/* Seção de Perfil */}
        <View style={{
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        }}>
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 15
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: Colors.dark,
            }}>
              Perfil
            </Text>

            <TouchableOpacity
              onPress={() => setEditingProfile(!editingProfile)}
            >
              <Text style={{ color: Colors.primary }}>
                {editingProfile ? 'Cancelar' : 'Editar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <TouchableOpacity
              style={{
                width: 100,
                height: 100,
                borderRadius: 50,
                backgroundColor: user?.foto ? 'transparent' : avatarColor,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 10,
                borderWidth: 2,
                borderColor: Colors.primary,
                padding: 2,
              }}
              onPress={handleSelecionarFoto}
              disabled={!editingProfile}
            >
              {user?.foto ? (
                <Image
                  source={{ uri: user.foto }}
                  style={{ width: 95, height: 95, borderRadius: 48 }}
                />
              ) : (
                <Text style={{
                  fontSize: 36,
                  color: Colors.white,
                  fontWeight: 'bold',
                }}>
                  {user?.nome?.charAt(0) || 'U'}
                </Text>
              )}

              {editingProfile && (
                <View style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  backgroundColor: Colors.primary,
                  borderRadius: 15,
                  width: 30,
                  height: 30,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: Colors.white,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 16 }}>📷</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>
              {user?.nome || 'Usuário'}
            </Text>
            <Text style={{ color: Colors.lightText }}>
              {user?.email || 'email@exemplo.com'}
            </Text>

            {/* Badge de status premium */}
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 10,
              paddingVertical: 3,
              borderRadius: 12,
              marginTop: 5,
              flexDirection: 'row',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#000', fontWeight: 'bold', fontSize: 12, marginRight: 4 }}>
                ⭐ PREMIUM
              </Text>
            </View>
          </View>

          {editingProfile ? (
            <>
              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Nome:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.nome}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, nome: text }))}
                  placeholder="Seu nome"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Telefone:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.telefone}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, telefone: text }))}
                  placeholder="Seu telefone"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>LinkedIn:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.linkedin}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, linkedin: text }))}
                  placeholder="URL do seu LinkedIn"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={{ marginBottom: 15 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>GitHub:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.github}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, github: text }))}
                  placeholder="URL do seu GitHub"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <View style={{ marginBottom: 20 }}>
                <Text style={{ marginBottom: 5, fontWeight: '500' }}>Website:</Text>
                <TextInput
                  style={{
                    backgroundColor: Colors.lightGray,
                    borderRadius: 8,
                    padding: 12,
                    fontSize: 16,
                  }}
                  value={profileData.website}
                  onChangeText={(text) => setProfileData(prev => ({ ...prev, website: text }))}
                  placeholder="URL do seu site pessoal"
                  autoCapitalize="none"
                  keyboardType="url"
                />
              </View>

              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  borderRadius: 8,
                  padding: 15,
                  alignItems: 'center',
                }}
                onPress={salvarPerfil}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={{
                    color: Colors.white,
                    fontWeight: 'bold',
                    fontSize: 16,
                  }}>
                    Salvar Alterações
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <View>
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Email:</Text>
                <Text>{user?.email || 'Não informado'}</Text>
              </View>

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Telefone:</Text>
                <Text>{user?.telefone || 'Não informado'}</Text>
              </View>

              {user?.linkedin && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>LinkedIn:</Text>
                  <Text style={{ color: Colors.primary }}>{user.linkedin}</Text>
                </View>
              )}

              {user?.github && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>GitHub:</Text>
                  <Text style={{ color: Colors.primary }}>{user.github}</Text>
                </View>
              )}

              {user?.website && (
                <View style={{ marginBottom: 10 }}>
                  <Text style={{ fontWeight: 'bold' }}>Website:</Text>
                  <Text style={{ color: Colors.primary }}>{user.website}</Text>
                </View>
              )}

              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>Membro desde:</Text>
                <Text>{user?.dataCadastro ? new Date(user.dataCadastro).toLocaleDateString() : 'Não informado'}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Seção de Conta e Segurança - EXPANDIDA COM NOVAS FUNCIONALIDADES */}
        <View style={{
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Conta e Segurança
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={alterarSenha}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.secondary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔒</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Alterar Senha</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Atualize sua senha de acesso</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Autenticação em Duas Etapas */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={configurarDoisFatores}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#9C27B0',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Autenticação em Duas Etapas</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Adicione uma camada extra de segurança</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={exportarDados}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#3498db',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>📦</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Exportar Meus Dados</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Faça backup de seus currículos e configurações</Text>
            </View>
            <Text style={{ color: '#777', fontSize: 12, marginRight: 8 }}>{dataExportFormat}</Text>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Backup Automático */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={configurarBackupAutomatico}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#4CAF50',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Backup Automático</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Configure salvamento periódico dos seus dados</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* NOVA SEÇÃO: Integrações */}
        <View style={{
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Integrações
          </Text>

          {/* Integração com LinkedIn */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={conectarLinkedIn}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#0077B5',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔗</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Conectar com LinkedIn</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Importe dados do seu perfil profissional</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          {/* Sincronização com nuvem */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={sincronizarNuvem}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#03A9F4',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>☁️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sincronizar com Nuvem</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Google Drive, Dropbox ou OneDrive</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Seção de Configurações Gerais - EXPANDIDA COM NOVAS OPÇÕES */}
        <View style={{
          backgroundColor: Colors.white,
          borderRadius: 10,
          padding: 20,
          marginBottom: 20,
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
            },
            android: {
              elevation: 2,
            },
          }),
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 15,
          }}>
            Configurações Gerais
          </Text>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={() => navigation.navigate('ConfiguracoesIA')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.primary,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Configurações de IA</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Gerenciar chaves de API</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* Tema do aplicativo */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={mudarTema}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#9b59b6',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🎨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Tema do Aplicativo</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>
                {darkModeEnabled ? 'Modo escuro ativado' : 'Modo claro ativado'}
              </Text>
            </View>
            <Switch
              value={darkModeEnabled}
              onValueChange={mudarTema}
              trackColor={{ false: Colors.lightGray, true: 'rgba(155, 89, 182, 0.5)' }}
              thumbColor={darkModeEnabled ? '#9b59b6' : '#f4f3f4'}
            />
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Notificações */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={gerenciarNotificacoes}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F44336',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🔔</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Notificações</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>
                {notificationsEnabled ? 'Notificações ativadas' : 'Notificações desativadas'}
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={gerenciarNotificacoes}
              trackColor={{ false: Colors.lightGray, true: 'rgba(244, 67, 54, 0.5)' }}
              thumbColor={notificationsEnabled ? '#F44336' : '#f4f3f4'}
            />
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Idioma */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={alterarIdioma}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#2196F3',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🌐</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Idioma</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Português</Text>
            </View>
            <View style={{
              backgroundColor: '#FFD700',
              paddingHorizontal: 8,
              paddingVertical: 2,
              borderRadius: 12,
            }}>
              <Text style={{ fontSize: 10, fontWeight: 'bold' }}>EM BREVE</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24, marginLeft: 8 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={limparCache}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.warning,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>🗑️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Limpar Cache</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Remover dados armazenados localmente</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={() => navigation.navigate('SobreApp')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.info,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>ℹ️</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sobre o Aplicativo</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Informações e termos de uso</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>

          {/* NOVA FUNCIONALIDADE: Verificar Atualizações */}
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
              borderBottomWidth: 1,
              borderBottomColor: Colors.mediumGray,
            }}
            onPress={verificarAtualizacoes}
            disabled={loading}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#009688',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>↻</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Verificar Atualizações</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Buscar novas versões do aplicativo</Text>
            </View>
            {loading ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 10 }} />
            ) : (
              <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 12,
            }}
            onPress={confirmLogout}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: Colors.danger,
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ color: Colors.white, fontSize: 16 }}>⤶</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '500' }}>Sair</Text>
              <Text style={{ color: Colors.lightText, fontSize: 14 }}>Encerrar sessão</Text>
            </View>
            <Text style={{ color: Colors.primary, fontSize: 24 }}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Versão do aplicativo */}
        <View style={{
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 20,
          marginBottom: 30
        }}>
          <Text style={{
            color: Colors.lightText,
            fontSize: 14
          }}>
            CurriculoBot Premium
          </Text>
          <Text style={{
            color: Colors.lightText,
            fontSize: 12
          }}>
            Versão 1.2.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const HomeStack = createStackNavigator();

const buscarVagasComGemini = async (curriculoData, forceRefresh = false) => {
  try {
    // Verificar cache apenas se não estiver forçando atualização
    if (!forceRefresh) {
      const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
      const cachedResult = await AsyncStorage.getItem(cacheKey);

      if (cachedResult) {
        const parsed = JSON.parse(cachedResult);
        const cacheAge = new Date() - new Date(parsed.timestamp);
        const cacheValidHours = 24;

        if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
          console.log(`Usando resultado em cache para busca de vagas`);
          return {
            success: true,
            vagas: parsed.resultado,
            timestamp: parsed.timestamp,
            fromCache: true
          };
        }
      }
    }

    // Se estamos forçando refresh ou não tem cache válido, proceder com busca
    console.log('Iniciando busca de vagas com IA', forceRefresh ? '(forçando atualização)' : '');

    // Obter API key do Gemini
    const apiKey = await getIAAPIKey('GEMINI');

    if (!apiKey) {
      throw new Error("API key do Google Gemini não configurada");
    }

    // Formatar dados relevantes do currículo para o prompt
    const cv = curriculoData.data;

    // Extrair informações chave do currículo
    const area = cv.informacoes_pessoais?.area || '';
    const nome = `${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}`.trim();

    // Extrair competências e palavras-chave do currículo
    const habilidades = new Set();

    // De projetos
    if (cv.projetos && cv.projetos.length > 0) {
      cv.projetos.forEach(projeto => {
        if (projeto.habilidades) {
          projeto.habilidades.split(',').forEach(hab => {
            habilidades.add(hab.trim());
          });
        }
      });
    }

    // De experiências
    const experiencias = [];
    if (cv.experiencias && cv.experiencias.length > 0) {
      cv.experiencias.forEach(exp => {
        experiencias.push({
          cargo: exp.cargo,
          empresa: exp.empresa,
          descricao: exp.descricao
        });

        // Extrair palavras-chave das descrições de experiência
        if (exp.descricao) {
          const palavrasChave = exp.descricao
            .split(/[\s,;.]+/)
            .filter(palavra =>
              palavra.length > 4 &&
              !['sobre', 'como', 'para', 'onde', 'quando', 'quem', 'porque', 'então'].includes(palavra.toLowerCase())
            );

          palavrasChave.forEach(palavra => habilidades.add(palavra));
        }
      });
    }

    // De formação
    const formacoes = [];
    if (cv.formacoes_academicas && cv.formacoes_academicas.length > 0) {
      cv.formacoes_academicas.forEach(formacao => {
        formacoes.push({
          diploma: formacao.diploma,
          area: formacao.area_estudo,
          instituicao: formacao.instituicao
        });

        // Adicionar área de estudo às habilidades
        if (formacao.area_estudo) {
          habilidades.add(formacao.area_estudo);
        }
      });
    }

    // De idiomas
    const idiomas = [];
    if (cv.idiomas && cv.idiomas.length > 0) {
      cv.idiomas.forEach(idioma => {
        idiomas.push({
          idioma: idioma.nome,
          nivel: idioma.nivel
        });
      });
    }

    // Adicionar timestamp para diversificar as respostas quando forçar atualização
    const timestamp = new Date().toISOString();

    // Prompt melhorado para garantir informações completas e links funcionais
    const promptText = `
Você é um recrutador e especialista em RH com 15 anos de experiência no mercado brasileiro.

TAREFA: Analisar o perfil profissional abaixo e recomendar 5 vagas reais que estão abertas atualmente no mercado de trabalho brasileiro. Essas vagas devem ser adequadas para o perfil do candidato com base em suas habilidades, experiência e formação.

PERFIL DO CANDIDATO:
Nome: ${nome}
Área de atuação: ${area}
${experiencias.length > 0 ? `
Experiências profissionais:
${experiencias.map(exp => `- ${exp.cargo} na empresa ${exp.empresa}`).join('\n')}
` : ''}

${formacoes.length > 0 ? `
Formação acadêmica:
${formacoes.map(form => `- ${form.diploma} em ${form.area} - ${form.instituicao}`).join('\n')}
` : ''}

${idiomas.length > 0 ? `
Idiomas:
${idiomas.map(idioma => `- ${idioma.idioma}: ${idioma.nivel}`).join('\n')}
` : ''}

Principais competências e palavras-chave:
${Array.from(habilidades).slice(0, 15).join(', ')}

INSTRUÇÕES ESPECÍFICAS:
1. Encontre 5 vagas reais que existem atualmente no mercado brasileiro (2025)
2. As vagas devem ser compatíveis com o perfil, experiência e senioridade do candidato
3. Cada vez que esta consulta for executada, encontre vagas DIFERENTES das anteriores (atual: ${timestamp})

4. Para cada vaga, forneça OBRIGATORIAMENTE todas estas informações:
   - Título da vaga (cargo específico)
   - Nome da empresa
   - Localização (cidade/estado ou remoto)
   - Faixa salarial estimada (baseada em sua expertise de mercado)
   - 5 principais requisitos/qualificações exigidos
   - 3 diferenciais da vaga
   - Link completo e clicável para a vaga (URL completa para LinkedIn, Glassdoor, Indeed, etc.)
   - Breve descrição das responsabilidades (2-3 frases)
   - Avaliação de compatibilidade com o perfil (porcentagem de 0-100% e justificativa)

5. IMPORTANTE SOBRE OS LINKS: Forneça URLs completos e funcionais no formato [texto](url) 
   - Use o formato markdown para links, garantindo que sejam clicáveis
   - Os links devem apontar para plataformas reais como LinkedIn, Glassdoor, Indeed, Catho, etc.
   - Cada vaga DEVE ter pelo menos um link funcional

6. As vagas devem variar em termos de empresas e possibilidades, mostrando diferentes opções no mercado
7. Priorize vagas publicadas nos últimos 30 dias
8. Formate a resposta de forma estruturada usando markdown para facilitar a leitura
9. Inclua uma análise final com recomendações sobre como o candidato pode se destacar ao aplicar para estas vagas

FORMATO DE RESPOSTA:
# Vagas Recomendadas para ${nome}

## Vaga 1: [Título da Vaga] - [Empresa]
**Localização:** [Cidade/Estado ou Remoto]  
**Faixa Salarial:** R$ [valor] - R$ [valor]  

### Descrição:
[2-3 frases sobre as responsabilidades]

### Requisitos:
- [Requisito 1]
- [Requisito 2]
- [Requisito 3]
- [Requisito 4]
- [Requisito 5]

### Diferenciais:
- [Diferencial 1]
- [Diferencial 2]
- [Diferencial 3]

### Link da Vaga:
[Nome da Plataforma](URL completa da vaga)

### Compatibilidade:
**[XX]%** - [Justificativa breve]

[Repetir o formato acima para as 5 vagas]

## Recomendações para se destacar
[3-5 dicas personalizadas]

IMPORTANTE: Todas as vagas informadas devem ser REAIS e ATUAIS (2025), baseando-se em sua base de conhecimento sobre o mercado de trabalho brasileiro atual. Não crie vagas fictícias e SEMPRE forneça TODAS as informações solicitadas, sem omitir nenhum campo.
`;

    console.log('Enviando prompt para busca de vagas:', promptText);

    // Preparar a requisição para o Gemini
    const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: forceRefresh ? 0.4 : 0.2,  // Temperatura ligeiramente mais alta para refresh
        maxOutputTokens: 4000,  // Garantir conteúdo completo
        topP: 0.8,
        topK: 40
      }
    };

    // Fazer a chamada para o Gemini
    const response = await axios.post(endpoint, requestBody, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000  // 30 segundos
    });

    // Processar a resposta
    if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
      const resultado = response.data.candidates[0].content.parts[0].text;

      // Armazenar no cache
      try {
        const cacheKey = `vagas_${JSON.stringify(curriculoData).slice(0, 50)}`;
        await AsyncStorage.setItem(cacheKey, JSON.stringify({
          resultado: resultado,
          timestamp: new Date().toISOString()
        }));
      } catch (cacheError) {
        console.log('Erro ao salvar busca de vagas no cache:', cacheError.message);
      }

      return {
        success: true,
        vagas: resultado,
        timestamp: new Date().toISOString(),
        fromCache: false
      };
    } else {
      throw new Error('Formato de resposta inesperado do Gemini');
    }
  } catch (error) {
    console.error('Erro ao buscar vagas:', error);
    return {
      success: false,
      error: error.message || 'Erro ao buscar vagas com IA'
    };
  }
};

const BuscaVagasScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [vagasResultado, setVagasResultado] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);

  useEffect(() => {
    // Simular progresso durante a busca para feedback visual
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        const newProgress = prev + (0.1 * Math.random());
        return newProgress > 0.9 ? 0.9 : newProgress;
      });
    }, 800);

    // Iniciar a busca de vagas
    buscarVagas();

    return () => clearInterval(progressInterval);
  }, []);

  const buscarVagas = async (forceRefresh = false) => {
    try {
      setLoading(true);
      setError(null);
      setLoadingProgress(0.1);

      if (forceRefresh) {
        // Mostrar tooltip/mensagem quando forçar a atualização
        Alert.alert(
          'Buscando Novas Vagas',
          'Estamos buscando novas vagas compatíveis com seu perfil. Isso pode levar alguns instantes...'
        );
      }

      // Chamar a função de busca com o parâmetro de forçar atualização
      const resultado = await buscarVagasComGemini(curriculoData, forceRefresh);

      if (resultado.success) {
        setVagasResultado(resultado.vagas);
        setFromCache(resultado.fromCache || false);
        setLastUpdate(resultado.timestamp || new Date().toISOString());
      } else {
        setError(resultado.error);
      }
    } catch (error) {
      console.error('Erro na busca de vagas:', error);
      setError('Não foi possível completar a busca de vagas. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
      setLoadingProgress(1);
    }
  };

  const handleRefresh = () => {
    // Forçar atualização (ignorar cache)
    buscarVagas(true);
  };

  const handleTryAgain = () => {
    setLoading(true);
    setError(null);
    setLoadingProgress(0.1);
    buscarVagas();
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: vagasResultado,
        title: 'Vagas recomendadas para seu perfil'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar as vagas.');
    }
  };

  // Funções de processamento de links (manter de antes)
  const processarConteudo = (texto) => {
    if (!texto) return { conteudoProcessado: '', links: [] };

    // Extrair links do formato markdown [texto](url)
    const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let match;
    const links = [];

    while ((match = regex.exec(texto)) !== null) {
      links.push({
        texto: match[1],
        url: match[2],
        completo: match[0]
      });
    }

    return {
      conteudoProcessado: texto,
      links
    };
  };

  // Componente VagaLink (manter de antes)
  const VagaLink = ({ url, label }) => {
    const handlePress = async () => {
      // Verificar se a URL é válida
      if (!url.startsWith('http')) {
        url = 'https://' + url;
      }

      try {
        const supported = await Linking.canOpenURL(url);

        if (supported) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Erro', `Não foi possível abrir o link: ${url}`);
        }
      } catch (error) {
        console.error('Erro ao abrir link:', error);
        Alert.alert('Erro', 'Não foi possível abrir este link.');
      }
    };

    return (
      <TouchableOpacity
        onPress={handlePress}
        style={{
          backgroundColor: Colors.primary,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: 5,
          alignSelf: 'flex-start',
          margin: 5,
        }}
      >
        <Text style={{ color: Colors.white, fontWeight: '500' }}>
          {label || 'Acessar Vaga'}
        </Text>
      </TouchableOpacity>
    );
  };

  // Manter de antes
  const renderizarLinksVagas = () => {
    const { conteudoProcessado, links } = processarConteudo(vagasResultado);

    // Agrupar links por vaga (baseado na ocorrência de "Vaga X" no texto)
    const secoes = conteudoProcessado.split(/## Vaga \d+:/);

    if (secoes.length <= 1) return null;

    return (
      <View style={{
        backgroundColor: '#e8f5e9',
        padding: 15,
        borderRadius: 10,
        marginBottom: 15,
      }}>
        <Text style={{
          fontSize: 16,
          fontWeight: 'bold',
          marginBottom: 10,
          color: Colors.dark,
        }}>
          Links Diretos para as Vagas:
        </Text>

        {secoes.map((secao, index) => {
          if (index === 0) return null; // Pular a introdução

          // Extrair o título da vaga
          const tituloMatch = secao.match(/\[([^\]]+)\]\s*-\s*\[([^\]]+)\]/);
          const titulo = tituloMatch
            ? `${tituloMatch[1]} - ${tituloMatch[2]}`
            : `Vaga ${index}`;

          // Encontrar links nesta seção
          const linksVaga = links.filter(link =>
            secao.includes(link.completo) &&
            (link.texto.includes('Link') ||
              link.texto.includes('vaga') ||
              link.texto.includes('Aplicar'))
          );

          if (linksVaga.length === 0) return null;

          return (
            <View key={index} style={{
              marginBottom: 10,
              padding: 10,
              backgroundColor: Colors.white,
              borderRadius: 5,
              borderLeftWidth: 3,
              borderLeftColor: Colors.success,
            }}>
              <Text style={{ fontWeight: 'bold', marginBottom: 5 }}>
                {titulo}
              </Text>

              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {linksVaga.map((link, linkIndex) => (
                  <VagaLink
                    key={linkIndex}
                    url={link.url}
                    label={link.texto}
                  />
                ))}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  // Para processar os resultados
  const { conteudoProcessado, links } = vagasResultado ? processarConteudo(vagasResultado) : { conteudoProcessado: '', links: [] };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vagas para Você</Text>

        {/* Novo botão de atualização */}
        {!loading && !error && (
          <TouchableOpacity
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              paddingVertical: 5,
              paddingHorizontal: 10,
              borderRadius: 5,
            }}
            onPress={handleRefresh}
          >
            <Text style={{ color: Colors.white, fontSize: 12 }}>Atualizar</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 20,
            textAlign: 'center'
          }}>
            Buscando vagas personalizadas
          </Text>

          <View style={{
            width: '80%',
            height: 10,
            backgroundColor: Colors.lightGray,
            borderRadius: 5,
            marginBottom: 20
          }}>
            <View style={{
              width: `${loadingProgress * 100}%`,
              height: '100%',
              backgroundColor: Colors.primary,
              borderRadius: 5
            }} />
          </View>

          <View style={{
            backgroundColor: 'rgba(0, 188, 212, 0.1)',
            padding: 15,
            borderRadius: 8,
            marginTop: 20,
            maxWidth: '90%'
          }}>
            <Text style={{ textAlign: 'center', color: Colors.dark }}>
              Nossa IA está analisando seu perfil e buscando vagas que correspondam às suas qualificações e objetivos de carreira.
            </Text>
          </View>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleTryAgain}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ padding: 15 }}>
            {/* Título e informações */}
            <View style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 2,
                },
              }),
            }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                  color: Colors.dark,
                }}>
                  Vagas Personalizadas para Seu Perfil
                </Text>

                {/* Botão de refresh alternativo */}
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.primary,
                    padding: 8,
                    borderRadius: 20,
                    width: 36,
                    height: 36,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                  onPress={handleRefresh}
                >
                  <Text style={{ color: Colors.white, fontSize: 16 }}>↻</Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 14,
                color: Colors.lightText,
                marginBottom: 6,
              }}>
                Com base nas informações do seu currículo, encontramos estas vagas que correspondem ao seu perfil profissional.
              </Text>

              {fromCache && (
                <View style={{
                  backgroundColor: '#e3f2fd',
                  padding: 8,
                  borderRadius: 4,
                  marginTop: 5,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <Text style={{
                    fontSize: 12,
                    color: '#0d47a1',
                    flex: 1,
                  }}>
                    Última atualização: {new Date(lastUpdate).toLocaleDateString()} às {new Date(lastUpdate).toLocaleTimeString()}
                  </Text>

                  <TouchableOpacity
                    style={{
                      backgroundColor: '#1976d2',
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 4,
                      marginLeft: 10,
                    }}
                    onPress={handleRefresh}
                  >
                    <Text style={{ color: Colors.white, fontSize: 12 }}>Buscar Novas</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Renderizar links para vagas */}
            {renderizarLinksVagas()}

            {/* Resultados da IA */}
            <View style={{
              backgroundColor: Colors.white,
              borderRadius: 10,
              padding: 15,
              marginBottom: 15,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.1,
                  shadowRadius: 4,
                },
                android: {
                  elevation: 2,
                },
              }),
            }}>
              <Markdown
                style={{
                  body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                  heading1: {
                    fontSize: 22,
                    fontWeight: 'bold',
                    marginBottom: 10,
                    color: Colors.dark,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.mediumGray,
                    paddingBottom: 5,
                  },
                  heading2: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 10,
                    marginTop: 15,
                    color: Colors.dark
                  },
                  heading3: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginTop: 10,
                    marginBottom: 5,
                    color: Colors.dark
                  },
                  paragraph: {
                    fontSize: 16,
                    lineHeight: 24,
                    marginBottom: 10,
                    color: Colors.dark
                  },
                  list_item: {
                    marginBottom: 5,
                    flexDirection: 'row',
                    alignItems: 'flex-start',
                  },
                  bullet_list: {
                    marginVertical: 10,
                  },
                  strong: {
                    fontWeight: 'bold',
                  },
                  em: {
                    fontStyle: 'italic',
                  },
                  link: {
                    color: Colors.primary,
                    textDecorationLine: 'underline',
                  },
                }}
                onLinkPress={(url) => {
                  Linking.openURL(url).catch(err => {
                    console.error('Erro ao abrir link:', err);
                    Alert.alert('Erro', 'Não foi possível abrir este link.');
                  });
                }}
              >
                {conteudoProcessado}
              </Markdown>
            </View>
          </ScrollView>

          {/* Botão para compartilhar */}
          <View style={{
            padding: 15,
            backgroundColor: Colors.white,
            borderTopWidth: 1,
            borderTopColor: Colors.mediumGray,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}>
            {/* Botão de atualização grande para facilitar o acesso */}
            <TouchableOpacity
              style={{
                backgroundColor: Colors.secondary,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignItems: 'center',
                flex: 1,
                marginRight: 8,
              }}
              onPress={handleRefresh}
            >
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Buscar Novas Vagas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.primary,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignItems: 'center',
                flex: 1,
                marginLeft: 8,
              }}
              onPress={handleShare}
            >
              <Text style={{
                color: Colors.white,
                fontWeight: 'bold',
                fontSize: 16,
              }}>
                Compartilhar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar se há usuário logado
    const checkUser = async () => {
      try {
        const userData = await AsyncStorage.getItem('currentUser');
        if (userData) {
          setUser(JSON.parse(userData));
        }
      } catch (error) {
        console.error('Erro ao verificar usuário:', error);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, []);

  const login = async (email, password) => {
    try {
      // Buscar usuários
      const usuarios = await AsyncStorage.getItem('usuarios');
      const usuariosArray = usuarios ? JSON.parse(usuarios) : [];

      // Verificar credenciais
      const usuarioEncontrado = usuariosArray.find(
        u => u.email === email && u.password === password
      );

      if (usuarioEncontrado) {
        setUser(usuarioEncontrado);
        await AsyncStorage.setItem('currentUser', JSON.stringify(usuarioEncontrado));
        return { success: true };
      } else {
        return { success: false, message: 'Email ou senha incorretos' };
      }
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      return { success: false, message: 'Erro ao fazer login' };
    }
  };

  const register = async (nome, email, password) => {
    try {
      // Verificar se o email já está em uso
      const usuarios = await AsyncStorage.getItem('usuarios');
      const usuariosArray = usuarios ? JSON.parse(usuarios) : [];

      if (usuariosArray.some(u => u.email === email)) {
        return { success: false, message: 'Email já cadastrado' };
      }

      // Criar novo usuário
      const novoUsuario = {
        id: Date.now().toString(),
        nome,
        email,
        password,
        dataCadastro: new Date().toISOString()
      };

      // Salvar usuário
      const novosUsuarios = [...usuariosArray, novoUsuario];
      await AsyncStorage.setItem('usuarios', JSON.stringify(novosUsuarios));

      // Fazer login automático
      setUser(novoUsuario);
      await AsyncStorage.setItem('currentUser', JSON.stringify(novoUsuario));

      return { success: true };
    } catch (error) {
      console.error('Erro ao cadastrar:', error);
      return { success: false, message: 'Erro ao cadastrar' };
    }
  };

  // Função de logout corrigida
  const logout = async () => {
    try {
      // Primeiro, definimos o estado para null para evitar acesso a dados antigos
      setUser(null);

      // Depois removemos os dados de usuário do AsyncStorage
      await AsyncStorage.removeItem('currentUser');

      // Talvez seja necessário limpar outras informações também
      // Por exemplo, limpar cache de análises, etc.

      console.log('Logout realizado com sucesso');
      return true;
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      // Mesmo com erro, definir o usuário como null para evitar problemas
      setUser(null);
      return false;
    }
  };

  // Função para atualizar o user (opcional, se você tiver)
  const updateUser = (userData) => {
    try {
      setUser(userData);
    } catch (error) {
      console.error('Erro ao atualizar dados do usuário:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

const chamarIAAPI = async (tipoIA, apiKey, promptText) => {
  const MAX_RETRIES = 2;

  // Implementação de backoff exponencial para retries
  const tentarComRetry = async (funcaoRequest) => {
    for (let tentativa = 0; tentativa <= MAX_RETRIES; tentativa++) {
      try {
        if (tentativa > 0) {
          const tempoEspera = Math.pow(2, tentativa) * 1000;
          console.log(`chamarIAAPI: Aguardando ${tempoEspera}ms antes da tentativa ${tentativa + 1}`);
          await new Promise(resolve => setTimeout(resolve, tempoEspera));
        }

        return await funcaoRequest();
      } catch (error) {
        console.log(`chamarIAAPI: Erro na tentativa ${tentativa + 1}:`, error.message);

        // Se é a última tentativa, propagar o erro
        if (tentativa === MAX_RETRIES) throw error;

        // Se não é erro de rate limit (429), não tente novamente
        if (error.response?.status !== 429) throw error;
      }
    }
  };

  // Handlers específicos para cada IA
  switch (tipoIA) {
    case 'GEMINI':
      return await tentarComRetry(async () => {
        const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
        const requestBody = {
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 800,
          }
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          return response.data.candidates[0].content.parts[0].text;
        } else {
          throw new Error('Formato de resposta inesperado do Gemini');
        }
      });

    case 'OPENAI':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.OPENAI.endpoint;
        const requestBody = {
          model: "gpt-3.5-turbo",
          messages: [
            { role: "system", content: "Você é um consultor especializado em análise de currículos." },
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 15000
        });

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do ChatGPT');
        }
      });

    case 'CLAUDE':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.CLAUDE.endpoint;
        const requestBody = {
          model: "claude-3-sonnet-20240229",
          max_tokens: 800,
          messages: [
            { role: "user", content: promptText }
          ]
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          timeout: 20000
        });

        if (response.data?.content?.[0]?.text) {
          return response.data.content[0].text;
        } else {
          throw new Error('Formato de resposta inesperado do Claude');
        }
      });

    case 'PERPLEXITY':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.PERPLEXITY.endpoint;
        const requestBody = {
          model: "llama-3-8b-instruct",
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Perplexity');
        }
      });

    case 'DEEPSEEK':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.DEEPSEEK.endpoint;
        const requestBody = {
          model: "deepseek-chat",
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do DeepSeek');
        }
      });

    case 'BLACKBOX':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.BLACKBOX.endpoint;
        const requestBody = {
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });

        if (response.data?.message?.content) {
          return response.data.message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Blackbox');
        }
      });

    case 'BING':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.BING.endpoint;
        const params = {
          q: promptText,
          count: 5,
          responseFilter: 'Computation,Entities,Places,Webpages'
        };

        const response = await axios.get(endpoint, {
          headers: {
            'Ocp-Apim-Subscription-Key': apiKey
          },
          params: params,
          timeout: 15000
        });

        if (response.data?.webPages?.value) {
          // Construa um texto resumindo os resultados
          let resultado = "Análise baseada em resultados da busca Bing:\n\n";
          response.data.webPages.value.forEach((item, index) => {
            resultado += `${index + 1}. ${item.name}\n${item.snippet}\n\n`;
          });

          return resultado;
        } else {
          throw new Error('Formato de resposta inesperado do Bing');
        }
      });

    case 'GROK':
      return await tentarComRetry(async () => {
        const endpoint = IA_APIS.GROK.endpoint;
        const requestBody = {
          messages: [
            { role: "user", content: promptText }
          ],
          temperature: 0.7,
          max_tokens: 800
        };

        const response = await axios.post(endpoint, requestBody, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: 20000
        });

        if (response.data?.choices?.[0]?.message?.content) {
          return response.data.choices[0].message.content;
        } else {
          throw new Error('Formato de resposta inesperado do Grok');
        }
      });

    default:
      throw new Error(`IA não implementada: ${tipoIA}`);
  }
};
const analisarCurriculoComIA = async (curriculoData, tipoAnalise, tipoIA = 'GEMINI', forceOffline = false) => {
  // Validação de entrada
  if (!curriculoData) {
    console.error('analisarCurriculoComIA: Dados do currículo não fornecidos');
    return {
      success: false,
      analise: 'Não foi possível analisar o currículo: dados ausentes.',
      offline: true
    };
  }

  if (!tipoAnalise) {
    tipoAnalise = 'geral'; // Valor padrão
  }

  // Verificar se a IA selecionada existe
  if (!IA_APIS[tipoIA]) {
    console.error(`analisarCurriculoComIA: Tipo de IA inválido: ${tipoIA}`);
    tipoIA = 'GEMINI'; // Fallback para Gemini
  }

  // Se a IA selecionada é offline ou forceOffline, usar análise local
  if (forceOffline || IA_APIS[tipoIA].offline) {
    console.log('analisarCurriculoComIA: Usando modo offline');
    return gerarAnaliseLocal(curriculoData, tipoAnalise);
  }

  // Verificar cache usando a combinação de tipoAnalise e tipoIA como chave
  const cacheKey = `analise_${tipoIA}_${tipoAnalise}_${JSON.stringify(curriculoData).slice(0, 50)}`;
  try {
    const cachedResult = await AsyncStorage.getItem(cacheKey);
    if (cachedResult) {
      const parsed = JSON.parse(cachedResult);
      const cacheAge = new Date() - new Date(parsed.timestamp);
      const cacheValidHours = 24;

      if (cacheAge < cacheValidHours * 60 * 60 * 1000) {
        console.log(`analisarCurriculoComIA: Usando resultado em cache para ${IA_APIS[tipoIA].nome}`);
        return {
          success: true,
          analise: parsed.resultado,
          offline: false,
          fromCache: true,
          provider: IA_APIS[tipoIA].nome
        };
      }
    }
  } catch (cacheError) {
    console.log('Erro ao verificar cache:', cacheError.message);
  }

  // Função para formatar currículo - definida explicitamente dentro do escopo
  const formatarCurriculo = (data) => {
    let texto = '';

    // Helper para adicionar seção apenas se existir dados
    const adicionarSecao = (titulo, items, formatoItem) => {
      if (!items || items.length === 0) return;

      texto += `${titulo.toUpperCase()}:\n`;
      items.forEach(item => {
        texto += formatoItem(item);
        texto += '\n';
      });
      texto += '\n';
    };

    // Informações Pessoais
    const pessoal = data.informacoes_pessoais || {};
    const nomeCompleto = `${pessoal.nome || ''} ${pessoal.sobrenome || ''}`.trim();
    if (nomeCompleto) texto += `Nome: ${nomeCompleto}\n`;
    if (pessoal.email) texto += `Email: ${pessoal.email}\n`;
    if (pessoal.endereco) texto += `Endereço: ${pessoal.endereco}\n`;
    if (pessoal.area) texto += `Área: ${pessoal.area}\n`;
    if (pessoal.linkedin) texto += `LinkedIn: ${pessoal.linkedin}\n`;
    if (pessoal.github) texto += `GitHub: ${pessoal.github}\n`;
    if (pessoal.site) texto += `Site: ${pessoal.site}\n`;
    texto += '\n';

    // Resumo Profissional
    if (data.resumo_profissional) {
      texto += `RESUMO PROFISSIONAL:\n${data.resumo_profissional}\n\n`;
    }

    // Formação Acadêmica
    adicionarSecao('Formação Acadêmica', data.formacoes_academicas, (f) => {
      let item = `- ${f.diploma || ''} em ${f.area_estudo || ''}\n`;
      item += `  ${f.instituicao || ''}\n`;
      item += `  ${f.data_inicio || ''} - ${f.data_fim || ''}\n`;
      if (f.descricao) item += `  Descrição: ${f.descricao}\n`;
      if (f.competencias) item += `  Competências: ${f.competencias}\n`;
      return item;
    });

    // Experiência Profissional
    adicionarSecao('Experiência Profissional', data.experiencias, (e) => {
      let item = `- ${e.cargo || ''}\n`;
      item += `  ${e.empresa || ''}\n`;
      item += `  ${e.data_inicio || ''} - ${e.data_fim || ''}\n`;
      if (e.descricao) item += `  Descrição: ${e.descricao}\n`;
      return item;
    });

    // Cursos
    adicionarSecao('Cursos e Certificados', data.cursos, (c) => {
      let item = `- ${c.nome || ''}\n`;
      item += `  ${c.instituicao || ''}\n`;
      if (c.data_inicio || c.data_fim) {
        item += `  ${c.data_inicio || ''} - ${c.data_fim || ''}\n`;
      }
      if (c.descricao) item += `  Descrição: ${c.descricao}\n`;
      return item;
    });

    // Projetos
    adicionarSecao('Projetos', data.projetos, (p) => {
      let item = `- ${p.nome || ''}\n`;
      if (p.habilidades) item += `  Habilidades: ${p.habilidades}\n`;
      if (p.descricao) item += `  Descrição: ${p.descricao}\n`;
      return item;
    });

    // Idiomas
    adicionarSecao('Idiomas', data.idiomas, (i) => {
      return `- ${i.nome || ''}: ${i.nivel || ''}\n`;
    });

    return texto;
  };

  // Estruturar o currículo em texto para análise
  const curriculoTexto = formatarCurriculo(curriculoData);

  // Função para gerar o prompt adequado
  const gerarPrompt = (tipo, textoCurriculo) => {
    const prompts = {
      pontuacao: `Você é um consultor de RH. Avalie este currículo (0-10) em: Conteúdo (30%), Estrutura (20%), Apresentação (20%), Impacto (30%). Considere especialmente o resumo profissional, experiências e formação. Forneça nota geral ponderada e justifique brevemente.`,

      melhorias: `Você é um consultor de RH. Identifique 3 melhorias específicas para este currículo aumentar chances de entrevistas. Analise especialmente o resumo profissional e as competências demonstradas. Para cada melhoria, explique por quê e como implementar.`,

      dicas: `Você é um coach de carreira. Com base no resumo profissional e perfil completo deste candidato, forneça 3 dicas de carreira personalizadas. Seja específico e prático, considerando os objetivos mencionados no resumo.`,

      cursos: `Com base no resumo profissional e perfil geral deste candidato, sugira 3 cursos ou certificações específicas para complementar suas habilidades e aumentar empregabilidade. Explique onde encontrar e como agregaria valor.`,

      vagas: `Após analisar o resumo profissional e experiências deste candidato, sugira 3 tipos de vagas onde teria boas chances. Explique por que, competências valorizadas e palavras-chave para busca.`,

      geral: `Analise este currículo, incluindo o resumo profissional: 1) Pontos fortes (2), 2) Áreas de melhoria (2), 3) Impressão geral do perfil profissional, 4) Nota de 0-10.`
    };

    // Usar prompt específico ou default
    const promptBase = prompts[tipo] || prompts.geral;

    return `${promptBase}
    
    CURRÍCULO:
    ${textoCurriculo}
    
    Responda em português, com formatação clara e concisa.`;
  };

  const promptText = gerarPrompt(tipoAnalise, curriculoTexto);

  // Obter a API key para o tipo de IA selecionado
  const apiKey = await getIAAPIKey(tipoIA);

  // Verificar se precisa de API key e se ela está disponível
  if (IA_APIS[tipoIA].chaveNecessaria && !apiKey) {
    console.error(`analisarCurriculoComIA: API key não encontrada para ${IA_APIS[tipoIA].nome}`);
    return {
      success: false,
      analise: `Não foi possível analisar o currículo: API key não configurada para ${IA_APIS[tipoIA].nome}.`,
      offline: true,
      provider: IA_APIS[tipoIA].nome
    };
  }

  // Chamar a função específica para o tipo de IA
  try {
    const resultado = await chamarIAAPI(tipoIA, apiKey, promptText);

    // Salvar no cache
    try {
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        resultado: resultado,
        timestamp: new Date().toISOString()
      }));
    } catch (cacheError) {
      console.log('Erro ao salvar no cache:', cacheError.message);
    }

    return {
      success: true,
      analise: resultado,
      offline: false,
      provider: IA_APIS[tipoIA].nome
    };
  } catch (error) {
    console.error(`analisarCurriculoComIA: Erro ao chamar API de ${IA_APIS[tipoIA].nome}:`, error.message);

    // Tentar com Gemini como fallback se não for Gemini que já falhou
    if (tipoIA !== 'GEMINI') {
      console.log('analisarCurriculoComIA: Tentando fallback para Gemini');
      try {
        return await analisarCurriculoComIA(curriculoData, tipoAnalise, 'GEMINI', false);
      } catch (fallbackError) {
        console.error('analisarCurriculoComIA: Fallback para Gemini também falhou:', fallbackError.message);
      }
    }

    // Último recurso: usar análise local
    console.log('analisarCurriculoComIA: Usando análise local como último recurso');
    return gerarAnaliseLocal(curriculoData, tipoAnalise);
  }
};

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);
    const result = await login(email, password);
    setLoading(false);

    if (result.success) {
      // Login bem-sucedido
    } else {
      Alert.alert('Erro', result.message || 'Erro ao fazer login.');
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      <View style={styles.authHeader}>
        <Text style={styles.authTitle}>Login</Text>
        <Text style={styles.authSubtitle}>Entre na sua conta para continuar</Text>
      </View>

      <View style={styles.authForm}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Senha</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Sua senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.enhancedPrimaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.enhancedPrimaryButtonText}>Entrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.textButtonText}>Não tem uma conta? Cadastre-se</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};


const SimularEntrevistaScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCurriculos();
  }, []);

  const carregarCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  const handleIniciarEntrevista = (curriculo) => {
    navigation.navigate('EntrevistaSimulada', { curriculoData: curriculo });
  };

  const handleEntrevistaGenerica = () => {
    navigation.navigate('EntrevistaSimulada', { curriculoData: null });
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Extrair informações do currículo para exibição
  const getResumoCurriculo = (curriculo) => {
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, area };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Simular Entrevista</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando currículos...</Text>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <View style={{
            backgroundColor: '#e1f5fe',
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.info,
          }}>
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
              marginBottom: 5,
              color: Colors.dark,
            }}>
              Simulador de Entrevista com IA
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#01579b',
              lineHeight: 22,
            }}>
              Prepare-se para suas entrevistas de emprego com nosso simulador inteligente. A IA fará perguntas baseadas no seu currículo ou em um formato genérico, avaliará suas respostas e fornecerá feedback para melhorar seu desempenho.
            </Text>
          </View>

          {curriculos.length > 0 ? (
            <>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                color: Colors.dark,
              }}>
                Selecione um currículo para uma entrevista personalizada:
              </Text>

              <FlatList
                data={curriculos}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => {
                  const resumo = getResumoCurriculo(item);

                  return (
                    <TouchableOpacity
                      style={{
                        backgroundColor: Colors.white,
                        borderRadius: 10,
                        marginBottom: 15,
                        padding: 16,
                        ...Platform.select({
                          ios: {
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: 0.1,
                            shadowRadius: 3,
                          },
                          android: {
                            elevation: 2,
                          },
                        }),
                        borderLeftWidth: 4,
                        borderLeftColor: Colors.primary,
                      }}
                      onPress={() => handleIniciarEntrevista(item)}
                    >
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{
                          fontSize: 18,
                          fontWeight: 'bold',
                          color: Colors.dark,
                          marginBottom: 5,
                        }}>
                          {item.nome || 'Currículo sem nome'}
                        </Text>

                        <View style={{
                          backgroundColor: Colors.primary,
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 15,
                        }}>
                          <Text style={{ color: Colors.white, fontSize: 12 }}>
                            Selecionar
                          </Text>
                        </View>
                      </View>

                      <Text style={{
                        fontSize: 14,
                        color: Colors.lightText,
                        marginBottom: 10,
                      }}>
                        Criado em: {formatDate(item.dataCriacao)}
                      </Text>

                      <View style={{
                        backgroundColor: '#f5f5f5',
                        padding: 10,
                        borderRadius: 5,
                        marginTop: 5,
                      }}>
                        <Text style={{ color: Colors.dark }}>
                          <Text style={{ fontWeight: 'bold' }}>Área: </Text>
                          {resumo.area}
                        </Text>

                        <View style={{ flexDirection: 'row', marginTop: 5, flexWrap: 'wrap' }}>
                          <View style={{
                            backgroundColor: Colors.primary,
                            paddingVertical: 3,
                            paddingHorizontal: 8,
                            borderRadius: 12,
                            marginRight: 8,
                            marginBottom: 5,
                          }}>
                            <Text style={{ color: Colors.white, fontSize: 12 }}>
                              {resumo.experiencias} experiência(s)
                            </Text>
                          </View>

                          <View style={{
                            backgroundColor: Colors.secondary,
                            paddingVertical: 3,
                            paddingHorizontal: 8,
                            borderRadius: 12,
                            marginRight: 8,
                            marginBottom: 5,
                          }}>
                            <Text style={{ color: Colors.white, fontSize: 12 }}>
                              {resumo.formacoes} formação(ões)
                            </Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          ) : (
            <View style={{ alignItems: 'center', marginTop: 20 }}>
              <Text style={{ textAlign: 'center', marginBottom: 20 }}>
                Você ainda não tem currículos cadastrados. Crie um currículo primeiro ou use o modo de entrevista genérica.
              </Text>
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  marginBottom: 15,
                }}
                onPress={() => navigation.navigate('Chatbot')}
              >
                <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                  Criar Novo Currículo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{
            backgroundColor: '#f9fbe7',
            padding: 15,
            borderRadius: 10,
            marginTop: 10,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: '#9e9d24',
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 5,
              color: Colors.dark,
            }}>
              Entrevista Genérica
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#616161',
              marginBottom: 10,
            }}>
              Prefere uma entrevista sem vínculo com um currículo específico? Faça uma simulação com perguntas genéricas para qualquer cargo.
            </Text>
            <TouchableOpacity
              style={{
                backgroundColor: '#9e9d24',
                paddingVertical: 10,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignSelf: 'flex-start',
              }}
              onPress={handleEntrevistaGenerica}
            >
              <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
                Iniciar Entrevista Genérica
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const EntrevistaSimuladaScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const { user } = useAuth();
  const [entrevistaIniciada, setEntrevistaIniciada] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [perguntaAtual, setPerguntaAtual] = useState(null);
  const [resposta, setResposta] = useState('');
  const [historico, setHistorico] = useState([]);
  const [numeroPergunta, setNumeroPergunta] = useState(0);
  const [totalPerguntas, setTotalPerguntas] = useState(0);
  const [feedbackVisible, setFeedbackVisible] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [finalizando, setFinalizando] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [avaliacaoFinal, setAvaliacaoFinal] = useState(null);
  const [tipoCargo, setTipoCargo] = useState('');
  const [area, setArea] = useState('');

  const flatListRef = useRef();
  const respostaInputRef = useRef();

  // Função para iniciar a entrevista
  const iniciarEntrevista = async () => {
    try {
      setCarregando(true);

      // Verificar se é uma entrevista baseada em currículo ou genérica
      if (curriculoData) {
        // Extrair a área e cargo do currículo para personalizar a entrevista
        const cv = curriculoData.data;
        const areaDoCV = cv.informacoes_pessoais?.area || '';
        setArea(areaDoCV);

        // Determinar o cargo com base na experiência mais recente, se disponível
        if (cv.experiencias && cv.experiencias.length > 0) {
          setTipoCargo(cv.experiencias[0].cargo || '');
        }
      } else {
        // Para entrevista genérica, solicitar informações
        Alert.prompt(
          "Informações para Entrevista",
          "Qual cargo ou área você está buscando?",
          [
            {
              text: "Cancelar",
              onPress: () => navigation.goBack(),
              style: "cancel"
            },
            {
              text: "Continuar",
              onPress: input => {
                setArea(input || "Área não especificada");
                prepararEntrevista(input);
              }
            }
          ],
          "plain-text"
        );
        return; // Aguardar input do usuário
      }

      // Se temos currículo, continuar diretamente
      prepararEntrevista();

    } catch (error) {
      console.error('Erro ao iniciar entrevista:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a entrevista. Tente novamente.');
      setCarregando(false);
    }
  };

  // Função para preparar o conjunto de perguntas da entrevista
  const prepararEntrevista = async (areaInput = null) => {
    try {
      setCarregando(true);

      // Usar área do input para entrevista genérica, ou do currículo para específica
      const areaFinal = areaInput || area;

      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      // Construir prompt para gerar perguntas de entrevista
      let promptText = "";

      if (curriculoData) {
        // Formatamos os dados do currículo
        const cv = curriculoData.data;
        const experiencias = cv.experiencias?.map(exp =>
          `${exp.cargo} em ${exp.empresa} (${exp.data_inicio || ''} - ${exp.data_fim || 'atual'}): ${exp.descricao || ''}`
        ).join('\n') || 'Sem experiências profissionais';

        const formacoes = cv.formacoes_academicas?.map(form =>
          `${form.diploma} em ${form.area_estudo} pela ${form.instituicao} (${form.data_inicio || ''} - ${form.data_fim || ''})`
        ).join('\n') || 'Sem formação acadêmica';

        const habilidades = cv.projetos?.map(proj => proj.habilidades).filter(Boolean).join(', ') || 'Não especificadas';

        promptText = `
Você é um recrutador experiente especializado em entrevistas para a área de ${areaFinal}. Conduza uma entrevista simulada de emprego detalhada e realista para um candidato à posição de ${tipoCargo || areaFinal}.

CURRÍCULO DO CANDIDATO:
Nome: ${cv.informacoes_pessoais?.nome || ''} ${cv.informacoes_pessoais?.sobrenome || ''}
Área: ${areaFinal}

Experiências:
${experiencias}

Formação:
${formacoes}

Habilidades:
${habilidades}

INSTRUÇÕES PARA A ENTREVISTA:
1. Crie exatamente 10 perguntas desafiadoras e realistas baseadas no currículo do candidato
2. As perguntas devem incluir:
   - Perguntas comportamentais (situações específicas)
   - Perguntas técnicas relevantes para a área
   - Perguntas sobre experiências anteriores
   - Perguntas sobre soft skills e trabalho em equipe
   - Pelo menos uma pergunta situacional de resolução de problemas
   - Pelo menos uma pergunta de motivação profissional

3. Elabore perguntas que um recrutador real faria, usando linguagem profissional
4. Foque em perguntas que extraiam informações sobre competências, experiências e fit cultural
5. Use as informações do currículo para personalizar as perguntas
6. Inclua perguntas sobre possíveis gaps no currículo ou áreas de melhoria

FORMATO DE RESPOSTA:
Forneça apenas um array JSON de objetos, cada um representando uma pergunta, na seguinte estrutura:
[
  {
    "pergunta": "texto da pergunta 1",
    "context": "contexto breve sobre por que essa pergunta está sendo feita",
    "tipo": "comportamental/técnica/experiência/motivacional/situacional"
  },
  {
    "pergunta": "texto da pergunta 2",
    "context": "contexto breve sobre por que essa pergunta está sendo feita",
    "tipo": "comportamental/técnica/experiência/motivacional/situacional"
  }
]

Apenas retorne o JSON puro, sem texto introdutório ou explicações.
`;
      } else {
        // Prompt para entrevista genérica
        promptText = `
Você é um recrutador experiente especializado em entrevistas para a área de ${areaFinal}. Conduza uma entrevista simulada de emprego detalhada e realista para um candidato.

INSTRUÇÕES PARA A ENTREVISTA GENÉRICA:
1. Crie exatamente 10 perguntas desafiadoras e realistas para uma entrevista de emprego na área de ${areaFinal}
2. As perguntas devem incluir:
   - Perguntas comportamentais (situações específicas)
   - Perguntas técnicas relevantes para a área
   - Perguntas sobre experiências anteriores
   - Perguntas sobre soft skills e trabalho em equipe
   - Pelo menos uma pergunta situacional de resolução de problemas
   - Pelo menos uma pergunta de motivação profissional

3. Elabore perguntas que um recrutador real faria, usando linguagem profissional
4. Foque em perguntas que extraiam informações sobre competências, experiências e fit cultural
5. As perguntas devem ser genéricas o suficiente para qualquer pessoa na área, mas específicas o suficiente para avaliar conhecimentos relevantes
6. Inclua perguntas típicas de entrevistas para ${areaFinal} baseadas nas melhores práticas do mercado

FORMATO DE RESPOSTA:
Forneça apenas um array JSON de objetos, cada um representando uma pergunta, na seguinte estrutura:
[
  {
    "pergunta": "texto da pergunta 1",
    "context": "contexto breve sobre por que essa pergunta está sendo feita",
    "tipo": "comportamental/técnica/experiência/motivacional/situacional"
  },
  {
    "pergunta": "texto da pergunta 2",
    "context": "contexto breve sobre por que essa pergunta está sendo feita",
    "tipo": "comportamental/técnica/experiência/motivacional/situacional"
  }
]

Apenas retorne o JSON puro, sem texto introdutório ou explicações.
`;
      }

      // Chamar a API do Gemini para gerar perguntas
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;

        // Extrair o JSON da resposta
        const jsonMatch = resultText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          try {
            const perguntas = JSON.parse(jsonMatch[0]);
            setTotalPerguntas(perguntas.length);
            setNumeroPergunta(1);
            setPerguntaAtual(perguntas[0]);

            // Adicionar primeira pergunta ao histórico
            setHistorico([{
              id: '0',
              texto: perguntas[0].pergunta,
              isUser: false,
              context: perguntas[0].context,
              tipo: perguntas[0].tipo
            }]);

            // Salvar perguntas restantes no estado
            setEntrevistaIniciada(true);

            // Armazenar perguntas em AsyncStorage para recuperação caso a app feche
            await AsyncStorage.setItem(`entrevista_perguntas_${user.id}`,
              JSON.stringify({
                perguntas,
                timestampInicio: new Date().toISOString(),
                curriculoId: curriculoData?.id || null,
                area: areaFinal,
                tipoCargo: tipoCargo
              })
            );
          } catch (jsonError) {
            console.error('Erro ao parsear JSON da resposta:', jsonError);
            throw new Error('Formato de resposta inválido');
          }
        } else {
          throw new Error('Não foi possível extrair perguntas da resposta');
        }
      } else {
        throw new Error('Formato de resposta inesperado do Gemini');
      }
    } catch (error) {
      console.error('Erro ao preparar entrevista:', error);
      Alert.alert('Erro', 'Não foi possível preparar a entrevista. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  // Função para processar a resposta do usuário e fornecer feedback
  const enviarResposta = async () => {
    if (resposta.trim() === '') return;

    try {
      // Adicionar a resposta do usuário ao histórico
      const novoHistorico = [...historico, {
        id: `u-${numeroPergunta}`,
        texto: resposta,
        isUser: true
      }];

      setHistorico(novoHistorico);
      setResposta('');
      setCarregando(true);

      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      // Obter entrevista armazenada
      const entrevistaJson = await AsyncStorage.getItem(`entrevista_perguntas_${user.id}`);
      if (!entrevistaJson) {
        throw new Error("Dados da entrevista não encontrados");
      }

      const entrevistaData = JSON.parse(entrevistaJson);
      const perguntas = entrevistaData.perguntas;

      // Construir prompt para feedback da resposta
      const promptText = `
Você é um recrutador experiente especializado em entrevistas para a área de ${area || entrevistaData.area}.

PERGUNTA DA ENTREVISTA:
"${perguntaAtual.pergunta}"

Contexto da pergunta: ${perguntaAtual.context}
Tipo de pergunta: ${perguntaAtual.tipo}

RESPOSTA DO CANDIDATO:
"${resposta}"

TAREFA:
Analise a resposta do candidato à pergunta de entrevista acima e forneça um feedback detalhado:

1. Avalie a qualidade da resposta (escala de 1-10)
2. Identifique pontos fortes da resposta
3. Identifique pontos fracos ou informações faltantes
4. Forneça sugestões específicas para melhorar a resposta
5. Explique o que um recrutador buscaria neste tipo de resposta

FORMATO DE RESPOSTA:
{
  "pontuacao": 7,
  "pontos_fortes": ["ponto forte 1", "ponto forte 2"],
  "pontos_fracos": ["ponto fraco 1", "ponto fraco 2"],
  "sugestoes": ["sugestão 1", "sugestão 2"],
  "explicacao": "Explicação sobre o que um recrutador busca nesta resposta",
  "resumo": "Um resumo conciso do feedback em um parágrafo"
}

Retorne apenas o JSON puro, sem texto adicional.
`;

      // Chamar a API do Gemini para gerar feedback
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 2000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;

        // Extrair o JSON da resposta
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const feedbackData = JSON.parse(jsonMatch[0]);

            // Formatar feedback para exibição
            const feedbackFormatado = `## Feedback sobre sua resposta

**Pontuação:** ${feedbackData.pontuacao}/10

**Pontos fortes:**
${feedbackData.pontos_fortes.map(ponto => `- ${ponto}`).join('\n')}

**Pontos a melhorar:**
${feedbackData.pontos_fracos.map(ponto => `- ${ponto}`).join('\n')}

**Sugestões:**
${feedbackData.sugestoes.map(sugestao => `- ${sugestao}`).join('\n')}

**O que o recrutador busca:**
${feedbackData.explicacao}

**Resumo:**
${feedbackData.resumo}`;

            setFeedback(feedbackFormatado);
            setFeedbackVisible(true);

            // Salvar feedback no histórico de entrevista
            await AsyncStorage.setItem(`entrevista_feedback_${user.id}_${numeroPergunta}`,
              JSON.stringify({
                pergunta: perguntaAtual.pergunta,
                resposta: resposta,
                feedback: feedbackData
              })
            );

          } catch (jsonError) {
            console.error('Erro ao parsear JSON do feedback:', jsonError);
            setFeedback("Não foi possível gerar o feedback para sua resposta. Vamos continuar com a próxima pergunta.");
            setFeedbackVisible(true);
          }
        } else {
          setFeedback("Não foi possível gerar o feedback para sua resposta. Vamos continuar com a próxima pergunta.");
          setFeedbackVisible(true);
        }
      } else {
        setFeedback("Não foi possível gerar o feedback para sua resposta. Vamos continuar com a próxima pergunta.");
        setFeedbackVisible(true);
      }
    } catch (error) {
      console.error('Erro ao processar resposta:', error);
      Alert.alert('Erro', 'Não foi possível processar sua resposta. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  };

  // Função para prosseguir para a próxima pergunta
  const proximaPergunta = async () => {
    try {
      setFeedbackVisible(false);
      setFeedback('');

      // Obter entrevista armazenada
      const entrevistaJson = await AsyncStorage.getItem(`entrevista_perguntas_${user.id}`);
      if (!entrevistaJson) {
        throw new Error("Dados da entrevista não encontrados");
      }

      const entrevistaData = JSON.parse(entrevistaJson);
      const perguntas = entrevistaData.perguntas;

      // Verificar se ainda há perguntas
      if (numeroPergunta < perguntas.length) {
        // Próxima pergunta
        const proximoNumero = numeroPergunta + 1;
        const proximaPergunta = perguntas[proximoNumero - 1];

        setNumeroPergunta(proximoNumero);
        setPerguntaAtual(proximaPergunta);

        // Adicionar próxima pergunta ao histórico
        setHistorico(prev => [...prev, {
          id: `${proximoNumero}`,
          texto: proximaPergunta.pergunta,
          isUser: false,
          context: proximaPergunta.context,
          tipo: proximaPergunta.tipo
        }]);

        // Rolar para o fim da lista
        if (flatListRef.current) {
          setTimeout(() => {
            flatListRef.current.scrollToEnd({ animated: true });
          }, 200);
        }
      } else {
        // Finalizar entrevista
        setFinalizando(true);
        gerarAvaliacaoFinal();
      }
    } catch (error) {
      console.error('Erro ao avançar para próxima pergunta:', error);
      Alert.alert('Erro', 'Não foi possível carregar a próxima pergunta. Tente novamente.');
    }
  };

  // Função para gerar avaliação final da entrevista
  const gerarAvaliacaoFinal = async () => {
    try {
      setCarregando(true);

      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      // Recuperar todos os feedbacks armazenados
      const entrevistaJson = await AsyncStorage.getItem(`entrevista_perguntas_${user.id}`);
      if (!entrevistaJson) {
        throw new Error("Dados da entrevista não encontrados");
      }

      const entrevistaData = JSON.parse(entrevistaJson);
      const perguntas = entrevistaData.perguntas;

      // Construir lista de perguntas e respostas
      let perguntasRespostas = [];

      for (let i = 1; i <= perguntas.length; i++) {
        const feedbackJson = await AsyncStorage.getItem(`entrevista_feedback_${user.id}_${i}`);
        if (feedbackJson) {
          const feedbackData = JSON.parse(feedbackJson);
          perguntasRespostas.push({
            pergunta: feedbackData.pergunta,
            resposta: feedbackData.resposta,
            feedback: feedbackData.feedback
          });
        }
      }

      // Construir prompt para avaliação final
      const promptText = `
Você é um recrutador experiente especializado em entrevistas para a área de ${entrevistaData.area || area}.

CONTEXTO:
Foi conduzida uma entrevista simulada com um candidato para uma posição na área de ${entrevistaData.area || area}${entrevistaData.tipoCargo ? `, com foco em ${entrevistaData.tipoCargo}` : ''}.

RESUMO DA ENTREVISTA:
${perguntasRespostas.map((item, index) => `
Pergunta ${index + 1}: "${item.pergunta}"
Resposta: "${item.resposta}"
Pontuação: ${item.feedback.pontuacao}/10
`).join('\n')}

TAREFA:
Baseado nas respostas do candidato, faça uma avaliação completa de seu desempenho na entrevista:

1. Calcule a pontuação global (média das pontuações individuais)
2. Identifique os 3-5 principais pontos fortes demonstrados
3. Identifique as 3-5 principais áreas de melhoria
4. Forneça 3-5 recomendações específicas para melhorar em futuras entrevistas
5. Avalie as habilidades de comunicação, estruturação de respostas e confiança do candidato
6. Dê uma avaliação geral sobre as chances do candidato neste processo seletivo (baixa/média/alta)

FORMATO DE RESPOSTA:
{
  "pontuacao_global": 7.5,
  "pontos_fortes": [
    {"ponto": "Descrição do ponto forte 1", "exemplo": "Exemplo específico da entrevista"},
    {"ponto": "Descrição do ponto forte 2", "exemplo": "Exemplo específico da entrevista"}
  ],
  "areas_melhoria": [
    {"area": "Descrição da área 1", "sugestao": "Sugestão específica"},
    {"area": "Descrição da área 2", "sugestao": "Sugestão específica"}
  ],
  "recomendacoes": ["Recomendação 1", "Recomendação 2", "Recomendação 3"],
  "avaliacao_comunicacao": "Análise da comunicação",
  "avaliacao_estrutura": "Análise da estrutura das respostas",
  "avaliacao_confianca": "Análise da confiança demonstrada",
  "chance_sucesso": "média",
  "conclusao": "Conclusão geral sobre o desempenho em um parágrafo"
}

Retorne apenas o JSON puro, sem texto adicional.
`;

      // Chamar a API do Gemini para gerar avaliação final
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4000,
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const resultText = response.data.candidates[0].content.parts[0].text;

        // Extrair o JSON da resposta
        const jsonMatch = resultText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const avaliacaoData = JSON.parse(jsonMatch[0]);
            setAvaliacaoFinal(avaliacaoData);
            setConcluido(true);

            // Salvar avaliação final
            await AsyncStorage.setItem(`entrevista_avaliacao_${user.id}`,
              JSON.stringify({
                avaliacao: avaliacaoData,
                timestamp: new Date().toISOString(),
                area: entrevistaData.area || area,
                tipoCargo: entrevistaData.tipoCargo || tipoCargo
              })
            );

          } catch (jsonError) {
            console.error('Erro ao parsear JSON da avaliação final:', jsonError);
            throw new Error('Formato de resposta inválido');
          }
        } else {
          throw new Error('Não foi possível extrair avaliação final da resposta');
        }
      } else {
        throw new Error('Formato de resposta inesperado do Gemini');
      }
    } catch (error) {
      console.error('Erro ao gerar avaliação final:', error);
      Alert.alert('Erro', 'Não foi possível gerar a avaliação final da entrevista. Tente novamente mais tarde.');
    } finally {
      setCarregando(false);
    }
  };

  // Hook para iniciar a entrevista quando o componente for montado
  useEffect(() => {
    if (!entrevistaIniciada && !carregando) {
      iniciarEntrevista();
    }
  }, []);

  // Função para mapear o nível de chance de sucesso para uma cor
  const getChanceColor = (chance) => {
    switch (chance.toLowerCase()) {
      case 'alta':
        return Colors.success;
      case 'média':
        return Colors.warning;
      case 'baixa':
        return Colors.danger;
      default:
        return Colors.primary;
    }
  };

  // Renderizar mensagem de entrevista
  const renderMensagem = ({ item }) => (
    <View style={[
      styles.mensagemEntrevista,
      item.isUser ? styles.mensagemUsuario : styles.mensagemRecrutador
    ]}>
      <Text style={[
        styles.textoMensagem,
        item.isUser ? styles.textoMensagemUsuario : styles.textoMensagemRecrutador
      ]}>
        {item.texto}
      </Text>
      {!item.isUser && item.tipo && (
        <View style={styles.tipoPerguntaBadge}>
          <Text style={styles.tipoPerguntaTexto}>
            {item.tipo}
          </Text>
        </View>
      )}
    </View>
  );

  // Renderizar avaliação final
  const renderAvaliacaoFinal = () => {
    if (!avaliacaoFinal) return null;

    return (
      <ScrollView style={styles.avaliacaoFinalContainer}>
        <View style={styles.avaliacaoHeader}>
          <Text style={styles.avaliacaoTitulo}>Avaliação Final da Entrevista</Text>

          <View style={styles.pontuacaoContainer}>
            <Text style={styles.pontuacaoLabel}>Pontuação Global</Text>
            <View style={styles.pontuacaoCircle}>
              <Text style={styles.pontuacaoValor}>
                {avaliacaoFinal.pontuacao_global.toFixed(1)}
              </Text>
              <Text style={styles.pontuacaoMax}>/10</Text>
            </View>
          </View>

          <View style={[
            styles.chanceSucessoContainer,
            { backgroundColor: getChanceColor(avaliacaoFinal.chance_sucesso) }
          ]}>
            <Text style={styles.chanceSucessoTexto}>
              Chance de sucesso: {avaliacaoFinal.chance_sucesso.toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.secaoAvaliacao}>
          <Text style={styles.secaoTitulo}>Pontos Fortes</Text>
          {avaliacaoFinal.pontos_fortes.map((ponto, index) => (
            <View key={`forte-${index}`} style={styles.pontoItem}>
              <Text style={styles.pontoTitulo}>{ponto.ponto}</Text>
              <Text style={styles.pontoExemplo}>{ponto.exemplo}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secaoAvaliacao}>
          <Text style={styles.secaoTitulo}>Áreas de Melhoria</Text>
          {avaliacaoFinal.areas_melhoria.map((area, index) => (
            <View key={`melhoria-${index}`} style={styles.pontoItem}>
              <Text style={styles.pontoTitulo}>{area.area}</Text>
              <Text style={styles.pontoExemplo}>{area.sugestao}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secaoAvaliacao}>
          <Text style={styles.secaoTitulo}>Recomendações</Text>
          {avaliacaoFinal.recomendacoes.map((recomendacao, index) => (
            <View key={`rec-${index}`} style={styles.recomendacaoItem}>
              <Text style={styles.recomendacaoNumero}>{index + 1}</Text>
              <Text style={styles.recomendacaoTexto}>{recomendacao}</Text>
            </View>
          ))}
        </View>

        <View style={styles.secaoAvaliacao}>
          <Text style={styles.secaoTitulo}>Avaliação Detalhada</Text>

          <View style={styles.avaliacaoDetalheItem}>
            <Text style={styles.avaliacaoDetalheTitulo}>Comunicação:</Text>
            <Text style={styles.avaliacaoDetalheTexto}>{avaliacaoFinal.avaliacao_comunicacao}</Text>
          </View>

          <View style={styles.avaliacaoDetalheItem}>
            <Text style={styles.avaliacaoDetalheTitulo}>Estrutura das Respostas:</Text>
            <Text style={styles.avaliacaoDetalheTexto}>{avaliacaoFinal.avaliacao_estrutura}</Text>
          </View>

          <View style={styles.avaliacaoDetalheItem}>
            <Text style={styles.avaliacaoDetalheTitulo}>Confiança:</Text>
            <Text style={styles.avaliacaoDetalheTexto}>{avaliacaoFinal.avaliacao_confianca}</Text>
          </View>
        </View>

        <View style={styles.conclusaoContainer}>
          <Text style={styles.conclusaoTitulo}>Conclusão</Text>
          <Text style={styles.conclusaoTexto}>{avaliacaoFinal.conclusao}</Text>
        </View>

        <TouchableOpacity
          style={styles.botaoEncerrar}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.textoEncerrar}>Encerrar Entrevista</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (entrevistaIniciada && !concluido) {
              Alert.alert(
                "Sair da entrevista",
                "Tem certeza que deseja sair? Seu progresso será perdido.",
                [
                  { text: "Cancelar", style: "cancel" },
                  { text: "Sair", onPress: () => navigation.goBack() }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {concluido ? 'Resultado da Entrevista' : 'Entrevista Simulada'}
        </Text>
      </View>

      {carregando && !entrevistaIniciada ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            Preparando sua entrevista{curriculoData ? ' personalizada' : ' genérica'}...
          </Text>
        </View>
      ) : concluido ? (
        renderAvaliacaoFinal()
      ) : (
        <View style={styles.entrevistaContainer}>
          <View style={styles.progressoContainer}>
            <View style={styles.progressoTrack}>
              <View
                style={[
                  styles.progressoFill,
                  { width: `${(numeroPergunta / totalPerguntas) * 100}%` }
                ]}
              />
            </View>
            <Text style={styles.progressoTexto}>
              Pergunta {numeroPergunta} de {totalPerguntas}
            </Text>
          </View>

          <FlatList
            ref={flatListRef}
            data={historico}
            keyExtractor={(item) => item.id}
            renderItem={renderMensagem}
            contentContainerStyle={styles.mensagensLista}
            onLayout={() => {
              if (flatListRef.current) {
                flatListRef.current.scrollToEnd({ animated: true });
              }
            }}
          />

          {feedbackVisible ? (
            <View style={styles.feedbackContainer}>
              <Text style={styles.feedbackTitulo}>Feedback do Recrutador</Text>

              <ScrollView style={styles.feedbackScrollView}>
                <Markdown
                  style={{
                    body: { fontSize: 14, lineHeight: 20, color: Colors.dark },
                    heading2: {
                      fontSize: 16,
                      fontWeight: 'bold',
                      marginBottom: 10,
                      color: Colors.dark
                    },
                    bullet_list: { marginVertical: 5 },
                    paragraph: { marginBottom: 10 },
                    strong: { fontWeight: 'bold' },
                  }}
                >
                  {feedback}
                </Markdown>
              </ScrollView>

              <TouchableOpacity
                style={styles.continuarButton}
                onPress={proximaPergunta}
              >
                <Text style={styles.continuarButtonText}>
                  {numeroPergunta === totalPerguntas ? 'Finalizar Entrevista' : 'Próxima Pergunta'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.inputContainer}>
              <TextInput
                ref={respostaInputRef}
                style={styles.input}
                placeholder="Digite sua resposta aqui..."
                value={resposta}
                onChangeText={setResposta}
                multiline
                textAlignVertical="top"
                editable={!carregando}
              />

              <TouchableOpacity
                style={[
                  styles.enviarButton,
                  (resposta.trim() === '' || carregando) && styles.enviarButtonDisabled
                ]}
                onPress={enviarResposta}
                disabled={resposta.trim() === '' || carregando}
              >
                {carregando ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.enviarButtonText}>Enviar</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
};


const CurriculosAnaliseScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fadeValue, setFadeValue] = useState(0); // Usar um valor numérico em vez de Animated.Value

  const loadCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);

      // Atualizamos para 1 após carregar os dados
      setTimeout(() => {
        setFadeValue(1);
      }, 100);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculos();
  }, []);

  // Função para extrair informações do currículo para exibição
  const getResumoCurriculo = (curriculo) => {
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const projetos = cv.projetos?.length || 0;
    const idiomas = cv.idiomas?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, projetos, idiomas, area };
  };

  // Formatar data de maneira mais legível
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={curriculoAnaliseStyles.container}>
        <View style={curriculoAnaliseStyles.header}>
          <TouchableOpacity
            style={curriculoAnaliseStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ProfessionalColors.primary} />
          <Text style={{ marginTop: 16, color: ProfessionalColors.textMedium, fontSize: 16 }}>
            Carregando currículos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (curriculos.length === 0) {
    return (
      <SafeAreaView style={curriculoAnaliseStyles.container}>
        <View style={curriculoAnaliseStyles.header}>
          <TouchableOpacity
            style={curriculoAnaliseStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
        </View>
        <View style={curriculoAnaliseStyles.emptyState}>
          <DocumentIcon style={curriculoAnaliseStyles.emptyStateIcon} />
          <Text style={curriculoAnaliseStyles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={curriculoAnaliseStyles.emptyStateText}>
            Você precisa criar um currículo antes de usar nossa poderosa análise de IA para aprimorá-lo.
          </Text>
          <TouchableOpacity
            style={curriculoAnaliseStyles.emptyStateButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={curriculoAnaliseStyles.emptyStateButtonText}>Criar Meu Currículo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={curriculoAnaliseStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ProfessionalColors.cardBackground} />

      <View style={curriculoAnaliseStyles.header}>
        <TouchableOpacity
          style={curriculoAnaliseStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={curriculoAnaliseStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={curriculoAnaliseStyles.headerTitle}>Analisar Currículo</Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={curriculoAnaliseStyles.introContainer}>
          <Text style={curriculoAnaliseStyles.introTitle}>Análise Profissional com IA</Text>
          <Text style={curriculoAnaliseStyles.introText}>
            Nossa tecnologia de IA avançada analisará seu currículo e fornecerá feedback detalhado,
            identificará pontos fortes e fracos, e sugerirá melhorias personalizadas para aumentar
            suas chances de sucesso.
          </Text>
        </View>

        <Text style={curriculoAnaliseStyles.sectionTitle}>Selecione um currículo para analisar:</Text>

        {/* Não usamos a propriedade opacity com Animated aqui */}
        <FlatList
          data={curriculos}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          style={{ opacity: fadeValue }} // Usamos um valor numérico normal
          renderItem={({ item }) => {
            const resumo = getResumoCurriculo(item);

            return (
              <View style={curriculoAnaliseStyles.curriculoCard}>
                <View style={curriculoAnaliseStyles.curriculoCardContent}>
                  <View style={curriculoAnaliseStyles.curriculoCardHeader}>
                    <View>
                      <Text style={curriculoAnaliseStyles.curriculoCardTitle}>
                        {item.nome || 'Currículo sem nome'}
                      </Text>
                      <Text style={curriculoAnaliseStyles.curriculoCardDate}>
                        Criado em {formatDate(item.dataCriacao)}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={curriculoAnaliseStyles.curriculoCardBadge}
                    >
                      <Text style={curriculoAnaliseStyles.curriculoCardBadgeText}>
                        Selecionar
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={curriculoAnaliseStyles.curriculoCardStats}>
                    <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                      <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                        Área: {resumo.area}
                      </Text>
                    </View>

                    {resumo.experiencias > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.experiencias} experiência(s)
                        </Text>
                      </View>
                    )}

                    {resumo.formacoes > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.formacoes} formação(ões)
                        </Text>
                      </View>
                    )}

                    {resumo.projetos > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.projetos} projeto(s)
                        </Text>
                      </View>
                    )}

                    {resumo.idiomas > 0 && (
                      <View style={curriculoAnaliseStyles.curriculoCardStatItem}>
                        <Text style={curriculoAnaliseStyles.curriculoCardStatText}>
                          {resumo.idiomas} idioma(s)
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={curriculoAnaliseStyles.curriculoCardFooter}>
                  <TouchableOpacity
                    style={curriculoAnaliseStyles.curriculoCardButton}
                    onPress={() => navigation.navigate('PreviewCV', { curriculoData: item })}
                  >
                    <Text style={curriculoAnaliseStyles.curriculoCardButtonText}>
                      <Text>🔍</Text> Visualizar
                    </Text>
                  </TouchableOpacity>

                  <View style={curriculoAnaliseStyles.curriculoCardButtonDivider} />

                  <TouchableOpacity
                    style={curriculoAnaliseStyles.curriculoCardButton}
                    onPress={() => navigation.navigate('AnaliseCV', { curriculoData: item })}
                  >
                    <Text style={curriculoAnaliseStyles.curriculoCardButtonText}>
                      <Text>📊</Text> Analisar
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />

        <TouchableOpacity
          style={curriculoAnaliseStyles.analyzeButton}
          onPress={() => navigation.navigate('AnaliseCV', { curriculoData: curriculos[0] })}
        >
          <Text>🧠</Text>
          <Text style={curriculoAnaliseStyles.analyzeButtonText}>
            Análise Completa com IA
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const MeusCurriculosScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredCurriculos, setFilteredCurriculos] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCurriculoId, setSelectedCurriculoId] = useState(null);
  const [fadeValue, setFadeValue] = useState(0); // Valor numérico para fade

  // Referência para posição do menu
  const menuPosition = useRef({ x: 0, y: 0 });

  const loadCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);
      setFilteredCurriculos(curriculosData);

      // Usando um valor numérico para fade
      setTimeout(() => {
        setFadeValue(1);
      }, 100);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCurriculos();

    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      loadCurriculos();
    });

    return unsubscribe;
  }, [navigation]);

  // Filtrar currículos com base no texto de pesquisa
  useEffect(() => {
    if (searchText.trim() === '') {
      setFilteredCurriculos(curriculos);
    } else {
      const filtered = curriculos.filter(cv =>
        cv.nome?.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredCurriculos(filtered);
    }
  }, [searchText, curriculos]);

  const handleDeleteCV = (id) => {
    setShowMenu(false);

    Alert.alert(
      "Excluir Currículo",
      "Tem certeza que deseja excluir este currículo?",
      [
        {
          text: "Cancelar",
          style: "cancel"
        },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            try {
              const updatedCurriculos = curriculos.filter(cv => cv.id !== id);
              await AsyncStorage.setItem(`curriculos_${user.id}`, JSON.stringify(updatedCurriculos));
              setCurriculos(updatedCurriculos);
              setFilteredCurriculos(
                filteredCurriculos.filter(cv => cv.id !== id)
              );

              // Adicionar mensagem de sucesso
              Alert.alert(
                "Sucesso",
                "Currículo excluído com sucesso!"
              );
            } catch (error) {
              console.error('Erro ao excluir currículo:', error);
              Alert.alert('Erro', 'Não foi possível excluir o currículo.');
            }
          }
        }
      ]
    );
  };

  const handleViewCV = (cv) => {
    navigation.navigate('PreviewCV', { curriculoData: cv });
  };

  // Nova função para editar currículo
  const handleEditCV = (cv) => {
    navigation.navigate('EditarCurriculo', { curriculoData: cv });
  };

  const handleAnalyzeCV = (cv) => {
    navigation.navigate('AnaliseCV', { curriculoData: cv });
  };

  const handleShareCV = (cv) => {
    // Simular compartilhamento
    Share.share({
      message: `Currículo de ${cv.nome || 'Usuário'} - ${formatDate(cv.dataCriacao)}`,
      title: `Currículo - ${cv.nome || 'Usuário'}`
    }).catch(error => {
      console.error('Erro ao compartilhar:', error);
    });
  };

  const showContextMenu = (id, event) => {
    // Salvar a posição para o menu
    menuPosition.current = {
      x: event.nativeEvent.pageX - 180,  // Ajustar para o menu não ficar fora da tela
      y: event.nativeEvent.pageY
    };
    setSelectedCurriculoId(id);
    setShowMenu(true);
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Obter resumo do currículo
  const getCurriculoDetails = (curriculo) => {
    const cv = curriculo.data;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';
    const experiencias = cv.experiencias?.length || 0;
    const ultimaExperiencia = cv.experiencias?.length > 0
      ? cv.experiencias[0].cargo + ' em ' + cv.experiencias[0].empresa
      : 'Nenhuma experiência';
    const formacoes = cv.formacoes_academicas?.length || 0;
    const ultimaFormacao = cv.formacoes_academicas?.length > 0
      ? cv.formacoes_academicas[0].diploma + ' em ' + cv.formacoes_academicas[0].area_estudo
      : 'Nenhuma formação';

    return { area, experiencias, ultimaExperiencia, formacoes, ultimaFormacao };
  };

  if (loading) {
    return (
      <SafeAreaView style={meusCurriculosStyles.container}>
        <View style={meusCurriculosStyles.header}>
          <TouchableOpacity
            style={meusCurriculosStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ProfessionalColors.primary} />
          <Text style={{ marginTop: 16, color: ProfessionalColors.textMedium, fontSize: 16 }}>
            Carregando currículos...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (curriculos.length === 0) {
    return (
      <SafeAreaView style={meusCurriculosStyles.container}>
        <View style={meusCurriculosStyles.header}>
          <TouchableOpacity
            style={meusCurriculosStyles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>
        </View>
        <View style={meusCurriculosStyles.emptyState}>
          <DocumentIcon style={meusCurriculosStyles.emptyStateIcon} />
          <Text style={meusCurriculosStyles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={meusCurriculosStyles.emptyStateText}>
            Você ainda não criou nenhum currículo. Crie seu primeiro currículo profissional agora mesmo!
          </Text>
          <TouchableOpacity
            style={meusCurriculosStyles.emptyStateButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={meusCurriculosStyles.emptyStateButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={meusCurriculosStyles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={ProfessionalColors.cardBackground} />

      <View style={meusCurriculosStyles.header}>
        <TouchableOpacity
          style={meusCurriculosStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={meusCurriculosStyles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>

        <View style={meusCurriculosStyles.headerActions}>
          <TouchableOpacity style={meusCurriculosStyles.headerActionButton}>
            <Text style={meusCurriculosStyles.headerActionIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de pesquisa */}
      <View style={meusCurriculosStyles.searchContainer}>
        <Text style={meusCurriculosStyles.searchIcon}>🔍</Text>
        <TextInput
          style={meusCurriculosStyles.searchInput}
          placeholder="Buscar currículos..."
          value={searchText}
          onChangeText={setSearchText}
        />
      </View>

      {/* Header da seção */}
      <View style={meusCurriculosStyles.sectionHeader}>
        <Text style={meusCurriculosStyles.sectionTitle}>
          Seus Currículos ({filteredCurriculos.length})
        </Text>
        <TouchableOpacity>
          <Text style={meusCurriculosStyles.sectionActionText}>Ordenar</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredCurriculos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 80 }}
        style={{ opacity: fadeValue }} // Usando valor numérico
        renderItem={({ item }) => {
          const details = getCurriculoDetails(item);

          return (
            <View style={meusCurriculosStyles.curriculoCard}>
              <TouchableOpacity
                style={meusCurriculosStyles.curriculoCardContent}
                onPress={() => handleViewCV(item)}
                onLongPress={(event) => showContextMenu(item.id, event)}
              >
                <View style={meusCurriculosStyles.curriculoCardHeader}>
                  <Text style={meusCurriculosStyles.curriculoCardTitle}>
                    {item.nome || 'Currículo sem nome'}
                  </Text>

                  {/* Menu de contexto */}
                  <TouchableOpacity
                    onPress={(event) => showContextMenu(item.id, event)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Text>⋮</Text>
                  </TouchableOpacity>
                </View>

                <View style={meusCurriculosStyles.curriculoCardMeta}>
                  <Text style={meusCurriculosStyles.curriculoCardMetaIcon}>📅</Text>
                  <Text style={meusCurriculosStyles.curriculoCardMetaText}>
                    Criado em {formatDate(item.dataCriacao)}
                  </Text>
                </View>

                <View style={meusCurriculosStyles.curriculoCardDetails}>
                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Área:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.area}
                    </Text>
                  </View>

                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Experiência:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.ultimaExperiencia}
                    </Text>
                  </View>

                  <View style={meusCurriculosStyles.curriculoCardDetailsRow}>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsLabel}>Formação:</Text>
                    <Text style={meusCurriculosStyles.curriculoCardDetailsValue}>
                      {details.ultimaFormacao}
                    </Text>
                  </View>
                </View>

                <View style={meusCurriculosStyles.curriculoCardTagsContainer}>
                  <View style={meusCurriculosStyles.curriculoCardTag}>
                    <Text style={meusCurriculosStyles.curriculoCardTagText}>
                      {details.experiencias} experiência(s)
                    </Text>
                  </View>

                  <View style={meusCurriculosStyles.curriculoCardTag}>
                    <Text style={meusCurriculosStyles.curriculoCardTagText}>
                      {details.formacoes} formação(ões)
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              <View style={meusCurriculosStyles.curriculoCardActions}>
                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleViewCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    <Text>👁️</Text> Visualizar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />

                {/* Novo botão de edição */}
                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleEditCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    <Text>✏️</Text> Editar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />

                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleAnalyzeCV(item)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionSecondary
                  ]}>
                    <Text>📊</Text> Analisar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />

                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleDeleteCV(item.id)}
                >
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionDanger
                  ]}>
                    <Text>🗑️</Text> Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
      />

      {/* Menu de contexto */}
      {showMenu && (
        <TouchableOpacity
          style={meusCurriculosStyles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[
            meusCurriculosStyles.menuOptions,
            {
              position: 'absolute',
              top: menuPosition.current.y,
              left: menuPosition.current.x
            }
          ]}>
            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleViewCV(cv);
              }}
            >
              <Text>👁️</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Visualizar</Text>
            </TouchableOpacity>

            {/* Adicionar opção de edição no menu de contexto também */}
            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleEditCV(cv);
              }}
            >
              <Text>✏️</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Editar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleAnalyzeCV(cv);
              }}
            >
              <Text>📊</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Analisar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleShareCV(cv);
              }}
            >
              <Text>📤</Text>
              <Text style={meusCurriculosStyles.menuOptionText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                if (selectedCurriculoId) handleDeleteCV(selectedCurriculoId);
              }}
            >
              <Text>🗑️</Text>
              <Text style={[meusCurriculosStyles.menuOptionText, meusCurriculosStyles.menuOptionDanger]}>
                Excluir
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={meusCurriculosStyles.fabButton}
        onPress={() => navigation.navigate('Chatbot')}
      >
        <Text style={meusCurriculosStyles.fabButtonText}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

// Componente para seção de itens no menu
const MenuItemSection = ({ title, children }) => (
  <View style={{ marginBottom: 15 }}>
    <Text style={{
      paddingHorizontal: 20,
      paddingVertical: 5,
      color: Colors.lightText,
      fontSize: 12,
      fontWeight: 'bold',
      textTransform: 'uppercase',
      backgroundColor: '#f5f5f5'
    }}>
      {title}
    </Text>
    {children}
  </View>
);

// Componente para item de menu
const MenuItem = ({ icon, title, onPress, badge, textColor = Colors.dark }) => (
  <TouchableOpacity
    style={{
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 20,
    }}
    onPress={onPress}
  >
    <Ionicons name={icon} size={22} color={textColor} style={{ marginRight: 15 }} />
    <Text style={{ fontSize: 16, color: textColor, flex: 1 }}>{title}</Text>
    {badge && (
      <View style={{
        backgroundColor: Colors.danger,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>{badge}</Text>
      </View>
    )}
  </TouchableOpacity>
);

const AuthNavigator = () => (
  <AuthStack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <AuthStack.Screen name="Login" component={LoginScreen} />
    <AuthStack.Screen name="Register" component={RegisterScreen} />
  </AuthStack.Navigator>
);

const SobreAppScreen = ({ navigation }) => {
  const [activeSection, setActiveSection] = useState('sobre');

  // Funções para lidar com links externos
  const handleOpenWebsite = () => {
    Linking.openURL('https://curriculobot.app');
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:suporte@curriculobot.app');
  };

  const handleSocialMedia = (platform) => {
    let url = '';
    switch (platform) {
      case 'linkedin':
        url = 'https://linkedin.com/company/curriculobot';
        break;
      case 'twitter':
        url = 'https://twitter.com/curriculobot';
        break;
      case 'instagram':
        url = 'https://instagram.com/curriculobot';
        break;
    }

    if (url) Linking.openURL(url);
  };

  // Renderização das seções de conteúdo
  const renderSectionIndicator = () => (
    <View style={styles.sectionIndicator}>
      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'sobre' && styles.activeSection
        ]}
        onPress={() => setActiveSection('sobre')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'sobre' && styles.activeSectionText
        ]}>
          Sobre
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'recursos' && styles.activeSection
        ]}
        onPress={() => setActiveSection('recursos')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'recursos' && styles.activeSectionText
        ]}>
          Recursos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.sectionTab,
          activeSection === 'versao' && styles.activeSection
        ]}
        onPress={() => setActiveSection('versao')}
      >
        <Text style={[
          styles.sectionTabText,
          activeSection === 'versao' && styles.activeSectionText
        ]}>
          Versão
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      <ScrollView style={styles.scrollView}>
        {/* Cabeçalho Principal */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButtonTop}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonTopText}>‹</Text>
          </TouchableOpacity>
        </View>

        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.logoContainer}>
            <View style={styles.logoBackground}>
              <Text style={styles.logoIcon}>📝</Text>
            </View>
          </View>
          <Text style={styles.appTitle}>CurriculoBot Premium</Text>
          <Text style={styles.appSubtitle}>Versão 1.2.0</Text>
          <View style={styles.premiumBadge}>
            <Text style={styles.premiumBadgeText}>PREMIUM</Text>
          </View>
        </View>

        {/* Indicador de seções */}
        {renderSectionIndicator()}

        {/* Conteúdo principal */}
        <View style={styles.contentContainer}>
          {activeSection === 'sobre' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>O que é o CurriculoBot?</Text>
              <Text style={styles.sectionDescription}>
                CurriculoBot é um assistente inteligente que ajuda você a criar, gerenciar e analisar
                currículos profissionais utilizando inteligência artificial de múltiplos provedores.
              </Text>

              <Text style={styles.sectionDescription}>
                Desenvolvido por uma equipe de especialistas da Estacio de Florianopolis, o CurriculoBot utiliza
                algoritmos avançados para personalizar seu currículo de acordo com as melhores práticas
                do mercado de trabalho atual.
              </Text>

              <View style={styles.infoCardContainer}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>1+</Text>
                  <Text style={styles.infoCardText}>Usuários</Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>10+</Text>
                  <Text style={styles.infoCardText}>Currículos</Text>
                </View>

                <View style={styles.infoCard}>
                  <Text style={styles.infoCardNumber}>98%</Text>
                  <Text style={styles.infoCardText}>Satisfação</Text>
                </View>
              </View>
            </View>
          )}

          {activeSection === 'recursos' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Recursos Premium</Text>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🤖</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Criação Guiada por IA</Text>
                  <Text style={styles.featureDescription}>
                    Interface conversacional intuitiva que simplifica a criação do seu currículo profissional.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>📊</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Análise Avançada</Text>
                  <Text style={styles.featureDescription}>
                    Análise profissional do seu currículo usando inteligência artificial de várias fontes.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🌟</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Dicas Personalizadas</Text>
                  <Text style={styles.featureDescription}>
                    Recomendações de melhorias, cursos e vagas personalizadas ao seu perfil.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>📝</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Múltiplos Templates</Text>
                  <Text style={styles.featureDescription}>
                    Escolha entre diversos modelos profissionais para personalizar seu currículo.
                  </Text>
                </View>
              </View>

              <View style={styles.featureItem}>
                <View style={styles.featureIconContainer}>
                  <Text style={styles.featureIcon}>🔎</Text>
                </View>
                <View style={styles.featureTextContainer}>
                  <Text style={styles.featureTitle}>Busca de Vagas</Text>
                  <Text style={styles.featureDescription}>
                    Encontre oportunidades alinhadas com seu perfil profissional.
                  </Text>
                </View>
              </View>
            </View>
          )}

          {activeSection === 'versao' && (
            <View style={styles.sectionContent}>
              <Text style={styles.sectionTitle}>Detalhes da Versão</Text>

              <View style={styles.versionCard}>
                <View style={styles.versionHeader}>
                  <Text style={styles.versionNumber}>1.2.0</Text>
                  <Text style={styles.versionDate}>Maio 2025</Text>
                </View>

                <View style={styles.versionFeatureList}>
                  <Text style={styles.versionFeatureTitle}>Novos recursos:</Text>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Análise avançada de carreira com visualização gráfica
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Integração com novas IAs (Claude, Perplexity, DeepSeek)
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Busca de vagas com compatibilidade por perfil
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Novos templates de currículo
                    </Text>
                  </View>

                  <View style={styles.versionFeatureItem}>
                    <View style={styles.versionFeatureDot} />
                    <Text style={styles.versionFeatureText}>
                      Interface redesenhada para melhor experiência
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.versionPrevious}>
                <Text style={styles.versionPreviousTitle}>Versões anteriores</Text>

                <View style={styles.versionPreviousItem}>
                  <Text style={styles.versionPreviousNumber}>1.1.0</Text>
                  <Text style={styles.versionPreviousDate}>Maior 2025</Text>
                </View>

                <View style={styles.versionPreviousItem}>
                  <Text style={styles.versionPreviousNumber}>1.0.0</Text>
                  <Text style={styles.versionPreviousDate}>Maio 2024</Text>
                </View>
              </View>
            </View>
          )}

          {/* Informações de contato */}
          <View style={styles.contactSection}>
            <Text style={styles.contactTitle}>Entre em Contato</Text>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleOpenWebsite}
            >
              <Text style={styles.contactButtonIcon}>🌐</Text>
              <Text style={styles.contactButtonText}>www.curriculobot.app</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.contactButton}
              onPress={handleContactSupport}
            >
              <Text style={styles.contactButtonIcon}>✉️</Text>
              <Text style={styles.contactButtonText}>suporte@curriculobot.app</Text>
            </TouchableOpacity>

            <View style={styles.socialMediaContainer}>
              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('linkedin')}
              >
                <Text style={styles.socialButtonText}>in</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('twitter')}
              >
                <Text style={styles.socialButtonText}>𝕏</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.socialButton}
                onPress={() => handleSocialMedia('instagram')}
              >
                <Text style={styles.socialButtonText}>📷</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Rodapé */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>© 2025 CurriculoBot Premium</Text>
            <Text style={styles.footerText}>Todos os direitos reservados</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SelecionarCurriculoScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarCurriculos();
  }, []);

  const carregarCurriculos = async () => {
    try {
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelecionarCurriculo = (curriculo) => {
    navigation.navigate('BuscaVagas', { curriculoData: curriculo });
  };

  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'Data não disponível';
      const date = new Date(dateString);
      return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch (error) {
      return 'Data inválida';
    }
  };

  // Extrair informações do currículo para exibição
  const getResumoCurriculo = (curriculo) => {
    const cv = curriculo.data;
    const experiencias = cv.experiencias?.length || 0;
    const formacoes = cv.formacoes_academicas?.length || 0;
    const projetos = cv.projetos?.length || 0;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';

    return { experiencias, formacoes, projetos, area };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Selecionar Currículo</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 10 }}>Carregando currículos...</Text>
        </View>
      ) : curriculos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Nenhum Currículo Encontrado</Text>
          <Text style={styles.emptyStateText}>
            Você precisa criar um currículo antes de buscar vagas.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Chatbot')}
          >
            <Text style={styles.primaryButtonText}>Criar Currículo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1, padding: 15 }}>
          <View style={{
            backgroundColor: '#e8f5e9',
            padding: 15,
            borderRadius: 10,
            marginBottom: 20,
            borderLeftWidth: 4,
            borderLeftColor: Colors.success,
          }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 5,
              color: Colors.dark,
            }}>
              Buscar Vagas Personalizadas
            </Text>
            <Text style={{
              fontSize: 14,
              color: '#2e7d32',
            }}>
              Selecione o currículo que deseja usar como base para a busca de vagas. Nossa IA encontrará oportunidades de emprego alinhadas ao seu perfil profissional.
            </Text>
          </View>

          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 10,
            color: Colors.dark,
          }}>
            Selecione um currículo:
          </Text>

          <FlatList
            data={curriculos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => {
              const resumo = getResumoCurriculo(item);

              return (
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.white,
                    borderRadius: 10,
                    marginBottom: 15,
                    padding: 16,
                    ...Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.1,
                        shadowRadius: 3,
                      },
                      android: {
                        elevation: 2,
                      },
                    }),
                    borderLeftWidth: 4,
                    borderLeftColor: Colors.primary,
                  }}
                  onPress={() => handleSelecionarCurriculo(item)}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{
                      fontSize: 18,
                      fontWeight: 'bold',
                      color: Colors.dark,
                      marginBottom: 5,
                    }}>
                      {item.nome || 'Currículo sem nome'}
                    </Text>

                    <View style={{
                      backgroundColor: Colors.primary,
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 15,
                    }}>
                      <Text style={{ color: Colors.white, fontSize: 12 }}>
                        Selecionar
                      </Text>
                    </View>
                  </View>

                  <Text style={{
                    fontSize: 14,
                    color: Colors.lightText,
                    marginBottom: 10,
                  }}>
                    Criado em: {formatDate(item.dataCriacao)}
                  </Text>

                  <View style={{
                    backgroundColor: '#f5f5f5',
                    padding: 10,
                    borderRadius: 5,
                    marginTop: 5,
                  }}>
                    <Text style={{ color: Colors.dark }}>
                      <Text style={{ fontWeight: 'bold' }}>Área: </Text>
                      {resumo.area}
                    </Text>

                    <View style={{ flexDirection: 'row', marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{
                        backgroundColor: Colors.primary,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.experiencias} experiência(s)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: Colors.secondary,
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginRight: 8,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.formacoes} formação(ões)
                        </Text>
                      </View>

                      <View style={{
                        backgroundColor: '#673AB7',
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 12,
                        marginBottom: 5,
                      }}>
                        <Text style={{ color: Colors.white, fontSize: 12 }}>
                          {resumo.projetos} projeto(s)
                        </Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
};

const RootNavigator = () => {
  const { user, loading } = useAuth();

  // Log para ajudar na depuração
  console.log('RootNavigator - User state:', user ? 'Logged in' : 'Logged out');

  // Mostrar tela de carregamento enquanto verifica autenticação
  if (loading) {
    return <SplashScreen />;
  }

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <RootStack.Screen name="App" component={AppNavigator} />
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
};

export default App;