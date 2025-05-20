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
import ColorsModule from '../../styles/colors';
import sharedStyles from '../../styles/sharedStyles';
import styles from '../../styles/styles';
import initialCVData from '../../styles/initialCVData';
import meusCurriculosStyles from '../../styles/meusCurriculosStyles';
import ProfessionalColors from '../../styles/ProfessionalColors';
import curriculoAnaliseStyles from '../../styles/curriculoAnaliseStyles';
import HeaderColors from '../../styles/HeaderColors'
const Colors = ColorsModule.Colors;
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Markdown from 'react-native-markdown-display';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import axios from 'axios';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import IA_APIS from '../../src/api/IA_APIS';
import salvarIAAPIKey from '../../src/api/salvarIAAPIKey';
import getIAAPIKey from '../../src/api/getIAAPIKey';
import ConfiguracoesAvancadasScreen from '../../screens/ConfiguracoesAvancadasScreen';
import DashboardScreen from '../../screens/DashboardScreen';
import SobreAppScreen from '../../screens/SobreAppScreen';
import SelecionarCurriculoScreen from '../../screens/SelecionarCurriculoScreen';
import AnaliseCVScreen from '../../screens/AnaliseCVScreen';
import PerfilFotoScreen from '../../screens/PerfilFotoScreen';
import analisarCurriculoComIA from '../../curriculo/analisarCurriculoComIA';
import chamarIAAPI from '../../src/api/chamarIAAPI';

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

export default CurriculosAnaliseScreen;