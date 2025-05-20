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

export default SelecionarCurriculoScreen;