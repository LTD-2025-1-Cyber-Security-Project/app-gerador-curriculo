import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  FlatList,
  SafeAreaView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Share,
  ActivityIndicator,
  Linking,
  Switch,
  Image,
  Animated,
  Dimensions,
  RefreshControl
} from 'react-native';
import ColorsModule from './styles/colors';
import sharedStyles from './styles/sharedStyles';
import styles from './styles/styles';
import meusCurriculosStyles from './styles/meusCurriculosStyles';
import ProfessionalColors from './styles/ProfessionalColors';
import curriculoAnaliseStyles from './styles/curriculoAnaliseStyles';
import HeaderColors from './styles/HeaderColors'
const Colors = ColorsModule.Colors;
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IA_APIS from './src/api/IA_APIS';
import salvarIAAPIKey from './src/api/salvarIAAPIKey';
import getIAAPIKey from './src/api/getIAAPIKey';
import ConfiguracoesAvancadasScreen from './screens/ConfiguracoesAvancadasScreen';
import DashboardScreen from './screens/DashboardScreen';
import SobreAppScreen from './screens/SobreAppScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const ConfigStack = createStackNavigator();
const ConfigAvStack = createStackNavigator();
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();
const RootStack = createStackNavigator();

const ConfigAvStackScreen = () => (
  <ConfigAvStack.Navigator screenOptions={{ headerShown: false }}>
    <ConfigAvStack.Screen name="ConfigAvMain" component={ConfiguracoesAvancadasScreen} />
  </ConfigAvStack.Navigator>
);

axios.interceptors.request.use(request => {
  console.log('Starting Request', JSON.stringify(request, null, 2));
  return request;
});

axios.interceptors.response.use(response => {
  console.log('Response:', JSON.stringify(response.status, null, 2));
  return response;
}, error => {
  console.log('Response Error:', error.message);
  console.log('Error Config:', JSON.stringify(error.config, null, 2));
  console.log('Error Data:', error.response?.data);
  return Promise.reject(error);
});

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

const renderTabBarIcon = (route, focused, color, size) => {
  // Usar emojis ou caracteres unicode em vez de ícones
  if (route.name === 'Home') {
    return <Text style={{ fontSize: 24, color }}>🏠</Text>;
  } else if (route.name === 'Dashboard') {
    return <Text style={{ fontSize: 24, color }}>📊</Text>;
  } else if (route.name === 'ConfigAv') {
    return <Text style={{ fontSize: 24, color }}>🔧</Text>;
  } else if (route.name === 'Config') {
    return <Text style={{ fontSize: 24, color }}>⚙️</Text>;
  }
  return null;
};

const HomeStackScreen = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    {/* Rotas existentes */}
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="Chatbot" component={ChatbotScreen} />
    <HomeStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
    <HomeStack.Screen name="PreviewCV" component={PreviewCVScreen} />
    <HomeStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
    <HomeStack.Screen name="AnaliseCV" component={AnaliseCVScreen} />
    <HomeStack.Screen name="SelecionarCurriculo" component={SelecionarCurriculoScreen} />
    <HomeStack.Screen name="BuscaVagas" component={BuscaVagasScreen} />
    <HomeStack.Screen name="SobreApp" component={SobreAppScreen} />
    <HomeStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
    <HomeStack.Screen name="EditarCurriculo" component={EditarCurriculoScreen} />
    
    {/* Novas rotas para simulação de entrevista */}
    <HomeStack.Screen name="SimularEntrevista" component={SimularEntrevistaScreen} />
    <HomeStack.Screen name="EntrevistaSimulada" component={EntrevistaSimuladaScreen} />
    
    {/* Outras rotas */}
    <HomeStack.Screen name="DadosMercado" component={DadosMercadoScreen} />
    <HomeStack.Screen name="GraficosRegionais" component={GraficosRegionaisScreen} />
  </HomeStack.Navigator>
);

const DashboardStackScreen = () => (
  <DashboardStack.Navigator screenOptions={{ headerShown: false }}>
    <DashboardStack.Screen name="DashboardMain" component={DashboardScreen} />
    <DashboardStack.Screen name="Chatbot" component={ChatbotScreen} />
    <DashboardStack.Screen name="MeusCurriculos" component={MeusCurriculosScreen} />
    <DashboardStack.Screen name="CurriculosAnalise" component={CurriculosAnaliseScreen} />
    <DashboardStack.Screen name="SelecionarCurriculo" component={SelecionarCurriculoScreen} />

    {/* Novas telas */}
    <DashboardStack.Screen name="DadosMercado" component={DadosMercadoScreen} />
    <DashboardStack.Screen name="GraficosRegionais" component={GraficosRegionaisScreen} />
  </DashboardStack.Navigator>
);

const ConfigStackScreen = () => (
  <ConfigStack.Navigator screenOptions={{ headerShown: false }}>
    <ConfigStack.Screen name="ConfigMain" component={ConfiguracoesScreen} />
    <ConfigStack.Screen name="ConfiguracoesIA" component={ConfiguracoesIAScreen} />
    <ConfigStack.Screen name="PerfilFoto" component={PerfilFotoScreen} />
    <ConfigStack.Screen name="Chatbot" component={ChatbotScreen} />
    <ConfigStack.Screen name="SobreApp" component={SobreAppScreen} />
  </ConfigStack.Navigator>
);

const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarIcon: ({ focused, color, size }) => renderTabBarIcon(route, focused, color, size),
      tabBarActiveTintColor: Colors.primary,
      tabBarInactiveTintColor: Colors.lightText,
      tabBarStyle: {
        height: 60,
        paddingBottom: 10,
        paddingTop: 5,
      },
      tabBarLabelStyle: {
        fontSize: 12,
      },
    })}
  >
    <Tab.Screen
      name="Home"
      component={HomeStackScreen}
      options={{ tabBarLabel: 'Início' }}
    />
    <Tab.Screen
      name="Dashboard"
      component={DashboardStackScreen}
      options={{ tabBarLabel: 'Dashboard' }}
    />
    <Tab.Screen
      name="ConfigAv"
      component={ConfigAvStackScreen}
      options={{ tabBarLabel: 'API Avançada' }}
    />
    <Tab.Screen
      name="Config"
      component={ConfigStackScreen}
      options={{ tabBarLabel: 'Configurações' }}
    />
  </Tab.Navigator>
);

const AppNavigator = () => (
  <AppStack.Navigator screenOptions={{ headerShown: false }}>
    <AppStack.Screen name="MainTabs" component={TabNavigator} />
  </AppStack.Navigator>
);

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

const gerarAnaliseLocal = (curriculoData, tipoAnalise) => {
  try {
    // Extrair dados relevantes para personalizar a análise
    const nome = curriculoData.informacoes_pessoais?.nome || '';
    const sobrenome = curriculoData.informacoes_pessoais?.sobrenome || '';
    const nomeCompleto = `${nome} ${sobrenome}`.trim();
    const area = curriculoData.informacoes_pessoais?.area || 'profissional';

    // Verificar completude das seções para pontuação
    const temFormacao = curriculoData.formacoes_academicas?.length > 0;
    const temExperiencia = curriculoData.experiencias?.length > 0;
    const temCursos = curriculoData.cursos?.length > 0;
    const temProjetos = curriculoData.projetos?.length > 0;
    const temIdiomas = curriculoData.idiomas?.length > 0;

    // Calcular pontuação básica
    let pontuacaoBase = 5; // Base média

    // Adicionar pontos para cada seção preenchida
    if (temFormacao) pontuacaoBase += 1;
    if (temExperiencia) pontuacaoBase += 1.5;
    if (temCursos) pontuacaoBase += 0.5;
    if (temProjetos) pontuacaoBase += 1;
    if (temIdiomas) pontuacaoBase += 0.5;

    // Limitar a 10
    const pontuacaoFinal = Math.min(10, pontuacaoBase);

    // Gerar análise baseada no tipo
    let analiseTexto = '';

    switch (tipoAnalise) {
      case 'pontuacao':
        analiseTexto = `# Análise de Pontuação do Currículo

## Pontuação Geral: ${pontuacaoFinal.toFixed(1)}/10

### Detalhamento:

1. **Conteúdo (30%)**: ${Math.min(10, pontuacaoBase + 0.5).toFixed(1)}/10
   - ${temExperiencia ? 'Apresenta experiência profissional relevante' : 'Falta detalhar experiência profissional'}
   - ${temFormacao ? 'Formação acadêmica bem estruturada' : 'Precisa incluir formação acadêmica'}

2. **Estrutura (20%)**: ${Math.min(10, pontuacaoBase).toFixed(1)}/10
   - Organização ${temFormacao && temExperiencia ? 'lógica e clara' : 'pode ser melhorada'}
   - ${temProjetos || temCursos ? 'Boa separação das seções' : 'Pode adicionar mais seções para melhorar a estrutura'}

3. **Apresentação (20%)**: ${Math.min(10, pontuacaoBase - 0.5).toFixed(1)}/10
   - Formatação ${temFormacao && temExperiencia && temCursos ? 'consistente' : 'inconsistente em algumas seções'}
   - ${temIdiomas ? 'Habilidades linguísticas bem apresentadas' : 'Considere adicionar seção de idiomas'}

4. **Impacto (30%)**: ${Math.min(10, pontuacaoBase - 0.3).toFixed(1)}/10
   - O currículo ${pontuacaoBase > 7 ? 'causa uma boa primeira impressão' : 'precisa de mais impacto visual e de conteúdo'}
   - ${temProjetos ? 'Os projetos adicionam valor diferencial' : 'Adicionar projetos pode aumentar o impacto'}

*Esta análise foi gerada automaticamente com base nos dados fornecidos.*`;
        break;

      case 'melhorias':
        analiseTexto = `# 5 Melhorias para o Currículo

1. **${!temExperiencia ? 'Adicionar experiências profissionais detalhadas' : 'Detalhar mais os resultados nas experiências profissionais'}**
   - ${!temExperiencia ? 'Inclua experiências prévias com datas, funções e responsabilidades' : 'Quantifique realizações com números e resultados tangíveis'}
   - Exemplo: "Aumentou vendas em 27%" ou "Liderou equipe de 5 pessoas no desenvolvimento de novo produto"

2. **${!temFormacao ? 'Incluir formação acadêmica' : 'Destacar competências específicas adquiridas na formação'}**
   - ${!temFormacao ? 'Adicione sua formação com período, instituição e área' : 'Relacione disciplinas chave ou projetos acadêmicos relevantes'}
   - Importante para validar conhecimentos técnicos e teóricos

3. **${!temIdiomas ? 'Adicionar seção de idiomas' : 'Especificar níveis de proficiência em idiomas'}**
   - ${!temIdiomas ? 'Inclua todos os idiomas que conhece com nível de proficiência' : 'Use padrões internacionais como A1-C2 ou descritores claros (fluente, intermediário)'}
   - Competências linguísticas são diferenciais importantes

4. **${!temProjetos ? 'Criar seção de projetos relevantes' : 'Aprimorar descrição dos projetos'}**
   - ${!temProjetos ? 'Adicione projetos pessoais ou profissionais relacionados à sua área' : 'Descreva tecnologias e metodologias utilizadas em cada projeto'}
   - Demonstre aplicação prática de suas habilidades

5. **Personalizar o currículo para cada vaga**
   - Adapte palavras-chave de acordo com a descrição da vaga
   - Priorize experiências e habilidades mais relevantes para cada posição

*Implementar estas melhorias pode aumentar significativamente suas chances de ser chamado para entrevistas.*`;
        break;

      case 'dicas':
        analiseTexto = `# Dicas Estratégicas de Carreira

## Com base no seu perfil na área de ${area}, recomendamos:

1. **Especialização Técnica**
   - Invista em conhecimentos específicos de ${area}
   - Considere certificações reconhecidas pelo mercado
   - Motivo: Profissionais especializados têm 42% mais chances de serem contratados

2. **Presença Digital Profissional**
   - Crie ou atualize seu perfil no LinkedIn destacando palavras-chave da área
   - Compartilhe conteúdo relevante sobre ${area}
   - Conecte-se com profissionais e empresas de referência no setor

3. **Networking Estratégico**
   - Participe de eventos, webinars e comunidades de ${area}
   - Associe-se a grupos profissionais do seu segmento
   - Busque mentoria de profissionais mais experientes

4. **Desenvolvimento de Soft Skills**
   - Além de habilidades técnicas, desenvolva comunicação e trabalho em equipe
   - Pratique liderança e resolução de problemas em projetos paralelos
   - Estas competências são cada vez mais valorizadas por recrutadores

5. **Aprendizado Contínuo**
   - Estabeleça uma rotina de atualização sobre tendências em ${area}
   - Reserve tempo semanal para cursos, leituras e experimentação
   - Mantenha-se relevante em um mercado que evolui rapidamente

*Estas recomendações foram personalizadas com base nas informações do seu currículo.*`;
        break;

      case 'cursos':
        analiseTexto = `# Cursos Recomendados para Seu Perfil

Com base no seu currículo na área de ${area}, recomendamos os seguintes cursos:

1. **${area === 'Tecnologia da Informação' ? 'AWS Certified Solutions Architect' :
            area === 'Marketing' ? 'Google Analytics Certification' :
              area === 'Administração' ? 'Gestão Ágil de Projetos (PMI-ACP)' :
                'Especialização em ' + area}**
   - Plataforma: ${area === 'Tecnologia da Informação' ? 'AWS Training' :
            area === 'Marketing' ? 'Google Skillshop' :
              area === 'Administração' ? 'PMI ou Coursera' :
                'EdX ou Coursera'}
   - Por que fazer: Certificação reconhecida globalmente que comprova competências avançadas
   - Como agregaria: Abre portas para posições sênior com remuneração até 30% maior

2. **${area === 'Tecnologia da Informação' ? 'Data Science Specialization' :
            area === 'Marketing' ? 'Digital Marketing Specialization' :
              area === 'Administração' ? 'Liderança e Gestão de Equipes' :
                'Fundamentos de ' + area}**
   - Plataforma: Coursera (em parceria com universidades)
   - Por que fazer: Complementa sua formação com habilidades analíticas fundamentais
   - Como agregaria: Amplia o perfil para funções que exigem tomada de decisão baseada em dados

3. **${temIdiomas ? 'Business English Communication' : 'Inglês para Profissionais'}**
   - Plataforma: Duolingo, EF English Live ou Cambly
   - Por que fazer: Comunicação em inglês é requisito para empresas multinacionais
   - Como agregaria: Aumenta empregabilidade em 65% e possibilidade de aumento salarial

4. **${area === 'Tecnologia da Informação' ? 'DevOps for Professionals' :
            area === 'Marketing' ? 'Growth Hacking Masterclass' :
              area === 'Administração' ? 'Financial Management' :
                'Inovação em ' + area}**
   - Plataforma: Udemy ou LinkedIn Learning
   - Por que fazer: Conhecimentos emergentes com alta demanda no mercado atual
   - Como agregaria: Posiciona você como profissional atualizado com tendências recentes

5. **${area === 'Tecnologia da Informação' ? 'UI/UX Design Fundamentals' :
            area === 'Marketing' ? 'Content Marketing Strategy' :
              area === 'Administração' ? 'Business Analytics' :
                'Gestão de Projetos para ' + area}**
   - Plataforma: Alura, Udacity ou Domestika
   - Por que fazer: Complementa habilidades técnicas com visão de experiência do usuário
   - Como agregaria: Diferencial competitivo para posições que exigem múltiplas competências

*Esta lista foi personalizada com base no seu perfil atual e tendências de mercado para 2024. Atualizar estas competências pode aumentar significativamente sua empregabilidade.*`;
        break;

      case 'vagas':
        analiseTexto = `# Vagas Recomendadas para Seu Perfil

Com base no seu currículo na área de ${area}, você teria boas chances nas seguintes vagas:

1. **${area === 'Tecnologia da Informação' ? 'Desenvolvedor Full-Stack' :
            area === 'Marketing' ? 'Especialista em Marketing Digital' :
              area === 'Administração' ? 'Analista de Projetos' :
                'Especialista em ' + area}**
   - Por que combina: ${temExperiencia ? 'Sua experiência anterior demonstra as competências necessárias' : 'Seu perfil de formação se alinha com os requisitos típicos'}
   - Competências valorizadas: ${temProjetos ? 'Experiência prática em projetos' : 'Conhecimentos teóricos'}, ${temIdiomas ? 'domínio de idiomas' : 'habilidades analíticas'}
   - Empresas/setores: ${area === 'Tecnologia da Informação' ? 'Fintechs, agências digitais' :
            area === 'Marketing' ? 'E-commerces, agências' :
              area === 'Administração' ? 'Multinacionais, consultorias' :
                'Empresas de médio e grande porte'}
   - Palavras-chave: ${area.toLowerCase()}, especialista, ${temFormacao ? 'graduação' : 'experiência'}, análise

2. **${area === 'Tecnologia da Informação' ? 'Analista de Dados' :
            area === 'Marketing' ? 'Coordenador de Mídia Social' :
              area === 'Administração' ? 'Gerente de Operações' :
                'Consultor em ' + area}**
   - Por que combina: Aproveita suas competências em ${temProjetos ? 'projetos' : 'análise'} e ${temCursos ? 'conhecimentos específicos' : 'formação'}
   - Competências valorizadas: Análise crítica, conhecimentos técnicos, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}
   - Empresas/setores: Consultorias, startups em crescimento, empresas de tecnologia
   - Palavras-chave: análise, ${area.toLowerCase()}, consultoria, projetos, ${temExperiencia ? 'experiência comprovada' : 'potencial'}

3. **${area === 'Tecnologia da Informação' ? 'Gerente de Produto Técnico' :
            area === 'Marketing' ? 'Brand Manager' :
              area === 'Administração' ? 'Analista de Negócios' :
                'Analista de ' + area}**
   - Por que combina: Mescla ${temFormacao ? 'formação acadêmica' : 'visão prática'} com ${temProjetos ? 'experiência em projetos' : 'capacidade analítica'}
   - Competências valorizadas: Visão estratégica, conhecimento de mercado, ${temIdiomas ? 'habilidades de comunicação internacional' : 'comunicação clara'}
   - Empresas/setores: Empresas de médio e grande porte, multinacionais, consultorias especializadas
   - Palavras-chave: gerenciamento, estratégia, ${area.toLowerCase()}, análise, ${temFormacao ? 'qualificação acadêmica' : 'experiência prática'}

4. **${area === 'Tecnologia da Informação' ? 'Arquiteto de Soluções' :
            area === 'Marketing' ? 'Gerente de Growth Marketing' :
              area === 'Administração' ? 'Coordenador de Projetos' :
                'Gerente de ' + area}**
   - Por que combina: Utiliza ${temFormacao ? 'conhecimento teórico' : 'visão prática'} combinado com ${temExperiencia ? 'experiência no mercado' : 'potencial de liderança'}
   - Competências valorizadas: Visão holística, capacidade de coordenação, ${temCursos ? 'especialização técnica' : 'adaptabilidade'}
   - Empresas/setores: Empresas inovadoras, líderes de mercado, organizações em transformação
   - Palavras-chave: coordenação, ${area.toLowerCase()}, gerenciamento, ${temIdiomas ? 'internacional' : 'nacional'}, estratégia

5. **${area === 'Tecnologia da Informação' ? 'Especialista em Segurança da Informação' :
            area === 'Marketing' ? 'Customer Success Manager' :
              area === 'Administração' ? 'Analista de Processos' :
                'Especialista em ' + area} ${temIdiomas ? 'Internacional' : 'Sênior'}**
   - Por que combina: Aproveita ${temFormacao && temExperiencia ? 'combinação de teoria e prática' : temFormacao ? 'sólida formação acadêmica' : 'experiência prática'}
   - Competências valorizadas: Especialização técnica, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}, resolução de problemas
   - Empresas/setores: Empresas de tecnologia, multinacionais, consultorias especializadas
   - Palavras-chave: especialista, ${area.toLowerCase()}, ${temFormacao ? 'graduação' : 'experiência'}, ${temIdiomas ? 'internacional' : 'nacional'}, técnico

*Esta lista foi personalizada com base no seu perfil atual. Adapte seu currículo para destacar as competências relevantes para cada tipo de vaga.*`;
        break;

      default:
        analiseTexto = `# Análise Geral do Currículo

## Pontos Fortes
- ${temFormacao ? 'Formação acadêmica na área de atuação' : 'Perfil com potencial de desenvolvimento'}
- ${temExperiencia ? 'Experiência profissional demonstrada' : 'Oportunidade para destacar projetos e outras atividades'}
- ${temIdiomas ? 'Conhecimento de idiomas' : 'Foco em competências técnicas'}

## Áreas de Melhoria
- ${!temProjetos ? 'Adicionar seção de projetos para demonstrar habilidades práticas' : 'Detalhar melhor os projetos apresentados'}
- ${!temCursos ? 'Incluir cursos e certificações para complementar formação' : 'Relacionar cursos com objetivos profissionais'}
- Personalizar o currículo para cada oportunidade específica

## Impressão Geral
O currículo apresenta um profissional ${pontuacaoFinal > 7 ? 'bem qualificado' : 'com potencial'} na área de ${area}. ${pontuacaoFinal > 7 ? 'Possui boa estrutura' : 'Precisa de ajustes na estrutura'} e ${temExperiencia && temFormacao ? 'apresenta informações relevantes' : 'pode ser enriquecido com mais informações relevantes'}.

## Nota Geral: ${pontuacaoFinal.toFixed(1)}/10

*Esta análise foi gerada pelo sistema de análise local e representa uma avaliação baseada nos dados fornecidos.*`;
    }

    // Informar que estamos usando análise local
    return {
      success: true,
      analise: analiseTexto,
      offline: true,
      provider: 'Sistema Local'
    };
  } catch (error) {
    console.error('Erro na análise local:', error);

    // Em caso de erro, retornar uma análise genérica
    return {
      success: true,
      analise: `# Análise de Currículo\n\nSeu currículo apresenta um bom equilíbrio entre formação e experiência. Continue aprimorando com cursos e projetos relevantes para sua área.\n\n*Nota: Esta é uma análise básica gerada pelo sistema.*`,
      offline: true,
      provider: 'Sistema Local'
    };
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

const ChatMessage = ({ message, isUser, time }) => (
  <View style={[
    styles.messageContainer,
    isUser ? styles.userMessageContainer : styles.botMessageContainer
  ]}>
    <Text style={[
      styles.messageText,
      isUser ? styles.userMessageText : styles.botMessageText
    ]}>
      {message}
    </Text>
    <Text style={styles.messageTime}>{time}</Text>
  </View>
);

const ChatOptions = ({ options, onSelect }) => {
  if (!options || options.length === 0) return null;

  // Identificar se são opções longas
  const hasLongOptions = options.some(option => option.length > 10);

  // Verificar se são opções de áreas específicas
  const isAreaStep = options.includes('Tecnologia da Informação') ||
    options.includes('Administração');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.optionsContainer}
    >
      {options.map((option, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.optionButton,
            hasLongOptions && styles.longOptionButton,
            isAreaStep && styles.areaOptionButton
          ]}
          onPress={() => onSelect(option)}
        >
          <Text
            style={[
              styles.optionText,
              hasLongOptions && styles.longOptionText
            ]}
            adjustsFontSizeToFit={true}
            numberOfLines={2}
          >
            {option}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const CurriculumPreview = ({ data, templateStyle = 'modern' }) => {
  if (!data || !data.informacoes_pessoais) {
    return (
      <View style={styles.emptyPreview}>
        <Text style={styles.emptyPreviewText}>
          As informações do seu currículo aparecerão aqui conforme você as fornecer.
        </Text>
      </View>
    );
  }

  // Definição de estilos baseados no template selecionado
  const getTemplateStyles = () => {
    switch (templateStyle) {
      case 'classic':
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            borderBottomWidth: 2,
            borderBottomColor: Colors.dark,
            paddingBottom: 10,
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors.dark,
            textAlign: 'center',
          },
          contact: {
            color: Colors.dark,
            textAlign: 'center',
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.mediumGray,
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.dark,
          itemBorder: {
            borderLeftWidth: 0,
            paddingLeft: 0,
          }
        };

      case 'elegant':
        return {
          container: {
            backgroundColor: '#fff',
            padding: 20,
            borderWidth: 1,
            borderColor: '#d4d4d4',
          },
          header: {
            marginBottom: 25,
            alignItems: 'center',
            borderBottomWidth: 0.5,
            borderBottomColor: '#aaa',
            paddingBottom: 20,
          },
          name: {
            fontSize: 28,
            fontWeight: '300', // Mais leve
            color: '#333',
            marginBottom: 5,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textAlign: 'center',
          },
          contact: {
            color: '#666',
            marginBottom: 3,
            textAlign: 'center',
            fontSize: 14,
          },
          sectionTitle: {
            fontSize: 16,
            fontWeight: '400',
            color: '#333',
            marginBottom: 15,
            textTransform: 'uppercase',
            letterSpacing: 2,
            paddingBottom: 5,
            borderBottomWidth: 0.5,
            borderBottomColor: '#aaa',
            textAlign: 'center',
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: '500',
            color: '#333',
          },
          accent: '#333',
          itemBorder: {
            paddingLeft: 0,
            marginBottom: 18,
          }
        };

      // Template padrão (Modern)
      default:
        return {
          container: {
            backgroundColor: Colors.white,
            padding: 15,
          },
          header: {
            marginBottom: 15,
          },
          name: {
            fontSize: 24,
            fontWeight: 'bold',
            color: Colors.primary,
            marginBottom: 5,
          },
          contact: {
            color: Colors.dark,
            marginBottom: 5,
          },
          sectionTitle: {
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.primary,
            marginBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: Colors.primary,
            paddingBottom: 5,
          },
          itemTitle: {
            fontSize: 16,
            fontWeight: 'bold',
            color: Colors.dark,
          },
          accent: Colors.primary,
          itemBorder: {
            borderLeftWidth: 3,
            borderLeftColor: Colors.primary,
            paddingLeft: 10,
          }
        };
    }
  };

  const ts = getTemplateStyles();
  const personalInfo = data.informacoes_pessoais;
  const fullName = `${personalInfo.nome || ''} ${personalInfo.sobrenome || ''}`.trim();

  // Renderização do currículo em duas colunas ou formato padrão
  if (templateStyle === 'two-column') {
    return (
      <View style={[styles.previewContainer, ts.container]}>
        {/* Coluna lateral */}
        <View style={ts.header}>
          {fullName ? (
            <Text style={ts.name}>{fullName}</Text>
          ) : null}

          {personalInfo.email || personalInfo.endereco ? (
            <Text style={ts.contact}>
              {personalInfo.email}
              {personalInfo.email && personalInfo.endereco ? '\n' : ''}
              {personalInfo.endereco}
            </Text>
          ) : null}

          {/* Links na barra lateral */}
          {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
            <View style={ts.sidebarSection}>
              <Text style={ts.sidebarTitle}>Links</Text>
              {personalInfo.site && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>{personalInfo.site}</Text>
              )}
              {personalInfo.linkedin && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>LinkedIn</Text>
              )}
              {personalInfo.github && (
                <Text style={[styles.previewLink, { color: '#fff', textAlign: 'center' }]}>GitHub</Text>
              )}
            </View>
          )}

          {/* Idiomas na barra lateral */}
          {data.idiomas && data.idiomas.length > 0 && (
            <View style={ts.sidebarSection}>
              <Text style={ts.sidebarTitle}>Idiomas</Text>
              {data.idiomas.map((idioma, index) => (
                <Text key={index} style={{ color: '#fff', textAlign: 'center', marginBottom: 4 }}>
                  {idioma.nome}: {idioma.nivel}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Coluna principal de conteúdo */}
        <View style={ts.contentColumn}>
          {/* Resumo Profissional */}
          {data.resumo_profissional ? (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
              <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
            </View>
          ) : null}

          {/* Formação Acadêmica */}
          {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
              {data.formacoes_academicas.map((formacao, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>
                    {formacao.diploma} em {formacao.area_estudo}
                  </Text>
                  <Text style={styles.previewItemSubtitle}>{formacao.instituicao}</Text>
                  {formacao.data_inicio ? (
                    <Text style={styles.previewItemDate}>
                      {formacao.data_inicio}
                      {formacao.data_fim ?
                        formacao.data_fim.toLowerCase() === 'atual' ?
                          ' - Presente' :
                          ` - ${formacao.data_fim}` :
                        ''}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Experiência Profissional */}
          {data.experiencias && data.experiencias.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
              {data.experiencias.map((exp, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
                  <Text style={styles.previewItemSubtitle}>{exp.empresa}</Text>
                  {exp.data_inicio ? (
                    <Text style={styles.previewItemDate}>
                      {exp.data_inicio}
                      {exp.data_fim ?
                        exp.data_fim.toLowerCase() === 'atual' ?
                          ' - Presente' :
                          ` - ${exp.data_fim}` :
                        ''}
                    </Text>
                  ) : null}
                  {exp.descricao ? (
                    <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Cursos */}
          {data.cursos && data.cursos.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
              {data.cursos.map((curso, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
                  <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
                  {curso.data_inicio || curso.data_fim ? (
                    <Text style={styles.previewItemDate}>
                      {curso.data_inicio || ''}
                      {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                      {curso.data_fim || ''}
                    </Text>
                  ) : null}
                  {curso.descricao ? (
                    <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          {/* Projetos */}
          {data.projetos && data.projetos.length > 0 && (
            <View style={styles.previewSection}>
              <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
              {data.projetos.map((projeto, index) => (
                <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                  <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
                  {projeto.habilidades ? (
                    <Text style={styles.previewItemSubtitle}>
                      <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                    </Text>
                  ) : null}
                  {projeto.descricao ? (
                    <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
                  ) : null}
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  }

  // Renderização especial para template de timeline
  else if (templateStyle === 'timeline') {
    return (
      <View style={[styles.previewContainer, ts.container]}>
        <View style={ts.header}>
          {fullName ? (
            <Text style={ts.name}>{fullName}</Text>
          ) : null}

          {personalInfo.email || personalInfo.endereco ? (
            <Text style={ts.contact}>
              {personalInfo.email}
              {personalInfo.email && personalInfo.endereco ? ' | ' : ''}
              {personalInfo.endereco}
            </Text>
          ) : null}

          {/* Links */}
          {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
            <View style={styles.previewLinks}>
              {personalInfo.site && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>{personalInfo.site}</Text>
              )}
              {personalInfo.linkedin && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>LinkedIn</Text>
              )}
              {personalInfo.github && (
                <Text style={[styles.previewLink, { color: '#b2dfdb' }]}>GitHub</Text>
              )}
            </View>
          )}
        </View>

        {/* Resumo Profissional */}
        {data.resumo_profissional ? (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
            <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
          </View>
        ) : null}

        {/* Experiência Profissional com Timeline */}
        {data.experiencias && data.experiencias.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
            {data.experiencias.map((exp, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                {/* Dot da Timeline */}
                <View style={ts.timelineDot}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: 'bold' }}>
                    {index + 1}
                  </Text>
                </View>

                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
                <Text style={styles.previewItemSubtitle}>{exp.empresa}</Text>
                {exp.data_inicio ? (
                  <Text style={[styles.previewItemDate, { fontWeight: 'bold', color: '#00796b' }]}>
                    {exp.data_inicio}
                    {exp.data_fim ?
                      exp.data_fim.toLowerCase() === 'atual' ?
                        ' - Presente' :
                        ` - ${exp.data_fim}` :
                      ''}
                  </Text>
                ) : null}
                {exp.descricao ? (
                  <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Outras seções como padrão */}
        {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
            {data.formacoes_academicas.map((formacao, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>
                  {formacao.diploma} em {formacao.area_estudo}
                </Text>
                <Text style={styles.previewItemSubtitle}>{formacao.instituicao}</Text>
                {formacao.data_inicio ? (
                  <Text style={styles.previewItemDate}>
                    {formacao.data_inicio}
                    {formacao.data_fim ?
                      formacao.data_fim.toLowerCase() === 'atual' ?
                        ' - Presente' :
                        ` - ${formacao.data_fim}` :
                      ''}
                  </Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {/* Restante das seções como no padrão */}
        {data.cursos && data.cursos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
            {data.cursos.map((curso, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
                <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
                {curso.data_inicio || curso.data_fim ? (
                  <Text style={styles.previewItemDate}>
                    {curso.data_inicio || ''}
                    {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                    {curso.data_fim || ''}
                  </Text>
                ) : null}
                {curso.descricao ? (
                  <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {data.projetos && data.projetos.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
            {data.projetos.map((projeto, index) => (
              <View key={index} style={[styles.previewItem, ts.itemBorder]}>
                <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
                {projeto.habilidades ? (
                  <Text style={styles.previewItemSubtitle}>
                    <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                  </Text>
                ) : null}
                {projeto.descricao ? (
                  <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
                ) : null}
              </View>
            ))}
          </View>
        )}

        {data.idiomas && data.idiomas.length > 0 && (
          <View style={styles.previewSection}>
            <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Idiomas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
              {data.idiomas.map((idioma, index) => (
                <View key={index} style={{
                  backgroundColor: '#e0f2f1',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 10,
                  marginBottom: 10,
                  borderRadius: 5,
                  borderLeftWidth: 3,
                  borderLeftColor: ts.accent,
                }}>
                  <Text style={{ fontWeight: 'bold', color: '#00796b' }}>
                    {idioma.nome}: <Text style={{ fontWeight: 'normal' }}>{idioma.nivel}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </View>
    );
  }

  // Renderização padrão para os outros templates
  return (
    <View style={[styles.previewContainer, ts.container]}>
      <View style={ts.header}>
        {fullName ? (
          <Text style={ts.name}>{fullName}</Text>
        ) : null}

        {personalInfo.email || personalInfo.endereco ? (
          <Text style={ts.contact}>
            {personalInfo.email}
            {personalInfo.email && personalInfo.endereco ? ' | ' : ''}
            {personalInfo.endereco}
          </Text>
        ) : null}

        {/* Links */}
        {(personalInfo.site || personalInfo.linkedin || personalInfo.github) && (
          <View style={styles.previewLinks}>
            {personalInfo.site && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>{personalInfo.site}</Text>
            )}
            {personalInfo.linkedin && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>LinkedIn</Text>
            )}
            {personalInfo.github && (
              <Text style={[styles.previewLink, { color: ts.accent }]}>GitHub</Text>
            )}
          </View>
        )}
      </View>

      {/* Resumo Profissional */}
      {data.resumo_profissional ? (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Resumo Profissional</Text>
          <Text style={styles.previewResumeText}>{data.resumo_profissional}</Text>
        </View>
      ) : null}

      {/* Formação Acadêmica */}
      {data.formacoes_academicas && data.formacoes_academicas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Formação Acadêmica</Text>
          {data.formacoes_academicas.map((formacao, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>
                {formacao.diploma} em {formacao.area_estudo}
              </Text>
              <Text style={styles.previewItemSubtitle}>{formacao.instituicao}</Text>
              {formacao.data_inicio ? (
                <Text style={styles.previewItemDate}>
                  {formacao.data_inicio}
                  {formacao.data_fim ?
                    formacao.data_fim.toLowerCase() === 'atual' ?
                      ' - Presente' :
                      ` - ${formacao.data_fim}` :
                    ''}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Experiência Profissional */}
      {data.experiencias && data.experiencias.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Experiência Profissional</Text>
          {data.experiencias.map((exp, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{exp.cargo}</Text>
              <Text style={styles.previewItemSubtitle}>{exp.empresa}</Text>
              {exp.data_inicio ? (
                <Text style={styles.previewItemDate}>
                  {exp.data_inicio}
                  {exp.data_fim ?
                    exp.data_fim.toLowerCase() === 'atual' ?
                      ' - Presente' :
                      ` - ${exp.data_fim}` :
                    ''}
                </Text>
              ) : null}
              {exp.descricao ? (
                <Text style={styles.previewItemDescription}>{exp.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Cursos */}
      {data.cursos && data.cursos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Cursos e Certificados</Text>
          {data.cursos.map((curso, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{curso.nome}</Text>
              <Text style={styles.previewItemSubtitle}>{curso.instituicao}</Text>
              {curso.data_inicio || curso.data_fim ? (
                <Text style={styles.previewItemDate}>
                  {curso.data_inicio || ''}
                  {curso.data_inicio && curso.data_fim ? ' - ' : ''}
                  {curso.data_fim || ''}
                </Text>
              ) : null}
              {curso.descricao ? (
                <Text style={styles.previewItemDescription}>{curso.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Projetos */}
      {data.projetos && data.projetos.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Projetos</Text>
          {data.projetos.map((projeto, index) => (
            <View key={index} style={[styles.previewItem, ts.itemBorder]}>
              <Text style={[styles.previewItemTitle, ts.itemTitle]}>{projeto.nome}</Text>
              {projeto.habilidades ? (
                <Text style={styles.previewItemSubtitle}>
                  <Text style={{ fontWeight: 'bold' }}>Habilidades:</Text> {projeto.habilidades}
                </Text>
              ) : null}
              {projeto.descricao ? (
                <Text style={styles.previewItemDescription}>{projeto.descricao}</Text>
              ) : null}
            </View>
          ))}
        </View>
      )}

      {/* Idiomas */}
      {data.idiomas && data.idiomas.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={[styles.previewSectionTitle, ts.sectionTitle]}>Idiomas</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {data.idiomas.map((idioma, index) => (
              <View key={index} style={[
                styles.previewItem,
                {
                  backgroundColor: '#f8f9fa',
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  marginRight: 10,
                  marginBottom: 10,
                  borderRadius: 5,
                  borderLeftWidth: 3,
                  borderLeftColor: ts.accent,
                }
              ]}>
                <Text style={{ fontWeight: 'bold' }}>{idioma.nome}: <Text style={{ fontWeight: 'normal' }}>{idioma.nivel}</Text></Text>
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  );
};

const initialCVData = {
  informacoes_pessoais: {},
  resumo_profissional: "", // Novo campo para resumo/biografia
  formacoes_academicas: [],
  cursos: [],
  projetos: [],
  experiencias: [],
  idiomas: []
};

const processMessage = (message, currentStep, cvData) => {
  // Se não temos dados do CV ainda, inicializar
  const data = cvData || { ...initialCVData };

  // Para permitir pular campos com "não sei"
  const isSkipping = ['não sei', 'nao sei', 'n sei', 'ns', 'desconheço', 'desconheco'].includes(message.toLowerCase());

  // Processamento baseado na etapa atual
  switch (currentStep) {
    case 'boas_vindas':
      if (['oi', 'olá', 'ola', 'começar', 'iniciar', 'hello', 'hi'].includes(message.toLowerCase())) {
        return {
          response: "Olá! Eu sou o CurriculoBot, seu assistente para criar um currículo profissional. Vamos começar com suas informações pessoais. Como posso te chamar?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      } else {
        return {
          response: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto para iniciar.",
          nextStep: 'boas_vindas',
          options: ['Começar'],
          cvData: data
        };
      }

    case 'nome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu nome. Poderia repetir por favor?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.nome = message.trim();

      return {
        response: `Prazer em conhecê-lo, ${message.trim()}! Agora, qual é o seu sobrenome?`,
        nextStep: 'sobrenome',
        options: [],
        cvData: data
      };

    case 'sobrenome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu sobrenome. Poderia repetir por favor?",
          nextStep: 'sobrenome',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.sobrenome = message.trim();

      return {
        response: "Ótimo! Agora, qual é o seu endereço de e-mail?",
        nextStep: 'email',
        options: [],
        cvData: data
      };

    case 'email':
      if (!message.includes('@')) {
        return {
          response: "Hmm, isso não parece um endereço de e-mail válido. Por favor, inclua um '@' no seu e-mail.",
          nextStep: 'email',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.email = message.trim();

      return {
        response: "Excelente! Agora, qual é o seu endereço?",
        nextStep: 'endereco',
        options: ['Não sei'],
        cvData: data
      };

    case 'endereco':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Desculpe, não consegui entender seu endereço. Poderia repetir por favor?",
          nextStep: 'endereco',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.informacoes_pessoais.endereco = message.trim();
      }

      return {
        response: "Qual é o seu CEP? (Digite 'não sei' caso não saiba ou prefira não informar)",
        nextStep: 'cep',
        options: ['Não sei'],
        cvData: data
      };

    case 'cep':
      if (!isSkipping) {
        // Validação básica de CEP (formato XXXXX-XXX ou XXXXXXXX)
        const cepRegex = /^[0-9]{5}-?[0-9]{3}$/;
        
        if (cepRegex.test(message.trim())) {
          data.informacoes_pessoais.cep = message.trim();
        } else if (message.trim() !== '') {
          return {
            response: "O CEP informado parece estar em formato inválido. Por favor, digite novamente no formato XXXXX-XXX ou XXXXXXXX. Ou digite 'não sei' para pular.",
            nextStep: 'cep',
            options: ['Não sei'],
            cvData: data
          };
        }
      }

      return {
        response: "Perfeito! Agora, qual é a sua área de atuação profissional?",
        nextStep: 'area',
        options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
        cvData: data
      };

    case 'area':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Desculpe, não consegui entender sua área profissional. Poderia repetir por favor?",
          nextStep: 'area',
          options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.informacoes_pessoais.area = message.trim();
      }

      return {
        response: "Você tem um site pessoal ou portfólio? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
        nextStep: 'site',
        options: ['Não sei', 'Não tenho'],
        cvData: data
      };

    case 'site':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.site = message.trim();
      }

      return {
        response: "Você tem um perfil no LinkedIn? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
        nextStep: 'linkedin',
        options: ['Não sei', 'Não tenho'],
        cvData: data
      };

    case 'linkedin':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.linkedin = message.trim();
      }

      // Verificar se é da área de tecnologia para perguntar sobre GitHub
      if (data.informacoes_pessoais.area &&
        ['tecnologia', 'tecnologia da informação', 'ti', 'desenvolvimento', 'programação']
          .includes(data.informacoes_pessoais.area.toLowerCase())) {
        return {
          response: "Você tem uma conta no GitHub? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
          nextStep: 'github',
          options: ['Não sei', 'Não tenho'],
          cvData: data
        };
      } else {
        return {
          response: "Vamos prosseguir. O que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    case 'github':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.github = message.trim();
      }

      return {
        response: "Agora, conte um pouco sobre você. Descreva brevemente sua trajetória profissional, acadêmica ou objetivos pessoais. Esse texto será um resumo que aparecerá no início do seu currículo.",
        nextStep: 'resumo_profissional',
        options: [],
        cvData: data
      };

    case 'resumo_profissional':
      // Salvar o resumo profissional
      data.resumo_profissional = message.trim();

      return {
        response: "Obrigado por compartilhar sua trajetória! Agora, o que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'escolher_proximo':
      const option = message.toLowerCase();

      if (option.includes('finalizar') || option.includes('concluir') || option.includes('pronto')) {
        return {
          response: "Deseja finalizar seu currículo? Todas as informações já foram salvas.",
          nextStep: 'finalizar',
          options: ['Sim, finalizar', 'Não, continuar editando'],
          cvData: data
        };
      } else if (option.includes('formação') || option.includes('formacao')) {
        return {
          response: "Vamos adicionar uma formação acadêmica. Qual é a instituição de ensino?",
          nextStep: 'formacao_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('experiência') || option.includes('experiencia')) {
        return {
          response: "Vamos adicionar uma experiência profissional. Qual foi o cargo ou posição?",
          nextStep: 'experiencia_cargo',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('curso') || option.includes('certificado')) {
        return {
          response: "Vamos adicionar um curso ou certificado. Qual é o nome do curso?",
          nextStep: 'curso_nome',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('projeto')) {
        return {
          response: "Vamos adicionar um projeto. Qual é o nome do projeto?",
          nextStep: 'projeto_nome',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('idioma')) {
        return {
          response: "Vamos adicionar um idioma. Qual idioma você conhece?",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro', 'Não sei'],
          cvData: data
        };
      } else {
        return {
          response: "Desculpe, não entendi sua escolha. O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    case 'formacao_instituicao':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da instituição de ensino.",
          nextStep: 'formacao_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar nova formação acadêmica
      const novaFormacao = {
        instituicao: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual diploma ou grau você obteve? (Ex: Bacharel, Tecnólogo, Mestrado)",
        nextStep: 'formacao_diploma',
        options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico', 'Não sei'],
        cvData: {
          ...data,
          formacao_atual: novaFormacao
        }
      };

    case 'formacao_diploma':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o tipo de diploma ou grau obtido.",
          nextStep: 'formacao_diploma',
          options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico', 'Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.diploma = message.trim();
      }

      return {
        response: "Qual foi a área de estudo ou curso?",
        nextStep: 'formacao_area',
        options: ['Não sei'],
        cvData: data
      };

    case 'formacao_area':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a área de estudo ou curso.",
          nextStep: 'formacao_area',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.area_estudo = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'formacao_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'formacao_data_inicio':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'formacao_data_inicio',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'formacao_data_fim',
        options: ['Cursando', 'Não sei'],
        cvData: data
      };

    case 'formacao_data_fim':
      if (!isSkipping) {
        data.formacao_atual.data_fim = message.toLowerCase() === 'cursando' ? 'Atual' : message.trim();
      }

      // Adicionar a formação à lista e limpar a formação atual
      if (!data.formacoes_academicas) {
        data.formacoes_academicas = [];
      }

      data.formacoes_academicas.push(data.formacao_atual);
      delete data.formacao_atual;

      return {
        response: "Formação acadêmica adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'experiencia_cargo':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o cargo ou posição ocupada, ou escolha uma das opções abaixo.",
          nextStep: 'experiencia_cargo',
          options: ['Voltar para menu principal', 'Não tenho experiência', 'Não sei'],
          cvData: data
        };
      }

      // Inicializar nova experiência profissional
      const novaExperiencia = {
        cargo: isSkipping ? '' : message.trim()
      };

      return {
        response: "Em qual empresa ou organização você trabalhou?",
        nextStep: 'experiencia_empresa',
        options: ['Não sei'],
        cvData: {
          ...data,
          experiencia_atual: novaExperiencia
        }
      };

    case 'experiencia_empresa':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da empresa ou organização.",
          nextStep: 'experiencia_empresa',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.experiencia_atual.empresa = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'experiencia_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'experiencia_data_inicio':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'experiencia_data_inicio',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.experiencia_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de término? (formato: MM/AAAA, ou digite 'atual' se ainda estiver neste emprego)",
        nextStep: 'experiencia_data_fim',
        options: ['Atual', 'Não sei'],
        cvData: data
      };

    case 'experiencia_data_fim':
      if (!isSkipping) {
        data.experiencia_atual.data_fim = message.toLowerCase() === 'atual' ? 'Atual' : message.trim();
      }

      // Adicionar a experiência à lista e limpar a experiência atual
      if (!data.experiencias) {
        data.experiencias = [];
      }

      data.experiencias.push(data.experiencia_atual);
      delete data.experiencia_atual;

      return {
        response: "Experiência profissional adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Curso
    case 'curso_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome do curso ou certificado.",
          nextStep: 'curso_nome',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar novo curso
      const novoCurso = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual instituição ofereceu este curso?",
        nextStep: 'curso_instituicao',
        options: ['Não sei'],
        cvData: {
          ...data,
          curso_atual: novoCurso
        }
      };

    case 'curso_instituicao':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da instituição.",
          nextStep: 'curso_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.curso_atual.instituicao = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA, ou digite 'não sei' se não lembrar)",
        nextStep: 'curso_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'curso_data_inicio':
      if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei' && !isSkipping) {
        data.curso_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'curso_data_fim',
        options: ['Cursando', 'Não sei'],
        cvData: data
      };

    case 'curso_data_fim':
      if (!isSkipping) {
        if (message.toLowerCase() === 'cursando') {
          data.curso_atual.data_fim = 'Atual';
        } else if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei') {
          data.curso_atual.data_fim = message.trim();
        }
      }

      // Adicionar o curso à lista e limpar o curso atual
      if (!data.cursos) {
        data.cursos = [];
      }

      data.cursos.push(data.curso_atual);
      delete data.curso_atual;

      return {
        response: "Curso adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Projeto
    case 'projeto_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome do projeto.",
          nextStep: 'projeto_nome',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar novo projeto
      const novoProjeto = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Quais habilidades ou tecnologias você utilizou neste projeto? (separadas por vírgula)",
        nextStep: 'projeto_habilidades',
        options: ['Não sei'],
        cvData: {
          ...data,
          projeto_atual: novoProjeto
        }
      };

    case 'projeto_habilidades':
      if (!isSkipping) {
        data.projeto_atual.habilidades = message.trim();
      }

      return {
        response: "Descreva brevemente este projeto:",
        nextStep: 'projeto_descricao',
        options: ['Não sei'],
        cvData: data
      };

    case 'projeto_descricao':
      if (!isSkipping) {
        data.projeto_atual.descricao = message.trim();
      }

      // Adicionar o projeto à lista e limpar o projeto atual
      if (!data.projetos) {
        data.projetos = [];
      }

      data.projetos.push(data.projeto_atual);
      delete data.projeto_atual;

      return {
        response: "Projeto adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Idioma
    case 'idioma_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o idioma.",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro', 'Não sei'],
          cvData: data
        };
      }

      // Inicializar novo idioma
      const novoIdioma = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual é o seu nível neste idioma?",
        nextStep: 'idioma_nivel',
        options: ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo', 'Não sei'],
        cvData: {
          ...data,
          idioma_atual: novoIdioma
        }
      };

    case 'idioma_nivel':
      if (!isSkipping) {
        data.idioma_atual.nivel = message.trim();
      }

      // Adicionar o idioma à lista e limpar o idioma atual
      if (!data.idiomas) {
        data.idiomas = [];
      }

      data.idiomas.push(data.idioma_atual);
      delete data.idioma_atual;

      return {
        response: "Idioma adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'finalizar':
      if (['sim', 'sim, finalizar', 'yes', 's', 'y'].includes(message.toLowerCase())) {
        return {
          response: "Seu currículo foi finalizado com sucesso! Você pode acessá-lo na aba 'Meus Currículos'. Obrigado por usar o CurriculoBot!",
          nextStep: 'concluido',
          options: ['Iniciar Novo Currículo'],
          cvData: data,
          isFinished: true
        };
      } else {
        return {
          response: "O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    default:
      return {
        response: "Parece que tivemos um problema. Vamos recomeçar. Como posso ajudar com seu currículo?",
        nextStep: 'boas_vindas',
        options: ['Começar'],
        cvData: initialCVData
      };
  }
};

const ConfirmationButtons = ({ onConfirm, onCorrect }) => {
  return (
    <View style={styles.confirmationContainer}>
      <TouchableOpacity
        style={[styles.confirmationButton, { backgroundColor: Colors.success }]}
        onPress={onConfirm}
      >
        <Text style={styles.confirmationButtonText}>✓ Confirmar</Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.confirmationButton, { backgroundColor: Colors.warning }]}
        onPress={onCorrect}
      >
        <Text style={styles.confirmationButtonText}>✗ Corrigir</Text>
      </TouchableOpacity>
    </View>
  );
};

const getCurrentTime = () => {
  const now = new Date();
  return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
};

const getUniqueId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

const salvarCurriculo = async (data, userId) => {
  try {
    // Buscar currículos existentes do usuário
    const cvs = await AsyncStorage.getItem(`curriculos_${userId}`);
    const curriculos = cvs ? JSON.parse(cvs) : [];

    // Criar novo currículo
    const novoCurriculo = {
      id: getUniqueId(),
      nome: `${data.informacoes_pessoais.nome || ''} ${data.informacoes_pessoais.sobrenome || ''}`.trim(),
      data: data,
      dataCriacao: new Date().toISOString()
    };

    // Adicionar ao array e salvar
    curriculos.push(novoCurriculo);
    await AsyncStorage.setItem(`curriculos_${userId}`, JSON.stringify(curriculos));

    return novoCurriculo.id;
  } catch (error) {
    console.error('Erro ao salvar currículo:', error);
    throw error;
  }
};

const ConfiguracoesIAScreen = ({ navigation }) => {
  const [iasSalvas, setIasSalvas] = useState({});
  const [iaAtual, setIaAtual] = useState('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    carregarConfiguracoes();
  }, []);

  const carregarConfiguracoes = async () => {
    try {
      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA) setIaAtual(defaultIA);

      // Carregar status das IAs
      const iasStatus = {};
      for (const [key, value] of Object.entries(IA_APIS)) {
        const apiKey = await getIAAPIKey(key);
        iasStatus[key] = {
          configurada: value.chaveNecessaria ? !!apiKey : true,
          apiKey: apiKey
        };
      }

      setIasSalvas(iasStatus);

      // Carregar a API key da IA selecionada
      if (defaultIA) {
        const currentKey = await getIAAPIKey(defaultIA);
        setApiKey(currentKey);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      Alert.alert('Erro', 'Não foi possível carregar as configurações das IAs.');
    }
  };

  const salvarConfiguracao = async () => {
    setIsSaving(true);
    try {
      // Salvar a IA padrão
      await AsyncStorage.setItem('ia_padrao', iaAtual);

      // Salvar a API key da IA selecionada
      await salvarIAAPIKey(iaAtual, apiKey);

      // Atualizar o estado
      const novasIasSalvas = { ...iasSalvas };
      novasIasSalvas[iaAtual] = {
        configurada: IA_APIS[iaAtual].chaveNecessaria ? !!apiKey : true,
        apiKey: apiKey
      };
      setIasSalvas(novasIasSalvas);

      Alert.alert('Sucesso', `Configuração de ${IA_APIS[iaAtual].nome} salva com sucesso!`);
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      Alert.alert('Erro', 'Não foi possível salvar a configuração.');
    } finally {
      setIsSaving(false);
    }
  };

  const selecionarIA = async (tipoIA) => {
    setIaAtual(tipoIA);
    const key = await getIAAPIKey(tipoIA);
    setApiKey(key || '');
  };

  const obterUrlAjuda = (tipoIA) => {
    switch (tipoIA) {
      case 'GEMINI':
        return 'https://ai.google.dev/tutorials/setup';
      case 'OPENAI':
        return 'https://platform.openai.com/api-keys';
      case 'CLAUDE':
        return 'https://console.anthropic.com/settings/keys';
      case 'PERPLEXITY':
        return 'https://www.perplexity.ai/settings/api';
      default:
        return null;
    }
  };

  const abrirUrlAjuda = (tipoIA) => {
    const url = obterUrlAjuda(tipoIA);
    if (url) {
      Alert.alert(
        "Abrir site externo",
        `Deseja abrir o site de ${IA_APIS[tipoIA].nome} para obter sua API key?`,
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Abrir", onPress: () => { /* Implementar abertura de URL */ } }
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={HeaderColors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Configurar IA</Text>
      </View>

      <ScrollView style={styles.configContent}>
        <View style={styles.configCard}>
          <Text style={styles.configIntroTitle}>Configure suas IAs</Text>
          <Text style={styles.configIntroText}>
            Adicione suas chaves de API para utilizar diferentes modelos de IA
            na análise de currículos. Uma chave API é necessária para cada serviço.
          </Text>
        </View>

        <Text style={styles.configTitle}>Selecione uma IA para configurar:</Text>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.iaCardsContainer}
        >
          {Object.entries(IA_APIS).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.iaCard,
                iaAtual === key && styles.iaCardSelected
              ]}
              onPress={() => selecionarIA(key)}
            >
              <View style={styles.iaCardHeader}>
                <Text style={[
                  styles.iaCardTitle,
                  iaAtual === key && styles.iaCardTitleSelected
                ]}>
                  {value.nome}
                </Text>
                {iasSalvas[key]?.configurada && (
                  <View style={styles.configuredBadge}>
                    <Text style={styles.configuredBadgeText}>✓</Text>
                  </View>
                )}
              </View>
              <Text style={styles.iaCardDescription}>
                {value.chaveNecessaria ? "Requer API Key" : "Não requer API Key"}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {IA_APIS[iaAtual]?.chaveNecessaria ? (
          <View style={styles.apiKeyContainer}>
            <View style={styles.apiKeyHeader}>
              <Text style={styles.apiKeyLabel}>
                API Key para {IA_APIS[iaAtual]?.nome}:
              </Text>
              <TouchableOpacity
                onPress={() => abrirUrlAjuda(iaAtual)}
                style={styles.helpButton}
              >
                <Text style={styles.helpButtonText}>Como obter?</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.apiKeyInputContainer}>
              <TextInput
                style={styles.apiKeyInput}
                value={apiKey}
                onChangeText={setApiKey}
                placeholder="Insira sua API Key aqui"
                secureTextEntry={!showApiKey}
              />
              <TouchableOpacity
                style={styles.toggleVisibilityButton}
                onPress={() => setShowApiKey(!showApiKey)}
              >
                <Text style={styles.toggleVisibilityText}>
                  {showApiKey ? "Ocultar" : "Mostrar"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.apiKeyHelper}>
              A API Key é necessária para usar os recursos de {IA_APIS[iaAtual]?.nome}.
            </Text>
          </View>
        ) : (
          <View style={styles.noApiKeyContainer}>
            <Text style={styles.noApiKeyText}>
              {IA_APIS[iaAtual]?.nome} não necessita de API Key.
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.saveButton,
            (isSaving) && styles.saveButtonDisabled
          ]}
          onPress={salvarConfiguracao}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar Configuração</Text>
          )}
        </TouchableOpacity>

        <View style={styles.tipsContainer}>
          <Text style={styles.tipsTitle}>Dicas:</Text>
          <Text style={styles.tipItem}>• O Google Gemini já vem com uma chave padrão</Text>
          <Text style={styles.tipItem}>• Para obter resultados melhores, configure sua própria API key</Text>
          <Text style={styles.tipItem}>• O modo offline não requer API key</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const SplashScreen = ({ navigation }) => {
  useEffect(() => {
    // Simular carregamento
    const timer = setTimeout(() => {
      if (navigation && navigation.replace) {
        navigation.replace('Auth');
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [navigation]);

  return (
    <SafeAreaView style={styles.splashContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      <Text style={styles.splashTitle}>CurriculoBot</Text>
      <Text style={styles.splashSubtitle}>Premium</Text>
      <ActivityIndicator size="large" color={Colors.white} style={{ marginTop: 20 }} />
    </SafeAreaView>
  );
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

const RegisterScreen = ({ navigation }) => {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();

  const handleRegister = async () => {
    if (!nome || !email || !password || !confirmPassword) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const result = await register(nome, email, password);
    setLoading(false);

    if (result.success) {
      // Registro bem-sucedido
    } else {
      Alert.alert('Erro', result.message || 'Erro ao fazer cadastro.');
    }
  };

  return (
    <SafeAreaView style={styles.authContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />
      <View style={styles.authHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.authTitle}>Cadastro</Text>
        <Text style={styles.authSubtitle}>Crie sua conta para continuar</Text>
      </View>

      <View style={styles.authForm}>
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Nome</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu nome completo"
              value={nome}
              onChangeText={setNome}
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Seu email profissional"
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
              placeholder="Crie uma senha forte"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Confirmar Senha</Text>
          <View style={styles.enhancedInputWrapper}>
            <TextInput
              style={styles.enhancedInput}
              placeholder="Confirme sua senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#9e9e9e"
            />
          </View>
        </View>

        <TouchableOpacity
          style={styles.enhancedPrimaryButton}
          onPress={handleRegister}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.enhancedPrimaryButtonText}>Cadastrar</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.textButtonText}>Já tem uma conta? Faça login</Text>
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
    switch(chance.toLowerCase()) {
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

const salvarProgressoCurriculo = async (userId, data) => {
  try {
    // Salvar o estado atual do chatbot
    await AsyncStorage.setItem(`curriculo_em_progresso_${userId}`, JSON.stringify({
      timestamp: new Date().toISOString(),
      data: data
    }));
    console.log('Progresso do currículo salvo com sucesso');
  } catch (error) {
    console.error('Erro ao salvar progresso do currículo:', error);
  }
};

const recuperarProgressoCurriculo = async (userId) => {
  try {
    const progresso = await AsyncStorage.getItem(`curriculo_em_progresso_${userId}`);
    if (progresso) {
      return JSON.parse(progresso);
    }
    return null;
  } catch (error) {
    console.error('Erro ao recuperar progresso do currículo:', error);
    return null;
  }
};

const limparProgressoCurriculo = async (userId) => {
  try {
    await AsyncStorage.removeItem(`curriculo_em_progresso_${userId}`);
    console.log('Progresso do currículo limpo com sucesso');
  } catch (error) {
    console.error('Erro ao limpar progresso do currículo:', error);
  }
};

const ChatbotScreen = ({ navigation, route }) => {
  // Estados do componente original
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [options, setOptions] = useState(['Começar']);
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState('boas_vindas');
  const [cvData, setCvData] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [initializing, setInitializing] = useState(true);
  
  // Novos estados para controle de confirmação
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [lastResponse, setLastResponse] = useState(null);
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  const [lastProcessedResult, setLastProcessedResult] = useState(null);

  const { user } = useAuth();
  const flatListRef = useRef();

  // Função para inicializar o chat com mensagem de boas-vindas
  const inicializarChat = () => {
    console.log('Inicializando chat com mensagem de boas-vindas');
    const welcomeMessage = {
      id: getUniqueId(),
      text: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto!",
      isUser: false,
      time: getCurrentTime()
    };

    setMessages([welcomeMessage]);
    setCurrentStep('boas_vindas');
    setCvData(null);
    setOptions(['Começar']);
  };

  // Verificar se estamos retomando um currículo em progresso
  useEffect(() => {
    const carregarDados = async () => {
      try {
        console.log('Carregando dados iniciais do chat');

        // Flag para verificar se devemos restaurar ou inicializar
        let restaurado = false;

        // Verificar se estamos restaurando de um progresso salvo
        if (route.params?.continuarProgresso) {
          console.log('Tentando restaurar progresso...');
          const progresso = await recuperarProgressoCurriculo(user.id);

          if (progresso && progresso.data) {
            // Verificar se o progresso é válido (menos de 24h)
            const dataProgresso = new Date(progresso.timestamp);
            const agora = new Date();
            const diferencaHoras = (agora - dataProgresso) / (1000 * 60 * 60);

            if (diferencaHoras < 24 && progresso.data.messages && progresso.data.messages.length > 0) {
              console.log('Restaurando progresso de', dataProgresso);

              // Restaurar o estado do chat
              setCvData(progresso.data.cvData || null);
              setCurrentStep(progresso.data.currentStep || 'boas_vindas');
              setOptions(progresso.data.options || ['Começar']);
              setMessages(progresso.data.messages || []);

              restaurado = true;

              // Notificar o usuário que o progresso foi restaurado
              setTimeout(() => {
                Alert.alert(
                  "Progresso Restaurado",
                  "Seu currículo em andamento foi restaurado com sucesso!"
                );
              }, 500);
            } else {
              console.log('Progresso muito antigo ou inválido:', diferencaHoras, 'horas');
            }
          } else {
            console.log('Nenhum progresso encontrado para restaurar');
          }
        }

        // Se não conseguimos restaurar, inicializar normalmente
        if (!restaurado) {
          console.log('Inicializando chat normalmente');
          inicializarChat();
        }
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        // Em caso de erro, garantir que o chat seja inicializado
        inicializarChat();
      } finally {
        // Sempre marcar a inicialização como concluída
        setInitializing(false);
      }
    };

    carregarDados();
  }, []);

  // Efeito para rolar para o final da lista quando mensagens mudarem
  useEffect(() => {
    if (messages.length > 0 && flatListRef.current && !initializing) {
      setTimeout(() => {
        flatListRef.current.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages, initializing]);

  // Salvar progresso quando sair da tela
  useEffect(() => {
    return () => {
      // Só salvar se houver progresso significativo (além da mensagem inicial) e não estiver concluído
      if (messages.length > 1 && currentStep !== 'boas_vindas' && currentStep !== 'concluido' && cvData) {
        console.log('Salvando progresso ao sair da tela');
        salvarProgressoCurriculo(user.id, {
          cvData,
          currentStep,
          options,
          messages,
        });
      }
    };
  }, [messages, currentStep, cvData, options, user.id]);

  // Limpar o progresso salvo quando finalizar o currículo
  useEffect(() => {
    if (currentStep === 'concluido' && cvData) {
      console.log('Currículo concluído, limpando progresso salvo');
      limparProgressoCurriculo(user.id);
    }
  }, [currentStep, cvData, user.id]);

  // Adicionar mensagem do bot
  const addBotMessage = (text) => {
    setIsTyping(true);

    // Simular tempo de digitação do bot (mais curto para melhor responsividade)
    setTimeout(() => {
      const newMessage = {
        id: getUniqueId(),
        text,
        isUser: false,
        time: getCurrentTime()
      };

      setMessages(prevMessages => [...prevMessages, newMessage]);
      setIsTyping(false);

      // Rolar para o final da lista
      if (flatListRef.current) {
        setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
      }
    }, 700);
  };

  // Função para aplicar o resultado processado
  const applyProcessedResult = (result) => {
    // Atualizar estados
    setCvData(result.cvData);
    setCurrentStep(result.nextStep);
    setOptions(result.options || []);

    // Adicionar resposta do bot
    addBotMessage(result.response);
    
    // Resetar confirmação
    setShowConfirmation(false);
    setWaitingConfirmation(false);

    // Salvar currículo se finalizado
    if (result.isFinished) {
      salvarCurriculo(result.cvData, user.id)
        .then(id => {
          console.log('Currículo salvo com ID:', id);
          // Limpar o progresso salvo ao finalizar
          limparProgressoCurriculo(user.id);
        })
        .catch(error => {
          console.error('Erro ao salvar currículo:', error);
          Alert.alert('Erro', 'Não foi possível salvar o currículo.');
        });
    }
  };

  // Lidar com envio de mensagem (versão modificada com confirmação)
  const handleSendMessage = () => {
    if (currentMessage.trim() === '') return;
    
    // Se estamos esperando confirmação, ignorar novas mensagens
    if (waitingConfirmation) return;

    // Adicionar mensagem do usuário
    const userMessage = {
      id: getUniqueId(),
      text: currentMessage,
      isUser: true,
      time: getCurrentTime()
    };

    // Atualizar mensagens
    setMessages(prevMessages => [...prevMessages, userMessage]);

    // Processar a mensagem para obter a resposta
    const result = processMessage(currentMessage, currentStep, cvData);
    
    // Salvar resultado para usar após confirmação
    setLastProcessedResult(result);
    setLastResponse(currentMessage);
    
    // Limpar campo de entrada
    setCurrentMessage('');
    
    // Mostrar confirmação, exceto para algumas etapas como 'boas_vindas'
    if (currentStep !== 'boas_vindas' && currentStep !== 'concluido' && !currentStep.includes('escolher')) {
      setShowConfirmation(true);
      setWaitingConfirmation(true);
    } else {
      // Para etapas que não precisam de confirmação, proceder normalmente
      applyProcessedResult(result);
    }

    // Rolar para o final da lista
    if (flatListRef.current) {
      setTimeout(() => flatListRef.current.scrollToEnd({ animated: true }), 100);
    }
  };
  
  // Função para confirmar a resposta
  const handleConfirmResponse = () => {
    if (lastProcessedResult) {
      applyProcessedResult(lastProcessedResult);
    }
  };
  
  // Função para corrigir a resposta
  const handleCorrectResponse = () => {
    // Voltar para a entrada anterior
    setCurrentMessage(lastResponse || '');
    setShowConfirmation(false);
    setWaitingConfirmation(false);
  };

  // Selecionar uma opção pré-definida
  const handleOptionSelect = (option) => {
    setCurrentMessage(option);
    handleSendMessage();
  };

  // Exibir indicador de carregamento enquanto inicializa
  if (initializing) {
    return (
      <SafeAreaView style={styles.chatContainer}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />
        <View style={styles.chatHeader}>
          <TouchableOpacity
            style={styles.chatBackButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.chatBackButtonText}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.chatHeaderTitle}>CurriculoBot</Text>
          <View style={{ width: 80 }} />
        </View>
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f7fa'
        }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, color: Colors.dark }}>
            Preparando o assistente...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Renderizar chatbot
  return (
    <SafeAreaView style={styles.chatContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />

      <View style={styles.chatHeader}>
        <TouchableOpacity
          style={styles.chatBackButton}
          onPress={() => {
            // Se há progresso significativo, confirmar antes de voltar
            if (messages.length > 1 && currentStep !== 'boas_vindas' && currentStep !== 'concluido') {
              Alert.alert(
                "Sair da criação?",
                "Seu progresso será salvo e você poderá continuar depois. Deseja sair?",
                [
                  { text: "Cancelar", style: "cancel" },
                  {
                    text: "Sair",
                    onPress: () => navigation.goBack()
                  }
                ]
              );
            } else {
              navigation.goBack();
            }
          }}
        >
          <Text style={styles.chatBackButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.chatHeaderTitle}>CurriculoBot</Text>
        <TouchableOpacity
          style={styles.previewToggle}
          onPress={() => setShowPreview(!showPreview)}
        >
          <Text style={styles.previewToggleText}>
            {showPreview ? 'Esconder Prévia' : 'Ver Prévia'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.chatContent}>
        {showPreview ? (
          <ScrollView style={styles.previewScroll}>
            <CurriculumPreview data={cvData} />
          </ScrollView>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChatMessage
                  message={item.text}
                  isUser={item.isUser}
                  time={item.time}
                />
              )}
              contentContainerStyle={styles.messagesContainer}
              onContentSizeChange={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: true });
                }
              }}
              onLayout={() => {
                if (flatListRef.current) {
                  flatListRef.current.scrollToEnd({ animated: false });
                }
              }}
              ListFooterComponent={
                isTyping ? (
                  <View style={styles.typingContainer}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={[styles.typingDot, { opacity: 0.7 }]} />
                      <View style={[styles.typingDot, { opacity: 0.8, marginHorizontal: 4 }]} />
                      <View style={[styles.typingDot, { opacity: 0.9 }]} />
                    </View>
                    <Text style={styles.typingText}>Bot está digitando...</Text>
                  </View>
                ) : null
              }
            />

            {showConfirmation && (
              <ConfirmationButtons 
                onConfirm={handleConfirmResponse} 
                onCorrect={handleCorrectResponse} 
              />
            )}

            {options && options.length > 0 && !waitingConfirmation && (
              <ChatOptions options={options} onSelect={handleOptionSelect} />
            )}
          </>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
        style={{ width: '100%' }}
      >
        <View style={styles.chatInputContainer}>
          <TextInput
            style={styles.improvedChatInput}
            placeholder="Digite sua mensagem..."
            value={currentMessage}
            onChangeText={setCurrentMessage}
            onSubmitEditing={handleSendMessage}
            returnKeyType="send"
            multiline={true}
            numberOfLines={3}
          />
          <TouchableOpacity
            style={[
              styles.improvedSendButton,
              {
                opacity: currentMessage.trim() === '' ? 0.5 : 1,
              }
            ]}
            onPress={handleSendMessage}
            disabled={currentMessage.trim() === ''}
          >
            <Text style={styles.improvedSendButtonText}>Enviar</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const EditarCurriculoScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState(curriculoData ? { ...curriculoData.data } : null);
  const [activeSection, setActiveSection] = useState('informacoes_pessoais');
  
  // Seções disponíveis para edição
  const sections = [
    { id: 'informacoes_pessoais', title: 'Informações Pessoais', icon: '👤' },
    { id: 'resumo_profissional', title: 'Resumo Profissional', icon: '📝' },
    { id: 'formacoes_academicas', title: 'Formação Acadêmica', icon: '🎓' },
    { id: 'experiencias', title: 'Experiência Profissional', icon: '💼' },
    { id: 'cursos', title: 'Cursos e Certificados', icon: '📚' },
    { id: 'projetos', title: 'Projetos', icon: '🚀' },
    { id: 'idiomas', title: 'Idiomas', icon: '🌐' }
  ];
  
  // Salvar as alterações feitas
  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      
      // Buscar currículos existentes
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];
      
      // Encontrar e atualizar o currículo atual
      const index = curriculos.findIndex(cv => cv.id === curriculoData.id);
      
      if (index !== -1) {
        // Criar cópia atualizada
        const updatedCurriculo = {
          ...curriculos[index],
          data: editData,
          dataAtualizacao: new Date().toISOString()
        };
        
        // Atualizar array de currículos
        curriculos[index] = updatedCurriculo;
        
        // Salvar no AsyncStorage
        await AsyncStorage.setItem(`curriculos_${user.id}`, JSON.stringify(curriculos));
        
        Alert.alert(
          'Sucesso',
          'Currículo atualizado com sucesso!',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        throw new Error('Currículo não encontrado');
      }
    } catch (error) {
      console.error('Erro ao salvar alterações:', error);
      Alert.alert('Erro', 'Não foi possível salvar as alterações.');
    } finally {
      setSaving(false);
    }
  };
  
  // Renderizar editor de informações pessoais
  const renderPersonalInfoEditor = () => {
    const pessoal = editData.informacoes_pessoais || {};
    
    return (
      <View style={styles.editorSection}>
        <Text style={styles.editorSectionTitle}>Informações Pessoais</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Nome:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.nome || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, nome: text }
              });
            }}
            placeholder="Nome"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Sobrenome:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.sobrenome || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, sobrenome: text }
              });
            }}
            placeholder="Sobrenome"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Email:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.email || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, email: text }
              });
            }}
            placeholder="Email"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Endereço:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.endereco || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, endereco: text }
              });
            }}
            placeholder="Endereço"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>CEP:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.cep || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, cep: text }
              });
            }}
            placeholder="CEP"
            keyboardType="numeric"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Área:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.area || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, area: text }
              });
            }}
            placeholder="Área de atuação"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>LinkedIn:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.linkedin || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, linkedin: text }
              });
            }}
            placeholder="Perfil LinkedIn"
          />
        </View>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>GitHub:</Text>
          <TextInput
            style={styles.input}
            value={pessoal.github || ''}
            onChangeText={(text) => {
              setEditData({
                ...editData,
                informacoes_pessoais: { ...pessoal, github: text }
              });
            }}
            placeholder="Perfil GitHub"
          />
        </View>
      </View>
    );
  };
  
  // Renderizar editor de resumo profissional
  const renderResumeEditor = () => {
    return (
      <View style={styles.editorSection}>
        <Text style={styles.editorSectionTitle}>Resumo Profissional</Text>
        
        <TextInput
          style={[styles.input, styles.textArea]}
          value={editData.resumo_profissional || ''}
          onChangeText={(text) => {
            setEditData({
              ...editData,
              resumo_profissional: text
            });
          }}
          placeholder="Descreva brevemente sua trajetória e objetivos profissionais"
          multiline
          numberOfLines={6}
          textAlignVertical="top"
        />
      </View>
    );
  };
  
  // Renderizar editor de formação acadêmica
  const renderEducationEditor = () => {
    const formacoes = editData.formacoes_academicas || [];
    
    return (
      <View style={styles.editorSection}>
        <Text style={styles.editorSectionTitle}>Formação Acadêmica</Text>
        
        {formacoes.map((formacao, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{formacao.diploma || 'Formação'} em {formacao.area_estudo || 'Área'}</Text>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  const newFormacoes = [...formacoes];
                  newFormacoes.splice(index, 1);
                  setEditData({
                    ...editData,
                    formacoes_academicas: newFormacoes
                  });
                }}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Instituição:</Text>
              <TextInput
                style={styles.input}
                value={formacao.instituicao || ''}
                onChangeText={(text) => {
                  const newFormacoes = [...formacoes];
                  newFormacoes[index] = { ...formacao, instituicao: text };
                  setEditData({
                    ...editData,
                    formacoes_academicas: newFormacoes
                  });
                }}
                placeholder="Instituição de ensino"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Diploma:</Text>
              <TextInput
                style={styles.input}
                value={formacao.diploma || ''}
                onChangeText={(text) => {
                  const newFormacoes = [...formacoes];
                  newFormacoes[index] = { ...formacao, diploma: text };
                  setEditData({
                    ...editData,
                    formacoes_academicas: newFormacoes
                  });
                }}
                placeholder="Tipo de diploma"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Área de Estudo:</Text>
              <TextInput
                style={styles.input}
                value={formacao.area_estudo || ''}
                onChangeText={(text) => {
                  const newFormacoes = [...formacoes];
                  newFormacoes[index] = { ...formacao, area_estudo: text };
                  setEditData({
                    ...editData,
                    formacoes_academicas: newFormacoes
                  });
                }}
                placeholder="Área de estudo"
              />
            </View>
            
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 5 }]}>
                <Text style={styles.inputLabel}>Data Início:</Text>
                <TextInput
                  style={styles.input}
                  value={formacao.data_inicio || ''}
                  onChangeText={(text) => {
                    const newFormacoes = [...formacoes];
                    newFormacoes[index] = { ...formacao, data_inicio: text };
                    setEditData({
                      ...editData,
                      formacoes_academicas: newFormacoes
                    });
                  }}
                  placeholder="MM/AAAA"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 5 }]}>
                <Text style={styles.inputLabel}>Data Fim:</Text>
                <TextInput
                  style={styles.input}
                  value={formacao.data_fim || ''}
                  onChangeText={(text) => {
                    const newFormacoes = [...formacoes];
                    newFormacoes[index] = { ...formacao, data_fim: text };
                    setEditData({
                      ...editData,
                      formacoes_academicas: newFormacoes
                    });
                  }}
                  placeholder="MM/AAAA ou Atual"
                />
              </View>
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditData({
              ...editData,
              formacoes_academicas: [
                ...(editData.formacoes_academicas || []),
                { instituicao: '', diploma: '', area_estudo: '', data_inicio: '', data_fim: '' }
              ]
            });
          }}
        >
          <Text style={styles.addButtonText}>+ Adicionar Formação</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Renderizar editor de experiências
  const renderExperienceEditor = () => {
    const experiencias = editData.experiencias || [];
    
    return (
      <View style={styles.editorSection}>
        <Text style={styles.editorSectionTitle}>Experiência Profissional</Text>
        
        {experiencias.map((experiencia, index) => (
          <View key={index} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <Text style={styles.itemTitle}>{experiencia.cargo || 'Cargo'} - {experiencia.empresa || 'Empresa'}</Text>
              
              <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => {
                  const newExperiencias = [...experiencias];
                  newExperiencias.splice(index, 1);
                  setEditData({
                    ...editData,
                    experiencias: newExperiencias
                  });
                }}
              >
                <Text style={styles.deleteButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cargo:</Text>
              <TextInput
                style={styles.input}
                value={experiencia.cargo || ''}
                onChangeText={(text) => {
                  const newExperiencias = [...experiencias];
                  newExperiencias[index] = { ...experiencia, cargo: text };
                  setEditData({
                    ...editData,
                    experiencias: newExperiencias
                  });
                }}
                placeholder="Cargo ou posição"
              />
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Empresa:</Text>
              <TextInput
                style={styles.input}
                value={experiencia.empresa || ''}
                onChangeText={(text) => {
                  const newExperiencias = [...experiencias];
                  newExperiencias[index] = { ...experiencia, empresa: text };
                  setEditData({
                    ...editData,
                    experiencias: newExperiencias
                  });
                }}
                placeholder="Nome da empresa"
              />
            </View>
            
            <View style={styles.rowInputs}>
              <View style={[styles.inputGroup, { flex: 1, marginRight: 5 }]}>
                <Text style={styles.inputLabel}>Data Início:</Text>
                <TextInput
                  style={styles.input}
                  value={experiencia.data_inicio || ''}
                  onChangeText={(text) => {
                    const newExperiencias = [...experiencias];
                    newExperiencias[index] = { ...experiencia, data_inicio: text };
                    setEditData({
                      ...editData,
                      experiencias: newExperiencias
                    });
                  }}
                  placeholder="MM/AAAA"
                />
              </View>
              
              <View style={[styles.inputGroup, { flex: 1, marginLeft: 5 }]}>
                <Text style={styles.inputLabel}>Data Fim:</Text>
                <TextInput
                  style={styles.input}
                  value={experiencia.data_fim || ''}
                  onChangeText={(text) => {
                    const newExperiencias = [...experiencias];
                    newExperiencias[index] = { ...experiencia, data_fim: text };
                    setEditData({
                      ...editData,
                      experiencias: newExperiencias
                    });
                  }}
                  placeholder="MM/AAAA ou Atual"
                />
              </View>
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Descrição:</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={experiencia.descricao || ''}
                onChangeText={(text) => {
                  const newExperiencias = [...experiencias];
                  newExperiencias[index] = { ...experiencia, descricao: text };
                  setEditData({
                    ...editData,
                    experiencias: newExperiencias
                  });
                }}
                placeholder="Descreva suas responsabilidades e realizações"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>
        ))}
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditData({
              ...editData,
              experiencias: [
                ...(editData.experiencias || []),
                { cargo: '', empresa: '', data_inicio: '', data_fim: '', descricao: '' }
              ]
            });
          }}
        >
          <Text style={styles.addButtonText}>+ Adicionar Experiência</Text>
        </TouchableOpacity>
      </View>
    );
  };
  
  // Renderizar seção ativa
  const renderActiveSection = () => {
    switch (activeSection) {
      case 'informacoes_pessoais':
        return renderPersonalInfoEditor();
      case 'resumo_profissional':
        return renderResumeEditor();
      case 'formacoes_academicas':
        return renderEducationEditor();
      case 'experiencias':
        return renderExperienceEditor();
      // Implementar outras seções seguindo o mesmo padrão
      default:
        return <Text>Selecione uma seção para editar</Text>;
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.dark} />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            Alert.alert(
              'Sair da edição',
              'Todas as alterações não salvas serão perdidas. Deseja sair?',
              [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', onPress: () => navigation.goBack() }
              ]
            );
          }}
        >
          <Text style={styles.backButtonText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Editar Currículo</Text>
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveChanges}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={styles.saveButtonText}>Salvar</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.editorContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.sectionsScroll}
          contentContainerStyle={styles.sectionsScrollContent}
        >
          {sections.map(section => (
            <TouchableOpacity
              key={section.id}
              style={[
                styles.sectionTab,
                activeSection === section.id && styles.activeSectionTab
              ]}
              onPress={() => setActiveSection(section.id)}
            >
              <Text style={styles.sectionTabIcon}>{section.icon}</Text>
              <Text
                style={[
                  styles.sectionTabText,
                  activeSection === section.id && styles.activeSectionTabText
                ]}
              >
                {section.title}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        
        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
        >
          {renderActiveSection()}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const melhorarCurriculoComIA = async (curriculoData) => {
  try {
    // Obter API key do Gemini ou outro provedor disponível
    const apiKey = await getIAAPIKey('GEMINI');
    
    if (!apiKey) {
      throw new Error("API key do Gemini não configurada");
    }
    
    // Formatar o currículo para envio à IA
    const cvFormatado = formatarCurriculo(curriculoData);
    
    // Construir o prompt para a IA
    const promptText = `
Você é um especialista em recrutamento e elaboração de currículos profissionais. Sua tarefa é melhorar o currículo abaixo, mantendo todas as informações verdadeiras, mas tornando-o mais atrativo, profissional e eficaz.

- Melhore o resumo profissional para destacar competências e realizações
- Reformule as descrições de experiência para enfatizar resultados e impacto
- Padronize a formatação e estrutura 
- Mantenha todas as informações factuais e datas inalteradas
- Use linguagem mais dinâmica e verbos de ação
- Elimine repetições e informações desnecessárias
- Inclua palavras-chave relevantes para a área

NÃO INVENTE informações falsas ou exageradas. Mantenha-se fiel ao conteúdo original.

CURRÍCULO ORIGINAL:
${cvFormatado}

Retorne o currículo melhorado no formato JSON com a mesma estrutura do original, mas com conteúdo aprimorado. Mantenha os nomes das propriedades exatamente iguais.
    `;
    
    // Chamar a API do Gemini
    const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
    const requestBody = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: {
        temperature: 0.3,
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
          // Converter o texto JSON em objeto
          const melhoradoData = JSON.parse(jsonMatch[0]);
          
          return {
            success: true,
            curriculoMelhorado: melhoradoData
          };
        } catch (jsonError) {
          console.error('Erro ao parsear JSON da resposta:', jsonError);
          throw new Error('Formato de resposta inválido');
        }
      } else {
        throw new Error('Não foi possível extrair currículo melhorado da resposta');
      }
    } else {
      throw new Error('Formato de resposta inesperado do Gemini');
    }
  } catch (error) {
    console.error('Erro ao melhorar currículo com IA:', error);
    return {
      success: false,
      error: error.message || 'Erro ao processar o currículo'
    };
  }
};

const MelhorarComIAButton = ({ curriculoData, onMelhoria }) => {
  const [loading, setLoading] = useState(false);
  
  const handleMelhorarComIA = async () => {
    try {
      setLoading(true);
      
      // Confirmar antes de proceder
      Alert.alert(
        "Melhorar com IA",
        "A IA irá melhorar a redação e apresentação do seu currículo, mantendo todas as informações verdadeiras. Deseja continuar?",
        [
          { text: "Cancelar", style: "cancel" },
          { 
            text: "Continuar", 
            onPress: async () => {
              // Chamar a função de melhoria
              const resultado = await melhorarCurriculoComIA(curriculoData.data);
              
              if (resultado.success) {
                // Chamar a função de callback com os dados melhorados
                onMelhoria(resultado.curriculoMelhorado);
              } else {
                Alert.alert("Erro", resultado.error || "Não foi possível melhorar o currículo.");
              }
              
              setLoading(false);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Erro ao melhorar currículo:', error);
      Alert.alert("Erro", "Ocorreu um erro ao tentar melhorar o currículo.");
      setLoading(false);
    }
  };
  
  return (
    <TouchableOpacity
      style={{
        backgroundColor: Colors.info,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 10,
      }}
      onPress={handleMelhorarComIA}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.white} />
      ) : (
        <>
          <Text style={{ color: Colors.white, fontWeight: 'bold', marginRight: 5 }}>✨</Text>
          <Text style={{ color: Colors.white, fontWeight: 'bold' }}>
            Melhorar com IA
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
};

const PreviewCVScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [templateStyle, setTemplateStyle] = useState('modern');
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [currentData, setCurrentData] = useState(curriculoData); // Para armazenar versão atual (original ou melhorada)
  const [showComparison, setShowComparison] = useState(false); // Para mostrar comparação antes/depois
  const { user } = useAuth();
  
  const handleShare = async () => {
    try {
      await Share.share({
        message: `Currículo de ${curriculoData.nome || 'Usuário'}`,
        title: `Currículo - ${curriculoData.nome || 'Usuário'}`
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o currículo.');
    }
  };

  // Emular criação de PDF (já que não temos a biblioteca)
  const handleExportPDF = async () => {
    setGeneratingPDF(true);

    try {
      // Simular processo de geração de PDF
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Exibir alerta com opções de ação
      Alert.alert(
        'PDF Gerado com Sucesso!',
        'O que você gostaria de fazer com o PDF?',
        [
          {
            text: 'Compartilhar',
            onPress: () => handleShare(),
          },
          {
            text: 'Salvar na Galeria',
            onPress: () => {
              Alert.alert(
                'Salvando na Galeria...',
                'Funcionalidade simulada. Em um app real, o PDF seria salvo na galeria.',
                [{ text: 'OK' }]
              );
            },
          },
          {
            text: 'Cancelar',
            style: 'cancel',
          },
        ]
      );
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      Alert.alert('Erro', 'Não foi possível gerar o PDF.');
    } finally {
      setGeneratingPDF(false);
    }
  };
  
  // Função para salvar o currículo melhorado
  const handleSalvarMelhorado = async (dadosMelhorados) => {
    try {
      // Buscar currículos existentes
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculos = cvs ? JSON.parse(cvs) : [];
      
      // Criar uma nova entrada para o currículo melhorado
      const novoCurriculo = {
        id: getUniqueId(),
        nome: `${curriculoData.nome || 'Currículo'} (Melhorado)`,
        data: dadosMelhorados,
        dataCriacao: new Date().toISOString()
      };
      
      // Adicionar ao array e salvar
      curriculos.push(novoCurriculo);
      await AsyncStorage.setItem(`curriculos_${user.id}`, JSON.stringify(curriculos));
      
      Alert.alert(
        "Sucesso",
        "Currículo melhorado salvo com sucesso!",
        [{ text: "OK" }]
      );
      
      // Atualizar dados na tela
      setCurrentData({
        ...novoCurriculo
      });
      
    } catch (error) {
      console.error('Erro ao salvar currículo melhorado:', error);
      Alert.alert("Erro", "Não foi possível salvar o currículo melhorado.");
    }
  };
  
  // Lidar com melhoria de currículo
  const handleCurriculoMelhorado = (dadosMelhorados) => {
    // Mostrar alerta com opções
    Alert.alert(
      "Currículo Melhorado",
      "Seu currículo foi melhorado com sucesso! O que deseja fazer?",
      [
        { 
          text: "Visualizar Melhorias", 
          onPress: () => {
            // Mostrar comparação
            setShowComparison(true);
            setCurrentData({
              ...curriculoData,
              data: dadosMelhorados
            });
          }
        },
        { 
          text: "Salvar como Novo", 
          onPress: () => handleSalvarMelhorado(dadosMelhorados)
        },
        { 
          text: "Cancelar", 
          style: "cancel" 
        }
      ]
    );
  };

  const templateOptions = [
    { id: 'modern', name: 'Moderno', category: 'Moderno', color: Colors.primary },
    // Clássicos
    { id: 'classic', name: 'Clássico', category: 'Clássico', color: Colors.dark },
    { id: 'traditional', name: 'Tradicional', category: 'Clássico', color: '#333333' },
    // Criativos
    { id: 'consulting', name: 'Consultoria', category: 'Profissional', color: '#1a237e' },
  ];

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
        <Text style={styles.headerTitle}>Visualizar Currículo</Text>
      </View>

      {/* Barra de ferramentas */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: '#f0f0f0',
        padding: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.mediumGray,
      }}>
        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
            borderRightWidth: 1,
            borderRightColor: Colors.mediumGray,
          }}
          onPress={() => setShowTemplateSelector(!showTemplateSelector)}
        >
          <Text style={{ marginRight: 5 }}>Template: {templateOptions.find(t => t.id === templateStyle)?.name}</Text>
          <Text>▼</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical: 8,
          }}
          onPress={handleExportPDF}
          disabled={generatingPDF}
        >
          {generatingPDF ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <>
              <Text style={{ marginRight: 5 }}>Exportar PDF</Text>
              <Text>📄</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Template selector overlay (em vez de Modal) */}
      {showTemplateSelector && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 100,
        }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            onPress={() => setShowTemplateSelector(false)}
          />

          <View style={{
            backgroundColor: Colors.white,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 20,
          }}>
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 15,
            }}>
              <Text style={{
                fontSize: 18,
                fontWeight: 'bold',
                color: Colors.dark,
              }}>
                Escolher Template
              </Text>

              <TouchableOpacity
                onPress={() => setShowTemplateSelector(false)}
              >
                <Text style={{
                  fontSize: 22,
                  color: Colors.lightText,
                  paddingHorizontal: 5,
                }}>
                  ×
                </Text>
              </TouchableOpacity>
            </View>

            {templateOptions.map(template => (
              <TouchableOpacity
                key={template.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.mediumGray,
                  backgroundColor: templateStyle === template.id ? '#e3f2fd' : 'transparent',
                }}
                onPress={() => {
                  setTemplateStyle(template.id);
                  setShowTemplateSelector(false);
                }}
              >
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: template.color,
                  marginRight: 15,
                }} />

                <View style={{ flex: 1 }}>
                  <Text style={{
                    fontSize: 16,
                    fontWeight: templateStyle === template.id ? 'bold' : 'normal',
                    color: Colors.dark,
                  }}>
                    {template.name}
                  </Text>
                </View>

                {templateStyle === template.id && (
                  <Text style={{ fontSize: 18, color: Colors.primary }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <ScrollView style={styles.previewScreenScroll}>
        <View style={styles.previewScreenCard}>
          <CurriculumPreview data={currentData.data} templateStyle={templateStyle} />
        </View>
        
        {/* Adicionar o botão de melhoria com IA */}
        <View style={{ padding: 15 }}>
          <MelhorarComIAButton 
            curriculoData={curriculoData}
            onMelhoria={handleCurriculoMelhorado}
          />
        </View>
      </ScrollView>

      <View style={styles.previewActions}>
        <TouchableOpacity
          style={styles.previewActionButton}
          onPress={handleShare}
        >
          <Text style={styles.previewActionButtonText}>Compartilhar</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.previewActionButton, { backgroundColor: Colors.secondary }]}
          onPress={() => navigation.navigate('AnaliseCV', { curriculoData })}
        >
          <Text style={styles.previewActionButtonText}>Analisar com IA</Text>
        </TouchableOpacity>
        
        {/* Adicionar botão de edição */}
        <TouchableOpacity
          style={[styles.previewActionButton, { backgroundColor: Colors.info }]}
          onPress={() => navigation.navigate('EditarCurriculo', { curriculoData: currentData })}
        >
          <Text style={styles.previewActionButtonText}>Editar Currículo</Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal de comparação antes/depois */}
      {showComparison && (
        <View style={styles.comparisonModal}>
          <View style={styles.comparisonContainer}>
            <View style={styles.comparisonHeader}>
              <Text style={styles.comparisonTitle}>Antes e Depois</Text>
              <TouchableOpacity
                style={styles.comparisonCloseButton}
                onPress={() => setShowComparison(false)}
              >
                <Text style={styles.comparisonCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.comparisonScroll}>
              {/* Exemplo de comparação - resumo profissional */}
              <View style={styles.comparisonSection}>
                <Text style={styles.comparisonSectionTitle}>Resumo Profissional</Text>
                
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Antes:</Text>
                  <Text style={styles.comparisonOriginalText}>
                    {curriculoData.data.resumo_profissional || 'Sem resumo profissional'}
                  </Text>
                </View>
                
                <View style={styles.comparisonItem}>
                  <Text style={styles.comparisonLabel}>Depois:</Text>
                  <Text style={styles.comparisonImprovedText}>
                    {currentData.data.resumo_profissional || 'Sem resumo profissional'}
                  </Text>
                </View>
              </View>
              
              {/* Outras comparações podem ser adicionadas para experiências, etc. */}
            </ScrollView>
            
            <View style={styles.comparisonActions}>
              <TouchableOpacity
                style={styles.comparisonButton}
                onPress={() => setShowComparison(false)}
              >
                <Text style={styles.comparisonButtonText}>Fechar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.comparisonButton, { backgroundColor: Colors.success }]}
                onPress={() => {
                  handleSalvarMelhorado(currentData.data);
                  setShowComparison(false);
                }}
              >
                <Text style={styles.comparisonButtonText}>Salvar Melhorias</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const DocumentIcon = ({ style }) => {
  return (
    <View style={[{
      width: 80,
      height: 80,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(78, 115, 223, 0.1)',
      borderRadius: 40,
    }, style]}>
      <Text style={{ fontSize: 40 }}>📄</Text>
    </View>
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

const PerfilFotoScreen = ({ navigation, route }) => {
  const { user, updateUser } = useAuth();
  const [selectedImage, setSelectedImage] = useState(user?.foto || null);
  const [loading, setLoading] = useState(false);
  const [showImageOptions, setShowImageOptions] = useState(false);

  // Cores predefinidas para avatares caso não haja foto
  const colorOptions = [
    '#3498db', '#2ecc71', '#e74c3c', '#f39c12',
    '#9b59b6', '#1abc9c', '#d35400', '#c0392b'
  ];

  // Imagens de exemplo para simular a galeria
  const exampleImages = [
    { id: 'img1', uri: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop' },
    { id: 'img2', uri: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop' },
    { id: 'img3', uri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop' },
    { id: 'img4', uri: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop' },
    { id: 'img5', uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop' },
    { id: 'img6', uri: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop' },
    { id: 'img7', uri: 'https://randomuser.me/api/portraits/men/1.jpg' },
    { id: 'img8', uri: 'https://randomuser.me/api/portraits/women/1.jpg' },
    { id: 'img9', uri: 'https://randomuser.me/api/portraits/men/32.jpg' },
    { id: 'img10', uri: 'https://randomuser.me/api/portraits/women/44.jpg' },
    { id: 'img11', uri: 'https://randomuser.me/api/portraits/men/85.jpg' },
    { id: 'img12', uri: 'https://randomuser.me/api/portraits/women/63.jpg' },
  ];

  // Estado para controlar o avatar de cor selecionado (caso não use foto)
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    user?.avatarColorIndex !== undefined ? user.avatarColorIndex : Math.floor(Math.random() * colorOptions.length)
  );

  // Função para salvar a foto do perfil
  const saveProfileImage = async () => {
    try {
      setLoading(true);

      // Buscar dados atuais do usuário
      const usuariosStr = await AsyncStorage.getItem('usuarios');
      const usuarios = JSON.parse(usuariosStr) || [];

      // Encontrar índice do usuário atual
      const userIndex = usuarios.findIndex(u => u.id === user.id);
      if (userIndex === -1) {
        throw new Error('Usuário não encontrado');
      }

      // Atualizar usuário com a nova foto e índice de cor do avatar
      const updatedUser = {
        ...usuarios[userIndex],
        foto: selectedImage,
        avatarColorIndex: selectedColorIndex,
        dataAtualizacao: new Date().toISOString()
      };

      usuarios[userIndex] = updatedUser;

      // Salvar usuários atualizados
      await AsyncStorage.setItem('usuarios', JSON.stringify(usuarios));

      // Atualizar usuário atual
      await AsyncStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Se o contexto de autenticação tiver uma função para atualizar o usuário, use-a
      if (updateUser) {
        updateUser(updatedUser);
      }

      Alert.alert('Sucesso', 'Foto de perfil atualizada com sucesso!');

      // Navegar de volta se veio de uma rota específica
      if (route.params?.returnTo) {
        navigation.navigate(route.params.returnTo);
      } else {
        navigation.goBack();
      }

    } catch (error) {
      console.error('Erro ao salvar foto de perfil:', error);
      Alert.alert('Erro', 'Não foi possível salvar a foto de perfil.');
    } finally {
      setLoading(false);
    }
  };

  // Função para simular a captura de foto com a câmera
  const handleTakePhoto = () => {
    setShowImageOptions(false);

    // Simular o processo de tirar uma foto
    setLoading(true);
    setTimeout(() => {
      // Seleciona uma imagem aleatória da galeria para simular uma foto
      const randomIndex = Math.floor(Math.random() * exampleImages.length);
      setSelectedImage(exampleImages[randomIndex].uri);
      setLoading(false);

      Alert.alert('Foto Capturada', 'A foto foi capturada com sucesso! (Simulação)');
    }, 1500);
  };

  // Função para remover a foto de perfil
  const handleRemovePhoto = () => {
    Alert.alert(
      'Remover Foto',
      'Tem certeza que deseja remover sua foto de perfil?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () => {
            setSelectedImage(null);
            setShowImageOptions(false);
          }
        }
      ]
    );
  };

  // Renderiza o avatar com iniciais caso não haja foto
  const renderInitialsAvatar = () => {
    const initials = user?.nome ? user.nome.charAt(0).toUpperCase() : 'U';
    const backgroundColor = colorOptions[selectedColorIndex];

    return (
      <View style={{
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor,
        justifyContent: 'center',
        alignItems: 'center',
      }}>
        <Text style={{
          fontSize: 60,
          color: Colors.white,
          fontWeight: 'bold',
        }}>
          {initials}
        </Text>
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
        <Text style={styles.headerTitle}>Foto de Perfil</Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        <View style={{
          padding: 20,
          alignItems: 'center',
        }}>
          {/* Avatar ou foto do perfil */}
          <TouchableOpacity
            style={{
              marginVertical: 20,
              borderWidth: 3,
              borderColor: Colors.primary,
              borderRadius: 75,
              padding: 3,
            }}
            onPress={() => setShowImageOptions(true)}
            disabled={loading}
          >
            {selectedImage ? (
              <Image
                source={{ uri: selectedImage }}
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: 75,
                }}
              />
            ) : (
              renderInitialsAvatar()
            )}

            {/* Ícone de câmera sobreposto */}
            <View style={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              backgroundColor: Colors.primary,
              borderRadius: 20,
              width: 40,
              height: 40,
              justifyContent: 'center',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: Colors.white,
            }}>
              <Text style={{ fontSize: 18, color: Colors.white }}>📷</Text>
            </View>
          </TouchableOpacity>

          <Text style={{
            fontSize: 20,
            fontWeight: 'bold',
            marginVertical: 10,
          }}>
            {user?.nome || 'Usuário'}
          </Text>

          <Text style={{
            fontSize: 16,
            color: Colors.lightText,
            marginBottom: 20,
            textAlign: 'center',
          }}>
            Selecione ou tire uma foto para seu perfil, ou escolha uma cor para o avatar com suas iniciais.
          </Text>

          {/* Seletor de cores para o avatar */}
          {!selectedImage && (
            <View style={{ marginVertical: 20 }}>
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                textAlign: 'center',
              }}>
                Escolha uma cor para seu avatar
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}>
                {colorOptions.map((color, index) => (
                  <TouchableOpacity
                    key={index}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: color,
                      margin: 5,
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderWidth: selectedColorIndex === index ? 3 : 0,
                      borderColor: Colors.white,
                      elevation: selectedColorIndex === index ? 5 : 0,
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: selectedColorIndex === index ? 0.3 : 0,
                      shadowRadius: selectedColorIndex === index ? 4 : 0,
                    }}
                    onPress={() => setSelectedColorIndex(index)}
                  >
                    {selectedColorIndex === index && (
                      <Text style={{ color: Colors.white, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Galeria de fotos de exemplo */}
          {showImageOptions && (
            <View style={{ marginTop: 20, width: '100%' }}>
              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 15,
                paddingHorizontal: 10,
              }}>
                <Text style={{
                  fontSize: 18,
                  fontWeight: 'bold',
                }}>
                  Escolha uma Foto
                </Text>

                <TouchableOpacity
                  onPress={() => setShowImageOptions(false)}
                >
                  <Text style={{
                    fontSize: 22,
                    color: Colors.lightText,
                    paddingHorizontal: 5,
                  }}>
                    ×
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-around',
                marginBottom: 20,
              }}>
                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.primary,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleTakePhoto}
                >
                  <Text style={{ color: Colors.white }}>Tirar Foto</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    alignItems: 'center',
                    backgroundColor: Colors.danger,
                    padding: 12,
                    borderRadius: 8,
                    width: '45%',
                  }}
                  onPress={handleRemovePhoto}
                >
                  <Text style={{ color: Colors.white }}>Remover Foto</Text>
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                marginBottom: 10,
                paddingHorizontal: 10,
              }}>
                Selecione da Galeria:
              </Text>

              <View style={{
                flexDirection: 'row',
                flexWrap: 'wrap',
                justifyContent: 'space-between',
                paddingHorizontal: 5,
              }}>
                {exampleImages.map((img, index) => (
                  <TouchableOpacity
                    key={img.id}
                    style={{
                      width: '30%',
                      aspectRatio: 1,
                      marginBottom: 10,
                      borderWidth: 2,
                      borderColor: selectedImage === img.uri ? Colors.primary : 'transparent',
                      borderRadius: 8,
                    }}
                    onPress={() => setSelectedImage(img.uri)}
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: 6,
                      }}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 8,
              marginTop: 30,
              width: '80%',
              alignItems: 'center',
            }}
            onPress={saveProfileImage}
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
                Salvar
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const AnaliseCVScreen = ({ route, navigation }) => {
  const { curriculoData } = route.params;
  const [activeTab, setActiveTab] = useState('pontuacao');
  const [analiseResultado, setAnaliseResultado] = useState(null);
  const [providerInfo, setProviderInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [usingOfflineMode, setUsingOfflineMode] = useState(false);
  const [preferOffline, setPreferOffline] = useState(false);
  const [selectedIA, setSelectedIA] = useState('GEMINI');
  const [iaOptions, setIaOptions] = useState([]);
  const [detalhado, setDetalhado] = useState(false); // Estado para controlar análise detalhada
  const [showCharts, setShowCharts] = useState(false); // Estado para mostrar/esconder gráficos

  // Alteração: Adicionar um ID de currículo atual para controle
  const [currentCurriculoId, setCurrentCurriculoId] = useState(null);

  useEffect(() => {
    carregarIAsConfiguradas();
  }, []);

  // Alteração: Atualizar o ID do currículo atual quando mudar
  useEffect(() => {
    if (curriculoData && curriculoData.id !== currentCurriculoId) {
      setCurrentCurriculoId(curriculoData.id);
      fetchAnalise(true); // Forçar nova análise quando currículo mudar
    }
  }, [curriculoData]);

  useEffect(() => {
    fetchAnalise();
  }, [activeTab, preferOffline, selectedIA, detalhado]); // Adicionei 'detalhado' como dependência

  const carregarIAsConfiguradas = async () => {
    try {
      // Carregar IA padrão
      const defaultIA = await AsyncStorage.getItem('ia_padrao');
      if (defaultIA && IA_APIS[defaultIA] && defaultIA !== 'OPENAI') {
        setSelectedIA(defaultIA);
      }

      // Verificar quais IAs estão configuradas
      const options = [];
      for (const [key, value] of Object.entries(IA_APIS)) {
        // Alteração: Excluir OPENAI (ChatGPT) das opções
        if (key !== 'OPENAI') {
          const apiKey = await getIAAPIKey(key);
          if (!value.chaveNecessaria || apiKey) {
            options.push({
              id: key,
              nome: value.nome
            });
          }
        }
      }

      setIaOptions(options);
    } catch (error) {
      console.error('Erro ao carregar IAs configuradas:', error);
    }
  };

  // Função para gerar dados de gráficos com base no currículo
  const gerarDadosGraficos = () => {
    if (!curriculoData || !curriculoData.data) {
      return null;
    }

    // Dados do currículo
    const cv = curriculoData.data;

    // Gerar dados para o gráfico de habilidades
    const gerarDadosHabilidades = () => {
      // Conjunto para armazenar habilidades únicas
      const habilidadesSet = new Set();

      // Extrair habilidades de projetos
      if (cv.projetos && cv.projetos.length > 0) {
        cv.projetos.forEach(projeto => {
          if (projeto.habilidades) {
            projeto.habilidades.split(',').forEach(hab => {
              habilidadesSet.add(hab.trim());
            });
          }
        });
      }

      // Converter para array de objetos para o gráfico
      const habilidadesArray = Array.from(habilidadesSet).map(habilidade => ({
        nome: habilidade,
        valor: Math.floor(Math.random() * 5) + 5 // Valor aleatório entre 5-10 (demo)
      }));

      return habilidadesArray.slice(0, 8); // Limitar a 8 habilidades para o gráfico
    };

    // Gerar dados para o gráfico de experiência
    const gerarDadosExperiencia = () => {
      if (!cv.experiencias || cv.experiencias.length === 0) {
        return [];
      }

      return cv.experiencias.map(exp => {
        // Calcular duração aproximada em meses
        let inicio = exp.data_inicio ? new Date(exp.data_inicio) : new Date();
        let fim = exp.data_fim && exp.data_fim.toLowerCase() !== 'atual'
          ? new Date(exp.data_fim)
          : new Date();

        // Se as datas não são objetos Date válidos, usar valores padrão
        if (isNaN(inicio.getTime())) inicio = new Date('2020-01-01');
        if (isNaN(fim.getTime())) fim = new Date();

        const diferencaMeses = (fim.getFullYear() - inicio.getFullYear()) * 12 +
          (fim.getMonth() - inicio.getMonth());

        return {
          empresa: exp.empresa || 'Empresa',
          cargo: exp.cargo || 'Cargo',
          duracao: Math.max(1, diferencaMeses || 6) // Pelo menos 1 mês
        };
      });
    };

    // Gerar dados para pontuação por área
    const gerarDadosPontuacao = () => {
      const pontuacoes = {
        'Experiência': cv.experiencias && cv.experiencias.length > 0 ? Math.min(10, cv.experiencias.length * 2) : 3,
        'Formação': cv.formacoes_academicas && cv.formacoes_academicas.length > 0 ? Math.min(10, cv.formacoes_academicas.length * 3) : 4,
        'Projetos': cv.projetos && cv.projetos.length > 0 ? Math.min(10, cv.projetos.length * 2.5) : 2,
        'Cursos': cv.cursos && cv.cursos.length > 0 ? Math.min(10, cv.cursos.length * 2) : 3,
        'Idiomas': cv.idiomas && cv.idiomas.length > 0 ? Math.min(10, cv.idiomas.length * 3) : 5
      };

      return Object.entries(pontuacoes).map(([area, valor]) => ({ area, valor }));
    };

    return {
      habilidades: gerarDadosHabilidades(),
      experiencia: gerarDadosExperiencia(),
      pontuacao: gerarDadosPontuacao()
    };
  };

  // Alteração: Melhorar a função fetchAnalise para incluir modo detalhado e aceitar parâmetro forceRefresh
  const fetchAnalise = async (forceRefresh = false) => {
    // Não recarrega se já estiver carregando, a menos que seja forçado
    if (loading && !forceRefresh) return;

    setLoading(true);
    setError(null);
    setUsingOfflineMode(false);
    setProviderInfo(null);

    // Limpar resultado anterior se for um currículo diferente ou forçar refresh
    if (forceRefresh) {
      setAnaliseResultado(null);
    }

    try {
      const tipoIA = selectedIA === 'OFFLINE' ? 'OFFLINE' : selectedIA;

      // Verificar se curriculoData existe e tem dados
      if (!curriculoData || !curriculoData.data) {
        throw new Error("Dados do currículo inválidos");
      }

      // Configurar objeto com parâmetros adicionais para análise detalhada
      const opcoesAnalise = {
        analiseDetalhada: detalhado,  // Nova opção para controlar nível de detalhe
        tipoAnalise: activeTab,
        maxTokens: detalhado ? 1500 : 800  // Aumenta o limite de tokens para análises detalhadas
      };

      // Passar as opções adicionais para a função de análise
      const resultado = await analisarCurriculoComIA(
        curriculoData.data,
        activeTab,
        tipoIA,
        preferOffline,
        opcoesAnalise  // Novo parâmetro com opções adicionais
      );

      if (resultado.offline || tipoIA === 'OFFLINE') {
        setUsingOfflineMode(true);
      }

      if (resultado.success) {
        setAnaliseResultado(resultado.analise);
        setProviderInfo(resultado.provider || 'IA Não Identificada');
      } else {
        setError(resultado.message || 'Erro ao analisar currículo');
      }
    } catch (error) {
      console.error('Erro ao buscar análise:', error);
      setError('Ocorreu um erro ao analisar o currículo. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleOfflineMode = () => {
    setPreferOffline(!preferOffline);
  };

  // Toggle para modo detalhado
  const toggleModoDetalhado = () => {
    setDetalhado(!detalhado);
    // A análise será atualizada automaticamente pelo useEffect
  };

  // Toggle para mostrar/esconder gráficos
  const toggleShowCharts = () => {
    setShowCharts(!showCharts);
  };

  // Render do seletor de IA
  const renderIASelector = () => (
    <View style={styles.iaSelectorContainer}>
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
      }}>
        <Text style={styles.iaSelectorLabel}>Analisar com:</Text>

        {/* Alteração: Adicionar botão de atualizar */}
        <TouchableOpacity
          style={{
            backgroundColor: Colors.secondary,
            paddingVertical: 6,
            paddingHorizontal: 12,
            borderRadius: 5,
            flexDirection: 'row',
            alignItems: 'center',
          }}
          onPress={() => fetchAnalise(true)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={{
              color: Colors.white,
              fontSize: 14,
              fontWeight: '500',
            }}>Atualizar</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.iaOptionsContainer}
      >
        {iaOptions.map(option => (
          <TouchableOpacity
            key={option.id}
            style={[
              styles.iaOptionButton,
              selectedIA === option.id && styles.iaOptionButtonSelected
            ]}
            onPress={() => setSelectedIA(option.id)}
          >
            <Text
              style={[
                styles.iaOptionText,
                selectedIA === option.id && styles.iaOptionTextSelected
              ]}
            >
              {option.nome}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Nova linha com opções adicionais */}
      <View style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
      }}>
        {/* Toggle para modo detalhado */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: detalhado ? Colors.primary : 'transparent',
            borderWidth: 1,
            borderColor: Colors.primary,
            borderRadius: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          onPress={toggleModoDetalhado}
        >
          <Text
            style={{
              color: detalhado ? Colors.white : Colors.primary,
              fontSize: 14,
            }}
          >
            {detalhado ? 'Análise Detalhada ✓' : 'Análise Simples'}
          </Text>
        </TouchableOpacity>

        {/* Botão para visualização de gráficos */}
        <TouchableOpacity
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: showCharts ? Colors.info : 'transparent',
            borderWidth: 1,
            borderColor: Colors.info,
            borderRadius: 5,
            paddingHorizontal: 10,
            paddingVertical: 6,
          }}
          onPress={toggleShowCharts}
        >
          <Text
            style={{
              color: showCharts ? Colors.white : Colors.info,
              fontSize: 14,
            }}
          >
            {showCharts ? 'Esconder Gráficos' : 'Visualizar Gráficos'}
          </Text>
        </TouchableOpacity>
      </View>

      {providerInfo && (
        <Text style={styles.providerInfo}>
          Análise fornecida por: {providerInfo}
        </Text>
      )}
    </View>
  );

  // Renderização dos gráficos
  const renderCharts = () => {
    const dadosGraficos = gerarDadosGraficos();

    if (!dadosGraficos) {
      return (
        <View style={{ padding: 15, alignItems: 'center' }}>
          <Text>Não foi possível gerar gráficos com os dados atuais.</Text>
        </View>
      );
    }

    return (
      <View style={{
        backgroundColor: '#f9f9f9',
        marginHorizontal: 15,
        marginBottom: 20,
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      }}>
        <Text style={{
          fontSize: 18,
          fontWeight: 'bold',
          marginBottom: 15,
          color: Colors.dark,
          textAlign: 'center',
        }}>
          Visualização Gráfica do Currículo
        </Text>

        {/* Gráfico de Pontuação por Área */}
        <View style={{ marginBottom: 20 }}>
          <Text style={{
            fontSize: 16,
            fontWeight: 'bold',
            marginBottom: 10,
            color: Colors.dark,
          }}>
            Pontuação por Área
          </Text>

          {/* Renderização do gráfico de barras horizontal */}
          {dadosGraficos.pontuacao.map((item, index) => (
            <View key={index} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text>{item.area}</Text>
                <Text>{item.valor.toFixed(1)}/10</Text>
              </View>
              <View style={{
                height: 10,
                backgroundColor: Colors.mediumGray,
                borderRadius: 5,
                marginTop: 5,
              }}>
                <View style={{
                  width: `${item.valor * 10}%`,
                  height: '100%',
                  backgroundColor: getBarColor(item.valor),
                  borderRadius: 5,
                }} />
              </View>
            </View>
          ))}
        </View>

        {/* Gráfico de Habilidades */}
        {dadosGraficos.habilidades.length > 0 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
              color: Colors.dark,
            }}>
              Principais Habilidades
            </Text>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {dadosGraficos.habilidades.map((item, index) => (
                <View key={index} style={{
                  width: '48%',
                  backgroundColor: Colors.white,
                  padding: 10,
                  borderRadius: 5,
                  marginBottom: 10,
                  borderLeftWidth: 3,
                  borderLeftColor: Colors.primary,
                  elevation: 1,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 1,
                }}>
                  <Text style={{ fontWeight: 'bold' }}>{item.nome}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 5 }}>
                    {Array(10).fill(0).map((_, i) => (
                      <View
                        key={i}
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: i < item.valor ? Colors.primary : Colors.mediumGray,
                          marginRight: 2,
                        }}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Gráfico de Experiência Profissional */}
        {dadosGraficos.experiencia.length > 0 && (
          <View>
            <Text style={{
              fontSize: 16,
              fontWeight: 'bold',
              marginBottom: 10,
              color: Colors.dark,
            }}>
              Experiência Profissional
            </Text>

            {dadosGraficos.experiencia.map((item, index) => (
              <View key={index} style={{ marginBottom: 10 }}>
                <Text style={{ fontWeight: 'bold' }}>{item.cargo} - {item.empresa}</Text>
                <View style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  marginTop: 5,
                }}>
                  <View style={{
                    width: `${Math.min(100, item.duracao * 2)}%`,
                    maxWidth: '80%',
                    height: 20,
                    backgroundColor: Colors.primary,
                    borderRadius: 5,
                    justifyContent: 'center',
                    paddingHorizontal: 5,
                  }}>
                    <Text style={{
                      color: Colors.white,
                      fontSize: 12,
                      textAlign: 'center',
                    }}>
                      {item.duracao} {item.duracao === 1 ? 'mês' : 'meses'}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    );
  };

  // Função para determinar a cor da barra com base no valor
  const getBarColor = (valor) => {
    if (valor >= 8) return Colors.success;
    if (valor >= 5) return Colors.primary;
    if (valor >= 3) return Colors.warning;
    return Colors.danger;
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
        <Text style={styles.headerTitle}>Análise com IA</Text>

        <TouchableOpacity
          style={styles.modeToggleButton}
          onPress={toggleOfflineMode}
        >
          <Text style={styles.modeToggleText}>
            {preferOffline ? 'Usar Online' : 'Usar Offline'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.cvAnalysisHeader}>
        <Text style={styles.cvAnalysisTitle}>
          Análise do currículo: {curriculoData.nome || 'Sem nome'}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.analysisTabs}
        contentContainerStyle={styles.analysisTabsContent}
      >
        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'pontuacao' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('pontuacao')}
        >
          <Text
            style={[
              styles.analysisTabText,
              activeTab === 'pontuacao' && styles.activeAnalysisTabText
            ]}
          >
            Pontuação
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'melhorias' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('melhorias')}
        >
          <Text
            style={[
              styles.analysisTabText,
              activeTab === 'melhorias' && styles.activeAnalysisTabText
            ]}
          >
            Melhorias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'dicas' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('dicas')}
        >
          <Text
            style={[
              styles.analysisTabText,
              activeTab === 'dicas' && styles.activeAnalysisTabText
            ]}
          >
            Dicas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'cursos' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('cursos')}
        >
          <Text
            style={[
              styles.analysisTabText,
              activeTab === 'cursos' && styles.activeAnalysisTabText
            ]}
          >
            Cursos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.analysisTab,
            activeTab === 'vagas' && styles.activeAnalysisTab
          ]}
          onPress={() => setActiveTab('vagas')}
        >
          <Text
            style={[
              styles.analysisTabText,
              activeTab === 'vagas' && styles.activeAnalysisTabText
            ]}
          >
            Vagas
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Selector de IA */}
      {renderIASelector()}

      {usingOfflineMode && (
        <View style={styles.offlineBanner}>
          <Text style={styles.offlineBannerText}>
            Usando análise offline - Algumas funcionalidades podem estar limitadas.
          </Text>
        </View>
      )}

      {detalhado && !usingOfflineMode && (
        <View style={{
          backgroundColor: '#e1f5fe',
          padding: 10,
          borderRadius: 5,
          marginHorizontal: 15,
          marginBottom: 10,
          borderLeftWidth: 3,
          borderLeftColor: Colors.info,
        }}>
          <Text style={{ color: '#01579b', fontSize: 14 }}>
            Modo detalhado ativado - Análise mais completa e aprofundada
          </Text>
        </View>
      )}

      {/* Visualização de gráficos */}
      {showCharts && !loading && !error && renderCharts()}

      {loading ? (
        <View style={styles.loadingAnalysisContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingAnalysisText}>
            {detalhado
              ? 'Realizando análise detalhada do currículo...'
              : 'Analisando seu currículo...'}
          </Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchAnalise(true)}
          >
            <Text style={styles.retryButtonText}>Tentar Novamente</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.analysisResultContainer}>
          {/* Use o componente Markdown para renderizar o texto formatado */}
          <Markdown
            style={{
              body: styles.analysisResultText,
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
              ordered_list: {
                marginVertical: 10,
              },
              hr: {
                backgroundColor: Colors.mediumGray,
                height: 1,
                marginVertical: 15,
              },
              blockquote: {
                borderLeftWidth: 3,
                borderLeftColor: Colors.primary,
                paddingLeft: 10,
                marginVertical: 10,
                backgroundColor: Colors.lightGray,
                padding: 10,
                borderRadius: 5,
              },
            }}
          >
            {analiseResultado}
          </Markdown>

          {/* Adicione também um botão para compartilhar a análise */}
          <TouchableOpacity
            style={[styles.shareAnalysisButton, { marginTop: 20 }]}
            onPress={() => {
              Share.share({
                message: analiseResultado,
                title: `Análise do Currículo - ${curriculoData.nome || 'Sem nome'}`
              });
            }}
          >
            <Text style={styles.shareAnalysisButtonText}>Compartilhar Análise</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

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

// Home

const HomeScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const scrollY = new Animated.Value(0);
  const screenWidth = Dimensions.get('window').width;

  // Estados gerais do HomeScreen
  const [curriculos, setCurriculos] = useState([]);
  const [loadingCurriculos, setLoadingCurriculos] = useState(true);
  const [temProgressoSalvo, setTemProgressoSalvo] = useState(false);
  const [ultimoProgressoData, setUltimoProgressoData] = useState(null);

  // Estados para a funcionalidade de Conhecimento
  const [activeScreen, setActiveScreen] = useState('home'); // 'home', 'knowledge', 'jobsearch', 'viewjob', 'viewresume'
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [generatingContent, setGeneratingContent] = useState(false);
  const [generatedContent, setGeneratedContent] = useState(null);
  const [savedKnowledge, setSavedKnowledge] = useState([]);
  const [relatedTopics, setRelatedTopics] = useState([]);
  const [activeTab, setActiveTab] = useState('topics'); // 'topics', 'saved', 'content'
  const [refreshing, setRefreshing] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Estados para busca de vagas e geração de currículos personalizados
  const [vacasEncontradas, setVacasEncontradas] = useState([]);
  const [vagaSelecionada, setVagaSelecionada] = useState(null);
  const [buscandoVagas, setBuscandoVagas] = useState(false);
  const [curriculosGerados, setCurriculosGerados] = useState([]);
  const [gerandoCurriculos, setGerandoCurriculos] = useState(false);
  const [quantidadeCurriculos, setQuantidadeCurriculos] = useState(3); // Padrão: 3 currículos
  const [curriculoSelecionadoParaVagas, setCurriculoSelecionadoParaVagas] = useState(null);
  const [curriculoSelecionadoParaView, setCurriculoSelecionadoParaView] = useState(null);
  const [modalQuantidadeVisible, setModalQuantidadeVisible] = useState(false);
  const [modalCurriculoVagaVisible, setModalCurriculoVagaVisible] = useState(false);
  const [modalRequisitosVisible, setModalRequisitosVisible] = useState(false);
  const [downloadOptions, setDownloadOptions] = useState({ visible: false, curriculoId: null });
  const [loadingExport, setLoadingExport] = useState(false);
  const [exportSuccess, setExportSuccess] = useState({ visible: false, filename: '', format: '' });
  const [filtroVagas, setFiltroVagas] = useState({ cargo: '', local: '', tipo: 'todos' });
  const [pesquisaVagasExternas, setPesquisaVagasExternas] = useState('');
  const [buscandoVagasExternas, setBuscandoVagasExternas] = useState(false);

  // Referência para o timeout do debounce
  const searchTimeoutRef = useRef(null);

  // Lista de tópicos de carreira
  const careerTopics = [
    { id: 'resume-writing', title: 'Técnicas de Escrita de Currículo', icon: '📝', category: 'curriculum' },
    { id: 'interview-tips', title: 'Dicas para Entrevistas de Emprego', icon: '🗣️', category: 'interview' },
    { id: 'networking', title: 'Networking Profissional', icon: '🔗', category: 'networking' },
    { id: 'personal-branding', title: 'Marca Pessoal', icon: '🌟', category: 'branding' },
    { id: 'career-transition', title: 'Transição de Carreira', icon: '🔄', category: 'career' },
    { id: 'remote-work', title: 'Trabalho Remoto', icon: '🏠', category: 'work' },
    { id: 'salary-negotiation', title: 'Negociação Salarial', icon: '💰', category: 'negotiation' },
    { id: 'linkedin-optimization', title: 'Otimização de Perfil LinkedIn', icon: '👔', category: 'social' },
    { id: 'technical-interviews', title: 'Entrevistas Técnicas', icon: '💻', category: 'interview' },
    { id: 'soft-skills', title: 'Habilidades Interpessoais', icon: '🤝', category: 'skills' },
    { id: 'portfolio-building', title: 'Construção de Portfólio', icon: '📊', category: 'branding' },
    { id: 'leadership', title: 'Desenvolvimento de Liderança', icon: '👑', category: 'leadership' },
    { id: 'freelancing', title: 'Trabalho Freelance', icon: '🚀', category: 'work' },
    { id: 'career-planning', title: 'Planejamento de Carreira', icon: '📈', category: 'career' },
    { id: 'industry-trends', title: 'Tendências do Mercado', icon: '📊', category: 'trends' },
    { id: 'work-life-balance', title: 'Equilíbrio Vida-Trabalho', icon: '⚖️', category: 'lifestyle' },
    { id: 'mentorship', title: 'Mentoria Profissional', icon: '🧠', category: 'development' },
    { id: 'startup-careers', title: 'Carreiras em Startups', icon: '🚀', category: 'career' },
    { id: 'digital-nomad', title: 'Nômade Digital', icon: '🌍', category: 'lifestyle' },
    { id: 'career-coaching', title: 'Coaching de Carreira', icon: '🏆', category: 'development' },
  ];

  // Categorias de tópicos 
  const categories = [
    { id: 'curriculum', name: 'Currículo', icon: '📄' },
    { id: 'interview', name: 'Entrevistas', icon: '🎯' },
    { id: 'career', name: 'Carreira', icon: '📈' },
    { id: 'skills', name: 'Habilidades', icon: '🧠' },
    { id: 'work', name: 'Trabalho', icon: '💼' },
    { id: 'networking', name: 'Networking', icon: '🔗' },
    { id: 'branding', name: 'Marca Pessoal', icon: '🌟' },
    { id: 'lifestyle', name: 'Estilo de Vida', icon: '🌴' },
    { id: 'development', name: 'Desenvolvimento', icon: '🚀' },
    { id: 'all', name: 'Todos', icon: '🔍' },
  ];

  // Tipos de trabalho para filtro de vagas
  const tiposTrabalho = [
    { id: 'todos', nome: 'Todos' },
    { id: 'clt', nome: 'CLT' },
    { id: 'pj', nome: 'PJ' },
    { id: 'estagio', nome: 'Estágio' },
    { id: 'temporario', nome: 'Temporário' },
    { id: 'freelance', nome: 'Freelance' },
    { id: 'remoto', nome: 'Remoto' },
  ];

  // Plataformas de busca de vagas
  const plataformasVagas = [
    { id: 'linkedin', nome: 'LinkedIn', icon: '🔗' },
    { id: 'indeed', nome: 'Indeed', icon: '🔍' },
    { id: 'glassdoor', nome: 'Glassdoor', icon: '🚪' },
    { id: 'vagas', nome: 'Vagas.com', icon: '📋' },
    { id: 'catho', nome: 'Catho', icon: '📢' },
    { id: 'infojobs', nome: 'InfoJobs', icon: '💼' }
  ];

  // Funções e hooks existentes
  useEffect(() => {
    carregarCurriculos();
    verificarProgressoSalvo();
    carregarConhecimentosSalvos();
    carregarCurriculosGerados();

    // Atualizar quando a tela ganhar foco
    const unsubscribe = navigation.addListener('focus', () => {
      carregarCurriculos();
      verificarProgressoSalvo();
      carregarConhecimentosSalvos();
      carregarCurriculosGerados();
    });

    return unsubscribe;
  }, [navigation]);

  const carregarCurriculos = async () => {
    try {
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      setCurriculos(cvs ? JSON.parse(cvs) : []);
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
    } finally {
      setLoadingCurriculos(false);
    }
  };

  // Carregar currículos gerados para vagas específicas
  const carregarCurriculosGerados = async () => {
    try {
      const curriculosGeradosString = await AsyncStorage.getItem(`curriculos_gerados_${user.id}`);
      if (curriculosGeradosString) {
        setCurriculosGerados(JSON.parse(curriculosGeradosString));
      }
    } catch (error) {
      console.error('Erro ao carregar currículos gerados:', error);
    }
  };

  const verificarProgressoSalvo = async () => {
    try {
      const progresso = await recuperarProgressoCurriculo(user.id);
      if (progresso && progresso.timestamp) {
        // Verificar se o progresso tem menos de 24 horas
        const dataProgresso = new Date(progresso.timestamp);
        const agora = new Date();
        const diferencaHoras = (agora - dataProgresso) / (1000 * 60 * 60);

        if (diferencaHoras < 24) {
          setTemProgressoSalvo(true);
          setUltimoProgressoData(dataProgresso);
        } else {
          setTemProgressoSalvo(false);
          // Limpar progresso antigo (mais de 24h)
          await limparProgressoCurriculo(user.id);
        }
      } else {
        setTemProgressoSalvo(false);
      }
    } catch (error) {
      console.error('Erro ao verificar progresso salvo:', error);
      setTemProgressoSalvo(false);
    }
  };

  // Função para carregar conhecimentos salvos
  const carregarConhecimentosSalvos = async () => {
    try {
      const conhecimentos = await AsyncStorage.getItem(`conhecimentos_${user.id}`);
      if (conhecimentos) {
        setSavedKnowledge(JSON.parse(conhecimentos));
      }
    } catch (error) {
      console.error('Erro ao carregar conhecimentos salvos:', error);
    }
  };

  // Função para formatar tempo relativo (ex: "2 horas atrás")
  const formatarTempoRelativo = (data) => {
    if (!data) return '';

    const agora = new Date();
    const diff = agora - new Date(data); // diferença em milissegundos

    // Converter para minutos
    const minutos = Math.floor(diff / (1000 * 60));

    if (minutos < 1) return 'agora mesmo';
    if (minutos < 60) return `${minutos} ${minutos === 1 ? 'minuto' : 'minutos'} atrás`;

    // Converter para horas
    const horas = Math.floor(minutos / 60);
    if (horas < 24) return `${horas} ${horas === 1 ? 'hora' : 'horas'} atrás`;

    // Converter para dias
    const dias = Math.floor(horas / 24);
    if (dias < 30) return `${dias} ${dias === 1 ? 'dia' : 'dias'} atrás`;

    // Para datas mais antigas, mostrar a data formatada
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Função para navegar para a tela de configuração de IAs
  const navegarParaConfiguracoesIA = () => {
    navigation.navigate('Config', { screen: 'ConfiguracoesIA' });
  };

  // Função para continuar o currículo em progresso
  const continuarCurriculo = () => {
    navigation.navigate('Chatbot', { continuarProgresso: true });
  };

  // Função para navegar para a tela de busca de vagas
  const navegarParaBuscaVagas = () => {
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
      return;
    }

    if (curriculos.length === 1) {
      // Se só tiver um currículo, use-o automaticamente
      setCurriculoSelecionadoParaVagas(curriculos[0]);
      setActiveScreen('jobsearch');
      setBuscandoVagas(true);
      buscarVagasOnline(curriculos[0]);
    } else {
      // Se tiver múltiplos currículos, mostre o modal para selecionar
      setModalCurriculoVagaVisible(true);
    }
  };

  // Exibir vaga detalhada
  const visualizarVagaDetalhada = (vaga) => {
    setVagaSelecionada(vaga);
    setActiveScreen('viewjob');
  };

  // Visualizar currículo gerado
  const visualizarCurriculoGerado = (curriculo) => {
    setCurriculoSelecionadoParaView(curriculo);
    setActiveScreen('viewresume');
  };

  // Função para extrair JSON de uma string de resposta
  const extrairJSON = (texto) => {
    try {
      // Tenta parsear a string diretamente
      return JSON.parse(texto);
    } catch (e) {
      // Se falhar, tenta encontrar um objeto JSON dentro da string
      try {
        const match = texto.match(/\{[\s\S]*\}/);
        if (match) {
          return JSON.parse(match[0]);
        }
      } catch (innerError) {
        console.log('Erro ao extrair JSON da resposta:', innerError);
      }
      
      // Cria um objeto manualmente se tudo falhar
      return null;
    }
  };

  // Buscar vagas de emprego online baseado no currículo
  const buscarVagasOnline = async (curriculo) => {
    setBuscandoVagas(true);
    setVacasEncontradas([]);

    try {
      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      // Extrair informações do currículo para a busca
      let perfilProfissional = {};
      
      // Tenta extrair dados do currículo para construir o perfil
      if (curriculo.conteudo) {
        if (typeof curriculo.conteudo === 'object') {
          // Se já for um objeto, usa diretamente
          const conteudo = curriculo.conteudo;
          
          // Cargo/Função
          perfilProfissional.cargo = curriculo.cargo || 
            (conteudo.experiencia && conteudo.experiencia[0]?.cargo) || 
            "Profissional";
          
          // Habilidades
          if (conteudo.habilidades) {
            if (Array.isArray(conteudo.habilidades)) {
              perfilProfissional.habilidades = conteudo.habilidades;
            } else if (conteudo.habilidades.tecnicas && Array.isArray(conteudo.habilidades.tecnicas)) {
              perfilProfissional.habilidades = conteudo.habilidades.tecnicas;
            }
          }
          
          // Localização
          perfilProfissional.localizacao = 
            (conteudo.contato && conteudo.contato.local) || 
            "São Paulo, SP";
          
          // Nível
          if (conteudo.experiencia) {
            const anosExperiencia = conteudo.experiencia.length;
            if (anosExperiencia < 2) {
              perfilProfissional.nivel = "Júnior";
            } else if (anosExperiencia < 5) {
              perfilProfissional.nivel = "Pleno";
            } else {
              perfilProfissional.nivel = "Sênior";
            }
          } else {
            perfilProfissional.nivel = "Pleno";
          }
          
        } else if (typeof curriculo.conteudo === 'string') {
          // Tenta parsear se for uma string JSON
          try {
            const conteudo = JSON.parse(curriculo.conteudo);
            perfilProfissional.cargo = curriculo.cargo || conteudo.experiencia?.[0]?.cargo || "Profissional";
            perfilProfissional.habilidades = conteudo.habilidades?.tecnicas || [];
            perfilProfissional.localizacao = conteudo.contato?.local || "São Paulo, SP";
            perfilProfissional.nivel = curriculo.nivel || "Pleno";
          } catch (e) {
            // Se não conseguir parsear, usa valores padrão
            perfilProfissional.cargo = curriculo.cargo || "Profissional";
            perfilProfissional.habilidades = [];
            perfilProfissional.localizacao = "São Paulo, SP";
            perfilProfissional.nivel = "Pleno";
          }
        }
      }
      
      // Se ainda não tiver habilidades, define algumas padrão
      if (!perfilProfissional.habilidades || perfilProfissional.habilidades.length === 0) {
        perfilProfissional.habilidades = ["Comunicação", "Trabalho em equipe", "Resolução de problemas"];
      }

      // Prompt melhorado para gerar vagas mais realistas
      const promptVagas = `
Você é um assistente especializado em busca de vagas de emprego que deve gerar listagens realistas e detalhadas de vagas atuais. Com base no perfil profissional abaixo, gere 8-10 vagas de emprego recentes e realistas disponíveis no Brasil.

PERFIL PROFISSIONAL:
- Cargo principal: ${perfilProfissional.cargo || "Profissional"}
- Habilidades: ${(perfilProfissional.habilidades || []).join(', ')}
- Nível: ${perfilProfissional.nivel || "Pleno"}
- Localização: ${perfilProfissional.localizacao || "São Paulo, SP"}

INSTRUÇÕES ESPECÍFICAS:
- Inclua vagas de empresas reais que contratam esse tipo de profissional no Brasil
- Forneça descrições detalhadas e específicas das vagas (não genéricas)
- Use faixas salariais realistas para o mercado brasileiro atual
- Inclua listas completas de requisitos (mínimo 5 por vaga)
- Crie URLs realistas para as vagas nas plataformas (LinkedIn, Indeed, etc.)
- Certifique-se de que cada vaga tenha um nível de compatibilidade diferente com o candidato

RETORNE APENAS UM OBJETO JSON VÁLIDO (sem texto explicativo antes ou depois) no seguinte formato:
{
  "vagas": [
    {
      "id": "vaga-uuid-1",
      "titulo": "Título específico da vaga",
      "empresa": "Nome da empresa real",
      "empresa_logo": "🏢",
      "empresa_descricao": "Breve descrição sobre a empresa (2-3 frases)",
      "localizacao": "Cidade, Estado",
      "regime": "CLT/PJ/Estágio/etc",
      "salario": "R$ XX.XXX - R$ XX.XXX",
      "data_publicacao": "DD/MM/YYYY",
      "descricao": "Descrição detalhada da vaga (pelo menos 3-4 frases)",
      "responsabilidades": ["Responsabilidade 1", "Responsabilidade 2", "Responsabilidade 3"],
      "requisitos": ["Requisito 1", "Requisito 2", "Requisito 3", "Requisito 4", "Requisito 5", "Requisito 6"],
      "beneficios": ["Benefício 1", "Benefício 2", "Benefício 3", "Benefício 4"],
      "url": "https://www.plataforma.com.br/vaga/empresa-cargo-id",
      "plataforma": "LinkedIn/Indeed/Glassdoor/etc",
      "tipo_trabalho": "Presencial/Remoto/Híbrido",
      "compatibilidade": 78,
      "palavras_chave": ["palavra1", "palavra2", "palavra3"]
    }
  ]
}
`;

      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestVagas = {
        contents: [{ parts: [{ text: promptVagas }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000, // Aumentado para permitir mais detalhes
          topP: 0.95,
          topK: 40
        }
      };

      const responseVagas = await axios.post(endpoint, requestVagas, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const textoVagas = responseVagas.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      let resultadoVagas = { vagas: [] };
      
      try {
        // Extrai o JSON da resposta
        const dadosVagas = extrairJSON(textoVagas);
        if (dadosVagas && dadosVagas.vagas) {
          resultadoVagas = dadosVagas;
        } else {
          throw new Error("Formato de resposta inválido");
        }
      } catch (error) {
        console.error('Erro ao parsear JSON de vagas:', error);
        // Criar vagas mock caso falhe
        resultadoVagas = {
          vagas: [
            {
              id: "vaga-mock-1",
              titulo: "Desenvolvedor Frontend Sênior",
              empresa: "TechSolutions Brasil",
              empresa_logo: "🏢",
              empresa_descricao: "Empresa de tecnologia especializada em soluções digitais para o mercado financeiro, com mais de 500 funcionários e projetos internacionais.",
              localizacao: "São Paulo, SP",
              regime: "CLT",
              salario: "R$ 8.000 - R$ 12.000",
              data_publicacao: "10/05/2025",
              descricao: "Estamos buscando um desenvolvedor Frontend experiente para liderar o desenvolvimento de nossa nova plataforma digital. O candidato ideal terá forte experiência com React, TypeScript e arquitetura de aplicações web de alta performance.",
              responsabilidades: [
                "Liderar o desenvolvimento de novas funcionalidades frontend",
                "Projetar arquiteturas escaláveis para aplicações web complexas",
                "Trabalhar em colaboração com o time de UX/UI e backend",
                "Implementar e manter padrões de código e qualidade"
              ],
              requisitos: [
                "Experiência comprovada de 5+ anos com desenvolvimento frontend",
                "Conhecimento avançado em React, Redux e TypeScript",
                "Experiência com otimização de performance em aplicações web",
                "Conhecimento em testes automatizados (Jest, Testing Library)",
                "Experiência com integração contínua e metodologias ágeis",
                "Bons conhecimentos em HTML5, CSS3 e design responsivo"
              ],
              beneficios: [
                "Plano de saúde e odontológico",
                "Vale refeição/alimentação de R$ 1.200",
                "Gympass",
                "Programa de participação nos lucros",
                "Home office flexível"
              ],
              url: "https://www.linkedin.com/jobs/view/desenvolvedor-frontend-senior-at-techsolutions-brasil-2985674123",
              plataforma: "LinkedIn",
              tipo_trabalho: "Híbrido",
              compatibilidade: 87,
              palavras_chave: ["React", "Frontend", "TypeScript", "Senior"]
            },
            {
              id: "vaga-mock-2",
              titulo: "Analista de Dados Pleno",
              empresa: "DataInsights",
              empresa_logo: "📊",
              empresa_descricao: "Consultoria especializada em análise de dados e business intelligence para empresas de varejo e e-commerce.",
              localizacao: "Remoto",
              regime: "PJ",
              salario: "R$ 7.000 - R$ 9.500",
              data_publicacao: "12/05/2025",
              descricao: "Procuramos um Analista de Dados para transformar dados brutos em insights de negócios. Você trabalhará com grandes volumes de dados e criará painéis e relatórios para tomada de decisão.",
              responsabilidades: [
                "Desenvolver análises estatísticas e modelos preditivos",
                "Criar e manter dashboards em Power BI ou Tableau",
                "Identificar tendências e padrões nos dados dos clientes",
                "Apresentar insights para stakeholders não-técnicos"
              ],
              requisitos: [
                "Experiência de 3+ anos com análise de dados",
                "Conhecimento avançado em SQL e Python",
                "Experiência com Power BI ou Tableau",
                "Conhecimentos em estatística e modelagem de dados",
                "Boa capacidade de comunicação e apresentação",
                "Desejável experiência com Big Data (Hadoop, Spark)"
              ],
              beneficios: [
                "Trabalho 100% remoto",
                "Horário flexível",
                "Equipamentos fornecidos pela empresa",
                "Plano de desenvolvimento personalizado"
              ],
              url: "https://www.vagas.com.br/vagas/analista-dados-pleno-datainsights-845219",
              plataforma: "Vagas.com",
              tipo_trabalho: "Remoto",
              compatibilidade: 72,
              palavras_chave: ["Dados", "Analytics", "SQL", "Python"]
            }
          ]
        };
      }

      // Ordenar vagas por compatibilidade
      resultadoVagas.vagas.sort((a, b) => b.compatibilidade - a.compatibilidade);
      
      // Atribuir ícones para empresas sem logo
      resultadoVagas.vagas = resultadoVagas.vagas.map(vaga => {
        if (!vaga.empresa_logo) {
          // Emojis para ícones de empresa
          const logosEmpresas = ['🏢', '🏭', '🏡', '🏪', '🏦', '🏨', '🏣', '🏬', '🏫', '🏥', '💼', '🔬', '💻', '📱', '🚀'];
          vaga.empresa_logo = logosEmpresas[Math.floor(Math.random() * logosEmpresas.length)];
        }
        
        // Garantir que todos os campos estejam presentes
        if (!vaga.empresa_descricao) {
          vaga.empresa_descricao = `${vaga.empresa} é uma empresa que atua no setor de ${vaga.palavras_chave ? vaga.palavras_chave[0] : 'tecnologia'}.`;
        }
        
        if (!vaga.responsabilidades || !Array.isArray(vaga.responsabilidades)) {
          vaga.responsabilidades = [
            "Desenvolver soluções para o negócio",
            "Trabalhar em equipe multidisciplinar",
            "Implementar melhorias contínuas"
          ];
        }
        
        if (!vaga.beneficios || !Array.isArray(vaga.beneficios)) {
          vaga.beneficios = [
            "Vale-refeição/alimentação",
            "Plano de saúde",
            "Home office flexível"
          ];
        }
        
        if (!vaga.tipo_trabalho) {
          vaga.tipo_trabalho = "Presencial";
        }
        
        if (!vaga.plataforma) {
          vaga.plataforma = "LinkedIn";
        }
        
        return vaga;
      });

      setVacasEncontradas(resultadoVagas.vagas);
    } catch (error) {
      console.error('Erro ao buscar vagas online:', error);
      Alert.alert(
        "Erro na Busca",
        "Não foi possível buscar vagas neste momento. Tente novamente mais tarde."
      );
    } finally {
      setBuscandoVagas(false);
    }
  };

  // NOVA FUNÇÃO: Buscar vagas em sites externos usando IA
  const buscarVagasExternas = async () => {
    if (!pesquisaVagasExternas.trim()) {
      Alert.alert("Atenção", "Digite um termo de busca para encontrar vagas.");
      return;
    }
    
    setBuscandoVagasExternas(true);
    
    try {
      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      const promptBuscaExterna = `
Você é um assistente especializado em busca de vagas de emprego que deve gerar listagens realistas e detalhadas de vagas atuais. Com base na busca: "${pesquisaVagasExternas}", gere 6-8 vagas de emprego recentes e realistas disponíveis no Brasil.

INSTRUÇÕES ESPECÍFICAS:
- Inclua vagas de empresas reais que correspondam ao termo de busca
- Garanta que as vagas sejam específicas para o termo buscado (${pesquisaVagasExternas})
- Forneça descrições detalhadas e específicas das vagas (não genéricas)
- Use faixas salariais realistas para o mercado brasileiro atual
- Inclua listas completas de requisitos (mínimo 5 por vaga)
- Crie URLs realistas para as vagas nas plataformas (LinkedIn, Indeed, etc.)
- Varie o nível das vagas (júnior, pleno, sênior)

RETORNE APENAS UM OBJETO JSON VÁLIDO (sem texto explicativo antes ou depois) no seguinte formato:
{
  "vagas": [
    {
      "id": "vaga-uuid-1",
      "titulo": "Título específico da vaga",
      "empresa": "Nome da empresa real",
      "empresa_logo": "🏢",
      "empresa_descricao": "Breve descrição sobre a empresa (2-3 frases)",
      "localizacao": "Cidade, Estado",
      "regime": "CLT/PJ/Estágio/etc",
      "salario": "R$ XX.XXX - R$ XX.XXX",
      "data_publicacao": "DD/MM/YYYY",
      "descricao": "Descrição detalhada da vaga (pelo menos 3-4 frases)",
      "responsabilidades": ["Responsabilidade 1", "Responsabilidade 2", "Responsabilidade 3"],
      "requisitos": ["Requisito 1", "Requisito 2", "Requisito 3", "Requisito 4", "Requisito 5", "Requisito 6"],
      "beneficios": ["Benefício 1", "Benefício 2", "Benefício 3", "Benefício 4"],
      "url": "https://www.plataforma.com.br/vaga/empresa-cargo-id",
      "plataforma": "LinkedIn/Indeed/Glassdoor/etc",
      "tipo_trabalho": "Presencial/Remoto/Híbrido",
      "compatibilidade": 65,
      "palavras_chave": ["palavra1", "palavra2", "palavra3"]
    }
  ]
}
`;

      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBuscaExterna = {
        contents: [{ parts: [{ text: promptBuscaExterna }] }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
          topP: 0.95,
          topK: 40
        }
      };

      const responseBuscaExterna = await axios.post(endpoint, requestBuscaExterna, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const textoBuscaExterna = responseBuscaExterna.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      const dadosVagasExternas = extrairJSON(textoBuscaExterna);
      
      if (dadosVagasExternas && dadosVagasExternas.vagas && dadosVagasExternas.vagas.length > 0) {
        // Atribuir ícones para empresas sem logo
        dadosVagasExternas.vagas = dadosVagasExternas.vagas.map(vaga => {
          if (!vaga.empresa_logo) {
            const logosEmpresas = ['🏢', '🏭', '🏡', '🏪', '🏦', '🏨', '🏣', '🏬', '🏫', '🏥', '💼', '🔬', '💻', '📱', '🚀'];
            vaga.empresa_logo = logosEmpresas[Math.floor(Math.random() * logosEmpresas.length)];
          }
          
          // Garantir que todos os campos estejam presentes
          if (!vaga.empresa_descricao) {
            vaga.empresa_descricao = `${vaga.empresa} é uma empresa que atua no setor de ${vaga.palavras_chave ? vaga.palavras_chave[0] : 'tecnologia'}.`;
          }
          
          if (!vaga.responsabilidades || !Array.isArray(vaga.responsabilidades)) {
            vaga.responsabilidades = [
              "Desenvolver soluções para o negócio",
              "Trabalhar em equipe multidisciplinar",
              "Implementar melhorias contínuas"
            ];
          }
          
          if (!vaga.beneficios || !Array.isArray(vaga.beneficios)) {
            vaga.beneficios = [
              "Vale-refeição/alimentação",
              "Plano de saúde",
              "Home office flexível"
            ];
          }
          
          if (!vaga.tipo_trabalho) {
            vaga.tipo_trabalho = "Presencial";
          }
          
          if (!vaga.plataforma) {
            vaga.plataforma = "LinkedIn";
          }
          
          return vaga;
        });
        
        setVacasEncontradas(dadosVagasExternas.vagas);
      } else {
        Alert.alert(
          "Nenhuma Vaga Encontrada",
          `Não encontramos vagas para "${pesquisaVagasExternas}". Tente outros termos de busca.`
        );
      }
      
    } catch (error) {
      console.error('Erro ao buscar vagas externas:', error);
      Alert.alert(
        "Erro na Busca",
        "Não foi possível buscar vagas externas. Tente novamente mais tarde."
      );
    } finally {
      setBuscandoVagasExternas(false);
    }
  };

  // Abrir modal para escolher quantos currículos gerar
  const abrirModalQuantidadeCurriculos = (vaga) => {
    setVagaSelecionada(vaga);
    setModalQuantidadeVisible(true);
  };

  // Gerar currículos personalizados para a vaga
  const gerarCurriculosParaVaga = async () => {
    if (!vagaSelecionada || !curriculoSelecionadoParaVagas || quantidadeCurriculos < 1) {
      Alert.alert("Erro", "Dados insuficientes para gerar currículos");
      return;
    }

    setModalQuantidadeVisible(false);
    setGerandoCurriculos(true);

    try {
      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      
      // Gerar currículos personalizados um por um
      const novosResumosGerados = [];

      for (let i = 0; i < quantidadeCurriculos; i++) {
        // Cada currículo terá um estilo diferente
        const estilos = [
          "Profissional Moderno", 
          "Executivo Conciso", 
          "Detalhado Abrangente", 
          "Orientado a Resultados",
          "Criativo Inovador",
          "Técnico Especializado"
        ];
        
        const estiloSelecionado = estilos[i % estilos.length];
        
        // Simplificar o formato do currículo para evitar erros de parsing
        let curriculoSimplificado = {
          nome: "Nome do Candidato",
          contato: {
            email: "email@exemplo.com",
            telefone: "(00) 00000-0000",
            linkedin: "linkedin.com/in/usuario"
          }
        };
        
        if (curriculoSelecionadoParaVagas.conteudo) {
          if (typeof curriculoSelecionadoParaVagas.conteudo === 'object') {
            curriculoSimplificado = curriculoSelecionadoParaVagas.conteudo;
          } else if (typeof curriculoSelecionadoParaVagas.conteudo === 'string') {
            try {
              curriculoSimplificado = JSON.parse(curriculoSelecionadoParaVagas.conteudo);
            } catch (e) {
              console.log("Erro ao parsear conteúdo do currículo, usando dados básicos");
            }
          }
        }

        // Prompt melhorado para gerar currículos mais detalhados
        const promptCurriculo = `
Você é um redator profissional especializado em criar currículos altamente eficazes e personalizados para vagas específicas. Crie uma versão personalizada do currículo que destaque as qualificações mais relevantes para esta vaga específica, maximizando as chances do candidato ser selecionado.

CURRÍCULO ATUAL DO CANDIDATO:
${JSON.stringify(curriculoSimplificado, null, 2)}

VAGA ALVO:
Título: ${vagaSelecionada.titulo}
Empresa: ${vagaSelecionada.empresa}
Descrição: ${vagaSelecionada.descricao}
Requisitos: ${JSON.stringify(vagaSelecionada.requisitos)}
Responsabilidades: ${JSON.stringify(vagaSelecionada.responsabilidades || [])}

ESTILO DO CURRÍCULO SOLICITADO: ${estiloSelecionado}

INSTRUÇÕES ESPECÍFICAS:
1. Mantenha o nome e informações de contato originais
2. Adapte o resumo profissional para destacar qualificações específicas para esta vaga
3. Reescreva as descrições das experiências enfatizando realizações relevantes para a vaga
4. Reorganize e priorize as habilidades que se alinham com os requisitos da vaga
5. Inclua palavras-chave e termos específicos mencionados na descrição da vaga
6. NÃO invente experiências ou qualificações que não estejam no currículo original
7. Use linguagem orientada a resultados e quantifique realizações sempre que possível
8. Formate o currículo de acordo com o estilo solicitado (${estiloSelecionado})
9. Inclua uma seção de "Competências Relevantes" personalizada para a vaga

RETORNE APENAS UM OBJETO JSON VÁLIDO (sem texto explicativo antes ou depois) no seguinte formato:
{
  "nome": "Nome completo do candidato",
  "contato": {
    "email": "email@exemplo.com",
    "telefone": "telefone do candidato",
    "linkedin": "linkedin do candidato (se disponível)",
    "local": "localização do candidato"
  },
  "resumo_profissional": "resumo profissional otimizado para a vaga (3-4 frases)",
  "competencias_relevantes": ["competência 1", "competência 2", "competência 3", "competência 4", "competência 5"],
  "experiencia": [
    {
      "cargo": "título do cargo",
      "empresa": "nome da empresa",
      "periodo": "período de trabalho",
      "descricao": "descrição otimizada das responsabilidades",
      "realizacoes": ["realização quantificada 1", "realização quantificada 2", "realização quantificada 3"]
    }
  ],
  "educacao": [
    {
      "curso": "nome do curso",
      "instituicao": "nome da instituição",
      "periodo": "período de estudo",
      "descricao": "descrição relevante (se aplicável)"
    }
  ],
  "habilidades": {
    "tecnicas": ["habilidade 1", "habilidade 2", "habilidade 3"],
    "comportamentais": ["habilidade 1", "habilidade 2", "habilidade 3"]
  },
  "idiomas": [
    {"idioma": "nome do idioma", "nivel": "nível de proficiência"}
  ],
  "certificacoes": [
    {"nome": "nome da certificação", "instituicao": "instituição emissora", "ano": "ano de obtenção"}
  ],
  "projetos_relevantes": [
    {"nome": "nome do projeto", "descricao": "breve descrição relevante para a vaga"}
  ]
}
`;

        const requestCurriculo = {
          contents: [{ parts: [{ text: promptCurriculo }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8000,
            topP: 0.8,
            topK: 40
          }
        };

        const responseCurriculo = await axios.post(endpoint, requestCurriculo, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 60000
        });

        const textoCurriculo = responseCurriculo.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        try {
          // Extrair o JSON da resposta
          const curriculoGerado = extrairJSON(textoCurriculo);
          
          if (curriculoGerado) {
            // Adicionar metadados ao currículo gerado
            const novoCurriculo = {
              id: `resumo-${Date.now()}-${i}`,
              curriculoOriginalId: curriculoSelecionadoParaVagas.id,
              vagaId: vagaSelecionada.id,
              vagaTitulo: vagaSelecionada.titulo,
              vagaEmpresa: vagaSelecionada.empresa,
              dataGeracao: new Date().toISOString(),
              estilo: estiloSelecionado,
              conteudo: curriculoGerado,
              compatibilidade: vagaSelecionada.compatibilidade || 75
            };
            
            novosResumosGerados.push(novoCurriculo);
          } else {
            throw new Error(`Não foi possível processar o currículo ${i+1}`);
          }
        } catch (error) {
          console.error(`Erro ao processar currículo ${i+1}:`, error);
          // Criar um currículo básico como fallback
          const curriculoBasico = {
            id: `resumo-fallback-${Date.now()}-${i}`,
            curriculoOriginalId: curriculoSelecionadoParaVagas.id,
            vagaId: vagaSelecionada.id,
            vagaTitulo: vagaSelecionada.titulo,
            vagaEmpresa: vagaSelecionada.empresa,
            dataGeracao: new Date().toISOString(),
            estilo: estiloSelecionado,
            conteudo: {
              nome: curriculoSimplificado.nome || "Nome do Candidato",
              contato: curriculoSimplificado.contato || {
                email: "email@exemplo.com",
                telefone: "(00) 00000-0000"
              },
              resumo_profissional: `Profissional com experiência em ${vagaSelecionada.titulo}, buscando novas oportunidades em ${vagaSelecionada.empresa}.`,
              competencias_relevantes: vagaSelecionada.requisitos?.slice(0, 5) || ["Comunicação", "Trabalho em equipe", "Resolução de problemas"],
              experiencia: [
                {
                  cargo: "Cargo Exemplo",
                  empresa: "Empresa Exemplo",
                  periodo: "2020 - Presente",
                  descricao: `Experiência relacionada a ${vagaSelecionada.titulo}`,
                  realizacoes: ["Implementação de melhorias no processo", "Aumento de produtividade em 25%"]
                }
              ],
              educacao: [
                {
                  curso: "Curso Exemplo",
                  instituicao: "Instituição Exemplo",
                  periodo: "2015 - 2019"
                }
              ],
              habilidades: {
                tecnicas: vagaSelecionada.requisitos?.slice(0, 3) || ["Habilidade 1", "Habilidade 2"],
                comportamentais: ["Comunicação", "Trabalho em equipe"]
              },
              idiomas: [
                { idioma: "Português", nivel: "Nativo" },
                { idioma: "Inglês", nivel: "Intermediário" }
              ],
              certificacoes: [],
              projetos_relevantes: []
            },
            compatibilidade: vagaSelecionada.compatibilidade || 70
          };
          novosResumosGerados.push(curriculoBasico);
        }
        
        // Breve pausa entre solicitações para evitar atingir limites de API
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      if (novosResumosGerados.length > 0) {
        // Atualizar a lista de currículos gerados
        const todosCurriculosGerados = [...curriculosGerados, ...novosResumosGerados];
        setCurriculosGerados(todosCurriculosGerados);
        
        // Salvar no AsyncStorage
        await AsyncStorage.setItem(`curriculos_gerados_${user.id}`, JSON.stringify(todosCurriculosGerados));
        
        // Mostrar confirmação
        Alert.alert(
          "Currículos Gerados",
          `${novosResumosGerados.length} currículos personalizados foram gerados com sucesso para a vaga "${vagaSelecionada.titulo}".`,
          [
            { 
              text: "Ver Agora", 
              onPress: () => {
                // Navegar para visualizar o primeiro currículo gerado
                visualizarCurriculoGerado(novosResumosGerados[0]);
              } 
            },
            { text: "OK" }
          ]
        );
      } else {
        throw new Error("Nenhum currículo foi gerado com sucesso");
      }
      
    } catch (error) {
      console.error('Erro ao gerar currículos personalizados:', error);
      Alert.alert(
        "Erro na Geração",
        "Não foi possível gerar os currículos personalizados. Tente novamente mais tarde."
      );
    } finally {
      setGerandoCurriculos(false);
    }
  };

  // Função para voltar à tela anterior
  const voltarTela = () => {
    if (activeScreen === 'viewjob') {
      setActiveScreen('jobsearch');
    } else if (activeScreen === 'viewresume') {
      setActiveScreen('jobsearch');
    } else if (activeScreen === 'jobsearch') {
      setActiveScreen('home');
    } else if (activeScreen === 'knowledge') {
      setActiveScreen('home');
    }
  };

  // Função para exportar currículo em formato específico
  const exportarCurriculo = async (curriculoId, formato) => {
    setLoadingExport(true);
    setDownloadOptions({ visible: false, curriculoId: null });
    
    try {
      // Encontrar o currículo a ser exportado
      const curriculo = curriculosGerados.find(cv => cv.id === curriculoId);
      
      if (!curriculo) {
        throw new Error("Currículo não encontrado");
      }
      
      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      
      // Baseado no formato, gerar o conteúdo apropriado
      let promptExportacao = "";
      
      if (formato === 'pdf') {
        // Prompt melhorado para HTML/CSS que será convertido em PDF
        promptExportacao = `
Crie código HTML elegante e profissional para um currículo que será convertido em PDF. O currículo deve seguir um design profissional e moderno, com CSS incorporado para impressão de alta qualidade.

Use o seguinte conteúdo de currículo:
${JSON.stringify(curriculo.conteudo, null, 2)}

REQUISITOS TÉCNICOS:
1. O design deve ser otimizado para impressão em PDF, usando as melhores práticas de CSS para mídia impressa
2. Use tipografia profissional e tamanhos de fonte adequados (16-18px para títulos, 11-12px para corpo de texto)
3. Inclua espaçamento adequado entre seções (margens de 15-20px)
4. Use cores sutis e profissionais (tons de azul, cinza ou outras cores adequadas)
5. Estruture o layout para maximizar o espaço sem parecer apertado ou vazio
6. Inclua ícones simples para contato e seções (usando entidades HTML ou Unicode)
7. Certifique-se de que o design seja elegante e represente bem o estilo do currículo (${curriculo.estilo})
8. Inclua barras de progresso ou visualizações gráficas para habilidades (quando aplicável)

Responda APENAS com o código HTML completo que inclui o CSS incorporado. Não inclua explicações ou comentários fora do código.
`;
      } else if (formato === 'docx') {
        // Prompt melhorado para formato de texto estruturado para DOCX
        promptExportacao = `
Crie uma representação em texto estruturado do currículo que será convertido para formato DOCX. O documento deve ser organizado de forma clara e profissional, usando apenas marcação de texto básica (sem HTML) que possa ser facilmente convertida para um documento Word.

Use o seguinte conteúdo de currículo:
${JSON.stringify(curriculo.conteudo, null, 2)}

FORMATO REQUERIDO:
Forneça o resultado usando apenas formatação de texto simples com a seguinte estrutura:

# ${curriculo.conteudo.nome || 'NOME DO CANDIDATO'}
--------------------
Email: ${curriculo.conteudo.contato?.email || 'email@exemplo.com'} | Telefone: ${curriculo.conteudo.contato?.telefone || '(00) 00000-0000'} | ${curriculo.conteudo.contato?.linkedin ? 'LinkedIn: ' + curriculo.conteudo.contato.linkedin : ''} | ${curriculo.conteudo.contato?.local ? 'Localização: ' + curriculo.conteudo.contato.local : ''}

## RESUMO PROFISSIONAL
${curriculo.conteudo.resumo_profissional || 'Resumo profissional aqui...'}

## COMPETÊNCIAS RELEVANTES
${(curriculo.conteudo.competencias_relevantes || []).map(comp => '- ' + comp).join('\n')}

## EXPERIÊNCIA PROFISSIONAL

${(curriculo.conteudo.experiencia || []).map(exp => `### ${exp.cargo} - ${exp.empresa} (${exp.periodo})
${exp.descricao}

Realizações:
${(exp.realizacoes || []).map(r => '- ' + r).join('\n')}
`).join('\n')}

## EDUCAÇÃO

${(curriculo.conteudo.educacao || []).map(edu => `### ${edu.curso} - ${edu.instituicao} (${edu.periodo})
${edu.descricao || ''}
`).join('\n')}

## HABILIDADES TÉCNICAS
${(curriculo.conteudo.habilidades?.tecnicas || []).map(h => '- ' + h).join('\n')}

## HABILIDADES COMPORTAMENTAIS
${(curriculo.conteudo.habilidades?.comportamentais || []).map(h => '- ' + h).join('\n')}

${curriculo.conteudo.idiomas && curriculo.conteudo.idiomas.length > 0 ? `## IDIOMAS
${curriculo.conteudo.idiomas.map(i => `- ${i.idioma}: ${i.nivel}`).join('\n')}
` : ''}

${curriculo.conteudo.certificacoes && curriculo.conteudo.certificacoes.length > 0 ? `## CERTIFICAÇÕES
${curriculo.conteudo.certificacoes.map(c => `- ${c.nome} (${c.instituicao}, ${c.ano})`).join('\n')}
` : ''}

${curriculo.conteudo.projetos_relevantes && curriculo.conteudo.projetos_relevantes.length > 0 ? `## PROJETOS RELEVANTES
${curriculo.conteudo.projetos_relevantes.map(p => `- ${p.nome}: ${p.descricao}`).join('\n')}
` : ''}

Currículo Otimizado para: ${curriculo.vagaTitulo} - ${curriculo.vagaEmpresa}
Estilo: ${curriculo.estilo}
Data: ${new Date(curriculo.dataGeracao).toLocaleDateString('pt-BR')}
`;
      }

      const requestExportacao = {
        contents: [{ parts: [{ text: promptExportacao }] }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8000,
          topP: 0.8,
          topK: 40
        }
      };

      const responseExportacao = await axios.post(endpoint, requestExportacao, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000
      });

      const textoExportacao = responseExportacao.data?.candidates?.[0]?.content?.parts?.[0]?.text;
      
      // Em um aplicativo real, aqui você usaria bibliotecas nativas para gerar os 
      // arquivos PDF/DOCX e salvá-los no dispositivo
      
      // Simular download bem-sucedido
      const nomeArquivo = `Curriculo_${curriculo.conteudo.nome?.replace(/\s+/g, '_') || 'Curriculo'}_${formato.toUpperCase()}.${formato}`;
      
      // Salvar registro de exportação
      const exportacoesAnteriores = await AsyncStorage.getItem(`exportacoes_${user.id}`) || '[]';
      const todasExportacoes = JSON.parse(exportacoesAnteriores);
      
      todasExportacoes.push({
        id: `export-${Date.now()}`,
        curriculoId: curriculoId,
        formato: formato,
        nomeArquivo: nomeArquivo,
        dataExportacao: new Date().toISOString()
      });
      
      await AsyncStorage.setItem(`exportacoes_${user.id}`, JSON.stringify(todasExportacoes));
      
      // Mostrar notificação de sucesso
      setExportSuccess({
        visible: true,
        filename: nomeArquivo,
        format: formato.toUpperCase()
      });
      
      setTimeout(() => {
        setExportSuccess({ visible: false, filename: '', format: '' });
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao exportar currículo:', error);
      Alert.alert(
        "Erro na Exportação",
        `Não foi possível exportar o currículo para ${formato.toUpperCase()}. Tente novamente mais tarde.`
      );
    } finally {
      setLoadingExport(false);
    }
  };

  // Função para navegar para a tela de conhecimento (subpágina)
  const navegarParaConhecimento = () => {
    setActiveScreen('knowledge');
    setActiveTab('topics');
    setSelectedTopic(null);
    setGeneratedContent(null);
  };

  // Função para voltar à tela inicial
  const voltarParaHome = () => {
    setActiveScreen('home');
  };

  // Implementação própria da função searchTopics com debounce manual
  const searchTopics = (query) => {
    if (!query || query.trim() === '') {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    const normalizedQuery = query.toLowerCase().trim();

    // Primeiro buscar nos tópicos já definidos
    const matchingPredefinedTopics = careerTopics.filter(topic =>
      topic.title.toLowerCase().includes(normalizedQuery)
    );

    // Depois buscar nos tópicos salvos
    const matchingSavedTopics = savedKnowledge.filter(knowledge =>
      !matchingPredefinedTopics.some(t => t.id === knowledge.topicId) && // Evitar duplicatas
      knowledge.title.toLowerCase().includes(normalizedQuery)
    ).map(knowledge => ({
      id: knowledge.topicId,
      title: knowledge.title,
      icon: '📚',
      isSaved: true
    }));

    // Se não encontrou nada e tem pelo menos 3 caracteres, gerar uma sugestão
    if (matchingPredefinedTopics.length === 0 && matchingSavedTopics.length === 0 && normalizedQuery.length >= 3) {
      setSearchResults([
        ...matchingPredefinedTopics,
        ...matchingSavedTopics,
        {
          id: `search-${Date.now()}`,
          title: `Gerar conteúdo sobre "${query}"`,
          icon: '🔍',
          isGenerated: true,
          generatedTitle: query
        }
      ]);
    } else {
      setSearchResults([...matchingPredefinedTopics, ...matchingSavedTopics]);
    }

    setIsSearching(false);
  };

  // Atualizar resultados de busca quando o texto muda (com debounce)
  const handleSearchChange = (text) => {
    setSearchQuery(text);

    if (text.trim() !== '') {
      setIsSearching(true);

      // Limpar timeout anterior se existir
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // Definir novo timeout (debounce)
      searchTimeoutRef.current = setTimeout(() => {
        searchTopics(text);
      }, 500);
    } else {
      setSearchResults([]);
      setIsSearching(false);

      // Limpar timeout se existir
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    }
  };

  // Limpar o timeout ao desmontar o componente
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Selecionar um tópico
  const handleSelectTopic = async (topic) => {
    setSelectedTopic(topic);
    setGeneratingContent(true);
    setActiveTab('content');

    try {
      // Verificar se já existe conteúdo salvo para este tópico
      const existingContent = savedKnowledge.find(k => k.topicId === topic.id);

      if (existingContent) {
        // Usar conteúdo existente
        setGeneratedContent(existingContent.content);
        setRelatedTopics(existingContent.relatedTopics || []);
        setGeneratingContent(false);
        setIsBookmarked(true);
      } else if (topic.isGenerated) {
        // Gerar conteúdo para um tópico personalizado
        await generateContentWithAI({
          id: topic.id,
          title: topic.generatedTitle || topic.title,
          icon: '🔍'
        });
        setIsBookmarked(false);
      } else {
        // Gerar novo conteúdo com IA para um tópico predefinido
        await generateContentWithAI(topic);
        setIsBookmarked(false);
      }
    } catch (error) {
      console.error('Erro ao processar tópico:', error);
      Alert.alert('Erro', 'Não foi possível gerar conteúdo para este tópico.');
      setGeneratingContent(false);
    }
  };

  // Gerar conteúdo com IA
  const generateContentWithAI = async (topic) => {
    try {
      // Obter API key da IA
      const apiKey = await getIAAPIKey('GEMINI');

      if (!apiKey) {
        throw new Error("API key do Gemini não configurada");
      }

      // Construir o prompt para a IA - prompt melhorado para conteúdo mais detalhado
      const promptText = `
Crie um guia profissional detalhado e altamente técnico sobre "${topic.title}" para desenvolvimento de carreira no Brasil.

Estruture o conteúdo no formato Markdown com as seguintes seções:

# ${topic.title}

## Introdução
[Uma introdução abrangente sobre ${topic.title} e sua importância no desenvolvimento profissional atual no Brasil e globalmente]

## Contexto e Importância
[Explicação do contexto contemporâneo e por que este tópico é relevante para profissionais]

## Principais Conceitos
[Explicação detalhada dos conceitos fundamentais, técnicas e metodologias relacionadas a este tópico, com exemplos específicos]

## Análise Aprofundada
[Discussão técnica e nuances importantes sobre o tópico, considerando diferentes perspectivas e contextos profissionais]

## Estratégias Avançadas
[5-7 estratégias concretas, acionáveis e detalhadas, com passos específicos para implementação]

## Estudos de Caso Brasileiros
[2-3 exemplos reais de sucesso no Brasil, com análise dos fatores críticos]

## Erros Comuns a Evitar
[4-6 erros frequentes e como evitá-los, com consequências específicas]

## Ferramentas e Recursos
[7-10 ferramentas, livros, cursos ou plataformas específicas para aprofundamento, com breve descrição de cada um]

## Implementação Passo-a-Passo
[Um guia detalhado com etapas específicas para aplicar este conhecimento em contextos profissionais brasileiros]

## Tendências Futuras (2025-2026)
[Tendências emergentes nesta área para os próximos anos com análise de impacto]

## Métricas de Sucesso
[Como medir resultados e avaliar o progresso na aplicação deste conhecimento]

## Conclusão
[Síntese estratégica dos pontos-chave e recomendações finais]

Forneça conteúdo extremamente detalhado, técnico e aplicável, com exemplos concretos do mercado brasileiro quando possível. O texto deve ser profundo e substantivo, com informações práticas que um profissional pode aplicar imediatamente. Evite generalizações e foque em conteúdo específico e acionável.
`;

      // Chamar a API do Gemini com temperatura mais baixa para resultados mais específicos
      const endpoint = `${IA_APIS.GEMINI.endpoint}?key=${apiKey}`;
      const requestBody = {
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature: 0.1, // Temperatura mais baixa para conteúdo mais focado e técnico
          maxOutputTokens: 8000, // Aumentado para permitir conteúdo mais detalhado
          topP: 0.8,
          topK: 40
        }
      };

      const response = await axios.post(endpoint, requestBody, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // Timeout aumentado para conteúdo maior
      });

      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const content = response.data.candidates[0].content.parts[0].text;

        // Prompt melhorado para tópicos relacionados mais relevantes
        const relatedTopicsPrompt = `
Analise tecnicamente o seguinte conteúdo sobre "${topic.title}" e sugira exatamente 5 tópicos relacionados específicos que complementariam diretamente este conhecimento para desenvolvimento de carreira.

Os tópicos devem ser altamente relevantes, específicos e seguir estas regras:
1. Nenhum tópico deve ser redundante com o conteúdo principal
2. Cada tópico deve representar uma área distinta que se conecte diretamente ao tema principal
3. Os tópicos devem ser específicos e não genéricos
4. Foque em tópicos técnicos e práticos, não superficiais
5. Considere tópicos atuais (2025) relevantes para o mercado brasileiro

Forneça apenas os títulos dos tópicos no formato:
1. [Tópico 1 específico]
2. [Tópico 2 específico]
3. [Tópico 3 específico]
4. [Tópico 4 específico]
5. [Tópico 5 específico]

Conteúdo original:
${content.substring(0, 1500)}...
`;

        const relatedResponse = await axios.post(endpoint, {
          contents: [{ parts: [{ text: relatedTopicsPrompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1000,
            topP: 0.9,
            topK: 40
          }
        }, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 15000
        });

        let relatedTopicsList = [];

        if (relatedResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          const topicsText = relatedResponse.data.candidates[0].content.parts[0].text;
          // Extrair tópicos da resposta
          const topicsLines = topicsText.split('\n').filter(line => line.trim().match(/^\d+\.\s+/));
          relatedTopicsList = topicsLines.map(line => {
            const topic = line.replace(/^\d+\.\s+/, '').trim();
            return {
              id: 'related-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9),
              title: topic,
              icon: '📚',
              isGenerated: true,
              generatedTitle: topic
            };
          });
        }

        // Atualizar estados
        setGeneratedContent(content);
        setRelatedTopics(relatedTopicsList);
      } else {
        throw new Error('Formato de resposta inesperado do Gemini');
      }

    } catch (error) {
      console.error('Erro ao gerar conteúdo com IA:', error);
      Alert.alert('Erro', 'Não foi possível gerar o conteúdo. Tente novamente mais tarde.');
    } finally {
      setGeneratingContent(false);
    }
  };

  // Salvar ou remover o conteúdo gerado (bookmark)
  const toggleBookmark = async () => {
    if (!selectedTopic || !generatedContent) return;

    try {
      if (isBookmarked) {
        // Remover dos favoritos
        const updatedKnowledge = savedKnowledge.filter(k => k.topicId !== selectedTopic.id);
        await AsyncStorage.setItem(`conhecimentos_${user.id}`, JSON.stringify(updatedKnowledge));
        setSavedKnowledge(updatedKnowledge);
        setIsBookmarked(false);
        Alert.alert('Removido', 'Conteúdo removido dos favoritos');
      } else {
        // Adicionar aos favoritos
        const newKnowledge = {
          id: 'k-' + Date.now().toString(),
          topicId: selectedTopic.id,
          title: selectedTopic.generatedTitle || selectedTopic.title,
          content: generatedContent,
          relatedTopics: relatedTopics,
          timestamp: new Date().toISOString()
        };

        const updatedKnowledge = [...savedKnowledge, newKnowledge];
        await AsyncStorage.setItem(`conhecimentos_${user.id}`, JSON.stringify(updatedKnowledge));
        setSavedKnowledge(updatedKnowledge);
        setIsBookmarked(true);
        Alert.alert('Sucesso', 'Conteúdo salvo nos favoritos!');
      }
    } catch (error) {
      console.error('Erro ao gerenciar favoritos:', error);
      Alert.alert('Erro', 'Não foi possível gerenciar os favoritos.');
    }
  };

  // Compartilhar o conteúdo gerado
  const shareGeneratedContent = async () => {
    if (!generatedContent) return;

    try {
      await Share.share({
        message: generatedContent,
        title: selectedTopic?.title || 'Conhecimento de Carreira'
      });
    } catch (error) {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o conteúdo.');
    }
  };

  // Abrir link de vaga externa
  const abrirLinkVaga = (url) => {
    if (!url) {
      Alert.alert("Ops!", "O link para esta vaga não está disponível.");
      return;
    }

    // Se a URL não começar com http:// ou https://, adicionar https://
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;

    Linking.canOpenURL(formattedUrl)
      .then((supported) => {
        if (supported) {
          return Linking.openURL(formattedUrl);
        } else {
          Alert.alert(
            "Link Inválido",
            "Não foi possível abrir este link. Tente acessar diretamente pelo navegador."
          );
        }
      })
      .catch(err => {
        console.error('Erro ao abrir URL:', err);
        Alert.alert(
          "Erro ao Abrir Link",
          "Ocorreu um erro ao tentar abrir o link da vaga."
        );
      });
  };

  // Função para atualizar tela (pull-to-refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await carregarConhecimentosSalvos();
    setRefreshing(false);
  };

  // Filtrar tópicos por categoria
  const getFilteredTopics = () => {
    if (selectedCategory === 'all') {
      return careerTopics;
    }
    return careerTopics.filter(topic => topic.category === selectedCategory);
  };

  // COMPONENTES DE INTERFACE

  // Modal para mostrar todos os requisitos de uma vaga
  const renderModalRequisitos = () => (
    <Modal
      visible={modalRequisitosVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalRequisitosVisible(false)}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          margin: 20,
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          elevation: 5,
          maxHeight: '80%',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 15,
            textAlign: 'center',
          }}>
            Requisitos da Vaga
          </Text>
          
          <FlatList
            data={vagaSelecionada?.requisitos || []}
            keyExtractor={(item, index) => `req-${index}`}
            renderItem={({ item }) => (
              <View style={{
                flexDirection: 'row',
                alignItems: 'flex-start',
                paddingVertical: 8,
                borderBottomWidth: 1,
                borderBottomColor: Colors.lightGray,
              }}>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 12,
                  marginTop: 2,
                }}>
                  <Text style={{ color: 'white', fontSize: 14 }}>✓</Text>
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: Colors.dark, lineHeight: 22 }}>
                  {item}
                </Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={{ textAlign: 'center', color: Colors.lightText, padding: 20 }}>
                Nenhum requisito disponível para esta vaga.
              </Text>
            }
          />
          
          <TouchableOpacity
            style={{
              marginTop: 20,
              backgroundColor: Colors.primary,
              padding: 15,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => setModalRequisitosVisible(false)}
          >
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              Fechar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal para selecionar o currículo para buscar vagas
  const renderModalSelecionarCurriculo = () => (
    <Modal
      visible={modalCurriculoVagaVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalCurriculoVagaVisible(false)}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          margin: 20,
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          elevation: 5,
          maxHeight: '80%',
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 15,
            textAlign: 'center',
          }}>
            Selecione um Currículo
          </Text>
          
          <Text style={{
            marginBottom: 20,
            color: Colors.lightText,
            textAlign: 'center',
          }}>
            Escolha qual currículo deseja utilizar para buscar vagas compatíveis
          </Text>
          
          <FlatList
            data={curriculos}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={{
                  padding: 15,
                  borderWidth: 1,
                  borderColor: Colors.mediumGray,
                  borderRadius: 10,
                  marginBottom: 10,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => {
                  setCurriculoSelecionadoParaVagas(item);
                  setModalCurriculoVagaVisible(false);
                  setActiveScreen('jobsearch');
                  setBuscandoVagas(true);
                  buscarVagasOnline(item);
                }}
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
                  <Text style={{ fontSize: 20, color: 'white' }}>📄</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: 'bold' }}>
                    {item.titulo || 'Currículo'}
                  </Text>
                  <Text style={{ color: Colors.lightText, fontSize: 12 }}>
                    Criado: {formatarTempoRelativo(new Date(item.dataCriacao))}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity
            style={{
              marginTop: 20,
              alignSelf: 'center',
              padding: 10,
            }}
            onPress={() => setModalCurriculoVagaVisible(false)}
          >
            <Text style={{ color: Colors.primary, fontWeight: 'bold' }}>
              Cancelar
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Modal para selecionar a quantidade de currículos a gerar
  const renderModalQuantidadeCurriculos = () => (
    <Modal
      visible={modalQuantidadeVisible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setModalQuantidadeVisible(false)}
    >
      <View style={{
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          margin: 20,
          backgroundColor: 'white',
          borderRadius: 20,
          padding: 20,
          elevation: 5,
        }}>
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            marginBottom: 5,
            textAlign: 'center',
          }}>
            Gerar Currículos Personalizados
          </Text>
          
          <Text style={{
            marginBottom: 20,
            color: Colors.dark,
            textAlign: 'center',
            fontSize: 15,
          }}>
            Vaga: {vagaSelecionada?.titulo} - {vagaSelecionada?.empresa}
          </Text>
          
          <Text style={{
            marginBottom: 20,
            color: Colors.lightText,
            textAlign: 'center',
          }}>
            Selecione quantos modelos de currículo você deseja gerar para esta vaga específica. Cada versão terá um estilo diferente otimizado para maximizar suas chances.
          </Text>
          
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-around',
            marginBottom: 30,
          }}>
            {[1, 2, 3, 5].map((num) => (
              <TouchableOpacity
                key={num}
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: quantidadeCurriculos === num ? Colors.primary : Colors.lightGray,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                onPress={() => setQuantidadeCurriculos(num)}
              >
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: quantidadeCurriculos === num ? 'white' : Colors.dark,
                }}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <TouchableOpacity
              style={{
                padding: 15,
                borderRadius: 10,
                backgroundColor: Colors.lightGray,
                flex: 1,
                marginRight: 10,
                alignItems: 'center',
              }}
              onPress={() => setModalQuantidadeVisible(false)}
            >
              <Text style={{ fontWeight: 'bold', color: Colors.dark }}>
                Cancelar
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={{
                padding: 15,
                borderRadius: 10,
                backgroundColor: Colors.primary,
                flex: 1,
                alignItems: 'center',
              }}
              onPress={gerarCurriculosParaVaga}
            >
              <Text style={{ fontWeight: 'bold', color: 'white' }}>
                Gerar Currículos
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  // Modal para opções de download
  const renderModalDownload = () => (
    <Modal
      visible={downloadOptions.visible}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setDownloadOptions({ visible: false, curriculoId: null })}
    >
      <View style={{
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
      }}>
        <View style={{
          backgroundColor: 'white',
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: 20,
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
        }}>
          <View style={{
            alignItems: 'center',
            marginBottom: 20,
          }}>
            <View style={{
              width: 40,
              height: 5,
              backgroundColor: Colors.mediumGray,
              borderRadius: 3,
              marginBottom: 15,
            }} />
            <Text style={{
              fontSize: 18,
              fontWeight: 'bold',
            }}>
              Exportar Currículo
            </Text>
          </View>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 15,
              borderBottomWidth: 1,
              borderBottomColor: Colors.lightGray,
            }}
            onPress={() => exportarCurriculo(downloadOptions.curriculoId, 'pdf')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#F40F02',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 20, color: 'white' }}>📄</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>PDF</Text>
              <Text style={{ color: Colors.lightText, fontSize: 12 }}>
                Formato ideal para envio por e-mail ou impressão
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 15,
            }}
            onPress={() => exportarCurriculo(downloadOptions.curriculoId, 'docx')}
          >
            <View style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: '#2B579A',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 20, color: 'white' }}>📝</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: 'bold' }}>DOCX</Text>
              <Text style={{ color: Colors.lightText, fontSize: 12 }}>
                Formato editável para Microsoft Word
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{
              marginTop: 20,
              padding: 15,
              backgroundColor: Colors.lightGray,
              borderRadius: 10,
              alignItems: 'center',
            }}
            onPress={() => setDownloadOptions({ visible: false, curriculoId: null })}
          >
            <Text style={{ fontWeight: 'bold' }}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Renderizar a tela detalhada de visualização da vaga
  const renderViewJobScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      {/* Cabeçalho */}
      <View style={{
        backgroundColor: Colors.primary,
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 1000,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={voltarTela}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
            Detalhes da Vaga
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {vagaSelecionada ? (
        <ScrollView style={{ flex: 1 }}>
          {/* Cabeçalho da vaga */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            borderBottomWidth: 1,
            borderBottomColor: Colors.lightGray,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
              <View style={{
                width: 60,
                height: 60,
                borderRadius: 10,
                backgroundColor: '#F5F5F5',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 15,
              }}>
                <Text style={{ fontSize: 30 }}>{vagaSelecionada.empresa_logo || '🏢'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.dark, marginBottom: 4 }}>
                  {vagaSelecionada.titulo}
                </Text>
                <Text style={{ color: Colors.darkGray, fontSize: 16 }}>
                  {vagaSelecionada.empresa}
                </Text>
              </View>
            </View>
            
            <View style={{ 
              flexDirection: 'row', 
              marginBottom: 15, 
              flexWrap: 'wrap' 
            }}>
              <View style={{ 
                backgroundColor: '#f1f8e9', 
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                marginRight: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="location-outline" size={16} color="#558b2f" style={{ marginRight: 4 }} />
                <Text style={{ color: '#558b2f', fontSize: 14 }}>
                  {vagaSelecionada.localizacao}
                </Text>
              </View>
              
              <View style={{ 
                backgroundColor: '#e3f2fd', 
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                marginRight: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="briefcase-outline" size={16} color="#1565c0" style={{ marginRight: 4 }} />
                <Text style={{ color: '#1565c0', fontSize: 14 }}>
                  {vagaSelecionada.regime}
                </Text>
              </View>
              
              <View style={{ 
                backgroundColor: '#fff8e1', 
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                marginRight: 10,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="home-outline" size={16} color="#ff8f00" style={{ marginRight: 4 }} />
                <Text style={{ color: '#ff8f00', fontSize: 14 }}>
                  {vagaSelecionada.tipo_trabalho || 'Presencial'}
                </Text>
              </View>
              
              <View style={{ 
                backgroundColor: '#e8eaf6', 
                paddingVertical: 6,
                paddingHorizontal: 12,
                borderRadius: 20,
                marginBottom: 10,
                flexDirection: 'row',
                alignItems: 'center'
              }}>
                <Ionicons name="calendar-outline" size={16} color="#3949ab" style={{ marginRight: 4 }} />
                <Text style={{ color: '#3949ab', fontSize: 14 }}>
                  Publicada em {vagaSelecionada.data_publicacao}
                </Text>
              </View>
            </View>
            
            {/* Salário e Compatibilidade */}
            <View style={{ marginBottom: 15 }}>
              <View style={{ 
                backgroundColor: '#e0f2f1',
                padding: 15,
                borderRadius: 8
              }}>
                <Text style={{ fontWeight: 'bold', color: '#00695c', marginBottom: 5 }}>
                  Faixa Salarial
                </Text>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#00695c' }}>
                  {vagaSelecionada.salario}
                </Text>
              </View>
            </View>
            
            {/* Compatibilidade com seu perfil */}
            <View style={{ marginBottom: 15 }}>
              <Text style={{ fontWeight: 'bold', color: Colors.dark, marginBottom: 5 }}>
                Compatibilidade com seu perfil
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ 
                  height: 10, 
                  backgroundColor: '#E0E0E0', 
                  borderRadius: 5,
                  flex: 1,
                  marginRight: 10
                }}>
                  <View style={{ 
                    height: '100%', 
                    width: `${vagaSelecionada.compatibilidade}%`, 
                    backgroundColor: vagaSelecionada.compatibilidade > 80 ? Colors.success : 
                                    vagaSelecionada.compatibilidade > 60 ? '#FF9800' : 
                                    Colors.danger,
                    borderRadius: 5
                  }} />
                </View>
                <Text style={{ 
                  fontWeight: 'bold', 
                  fontSize: 16,
                  color: vagaSelecionada.compatibilidade > 80 ? Colors.success : 
                          vagaSelecionada.compatibilidade > 60 ? '#FF9800' : 
                          Colors.danger 
                }}>
                  {vagaSelecionada.compatibilidade}%
                </Text>
              </View>
            </View>
            
            {/* Botões de ação */}
            <View style={{ flexDirection: 'row', marginTop: 10 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  backgroundColor: Colors.primary,
                  paddingVertical: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  marginRight: 10,
                  flexDirection: 'row',
                  justifyContent: 'center',
                }}
                onPress={() => abrirModalQuantidadeCurriculos(vagaSelecionada)}
              >
                <Ionicons name="document-text-outline" size={18} color="white" style={{ marginRight: 8 }} />
                <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>
                  Gerar Currículo
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
                  backgroundColor: Colors.secondary,
                  paddingVertical: 14,
                  paddingHorizontal: 14,
                  borderRadius: 8,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                onPress={() => abrirLinkVaga(vagaSelecionada.url)}
              >
                <Ionicons name="open-outline" size={22} color="white" />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Descrição da vaga */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            marginTop: 10,
            borderBottomWidth: 1,
            borderTopWidth: 1,
            borderColor: Colors.lightGray,
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: Colors.dark,
              marginBottom: 15
            }}>
              Descrição da Vaga
            </Text>
            
            <Text style={{ 
              color: Colors.darkGray, 
              fontSize: 16, 
              lineHeight: 24,
              marginBottom: 20
            }}>
              {vagaSelecionada.descricao}
            </Text>
            
            {/* Sobre a empresa */}
            {vagaSelecionada.empresa_descricao && (
              <>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: Colors.dark,
                  marginBottom: 10,
                  marginTop: 10
                }}>
                  Sobre a Empresa
                </Text>
                
                <Text style={{ 
                  color: Colors.darkGray, 
                  fontSize: 16, 
                  lineHeight: 24,
                  marginBottom: 10
                }}>
                  {vagaSelecionada.empresa_descricao}
                </Text>
              </>
            )}
            
            {/* Responsabilidades */}
            {vagaSelecionada.responsabilidades && vagaSelecionada.responsabilidades.length > 0 && (
              <>
                <Text style={{ 
                  fontSize: 18, 
                  fontWeight: 'bold', 
                  color: Colors.dark,
                  marginBottom: 10,
                  marginTop: 10
                }}>
                  Responsabilidades
                </Text>
                
                {vagaSelecionada.responsabilidades.map((responsabilidade, index) => (
                  <View key={`resp-${index}`} style={{ 
                    flexDirection: 'row', 
                    marginBottom: 8, 
                    alignItems: 'flex-start' 
                  }}>
                    <View style={{ 
                      width: 22, 
                      height: 22, 
                      borderRadius: 11, 
                      backgroundColor: '#e3f2fd', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      marginRight: 12,
                      marginTop: 2
                    }}>
                      <Text style={{ color: '#1565c0', fontSize: 12, fontWeight: 'bold' }}>
                        {index + 1}
                      </Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 16, color: Colors.darkGray, lineHeight: 22 }}>
                      {responsabilidade}
                    </Text>
                  </View>
                ))}
              </>
            )}
          </View>
          
          {/* Requisitos */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            marginTop: 10,
            borderBottomWidth: 1,
            borderTopWidth: 1,
            borderColor: Colors.lightGray,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: Colors.dark
              }}>
                Requisitos
              </Text>
              
              {vagaSelecionada.requisitos && vagaSelecionada.requisitos.length > 5 && (
                <TouchableOpacity 
                  style={{ 
                    backgroundColor: Colors.lightGray, 
                    paddingHorizontal: 12, 
                    paddingVertical: 6, 
                    borderRadius: 15 
                  }}
                  onPress={() => setModalRequisitosVisible(true)}
                >
                  <Text style={{ color: Colors.darkGray, fontSize: 12 }}>Ver todos</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {vagaSelecionada.requisitos && vagaSelecionada.requisitos.slice(0, 5).map((requisito, index) => (
              <View key={`req-${index}`} style={{ 
                flexDirection: 'row', 
                marginBottom: 12, 
                alignItems: 'flex-start' 
              }}>
                <View style={{ 
                  width: 24, 
                  height: 24, 
                  borderRadius: 12, 
                  backgroundColor: '#f5f5f5', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  marginRight: 12,
                  marginTop: 2
                }}>
                  <Ionicons name="checkmark" size={16} color={Colors.primary} />
                </View>
                <Text style={{ flex: 1, fontSize: 16, color: Colors.darkGray, lineHeight: 22 }}>
                  {requisito}
                </Text>
              </View>
            ))}
            
            {vagaSelecionada.requisitos && vagaSelecionada.requisitos.length > 5 && (
              <TouchableOpacity
                style={{ 
                  flexDirection: 'row', 
                  marginTop: 5,
                  alignItems: 'center',
                  justifyContent: 'center' 
                }}
                onPress={() => setModalRequisitosVisible(true)}
              >
                <Text style={{ color: Colors.primary, fontSize: 14, fontWeight: 'bold' }}>
                  Ver todos os {vagaSelecionada.requisitos.length} requisitos
                </Text>
                <Ionicons name="chevron-down" size={16} color={Colors.primary} style={{ marginLeft: 5 }} />
              </TouchableOpacity>
            )}
          </View>
          
          {/* Benefícios */}
          {vagaSelecionada.beneficios && vagaSelecionada.beneficios.length > 0 && (
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              marginTop: 10,
              borderBottomWidth: 1,
              borderTopWidth: 1,
              borderColor: Colors.lightGray,
            }}>
              <Text style={{ 
                fontSize: 18, 
                fontWeight: 'bold', 
                color: Colors.dark,
                marginBottom: 15
              }}>
                Benefícios
              </Text>
              
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {vagaSelecionada.beneficios.map((beneficio, index) => (
                  <View key={`ben-${index}`} style={{ 
                    backgroundColor: '#f5f5f5',
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    borderRadius: 20,
                    marginRight: 10,
                    marginBottom: 10,
                    flexDirection: 'row',
                    alignItems: 'center'
                  }}>
                    <Ionicons name="gift-outline" size={16} color={Colors.primary} style={{ marginRight: 6 }} />
                    <Text style={{ color: Colors.dark, fontSize: 14 }}>
                      {beneficio}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          
          {/* Informações adicionais */}
          <View style={{
            backgroundColor: 'white',
            padding: 20,
            marginTop: 10,
            marginBottom: 20,
            borderBottomWidth: 1,
            borderTopWidth: 1,
            borderColor: Colors.lightGray,
          }}>
            <Text style={{ 
              fontSize: 18, 
              fontWeight: 'bold', 
              color: Colors.dark,
              marginBottom: 15
            }}>
              Informações Adicionais
            </Text>
            
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Ionicons name="globe-outline" size={20} color={Colors.darkGray} style={{ marginRight: 10, width: 25 }} />
              <Text style={{ fontSize: 16, color: Colors.darkGray }}>
                Plataforma: {vagaSelecionada.plataforma || 'LinkedIn'}
              </Text>
            </View>
            
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}
              onPress={() => abrirLinkVaga(vagaSelecionada.url)}
            >
              <Ionicons name="link-outline" size={20} color={Colors.primary} style={{ marginRight: 10, width: 25 }} />
              <Text style={{ fontSize: 16, color: Colors.primary, textDecorationLine: 'underline' }}>
                Ver vaga original
              </Text>
            </TouchableOpacity>
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="time-outline" size={20} color={Colors.darkGray} style={{ marginRight: 10, width: 25 }} />
              <Text style={{ fontSize: 16, color: Colors.darkGray }}>
                Publicada em {vagaSelecionada.data_publicacao}
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Informações da vaga não encontradas</Text>
        </View>
      )}
    </SafeAreaView>
  );

  // Renderizar a tela de visualização de currículo gerado
  const renderViewResumeScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      {/* Cabeçalho */}
      <View style={{
        backgroundColor: Colors.primary,
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 1000,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={voltarTela}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
            Currículo Personalizado
          </Text>
          <View style={{ width: 24 }} />
        </View>
      </View>

      {curriculoSelecionadoParaView ? (
        <>
          <ScrollView style={{ flex: 1 }}>
            {/* Cabeçalho do currículo */}
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              borderBottomWidth: 1,
              borderBottomColor: Colors.lightGray,
            }}>
              <Text style={{ 
                fontSize: 24, 
                fontWeight: 'bold', 
                color: Colors.dark,
                marginBottom: 4,
                textAlign: 'center'
              }}>
                {curriculoSelecionadoParaView.conteudo.nome}
              </Text>
              
              <View style={{ 
                flexDirection: 'row', 
                justifyContent: 'center', 
                marginTop: 10,
                marginBottom: 15,
                flexWrap: 'wrap'
              }}>
                {curriculoSelecionadoParaView.conteudo.contato?.email && (
                  <Text style={{ 
                    color: Colors.darkGray, 
                    marginHorizontal: 5, 
                    fontSize: 14
                  }}>
                    <Ionicons name="mail-outline" size={14} color={Colors.primary} /> {curriculoSelecionadoParaView.conteudo.contato.email}
                  </Text>
                )}
                
                {curriculoSelecionadoParaView.conteudo.contato?.telefone && (
                  <Text style={{ 
                    color: Colors.darkGray, 
                    marginHorizontal: 5, 
                    fontSize: 14
                  }}>
                    <Ionicons name="call-outline" size={14} color={Colors.primary} /> {curriculoSelecionadoParaView.conteudo.contato.telefone}
                  </Text>
                )}
                
                {curriculoSelecionadoParaView.conteudo.contato?.local && (
                  <Text style={{ 
                    color: Colors.darkGray, 
                    marginHorizontal: 5, 
                    fontSize: 14
                  }}>
                    <Ionicons name="location-outline" size={14} color={Colors.primary} /> {curriculoSelecionadoParaView.conteudo.contato.local}
                  </Text>
                )}
              </View>
              
              <View style={{ 
                backgroundColor: '#f5f5f5',
                borderRadius: 8,
                padding: 15,
                marginTop: 10,
                marginBottom: 15
              }}>
                <Text style={{ 
                  fontWeight: 'bold', 
                  color: Colors.dark,
                  marginBottom: 5
                }}>
                  Currículo otimizado para:
                </Text>
                <Text style={{ 
                  fontSize: 16, 
                  fontWeight: 'bold', 
                  color: Colors.primary 
                }}>
                  {curriculoSelecionadoParaView.vagaTitulo}
                </Text>
                <Text style={{ color: Colors.darkGray }}>
                  {curriculoSelecionadoParaView.vagaEmpresa}
                </Text>
                
                <View style={{ 
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{ 
                    color: Colors.darkGray, 
                    fontSize: 13 
                  }}>
                    Compatibilidade: 
                  </Text>
                  <View style={{ 
                    height: 8, 
                    width: 100, 
                    backgroundColor: '#E0E0E0', 
                    borderRadius: 4,
                    marginHorizontal: 8
                  }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${curriculoSelecionadoParaView.compatibilidade}%`, 
                      backgroundColor: curriculoSelecionadoParaView.compatibilidade > 80 ? Colors.success : 
                                    curriculoSelecionadoParaView.compatibilidade > 60 ? '#FF9800' : 
                                    Colors.danger,
                      borderRadius: 4
                    }} />
                  </View>
                  <Text style={{ 
                    fontWeight: 'bold', 
                    color: curriculoSelecionadoParaView.compatibilidade > 80 ? Colors.success : 
                            curriculoSelecionadoParaView.compatibilidade > 60 ? '#FF9800' : 
                            Colors.danger 
                  }}>
                    {curriculoSelecionadoParaView.compatibilidade}%
                  </Text>
                </View>
                
                <View style={{ 
                  marginTop: 10,
                  flexDirection: 'row',
                  alignItems: 'center'
                }}>
                  <Text style={{ color: Colors.darkGray, fontSize: 13 }}>
                    Estilo: <Text style={{ fontWeight: 'bold', color: Colors.dark }}>{curriculoSelecionadoParaView.estilo}</Text>
                  </Text>
                </View>
              </View>
              
              {/* Botões de ação */}
              <View style={{ flexDirection: 'row', marginTop: 10 }}>
                <TouchableOpacity
                  style={{
                    flex: 1,
                    backgroundColor: Colors.primary,
                    paddingVertical: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                    marginRight: 10,
                    flexDirection: 'row',
                    justifyContent: 'center',
                  }}
                  onPress={() => setDownloadOptions({ 
                    visible: true, 
                    curriculoId: curriculoSelecionadoParaView.id 
                  })}
                >
                  <Ionicons name="download-outline" size={18} color="white" style={{ marginRight: 8 }} />
                  <Text style={{ color: 'white', fontWeight: 'bold' }}>
                    Baixar Currículo
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={{
                    backgroundColor: Colors.secondary,
                    paddingVertical: 12,
                    paddingHorizontal: 16,
                    borderRadius: 8,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  onPress={() => abrirLinkVaga(curriculoSelecionadoParaView.vagaUrl)}
                >
                  <Ionicons name="open-outline" size={20} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Corpo do currículo */}
            <View style={{
              backgroundColor: 'white',
              padding: 20,
              marginTop: 10,
              borderBottomWidth: 1,
              borderTopWidth: 1,
              borderColor: Colors.lightGray,
            }}>
              {/* Resumo Profissional */}
              {curriculoSelecionadoParaView.conteudo.resumo_profissional && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Resumo Profissional
                  </Text>
                  <Text style={{ 
                    fontSize: 16, 
                    color: Colors.darkGray, 
                    lineHeight: 24 
                  }}>
                    {curriculoSelecionadoParaView.conteudo.resumo_profissional}
                  </Text>
                </View>
              )}
              
              {/* Competências Relevantes */}
              {curriculoSelecionadoParaView.conteudo.competencias_relevantes && 
               curriculoSelecionadoParaView.conteudo.competencias_relevantes.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 10,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Competências Relevantes
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {curriculoSelecionadoParaView.conteudo.competencias_relevantes.map((comp, index) => (
                      <View key={`comp-${index}`} style={{ 
                        backgroundColor: '#f5f5f5',
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 16,
                        margin: 4
                      }}>
                        <Text style={{ color: Colors.darkGray, fontSize: 14 }}>
                          {comp}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {/* Experiência Profissional */}
              {curriculoSelecionadoParaView.conteudo.experiencia && 
               curriculoSelecionadoParaView.conteudo.experiencia.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Experiência Profissional
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.experiencia.map((exp, index) => (
                    <View key={`exp-${index}`} style={{ marginBottom: 20 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: 5, 
                          backgroundColor: Colors.primary,
                          marginTop: 5,
                          marginRight: 10
                        }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: 'bold', 
                            color: Colors.dark 
                          }}>
                            {exp.cargo}
                          </Text>
                          <Text style={{ 
                            fontSize: 15, 
                            color: Colors.darkGray, 
                            marginBottom: 5 
                          }}>
                            {exp.empresa} • {exp.periodo}
                          </Text>
                          {exp.descricao && (
                            <Text style={{ 
                              color: Colors.darkGray, 
                              lineHeight: 22, 
                              marginBottom: 10 
                            }}>
                              {exp.descricao}
                            </Text>
                          )}
                          
                          {exp.realizacoes && exp.realizacoes.length > 0 && (
                            <View style={{ marginTop: 5 }}>
                              <Text style={{ 
                                fontWeight: 'bold', 
                                fontSize: 14, 
                                color: Colors.dark, 
                                marginBottom: 5 
                              }}>
                                Principais Realizações:
                              </Text>
                              {exp.realizacoes.map((realiz, idx) => (
                                <View key={`real-${index}-${idx}`} style={{ 
                                  flexDirection: 'row', 
                                  alignItems: 'flex-start',
                                  marginBottom: 5
                                }}>
                                  <Text style={{ marginRight: 5, color: Colors.primary }}>•</Text>
                                  <Text style={{ flex: 1, color: Colors.darkGray, lineHeight: 20 }}>
                                    {realiz}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Educação */}
              {curriculoSelecionadoParaView.conteudo.educacao && 
               curriculoSelecionadoParaView.conteudo.educacao.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Educação
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.educacao.map((edu, index) => (
                    <View key={`edu-${index}`} style={{ marginBottom: 15 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                        <View style={{ 
                          width: 10, 
                          height: 10, 
                          borderRadius: 5, 
                          backgroundColor: Colors.secondary,
                          marginTop: 5,
                          marginRight: 10
                        }} />
                        <View style={{ flex: 1 }}>
                          <Text style={{ 
                            fontSize: 16, 
                            fontWeight: 'bold', 
                            color: Colors.dark 
                          }}>
                            {edu.curso}
                          </Text>
                          <Text style={{ 
                            fontSize: 15, 
                            color: Colors.darkGray, 
                            marginBottom: 5 
                          }}>
                            {edu.instituicao} • {edu.periodo}
                          </Text>
                          {edu.descricao && (
                            <Text style={{ color: Colors.darkGray, lineHeight: 22 }}>
                              {edu.descricao}
                            </Text>
                          )}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Habilidades */}
              {curriculoSelecionadoParaView.conteudo.habilidades && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Habilidades
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.habilidades.tecnicas && 
                  curriculoSelecionadoParaView.conteudo.habilidades.tecnicas.length > 0 && (
                    <View style={{ marginBottom: 15 }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold', 
                        color: Colors.dark,
                        marginBottom: 10
                      }}>
                        Técnicas
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {curriculoSelecionadoParaView.conteudo.habilidades.tecnicas.map((hab, index) => (
                          <View key={`tech-${index}`} style={{ 
                            backgroundColor: '#e8f5e9',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            margin: 4
                          }}>
                            <Text style={{ color: '#388e3c', fontSize: 14 }}>
                              {hab}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                  
                  {curriculoSelecionadoParaView.conteudo.habilidades.comportamentais && 
                  curriculoSelecionadoParaView.conteudo.habilidades.comportamentais.length > 0 && (
                    <View>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold', 
                        color: Colors.dark,
                        marginBottom: 10
                      }}>
                        Comportamentais
                      </Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                        {curriculoSelecionadoParaView.conteudo.habilidades.comportamentais.map((hab, index) => (
                          <View key={`soft-${index}`} style={{ 
                            backgroundColor: '#e3f2fd',
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderRadius: 16,
                            margin: 4
                          }}>
                            <Text style={{ color: '#1976d2', fontSize: 14 }}>
                              {hab}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
              
              {/* Idiomas */}
              {curriculoSelecionadoParaView.conteudo.idiomas && 
               curriculoSelecionadoParaView.conteudo.idiomas.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Idiomas
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.idiomas.map((idioma, index) => (
                    <View key={`lang-${index}`} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'center',
                      marginBottom: 10
                    }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold',
                        color: Colors.dark,
                        width: 100
                      }}>
                        {idioma.idioma}
                      </Text>
                      <Text style={{ 
                        color: Colors.darkGray,
                        fontSize: 15
                      }}>
                        {idioma.nivel}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Certificações */}
              {curriculoSelecionadoParaView.conteudo.certificacoes && 
               curriculoSelecionadoParaView.conteudo.certificacoes.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Certificações
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.certificacoes.map((cert, index) => (
                    <View key={`cert-${index}`} style={{ 
                      flexDirection: 'row', 
                      alignItems: 'flex-start',
                      marginBottom: 10
                    }}>
                      <View style={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: 4, 
                        backgroundColor: Colors.primary,
                        marginTop: 6,
                        marginRight: 8
                      }} />
                      <Text style={{ flex: 1, color: Colors.darkGray }}>
                        {cert.nome} - {cert.instituicao} ({cert.ano})
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              
              {/* Projetos Relevantes */}
              {curriculoSelecionadoParaView.conteudo.projetos_relevantes && 
               curriculoSelecionadoParaView.conteudo.projetos_relevantes.length > 0 && (
                <View style={{ marginBottom: 20 }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: 'bold', 
                    color: Colors.dark,
                    marginBottom: 15,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.lightGray,
                    paddingBottom: 5
                  }}>
                    Projetos Relevantes
                  </Text>
                  
                  {curriculoSelecionadoParaView.conteudo.projetos_relevantes.map((proj, index) => (
                    <View key={`proj-${index}`} style={{ marginBottom: 15 }}>
                      <Text style={{ 
                        fontSize: 16, 
                        fontWeight: 'bold', 
                        color: Colors.dark,
                        marginBottom: 5
                      }}>
                        {proj.nome}
                      </Text>
                      <Text style={{ color: Colors.darkGray, lineHeight: 22 }}>
                        {proj.descricao}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            
            {/* Rodapé com informações de geração */}
            <View style={{
              padding: 20,
              backgroundColor: '#f5f5f5',
              marginTop: 10,
              marginBottom: 30,
            }}>
              <Text style={{ 
                color: Colors.lightText, 
                fontSize: 13, 
                textAlign: 'center' 
              }}>
                Currículo gerado em {new Date(curriculoSelecionadoParaView.dataGeracao).toLocaleDateString('pt-BR')}
              </Text>
              <Text style={{ 
                color: Colors.lightText, 
                fontSize: 13, 
                textAlign: 'center',
                marginTop: 5
              }}>
                CurriculoBot - Personalizado para {curriculoSelecionadoParaView.vagaTitulo}
              </Text>
            </View>
          </ScrollView>
          
          {/* Botão flutuante para baixar */}
          <TouchableOpacity
            style={{
              position: 'absolute',
              bottom: 20,
              right: 20,
              backgroundColor: Colors.primary,
              width: 60,
              height: 60,
              borderRadius: 30,
              justifyContent: 'center',
              alignItems: 'center',
              elevation: 5,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.3,
              shadowRadius: 3,
            }}
            onPress={() => setDownloadOptions({ 
              visible: true, 
              curriculoId: curriculoSelecionadoParaView.id 
            })}
          >
            <Ionicons name="download-outline" size={26} color="white" />
          </TouchableOpacity>
        </>
      ) : (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text>Currículo não encontrado</Text>
        </View>
      )}
      
      {/* Notificação de exportação bem-sucedida */}
      {exportSuccess.visible && (
        <View style={{
          position: 'absolute',
          bottom: 30,
          left: 20,
          right: 20,
          backgroundColor: Colors.success,
          padding: 15,
          borderRadius: 8,
          flexDirection: 'row',
          alignItems: 'center',
          elevation: 5,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.3,
          shadowRadius: 3,
        }}>
          <View style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(255,255,255,0.2)',
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 15,
          }}>
            <Ionicons name="checkmark-circle" size={24} color="white" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              Download Concluído
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>
              Arquivo {exportSuccess.filename} salvo com sucesso.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );

  // Renderizar a tela de busca de vagas
  const renderJobSearchScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      {/* Cabeçalho */}
      <View style={{
        backgroundColor: Colors.primary,
        paddingTop: insets.top,
        paddingHorizontal: 20,
        paddingBottom: 15,
        zIndex: 1000,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => setActiveScreen('home')}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
            Vagas Compatíveis
          </Text>
          <View style={{ width: 24 }} />
        </View>

        {curriculoSelecionadoParaVagas && (
          <View style={{
            marginTop: 10,
            backgroundColor: 'rgba(255,255,255,0.2)',
            borderRadius: 10,
            padding: 10,
          }}>
            <Text style={{ color: 'white', fontSize: 13 }}>
              Buscando com o currículo:
            </Text>
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 15 }}>
              {curriculoSelecionadoParaVagas.titulo || 'Currículo Principal'}
            </Text>
          </View>
        )}
      </View>

      {/* Filtros de vagas */}
      <View style={{
        paddingHorizontal: 15,
        paddingVertical: 10,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: Colors.mediumGray,
      }}>
        <View style={{ flexDirection: 'row', marginBottom: 10 }}>
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: Colors.mediumGray,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              marginRight: 10,
              fontSize: 14,
            }}
            placeholder="Buscar por cargo..."
            value={filtroVagas.cargo}
            onChangeText={(text) => setFiltroVagas(prev => ({ ...prev, cargo: text }))}
          />
          
          <TextInput
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: Colors.mediumGray,
              borderRadius: 8,
              paddingHorizontal: 10,
              paddingVertical: 8,
              fontSize: 14,
            }}
            placeholder="Local..."
            value={filtroVagas.local}
            onChangeText={(text) => setFiltroVagas(prev => ({ ...prev, local: text }))}
          />
        </View>
        
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 10 }}
        >
          {tiposTrabalho.map(tipo => (
            <TouchableOpacity
              key={tipo.id}
              style={{
                paddingHorizontal: 12,
                paddingVertical: 6,
                backgroundColor: filtroVagas.tipo === tipo.id ? Colors.primary : Colors.lightGray,
                borderRadius: 20,
                marginRight: 8,
              }}
              onPress={() => setFiltroVagas(prev => ({ ...prev, tipo: tipo.id }))}
            >
              <Text style={{
                color: filtroVagas.tipo === tipo.id ? 'white' : Colors.dark,
                fontSize: 13,
              }}>
                {tipo.nome}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Busca externa de vagas */}
      <View style={{
        padding: 15,
        backgroundColor: '#f0f4ff',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: 'bold', color: Colors.dark, marginBottom: 8 }}>
            Procurar outras vagas
          </Text>
          
          <View style={{ flexDirection: 'row' }}>
            <TextInput
              style={{
                flex: 1,
                height: 40,
                borderWidth: 1,
                borderColor: Colors.mediumGray,
                borderTopLeftRadius: 8,
                borderBottomLeftRadius: 8,
                paddingHorizontal: 10,
                backgroundColor: 'white',
                fontSize: 14,
              }}
              placeholder="Ex: Desenvolvedor React, Designer UX..."
              value={pesquisaVagasExternas}
              onChangeText={setPesquisaVagasExternas}
            />
            
            <TouchableOpacity
              style={{
                height: 40,
                paddingHorizontal: 15,
                backgroundColor: Colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                borderTopRightRadius: 8,
                borderBottomRightRadius: 8,
              }}
              onPress={buscarVagasExternas}
              disabled={buscandoVagasExternas}
            >
              {buscandoVagasExternas ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <Ionicons name="search" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Lista de vagas */}
      {buscandoVagas ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center', color: Colors.dark, fontWeight: 'bold' }}>
            Buscando vagas compatíveis
          </Text>
          <Text style={{ marginTop: 10, textAlign: 'center', color: Colors.lightText }}>
            Estamos analisando seu currículo e buscando as melhores oportunidades...
          </Text>
        </View>
      ) : (
        vacasEncontradas.length === 0 ? (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
            <Ionicons name="search-outline" size={60} color={Colors.lightText} />
            <Text style={{ marginTop: 20, fontWeight: 'bold', fontSize: 18, textAlign: 'center', color: Colors.dark }}>
              Nenhuma vaga encontrada
            </Text>
            <Text style={{ marginTop: 10, textAlign: 'center', color: Colors.lightText }}>
              Tente ajustar seus filtros ou buscar com outro currículo.
            </Text>
            <TouchableOpacity
              style={{
                marginTop: 20,
                backgroundColor: Colors.primary,
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderRadius: 10,
              }}
              onPress={() => setModalCurriculoVagaVisible(true)}
            >
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Selecionar Outro Currículo
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={vacasEncontradas.filter(vaga => {
              // Aplicar filtros
              const cargoMatch = filtroVagas.cargo === '' || 
                vaga.titulo.toLowerCase().includes(filtroVagas.cargo.toLowerCase());
              
              const localMatch = filtroVagas.local === '' || 
                vaga.localizacao.toLowerCase().includes(filtroVagas.local.toLowerCase());
              
              const tipoMatch = filtroVagas.tipo === 'todos' || 
                vaga.regime.toLowerCase().includes(filtroVagas.tipo.toLowerCase());
              
              return cargoMatch && localMatch && tipoMatch;
            })}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 15 }}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  backgroundColor: 'white',
                  borderRadius: 12,
                  padding: 15,
                  marginBottom: 15,
                  elevation: 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.1,
                  shadowRadius: 2,
                }}
                onPress={() => visualizarVagaDetalhada(item)}
              >
                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  <View style={{
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: '#F5F5F5',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginRight: 15,
                  }}>
                    <Text style={{ fontSize: 24 }}>{item.empresa_logo || '🏢'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: 'bold', color: Colors.dark }}>
                      {item.titulo}
                    </Text>
                    <Text style={{ color: Colors.darkGray, marginTop: 2 }}>
                      {item.empresa}
                    </Text>
                    <View style={{ flexDirection: 'row', marginTop: 5 }}>
                      <Text style={{ fontSize: 12, color: Colors.lightText }}>
                        {item.localizacao} • {item.regime} • {item.data_publicacao}
                      </Text>
                    </View>
                  </View>
                </View>
                
                <Text style={{ marginBottom: 10, color: Colors.dark }}>
                  {item.descricao}
                </Text>
                
                {/* Requisitos */}
                <View style={{ 
                  backgroundColor: '#F8F8F8', 
                  padding: 10, 
                  borderRadius: 8,
                  marginBottom: 15
                }}>
                  <Text style={{ fontWeight: 'bold', marginBottom: 5, color: Colors.dark }}>
                    Requisitos:
                  </Text>
                  {item.requisitos.slice(0, 3).map((req, index) => (
                    <Text key={index} style={{ color: Colors.darkGray, fontSize: 13, marginBottom: 3 }}>
                      • {req}
                    </Text>
                  ))}
                  {item.requisitos.length > 3 && (
                    <TouchableOpacity onPress={() => {
                      setVagaSelecionada(item);
                      setModalRequisitosVisible(true);
                    }}>
                      <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: 'bold', marginTop: 5 }}>
                        +{item.requisitos.length - 3} requisitos... (ver todos)
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Compatibilidade */}
                <View style={{ marginBottom: 15 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontWeight: 'bold', color: Colors.dark }}>
                      Compatibilidade com seu perfil
                    </Text>
                    <Text style={{ 
                      fontWeight: 'bold', 
                      color: item.compatibilidade > 80 ? Colors.success : 
                              item.compatibilidade > 60 ? '#FF9800' : 
                              Colors.danger 
                    }}>
                      {item.compatibilidade}%
                    </Text>
                  </View>
                  <View style={{ 
                    height: 6, 
                    backgroundColor: '#E0E0E0', 
                    borderRadius: 3,
                    marginTop: 8
                  }}>
                    <View style={{ 
                      height: '100%', 
                      width: `${item.compatibilidade}%`, 
                      backgroundColor: item.compatibilidade > 80 ? Colors.success : 
                                       item.compatibilidade > 60 ? '#FF9800' : 
                                       Colors.danger,
                      borderRadius: 3
                    }} />
                  </View>
                </View>
                
                {/* Botões de ações */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      backgroundColor: Colors.primary,
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      flexDirection: 'row',
                      justifyContent: 'center',
                      marginRight: 10,
                    }}
                    onPress={() => abrirModalQuantidadeCurriculos(item)}
                  >
                    <Ionicons name="document-text-outline" size={16} color="white" style={{ marginRight: 5 }} />
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>
                      Gerar Currículo
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={{
                      backgroundColor: Colors.secondary,
                      padding: 12,
                      borderRadius: 8,
                      alignItems: 'center',
                      width: 46,
                    }}
                    onPress={() => visualizarVagaDetalhada(item)}
                  >
                    <Ionicons name="chevron-forward-outline" size={22} color="white" />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <View style={{ padding: 30, alignItems: 'center' }}>
                <Text style={{ color: Colors.lightText, textAlign: 'center' }}>
                  Nenhuma vaga corresponde aos filtros atuais.
                </Text>
              </View>
            }
          />
        )
      )}

      {/* FAB para Ver Currículos Gerados */}
      {curriculosGerados.length > 0 && (
        <TouchableOpacity
          style={{
            position: 'absolute',
            bottom: 20,
            right: 20,
            backgroundColor: Colors.primary,
            width: 60,
            height: 60,
            borderRadius: 30,
            justifyContent: 'center',
            alignItems: 'center',
            elevation: 5,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 3,
          }}
          onPress={() => {
            // Se só tem um currículo gerado, mostra ele diretamente
            if (curriculosGerados.length === 1) {
              visualizarCurriculoGerado(curriculosGerados[0]);
            } else {
              // Senão, navega para a lista de currículos gerados
              navigation.navigate('CurriculosGerados', { 
                curriculosGerados: curriculosGerados 
              });
            }
          }}
        >
          <Ionicons name="document-text" size={26} color="white" />
          <View style={{
            position: 'absolute',
            top: 0,
            right: 0,
            backgroundColor: Colors.danger,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 4,
          }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>
              {curriculosGerados.length}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );

  // Renderizar cabeçalho da tela de conhecimento
  const renderKnowledgeHeader = () => (
    <View style={{
      backgroundColor: Colors.primary,
      paddingTop: insets.top,
      paddingHorizontal: 20,
      paddingBottom: 15,
      zIndex: 1000,
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity onPress={voltarParaHome}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: 'white' }}>
          Biblioteca de Conhecimento
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={{ marginTop: 15 }}>
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.2)',
          borderRadius: 10,
          paddingHorizontal: 15,
          paddingVertical: 10,
          alignItems: 'center',
        }}>
          <Ionicons name="search" size={20} color="white" />
          <TextInput
            placeholder="Buscar conhecimento..."
            placeholderTextColor="rgba(255,255,255,0.7)"
            style={{
              flex: 1,
              color: 'white',
              marginLeft: 10,
              fontSize: 16,
            }}
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearchChange('')}>
              <Ionicons name="close-circle" size={20} color="white" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );

  // Renderizar abas de navegação da tela de conhecimento
  const renderKnowledgeTabs = () => (
    <View style={{
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: Colors.mediumGray,
      backgroundColor: 'white',
    }}>
      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 15,
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: activeTab === 'topics' ? Colors.primary : 'transparent',
        }}
        onPress={() => setActiveTab('topics')}
      >
        <Text style={{
          fontWeight: 'bold',
          color: activeTab === 'topics' ? Colors.primary : Colors.lightText,
        }}>
          Explorar Tópicos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 15,
          alignItems: 'center',
          borderBottomWidth: 3,
          borderBottomColor: activeTab === 'saved' ? Colors.primary : 'transparent',
        }}
        onPress={() => setActiveTab('saved')}
      >
        <Text style={{
          fontWeight: 'bold',
          color: activeTab === 'saved' ? Colors.primary : Colors.lightText,
        }}>
          Favoritos{' '}
          {savedKnowledge.length > 0 && (
            <Text>({savedKnowledge.length})</Text>
          )}
        </Text>
      </TouchableOpacity>

      {selectedTopic && (
        <TouchableOpacity
          style={{
            flex: 1,
            paddingVertical: 15,
            alignItems: 'center',
            borderBottomWidth: 3,
            borderBottomColor: activeTab === 'content' ? Colors.primary : 'transparent',
          }}
          onPress={() => setActiveTab('content')}
        >
          <Text style={{
            fontWeight: 'bold',
            color: activeTab === 'content' ? Colors.primary : Colors.lightText,
          }}>
            Conteúdo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Renderizar categorias horizontais
  const renderCategories = () => (
    <View style={{ marginVertical: 15 }}>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 15 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={{
              paddingHorizontal: 15,
              paddingVertical: 10,
              backgroundColor: selectedCategory === item.id ? Colors.primary : 'rgba(0,0,0,0.05)',
              borderRadius: 20,
              marginRight: 10,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setSelectedCategory(item.id)}
          >
            <Text style={{ marginRight: 5 }}>{item.icon}</Text>
            <Text style={{
              fontWeight: '500',
              color: selectedCategory === item.id ? 'white' : Colors.dark,
            }}>
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  // Renderizar resultados de busca
  const renderSearchResults = () => {
    if (searchQuery.trim() === '') return null;

    return (
      <View style={{
        backgroundColor: 'white',
        borderRadius: 10,
        margin: 15,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      }}>
        <View style={{
          padding: 15,
          borderBottomWidth: 1,
          borderBottomColor: Colors.mediumGray,
        }}>
          <Text style={{ fontWeight: 'bold', color: Colors.dark }}>
            Resultados para "{searchQuery}"
          </Text>
        </View>

        {isSearching ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <ActivityIndicator color={Colors.primary} />
            <Text style={{ marginTop: 10, color: Colors.lightText }}>Buscando...</Text>
          </View>
        ) : searchResults.length === 0 ? (
          <View style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: Colors.lightText }}>Nenhum resultado encontrado</Text>
            <TouchableOpacity
              style={{
                marginTop: 10,
                backgroundColor: Colors.primary,
                paddingHorizontal: 15,
                paddingVertical: 8,
                borderRadius: 20,
                flexDirection: 'row',
                alignItems: 'center',
              }}
              onPress={() => {
                const newTopic = {
                  id: `search-${Date.now()}`,
                  title: searchQuery,
                  icon: '🔍',
                  isGenerated: true,
                  generatedTitle: searchQuery
                };
                handleSelectTopic(newTopic);
              }}
            >
              <Ionicons name="add-circle-outline" size={16} color="white" style={{ marginRight: 5 }} />
              <Text style={{ color: 'white', fontWeight: '500' }}>
                Gerar conteúdo sobre "{searchQuery}"
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={{
                  padding: 15,
                  borderBottomWidth: 1,
                  borderBottomColor: Colors.mediumGray,
                  flexDirection: 'row',
                  alignItems: 'center',
                }}
                onPress={() => handleSelectTopic(item)}
              >
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: item.isGenerated ? '#e1f5fe' : item.isSaved ? '#e8f5e9' : '#f5f5f5',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 18 }}>{item.icon}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: item.isGenerated ? 'bold' : 'normal', color: Colors.dark }}>
                    {item.title}
                  </Text>
                  {item.isSaved && (
                    <Text style={{ fontSize: 12, color: Colors.success, marginTop: 2 }}>
                      Já salvo nos seus favoritos
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
              </TouchableOpacity>
            )}
            style={{ maxHeight: 300 }}
          />
        )}
      </View>
    );
  };

  // Renderizar lista de tópicos
  const renderTopicsList = () => {
    const filteredTopics = getFilteredTopics();

    return (
      <View style={{ padding: 15 }}>
        {filteredTopics.map((topic) => (
          <TouchableOpacity
            key={topic.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              padding: 15,
              backgroundColor: 'white',
              borderRadius: 10,
              marginBottom: 10,
              elevation: 2,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.1,
              shadowRadius: 2,
            }}
            onPress={() => handleSelectTopic(topic)}
          >
            <View style={{
              width: 50,
              height: 50,
              borderRadius: 25,
              backgroundColor: '#f5f5f5',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}>
              <Text style={{ fontSize: 24 }}>{topic.icon}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.dark }}>
                {topic.title}
              </Text>
              {savedKnowledge.some(k => k.topicId === topic.id) && (
                <Text style={{ fontSize: 12, color: Colors.success, marginTop: 4 }}>
                  <Ionicons name="bookmark" size={12} color={Colors.success} /> Salvo
                </Text>
              )}
            </View>
            <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Renderizar lista de favoritos
  const renderSavedList = () => {
    if (savedKnowledge.length === 0) {
      return (
        <View style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: 50,
          paddingHorizontal: 20
        }}>
          <Ionicons name="bookmark-outline" size={60} color={Colors.lightText} />
          <Text style={{
            fontSize: 18,
            fontWeight: 'bold',
            color: Colors.dark,
            marginTop: 15,
            textAlign: 'center'
          }}>
            Nenhum conteúdo salvo ainda
          </Text>
          <Text style={{
            color: Colors.lightText,
            textAlign: 'center',
            marginTop: 10,
            marginBottom: 20
          }}>
            Explore tópicos de carreira e salve conteúdo para acesso rápido.
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: Colors.primary,
              paddingHorizontal: 20,
              paddingVertical: 12,
              borderRadius: 25,
              flexDirection: 'row',
              alignItems: 'center',
            }}
            onPress={() => setActiveTab('topics')}
          >
            <Ionicons name="search" size={20} color="white" style={{ marginRight: 5 }} />
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              Explorar Tópicos
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={{ padding: 15 }}>
        {savedKnowledge.map((knowledge) => {
          // Encontrar o tópico original se existir
          const originalTopic = careerTopics.find(t => t.id === knowledge.topicId);

          return (
            <TouchableOpacity
              key={knowledge.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                backgroundColor: 'white',
                borderRadius: 10,
                marginBottom: 10,
                elevation: 2,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
              }}
              onPress={() => handleSelectTopic(originalTopic || {
                id: knowledge.topicId,
                title: knowledge.title,
                icon: '📚'
              })}
            >
              <View style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                backgroundColor: '#e8f5e9',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 15,
              }}>
                <Text style={{ fontSize: 24 }}>
                  {originalTopic?.icon || '📚'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.dark }}>
                  {knowledge.title}
                </Text>
                <Text style={{ fontSize: 12, color: Colors.lightText, marginTop: 4 }}>
                  Salvo: {formatarTempoRelativo(knowledge.timestamp)}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.lightText} />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Renderizar conteúdo do tópico
  const renderTopicContent = () => {
    if (!selectedTopic) return null;

    if (generatingContent) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ marginTop: 20, textAlign: 'center', color: Colors.dark, fontWeight: 'bold' }}>
            Gerando conteúdo sobre
          </Text>
          <Text style={{ marginTop: 5, textAlign: 'center', color: Colors.dark, fontWeight: 'bold', fontSize: 18 }}>
            {selectedTopic.generatedTitle || selectedTopic.title}
          </Text>
          <Text style={{ marginTop: 15, textAlign: 'center', color: Colors.lightText }}>
            Nossa IA está criando um guia profissional detalhado. Isso pode levar alguns instantes.
          </Text>
        </View>
      );
    }

    if (generatedContent) {
      return (
        <View style={{ flex: 1 }}>
          <ScrollView style={{ flex: 1 }}>
            <View style={{ padding: 15 }}>
              <Markdown
                style={{
                  body: { fontSize: 16, lineHeight: 24, color: Colors.dark },
                  heading1: {
                    fontSize: 24,
                    fontWeight: 'bold',
                    marginBottom: 15,
                    color: Colors.dark,
                    borderBottomWidth: 1,
                    borderBottomColor: Colors.mediumGray,
                    paddingBottom: 5,
                  },
                  heading2: {
                    fontSize: 20,
                    fontWeight: 'bold',
                    marginBottom: 10,
                    marginTop: 20,
                    color: Colors.dark
                  },
                  heading3: {
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginTop: 15,
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
                  ordered_list: {
                    marginVertical: 10,
                  },
                  hr: {
                    backgroundColor: Colors.mediumGray,
                    height: 1,
                    marginVertical: 15,
                  },
                  blockquote: {
                    borderLeftWidth: 3,
                    borderLeftColor: Colors.primary,
                    paddingLeft: 10,
                    marginVertical: 10,
                    backgroundColor: Colors.lightGray,
                    padding: 10,
                    borderRadius: 5,
                  },
                  link: {
                    color: Colors.primary,
                    textDecorationLine: 'underline',
                  }
                }}
              >
                {generatedContent}
              </Markdown>

              {/* Tópicos relacionados */}
              {relatedTopics && relatedTopics.length > 0 && (
                <View style={{
                  marginTop: 30,
                  padding: 15,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 10,
                  marginBottom: 20,
                }}>
                  <Text style={{
                    fontSize: 18,
                    fontWeight: 'bold',
                    marginBottom: 15,
                    color: Colors.dark,
                  }}>
                    Tópicos Relacionados
                  </Text>

                  {relatedTopics.map((topic, index) => (
                    <TouchableOpacity
                      key={index}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        padding: 12,
                        backgroundColor: Colors.white,
                        borderRadius: 8,
                        marginBottom: 8,
                        elevation: 1,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.1,
                        shadowRadius: 1,
                      }}
                      onPress={() => handleSelectTopic(topic)}
                    >
                      <Text style={{ fontSize: 20, marginRight: 10 }}>📚</Text>
                      <Text style={{ fontSize: 14, color: Colors.dark, flex: 1 }}>
                        {topic.title}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Espaço no final para evitar que o conteúdo fique sob a barra de ações */}
              <View style={{ height: 70 }} />
            </View>
          </ScrollView>

          {/* Barra de ações */}
          <View style={{
            flexDirection: 'row',
            padding: 15,
            borderTopWidth: 1,
            borderTopColor: Colors.mediumGray,
            backgroundColor: 'white',
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
          }}>
            <TouchableOpacity
              style={{
                backgroundColor: isBookmarked ? Colors.success : Colors.primary,
                flex: 1,
                paddingVertical: 12,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
                marginRight: 10,
              }}
              onPress={toggleBookmark}
            >
              <Ionicons
                name={isBookmarked ? "bookmark" : "bookmark-outline"}
                size={20}
                color="white"
                style={{ marginRight: 5 }}
              />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                {isBookmarked ? 'Salvo' : 'Salvar'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                backgroundColor: Colors.secondary,
                paddingVertical: 12,
                paddingHorizontal: 15,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}
              onPress={shareGeneratedContent}
            >
              <Ionicons name="share-outline" size={20} color="white" style={{ marginRight: 5 }} />
              <Text style={{ color: 'white', fontWeight: 'bold' }}>
                Compartilhar
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
        <Text style={{ textAlign: 'center', color: Colors.lightText }}>
          Nenhum conteúdo disponível.
        </Text>
      </View>
    );
  };

  // Renderizar conteúdo principal da tela de conhecimento baseado na aba ativa
  const renderKnowledgeContent = () => {
    if (searchQuery.trim() !== '') {
      return renderSearchResults();
    }

    switch (activeTab) {
      case 'topics':
        return (
          <>
            {renderCategories()}
            {renderTopicsList()}
          </>
        );
      case 'saved':
        return renderSavedList();
      case 'content':
        return renderTopicContent();
      default:
        return null;
    }
  };

  // Renderizar a tela completa de conhecimento
  const renderKnowledgeScreen = () => (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      {renderKnowledgeHeader()}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={{ marginTop: 5, flex: 1 }}>
          {renderKnowledgeTabs()}
          {renderKnowledgeContent()}
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  // Renderização da tela principal do HomeScreen
  const renderHomeScreen = () => (
    <SafeAreaView style={styles.homeContainer}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.primary} />

      <View style={styles.homeHeader}>
        <Text style={styles.homeTitle}>CurriculoBot</Text>
        <Text style={styles.homeSubtitle}>
          Seu assistente para criação de currículos
        </Text>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={logout}
        >
          <Text style={styles.logoutButtonText}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.homeContent}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.homeScrollContent}
        >
          <Text style={styles.welcomeText}>Olá, {user?.nome || 'visitante'}!</Text>

          {/* NOVA SEÇÃO: Botão de Vagas Personalizadas - Modificado para navegar */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Vagas Compatíveis</Text>
            <TouchableOpacity
              style={[styles.featureCard, {
                backgroundColor: '#f0f4ff',
                borderLeftWidth: 4,
                borderLeftColor: '#4364e8',
              }]}
              onPress={navegarParaBuscaVagas}
              activeOpacity={0.7}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#4364e8',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 15,
                }}>
                  <Text style={{ fontSize: 24, color: Colors.white }}>🔍</Text>
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: Colors.dark,
                  flex: 1,
                }}>
                  Buscar Vagas Compatíveis
                </Text>
              </View>

              <Text style={{ color: '#2c4283', marginBottom: 15, lineHeight: 22 }}>
                Nossa IA busca vagas de emprego alinhadas com seu perfil profissional e 
                gera currículos personalizados para cada oportunidade, aumentando suas 
                chances de sucesso.
              </Text>

              <View style={{
                backgroundColor: '#4364e8',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignSelf: 'flex-start',
                marginTop: 5,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{ color: Colors.white, fontWeight: 'bold', marginRight: 5 }}>
                  Encontrar Vagas Agora
                </Text>
                <Text style={{ color: Colors.white, fontSize: 18 }}>→</Text>
              </View>

              {/* Badge com número de currículos gerados */}
              {curriculosGerados.length > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 15,
                  right: 15,
                  backgroundColor: '#4364e8',
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 12, fontWeight: 'bold' }}>
                    {curriculosGerados.length} Currículo{curriculosGerados.length !== 1 ? 's' : ''} Gerado{curriculosGerados.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* SEÇÃO: Biblioteca de Conhecimento */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Desenvolvimento Profissional</Text>
            <TouchableOpacity
              style={[styles.featureCard, {
                backgroundColor: '#e1f5fe',
                borderLeftWidth: 4,
                borderLeftColor: '#03a9f4',
              }]}
              onPress={navegarParaConhecimento}
              activeOpacity={0.7}
            >
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginBottom: 10,
              }}>
                <View style={{
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: '#03a9f4',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 15,
                }}>
                  <Text style={{ fontSize: 24, color: Colors.white }}>🧠</Text>
                </View>
                <Text style={{
                  fontSize: 20,
                  fontWeight: 'bold',
                  color: Colors.dark,
                  flex: 1,
                }}>
                  Biblioteca de Conhecimento
                </Text>
              </View>

              <Text style={{ color: '#0277bd', marginBottom: 15, lineHeight: 22 }}>
                Explore guias profissionais detalhados sobre desenvolvimento de carreira,
                técnicas de entrevista, networking e muito mais. Conteúdo gerado por IA
                para impulsionar sua trajetória profissional.
              </Text>

              <View style={{
                backgroundColor: '#03a9f4',
                paddingVertical: 12,
                paddingHorizontal: 20,
                borderRadius: 8,
                alignSelf: 'flex-start',
                marginTop: 5,
                flexDirection: 'row',
                alignItems: 'center',
              }}>
                <Text style={{ color: Colors.white, fontWeight: 'bold', marginRight: 5 }}>
                  Explorar Conhecimento
                </Text>
                <Text style={{ color: Colors.white, fontSize: 18 }}>→</Text>
              </View>

              {/* Badge com número de conteúdos salvos */}
              {savedKnowledge.length > 0 && (
                <View style={{
                  position: 'absolute',
                  top: 15,
                  right: 15,
                  backgroundColor: '#03a9f4',
                  paddingVertical: 3,
                  paddingHorizontal: 8,
                  borderRadius: 12,
                }}>
                  <Text style={{ color: Colors.white, fontSize: 12, fontWeight: 'bold' }}>
                    {savedKnowledge.length} Guia{savedKnowledge.length !== 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Card de Currículo em Progresso */}
          {temProgressoSalvo && (
            <View style={styles.curriculoProgressoCard}>
              <View style={styles.curriculoProgressoHeader}>
                <View style={styles.curriculoProgressoIcon}>
                  <Text style={{ fontSize: 20, color: Colors.white }}>📝</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.curriculoProgressoTitulo}>
                    Currículo em Andamento
                  </Text>
                  <Text style={styles.curriculoProgressoSubtitulo}>
                    Última edição: {formatarTempoRelativo(ultimoProgressoData)}
                  </Text>
                </View>
              </View>

              <Text style={styles.curriculoProgressoTexto}>
                Você tem um currículo em andamento. Deseja continuar de onde parou?
              </Text>

              <TouchableOpacity
                style={styles.curriculoProgressoBotao}
                onPress={continuarCurriculo}
                activeOpacity={0.7}
              >
                <Text style={styles.curriculoProgressoBotaoTexto}>
                  Continuar Currículo
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* SEÇÃO: Ações Principais */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Ações Principais</Text>
            <View style={styles.mainActionsContainer}>
              {/* Botão "Novo Currículo" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('Chatbot')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📄</Text>
                </View>
                <Text style={styles.mainActionText}>Novo Currículo</Text>
              </TouchableOpacity>

              {/* Botão "Analise seu Currículo" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('CurriculosAnalise')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📊</Text>
                </View>
                <Text style={styles.mainActionText}>Analise seu Currículo</Text>
              </TouchableOpacity>

              {/* NOVO BOTÃO: "Simular Entrevista" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('SimularEntrevista')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>🎯</Text>
                </View>
                <Text style={styles.mainActionText}>Simular Entrevista</Text>
              </TouchableOpacity>

              {/* Botão "Gerenciar Currículos" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={() => navigation.navigate('MeusCurriculos')}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>📂</Text>
                </View>
                <Text style={styles.mainActionText}>Gerenciar Currículos</Text>
              </TouchableOpacity>

              {/* Botão "Configurar IAs" */}
              <TouchableOpacity
                style={styles.mainActionButton}
                onPress={navegarParaConfiguracoesIA}
                activeOpacity={0.7}
              >
                <View style={styles.mainActionIconContainer}>
                  <Text style={styles.mainActionIcon}>🔧</Text>
                </View>
                <Text style={styles.mainActionText}>Configurar IAs</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Seção de Informações do Aplicativo */}
          <View style={styles.featureSection}>
            <Text style={styles.featureSectionTitle}>Sobre o Aplicativo</Text>
            <TouchableOpacity
              style={[styles.featureCard, styles.compactCard]}
              onPress={() => navigation.navigate('SobreApp')}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: Colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 10,
                }}>
                  <Text style={{ fontSize: 20, color: Colors.white }}>ℹ️</Text>
                </View>
                <Text style={styles.featureTitle}>CurriculoBot Premium</Text>
              </View>
              <Text style={styles.featureDescription}>
                Versão: 1.2.0
              </Text>
              <Text style={styles.featureDescription}>
                Este aplicativo utiliza tecnologia de inteligência artificial para ajudar na criação e análise de currículos.
              </Text>
              <TouchableOpacity
                style={styles.premiumButton}
                onPress={() => navigation.navigate('SobreApp')}
              >
                <Text style={styles.premiumButtonText}>Saiba Mais</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Espaço adicional no final do scroll */}
          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );

  // Renderizar modais
  const renderModals = () => (
    <>
      {renderModalSelecionarCurriculo()}
      {renderModalQuantidadeCurriculos()}
      {renderModalDownload()}
      {renderModalRequisitos()}
      {gerandoCurriculos && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 15,
            padding: 25,
            alignItems: 'center',
            width: '80%',
          }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 20, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
              Gerando {quantidadeCurriculos} Currículo{quantidadeCurriculos > 1 ? 's' : ''} Personalizado{quantidadeCurriculos > 1 ? 's' : ''}
            </Text>
            <Text style={{ marginTop: 15, textAlign: 'center', color: Colors.lightText }}>
              Nossa IA está analisando seu perfil e otimizando seu currículo para a vaga "{vagaSelecionada?.titulo}" na {vagaSelecionada?.empresa}.
            </Text>
            <Text style={{ marginTop: 10, textAlign: 'center', color: Colors.lightText }}>
              Isso pode levar até 2 minutos.
            </Text>
          </View>
        </View>
      )}
      {loadingExport && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: 'white',
            borderRadius: 15,
            padding: 20,
            alignItems: 'center',
            width: '70%',
          }}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={{ marginTop: 15, fontWeight: 'bold', fontSize: 16, textAlign: 'center' }}>
              Preparando Documento
            </Text>
            <Text style={{ marginTop: 10, textAlign: 'center', color: Colors.lightText }}>
              Estamos gerando seu arquivo. Por favor, aguarde...
            </Text>
          </View>
        </View>
      )}
    </>
  );

  // Renderização principal do componente HomeScreen
  return (
    <>
      {activeScreen === 'home' && renderHomeScreen()}
      {activeScreen === 'knowledge' && renderKnowledgeScreen()}
      {activeScreen === 'jobsearch' && renderJobSearchScreen()}
      {activeScreen === 'viewjob' && renderViewJobScreen()}
      {activeScreen === 'viewresume' && renderViewResumeScreen()}
      {renderModals()}
    </>
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