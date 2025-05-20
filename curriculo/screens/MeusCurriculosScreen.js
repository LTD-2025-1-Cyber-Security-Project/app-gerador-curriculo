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
import DocumentIcon from '../../styles/DocumentIcon'

// Contexto de autenticação com tratamento seguro
const AuthContext = createContext(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  // Verificação de segurança
  if (context === undefined) {
    console.warn('useAuth deve ser usado dentro de um AuthProvider');
    return { user: null, isLoading: true };
  }
  return context;
};

const MeusCurriculosScreen = ({ navigation }) => {
  const authContext = useAuth();
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  const [curriculos, setCurriculos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredCurriculos, setFilteredCurriculos] = useState([]);
  const [showMenu, setShowMenu] = useState(false);
  const [selectedCurriculoId, setSelectedCurriculoId] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0)); // Usando Animated

  // Referência para posição do menu
  const menuPosition = useRef({ x: 0, y: 0 });

  // Verificar contexto de autenticação
  useEffect(() => {
    const checkAuthContext = async () => {
      try {
        setAuthLoading(true);
        
        // Tentar obter o usuário do contexto ou do AsyncStorage
        if (authContext && authContext.user) {
          setUser(authContext.user);
        } else {
          // Fallback: tentar obter dados do usuário do AsyncStorage
          const storedUser = await AsyncStorage.getItem('currentUser');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            setUser(userData);
          } else {
            // Se não há usuário logado, navegar para login
            console.log('Nenhum usuário encontrado, redirecionando para login...');
            Alert.alert(
              "Sessão Expirada",
              "Sua sessão expirou ou você não está logado. Por favor, faça login novamente.",
              [
                { text: "OK", onPress: () => navigation.navigate('Login') }
              ]
            );
          }
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuthContext();
  }, [authContext]);

  const loadCurriculos = async () => {
    try {
      if (!user || !user.id) {
        console.warn('Tentativa de carregar currículos sem usuário válido');
        return;
      }
      
      setLoading(true);
      const cvs = await AsyncStorage.getItem(`curriculos_${user.id}`);
      const curriculosData = cvs ? JSON.parse(cvs) : [];
      setCurriculos(curriculosData);
      setFilteredCurriculos(curriculosData);

      // Animação de fade in suave
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }).start();
      
    } catch (error) {
      console.error('Erro ao carregar currículos:', error);
      Alert.alert('Erro', 'Não foi possível carregar seus currículos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && !authLoading) {
      loadCurriculos();

      // Atualizar quando a tela ganhar foco
      const unsubscribe = navigation.addListener('focus', () => {
        loadCurriculos();
      });

      return unsubscribe;
    }
  }, [navigation, user, authLoading]);

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
    if (!user || !user.id) {
      Alert.alert('Erro', 'Usuário não autenticado. Faça login novamente.');
      return;
    }
    
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
    if (!cv) {
      Alert.alert('Erro', 'Currículo não encontrado ou corrompido.');
      return;
    }
    navigation.navigate('PreviewCV', { curriculoData: cv });
  };

  // Nova função para editar currículo
  const handleEditCV = (cv) => {
    if (!cv) {
      Alert.alert('Erro', 'Currículo não encontrado ou corrompido.');
      return;
    }
    navigation.navigate('EditarCurriculo', { curriculoData: cv });
  };

  const handleAnalyzeCV = (cv) => {
    if (!cv) {
      Alert.alert('Erro', 'Currículo não encontrado ou corrompido.');
      return;
    }
    navigation.navigate('AnaliseCV', { curriculoData: cv });
  };

  const handleShareCV = (cv) => {
    if (!cv) {
      Alert.alert('Erro', 'Currículo não encontrado ou corrompido.');
      return;
    }
    
    // Simular compartilhamento
    Share.share({
      message: `Currículo de ${cv.nome || 'Usuário'} - ${formatDate(cv.dataCriacao)}`,
      title: `Currículo - ${cv.nome || 'Usuário'}`
    }).catch(error => {
      console.error('Erro ao compartilhar:', error);
      Alert.alert('Erro', 'Não foi possível compartilhar o currículo.');
    });
  };

  const showContextMenu = (id, event) => {
    if (!id) return;
    
    // Salvar a posição para o menu
    menuPosition.current = {
      x: Math.max(10, Math.min(event.nativeEvent.pageX - 180, Dimensions.get('window').width - 200)),  // Garantir que não fique fora da tela
      y: Math.min(event.nativeEvent.pageY, Dimensions.get('window').height - 250) // Evitar que o menu fique cortado na parte inferior
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

  // Obter resumo do currículo com tratamento de possíveis valores undefined
  const getCurriculoDetails = (curriculo) => {
    if (!curriculo || !curriculo.data) {
      return { 
        area: 'Não disponível', 
        experiencias: 0, 
        ultimaExperiencia: 'Nenhuma experiência',
        formacoes: 0, 
        ultimaFormacao: 'Nenhuma formação'
      };
    }
    
    const cv = curriculo.data;
    const area = cv.informacoes_pessoais?.area || 'Não especificada';
    const experiencias = cv.experiencias?.length || 0;
    const ultimaExperiencia = cv.experiencias?.length > 0
      ? `${cv.experiencias[0].cargo || 'Não informado'} em ${cv.experiencias[0].empresa || 'Não informada'}`
      : 'Nenhuma experiência';
    const formacoes = cv.formacoes_academicas?.length || 0;
    const ultimaFormacao = cv.formacoes_academicas?.length > 0
      ? `${cv.formacoes_academicas[0].diploma || 'Não informado'} em ${cv.formacoes_academicas[0].area_estudo || 'Não informada'}`
      : 'Nenhuma formação';

    return { area, experiencias, ultimaExperiencia, formacoes, ultimaFormacao };
  };

  // Loading state se o contexto de autenticação ainda está carregando
  if (authLoading) {
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
            Verificando autenticação...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Verificar se o usuário está autenticado
  if (!user) {
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' }}>
            Você precisa estar logado para gerenciar seus currículos
          </Text>
          <TouchableOpacity
            style={{
              backgroundColor: ProfessionalColors.primary,
              paddingVertical: 12,
              paddingHorizontal: 30,
              borderRadius: 8,
            }}
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Fazer Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

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
            <Ionicons name="add-circle-outline" size={20} color="white" style={{ marginRight: 8 }} />
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
          <Ionicons name="chevron-back" size={24} color={ProfessionalColors.textDark} />
        </TouchableOpacity>
        <Text style={meusCurriculosStyles.headerTitle}>Gerenciar Currículos</Text>

        <View style={meusCurriculosStyles.headerActions}>
          <TouchableOpacity 
            style={meusCurriculosStyles.headerActionButton}
            onPress={() => navigation.navigate('ConfiguracoesAvancadas')}  
          >
            <Ionicons name="settings-outline" size={22} color={ProfessionalColors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de pesquisa */}
      <View style={meusCurriculosStyles.searchContainer}>
        <Ionicons name="search-outline" size={20} color={ProfessionalColors.textLight} style={{ marginRight: 8 }} />
        <TextInput
          style={meusCurriculosStyles.searchInput}
          placeholder="Buscar currículos..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor={ProfessionalColors.textLight}
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color={ProfessionalColors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {/* Header da seção */}
      <View style={meusCurriculosStyles.sectionHeader}>
        <Text style={meusCurriculosStyles.sectionTitle}>
          Seus Currículos ({filteredCurriculos.length})
        </Text>
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <Ionicons name="filter-outline" size={16} color={ProfessionalColors.primary} style={{ marginRight: 4 }} />
          <Text style={meusCurriculosStyles.sectionActionText}>Ordenar</Text>
        </TouchableOpacity>
      </View>

      <Animated.FlatList
        data={filteredCurriculos}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        style={{ opacity: fadeAnim }}
        renderItem={({ item }) => {
          const details = getCurriculoDetails(item);

          return (
            <View style={[
              meusCurriculosStyles.curriculoCard,
              {
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
              }
            ]}>
              <TouchableOpacity
                style={meusCurriculosStyles.curriculoCardContent}
                onPress={() => handleViewCV(item)}
                onLongPress={(event) => showContextMenu(item.id, event)}
                activeOpacity={0.7}
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
                    <Ionicons name="ellipsis-vertical" size={20} color={ProfessionalColors.textMedium} />
                  </TouchableOpacity>
                </View>

                <View style={meusCurriculosStyles.curriculoCardMeta}>
                  <Ionicons name="calendar-outline" size={16} color={ProfessionalColors.textMedium} style={{ marginRight: 5 }} />
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
                    <Ionicons name="briefcase-outline" size={14} color={ProfessionalColors.primary} style={{ marginRight: 4 }} />
                    <Text style={meusCurriculosStyles.curriculoCardTagText}>
                      {details.experiencias} experiência(s)
                    </Text>
                  </View>

                  <View style={meusCurriculosStyles.curriculoCardTag}>
                    <Ionicons name="school-outline" size={14} color={ProfessionalColors.primary} style={{ marginRight: 4 }} />
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
                  <Ionicons name="eye-outline" size={18} color={ProfessionalColors.primary} style={{ marginRight: 5 }} />
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    Visualizar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />
                
                {/* Botão de edição */}
                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleEditCV(item)}
                >
                  <Ionicons name="pencil-outline" size={18} color={ProfessionalColors.primary} style={{ marginRight: 5 }} />
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionPrimary
                  ]}>
                    Editar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />

                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleAnalyzeCV(item)}
                >
                  <Ionicons name="analytics-outline" size={18} color={ProfessionalColors.secondary} style={{ marginRight: 5 }} />
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionSecondary
                  ]}>
                    Analisar
                  </Text>
                </TouchableOpacity>

                <View style={meusCurriculosStyles.curriculoCardDivider} />

                <TouchableOpacity
                  style={meusCurriculosStyles.curriculoCardAction}
                  onPress={() => handleDeleteCV(item.id)}
                >
                  <Ionicons name="trash-outline" size={18} color={ProfessionalColors.danger} style={{ marginRight: 5 }} />
                  <Text style={[
                    meusCurriculosStyles.curriculoCardActionText,
                    meusCurriculosStyles.curriculoCardActionDanger
                  ]}>
                    Excluir
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          searchText.length > 0 ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="search" size={50} color={ProfessionalColors.textLight} />
              <Text style={{ marginTop: 10, fontSize: 16, color: ProfessionalColors.textMedium, textAlign: 'center' }}>
                Nenhum currículo encontrado para "{searchText}"
              </Text>
            </View>
          ) : null
        }
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
              left: menuPosition.current.x,
              ...Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.2,
                  shadowRadius: 6,
                },
                android: {
                  elevation: 5,
                },
              }),
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
              <Ionicons name="eye-outline" size={20} color={ProfessionalColors.textDark} style={{ marginRight: 10 }} />
              <Text style={meusCurriculosStyles.menuOptionText}>Visualizar</Text>
            </TouchableOpacity>
            
            {/* Opção de edição no menu de contexto */}
            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                setShowMenu(false);
                const cv = curriculos.find(c => c.id === selectedCurriculoId);
                if (cv) handleEditCV(cv);
              }}
            >
              <Ionicons name="pencil-outline" size={20} color={ProfessionalColors.textDark} style={{ marginRight: 10 }} />
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
              <Ionicons name="analytics-outline" size={20} color={ProfessionalColors.textDark} style={{ marginRight: 10 }} />
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
              <Ionicons name="share-social-outline" size={20} color={ProfessionalColors.textDark} style={{ marginRight: 10 }} />
              <Text style={meusCurriculosStyles.menuOptionText}>Compartilhar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={meusCurriculosStyles.menuOption}
              onPress={() => {
                if (selectedCurriculoId) handleDeleteCV(selectedCurriculoId);
              }}
            >
              <Ionicons name="trash-outline" size={20} color={ProfessionalColors.danger} style={{ marginRight: 10 }} />
              <Text style={[meusCurriculosStyles.menuOptionText, meusCurriculosStyles.menuOptionDanger]}>
                Excluir
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        style={[
          meusCurriculosStyles.fabButton,
          {
            ...Platform.select({
              ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.3,
                shadowRadius: 5,
              },
              android: {
                elevation: 6,
              },
            }),
          }
        ]}
        onPress={() => navigation.navigate('Chatbot')}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </SafeAreaView>
  );
};

export default MeusCurriculosScreen;