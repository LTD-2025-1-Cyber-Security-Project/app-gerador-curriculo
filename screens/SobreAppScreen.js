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

export default SobreAppScreen;