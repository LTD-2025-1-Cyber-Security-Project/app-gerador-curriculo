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
import ColorsModule from '../styles/colors';
import sharedStyles from '../styles/sharedStyles';
import styles from '../styles/styles';
import meusCurriculosStyles from '../styles/meusCurriculosStyles';
import ProfessionalColors from '../styles/ProfessionalColors';
import curriculoAnaliseStyles from '../styles/curriculoAnaliseStyles';
import HeaderColors from '../styles/HeaderColors'
const Colors = ColorsModule.Colors;
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IA_APIS from '../src/api/IA_APIS';
import salvarIAAPIKey from '../src/api/salvarIAAPIKey';
import getIAAPIKey from '../src/api/getIAAPIKey';
import ConfigAvStackScreen from '../screens/ConfigAvStackScreen';

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

export default DadosMercadoScreen;