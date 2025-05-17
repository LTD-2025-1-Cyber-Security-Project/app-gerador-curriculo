import { StyleSheet, Platform } from 'react-native';
import ColorsModule from './colors';
import HeaderColors from './HeaderColors'
import additionalStyles from './additionalStyles'

const Colors = ColorsModule.Colors;

const styles = StyleSheet.create({
  aboutContainer: {
    flex: 1,
    padding: 20,
  },
  aboutSection: {
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
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginHorizontal: 2,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa', // Fundo mais claro e agradável
  },
  chatHeader: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  chatHeaderTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  chatContent: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  messageContainer: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 18,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  botMessageContainer: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-start',
    borderTopLeftRadius: 5,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  userMessageContainer: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-end',
    borderTopRightRadius: 5,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  botMessageText: {
    color: '#333333', // Cor mais escura para melhor contraste
  },
  userMessageText: {
    color: '#ffffff', // Branco
    textShadowColor: 'rgba(0, 0, 0, 0.15)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  messageTime: {
    fontSize: 11,
    opacity: 0.7,
    alignSelf: 'flex-end',
    marginTop: 6,
  },
  chatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 12,
    marginRight: 10,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 15, // Aumentado para acomodar o texto
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 70, // Garantir largura mínima para o texto
  },
  sendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14, // Reduzido de 18
  },
  // Opções de chat melhoradas
  optionsContainer: {
    padding: 12,
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  optionButton: {
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12, // Aumentado de 10 para 12
    paddingHorizontal: 16, // Aumentado de 14 para 16
    marginRight: 10,
    marginBottom: 5,
    minWidth: 110, // Aumentado de 100 para 110
    justifyContent: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  longOptionButton: {
    minWidth: 155, // Aumentado de 140 para 155
    paddingHorizontal: 18, // Aumentado de 16 para 18
    height: 'auto',
  },
  optionText: {
    color: Colors.primary,
    fontSize: 16, // Aumentado de 14 para 16
    fontWeight: '600', // Aumentado de 500 para 600 (mais negrito)
    textAlign: 'center',
  },
  longOptionText: {
    fontSize: 15, // Aumentado de 13 para 15
  },
  // Indicador de digitação
  typingContainer: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    alignSelf: 'flex-start',
    marginHorizontal: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typingText: {
    color: Colors.primary,
    fontSize: 14,
    marginLeft: 8,
  },
  // Geral
  container: {
    flex: 1,
    backgroundColor: Colors.light,
  },
  header: {
    backgroundColor: HeaderColors.background, // Mudança do fundo para cor mais clara
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    color: HeaderColors.text, // Mudança para preto
    fontSize: 18,
    fontWeight: 'bold',
  },
  backButton: {
    marginRight: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: HeaderColors.backButton, // Cor mais escura para o botão
  },
  dashboardHeaderTitle: {
    color: HeaderColors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  configHeader: {
    backgroundColor: HeaderColors.background,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  configHeaderTitle: {
    color: HeaderColors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Estilos específicos para cada tela mencionada
  dashboardHeader: {
    backgroundColor: HeaderColors.background,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  emptyStateText: {
    textAlign: 'center',
    color: Colors.lightText,
    marginBottom: 20,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
    minWidth: 200,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  primaryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
    padding: 15,
    alignItems: 'center',
    minWidth: 200,
  },
  secondaryButtonText: {
    color: Colors.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Splash Screen
  splashContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashTitle: {
    fontSize: 40,
    fontWeight: 'bold',
    color: Colors.white,
  },
  splashSubtitle: {
    fontSize: 20,
    color: Colors.white,
    opacity: 0.8,
  },

  enhancedInputWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    height: 55, // Campo mais alto
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  enhancedInput: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.dark,
    height: '100%',
  },
  enhancedPrimaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    paddingVertical: 16, // Botão mais alto
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 15,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  enhancedPrimaryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 17, // Texto maior
    letterSpacing: 0.5, // Maior espaçamento entre letras
  },
  // Modificar os estilos existentes
  authContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  authHeader: {
    padding: 30,
    paddingTop: 60, // Mais espaço no topo
  },
  authTitle: {
    fontSize: 36, // Título maior
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 12,
  },
  authSubtitle: {
    fontSize: 18, // Subtítulo maior
    color: Colors.white,
    opacity: 0.9,
  },
  authForm: {
    flex: 1,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 30,
    paddingTop: 40,
  },
  inputContainer: {
    marginBottom: 22, // Mais espaço entre campos
  },
  inputLabel: {
    fontSize: 15, // Label maior
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 8,
    paddingLeft: 4,
  },
  textButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  textButtonText: {
    color: Colors.primary,
    fontSize: 16, // Texto maior
    fontWeight: '500',
  },
  input: {
    backgroundColor: Colors.lightGray,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
  },
  // Home
  homeContainer: {
    flex: 1,
    backgroundColor: Colors.primary,
  },
  homeHeader: {
    padding: 20,
    paddingTop: 30,
    position: 'relative',
  },
  homeTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
    marginBottom: 10,
  },
  homeSubtitle: {
    fontSize: 16,
    color: Colors.white,
    opacity: 0.9,
    marginBottom: 5,
  },
  logoutButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 8,
    borderRadius: 5,
  },
  logoutButtonText: {
    color: Colors.white,
    fontSize: 12,
  },
  homeContent: {
    flex: 1,
    backgroundColor: Colors.light,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 20,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 20,
  },
  featureSection: {
    marginBottom: 20,
  },
  featureSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.lightText,
    marginBottom: 10,
  },
  featureCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
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
  },
  compactCard: {
    padding: 15,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  featureDescription: {
    color: Colors.lightText,
    lineHeight: 22,
    marginBottom: 15,
  },
  chatBackButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBackButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  chatHeaderTitle: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  previewToggle: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  previewToggleText: {
    color: Colors.white,
    fontSize: 12,
  },
  messagesContainer: {
    padding: 15,
    paddingBottom: 20,
  },
  modeToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  modeToggleText: {
    color: Colors.white,
    fontSize: 12,
  },
  onlineBanner: {
    backgroundColor: '#E8F5E9',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: Colors.success,
  },
  onlineBannerText: {
    color: Colors.dark,
    fontSize: 14,
  },
  // Prévia do Currículo
  previewScroll: {
    flex: 1,
    padding: 15,
  },
  previewContainer: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
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
  },
  emptyPreview: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyPreviewText: {
    textAlign: 'center',
    color: Colors.lightText,
  },
  previewName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
    paddingBottom: 5,
  },
  previewContact: {
    color: Colors.dark,
    marginBottom: 10,
  },
  previewLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 15,
  },
  previewLink: {
    color: Colors.primary,
    marginRight: 10,
    marginBottom: 5,
  },
  previewSection: {
    marginTop: 15,
    marginBottom: 10,
  },
  previewSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    paddingBottom: 5,
    marginBottom: 10,
  },
  previewItem: {
    marginBottom: 10,
    paddingLeft: 10,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  previewItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 3,
  },
  previewItemSubtitle: {
    fontWeight: '500',
    marginBottom: 3,
  },
  previewItemDate: {
    color: Colors.lightText,
    fontSize: 14,
  },
  // Lista de Currículos
  cvListItemWithActions: {
    backgroundColor: Colors.white,
    marginBottom: 2,
  },
  cvListItem: {
    backgroundColor: Colors.white,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cvListItemContent: {
    flex: 1,
  },
  cvListItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 5,
  },
  cvListItemDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  cvListItemArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  cvListItemActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  cvActionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cvActionButtonText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 14,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  fabButtonText: {
    fontSize: 24,
    color: Colors.white,
  },
  // Tela de Prévia do Currículo
  previewScreenScroll: {
    flex: 1,
  },
  previewScreenCard: {
    margin: 15,
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
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
  },
  previewActions: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  previewActionButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 12,
    borderRadius: 5,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  previewActionButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  // Análise com IA
  analysisIntroContainer: {
    backgroundColor: Colors.white,
    padding: 20,
    margin: 15,
    marginBottom: 5,
    borderRadius: 10,
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
  },
  analysisIntroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  analysisIntroText: {
    color: Colors.lightText,
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
  },
  analysisCvItem: {
    backgroundColor: Colors.white,
    padding: 15,
    marginHorizontal: 15,
    marginVertical: 5,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  analysisCvItemContent: {
    flex: 1,
  },
  analysisCvItemTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
    marginBottom: 5,
  },
  analysisCvItemDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  analysisCvItemArrow: {
    fontSize: 24,
    color: Colors.primary,
  },
  cvAnalysisHeader: {
    backgroundColor: Colors.white,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  cvAnalysisTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  analysisTabs: {
    backgroundColor: Colors.white,
  },
  analysisTabsContent: {
    padding: 10,
  },
  analysisTab: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    marginHorizontal: 5,
    borderRadius: 20,
    backgroundColor: Colors.lightGray,
  },
  activeAnalysisTab: {
    backgroundColor: Colors.primary,
  },
  analysisTabText: {
    color: Colors.dark,
    fontWeight: '500',
  },
  activeAnalysisTabText: {
    color: Colors.white,
  },
  loadingAnalysisContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingAnalysisText: {
    marginTop: 15,
    textAlign: 'center',
    color: Colors.dark,
    fontSize: 16,
  },
  analysisResultContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: Colors.white,
  },
  analysisResultText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: Colors.danger,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  analysisCard: {
    backgroundColor: Colors.white,
    padding: 15,
    marginBottom: 15,
    borderRadius: 8,
    borderLeftWidth: 5,
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
  },
  analysisCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  analysisCardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  scoreContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  analysisCardDescription: {
    color: Colors.dark,
    lineHeight: 22,
  },
  // Selector de IA
  iaSelectorContainer: {
    backgroundColor: '#f8f9fa',
    padding: 10,
    borderRadius: 8,
    marginHorizontal: 15,
    marginBottom: 10,
  },
  iaSelectorLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    color: Colors.dark,
  },
  iaOptionsContainer: {
    flexDirection: 'row',
    paddingVertical: 5,
  },
  iaOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.lightGray,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
  },
  iaOptionButtonSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iaOptionText: {
    fontSize: 13,
    color: Colors.dark,
  },
  iaOptionTextSelected: {
    color: Colors.white,
    fontWeight: '500',
  },
  providerInfo: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
    marginTop: 8,
    textAlign: 'center',
  },
  offlineBanner: {
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 15,
    marginBottom: 15,
    borderLeftWidth: 3,
    borderLeftColor: Colors.warning,
  },
  offlineBannerText: {
    color: '#856404',
    fontSize: 14,
  },
  // Configuração de IAs
  configContent: {
    flex: 1,
    padding: 20,
  },
  configTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    color: Colors.dark,
  },
  iasList: {
    marginBottom: 20,
  },
  iaItem: {
    backgroundColor: Colors.white,
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iaItemSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  iaItemText: {
    fontSize: 16,
    color: Colors.dark,
  },
  iaItemTextSelected: {
    color: Colors.white,
    fontWeight: '500',
  },
  configuredBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configuredBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  apiKeyContainer: {
    marginBottom: 20,
  },
  apiKeyLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 10,
    color: Colors.dark,
  },
  apiKeyInput: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    marginBottom: 10,
  },
  apiKeyHelper: {
    fontSize: 12,
    color: Colors.lightText,
    fontStyle: 'italic',
  },
  noApiKeyContainer: {
    backgroundColor: '#f0f8ff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  noApiKeyText: {
    color: Colors.info,
    fontSize: 14,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: Colors.mediumGray,
  },
  saveButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  homeScrollContent: {
    paddingBottom: 30,
    flexGrow: 1,
  },
  shareAnalysisButton: {
    backgroundColor: Colors.secondary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  shareAnalysisButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  // Adicione estes estilos no objeto styles
  moreInfoButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 5,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  moreInfoButtonText: {
    color: Colors.primary,
    fontSize: 12,
    fontWeight: '500',
  },
  cardIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: {
    fontSize: 20,
  },
  configHintContainer: {
    backgroundColor: 'rgba(0, 188, 212, 0.08)',
    borderRadius: 4,
    padding: 8,
    marginTop: 10,
  },
  configHintText: {
    fontSize: 12,
    color: Colors.primary,
  },
  // Estilos para a tela de configuração
  configCard: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 16,
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
  },
  configIntroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  configIntroText: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  iaCardsContainer: {
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  iaCard: {
    width: 140,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding:
      12,
    marginRight: 12,
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
  },
  iaCardSelected: {
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  iaCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  iaCardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  iaCardTitleSelected: {
    color: Colors.primary,
  },
  iaCardDescription: {
    fontSize: 12,
    color: Colors.lightText,
  },
  apiKeyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  helpButton: {
    backgroundColor: 'rgba(0, 188, 212, 0.1)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  helpButtonText: {
    fontSize: 12,
    color: Colors.primary,
  },
  apiKeyInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleVisibilityButton: {
    position: 'absolute',
    right: 10,
    padding: 8,
  },
  toggleVisibilityText: {
    fontSize: 12,
    color: Colors.primary,
  },
  tipsContainer: {
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    marginBottom: 30,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 5,
    lineHeight: 20,
  },
  areaOptionsContainer: {
    paddingVertical: 15, // Mais espaço para opções de área
    flexWrap: 'wrap', // Permitir quebra de linha se necessário
    justifyContent: 'center',
  },
  areaOptionButton: {
    minWidth: 175, // Aumentado de 160 para 175
    paddingHorizontal: 20, // Aumentado de 18 para 20
    marginHorizontal: 5,
    height: 'auto',
  },
  areaOptionText: {
    fontWeight: 'bold', // Texto mais destacado
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
    alignItems: 'center',
  },
  improvedChatInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 14,
    marginRight: 10,
    fontSize: 16,
    maxHeight: 100, // Limitar altura máxima
    minHeight: 50, // Garantir altura mínima
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  improvedSendButton: {
    backgroundColor: Colors.primary,
    borderRadius: 25,
    width: 70,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  improvedSendButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 15,
  },
  previewResumeText: {
    color: Colors.dark,
    lineHeight: 20,
    textAlign: 'justify',
    paddingHorizontal: 2,
  },
  curriculoProgressoCard: {
    backgroundColor: '#FFF3CD',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#FFC107',
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
  },
  curriculoProgressoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  curriculoProgressoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  curriculoProgressoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#856404',
  },
  curriculoProgressoSubtitulo: {
    fontSize: 12,
    color: '#856404',
    opacity: 0.8,
  },
  curriculoProgressoTexto: {
    color: '#856404',
    marginBottom: 12,
  },
  curriculoProgressoBotao: {
    backgroundColor: '#FFC107',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  curriculoProgressoBotaoTexto: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 14,
  },
  container: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  scrollView: {
    flex: 1,
  },
  // Cabeçalho animado
  animatedHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Cabeçalho estático
  header: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: 15,
  },
  backButton: {
    marginRight: 10,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: '#fff',
  },
  backButtonTop: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 15,
  },
  backButtonTopText: {
    fontSize: 22,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Seção Hero
  heroContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 20,
    paddingBottom: 40,
    backgroundColor: Colors.primary,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoBackground: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  logoIcon: {
    fontSize: 48,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  appSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 15,
  },
  premiumBadge: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumBadgeText: {
    fontWeight: 'bold',
    fontSize: 14,
    color: '#000',
  },
  // Indicador de seções
  sectionIndicator: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    margin: 20,
    marginTop: -25,
    borderRadius: 10,
    height: 50,
    justifyContent: 'space-around',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  sectionTab: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeSection: {
    borderBottomWidth: 3,
    borderBottomColor: Colors.primary,
  },
  sectionTabText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#999',
  },
  activeSectionText: {
    color: Colors.primary,
    fontWeight: 'bold',
  },
  // Container de conteúdo
  contentContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  // Seções de conteúdo
  sectionContent: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    paddingBottom: 5,
    borderBottomWidth: 2,
    borderBottomColor: 'rgba(0,188,212,0.3)',
  },
  sectionDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#555',
    marginBottom: 20,
    textAlign: 'justify',
  },
  // Cards de informação
  infoCardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 20,
  },
  infoCard: {
    width: '30%',
    backgroundColor: Colors.primary,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  infoCardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 5,
  },
  infoCardText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  // Itens de recursos
  featureItem: {
    flexDirection: 'row',
    marginBottom: 25,
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  featureIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,188,212,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  featureIcon: {
    fontSize: 24,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  // Seção de versão
  versionCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  versionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  versionDate: {
    fontSize: 14,
    color: '#888',
  },
  versionFeatureList: {
    marginTop: 10,
  },
  versionFeatureTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  versionFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  versionFeatureDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
    marginRight: 10,
  },
  versionFeatureText: {
    fontSize: 15,
    color: '#444',
    flex: 1,
  },
  versionPrevious: {
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
    padding: 15,
  },
  versionPreviousTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginBottom: 10,
  },
  versionPreviousItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  versionPreviousNumber: {
    fontSize: 15,
    fontWeight: '500',
    color: '#444',
  },
  versionPreviousDate: {
    fontSize: 14,
    color: '#888',
  },
  // Seção de contato
  contactSection: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 30,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,188,212,0.1)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  contactButtonIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  contactButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '500',
  },
  socialMediaContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
  },
  socialButton: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  socialButtonText: {
    fontSize: 18,
    color: '#fff',
    fontWeight: 'bold',
  },
  // Rodapé
  footer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },

  usageSummaryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  usageSummaryCard: {
    width: '31%',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  usageSummaryTitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 5,
    textAlign: 'center',
  },
  usageSummaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  // Estilos para gráficos de uso por IA
  usageChartContainer: {
    marginBottom: 20,
  },
  usageChartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.dark,
  },
  barChartContainer: {
    marginBottom: 20,
  },
  barChartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  barChartLabelContainer: {
    width: 90,
  },
  barChartLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark,
  },
  barChartBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 25,
  },
  barChartBar: {
    height: '100%',
    borderRadius: 4,
  },
  barChartValue: {
    fontSize: 12,
    marginLeft: 8,
    color: Colors.lightText,
  },
  // Estilos para custo por IA
  costByIAContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  costByIATitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.dark,
  },
  costByIAItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  costByIADot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  costByIALabel: {
    fontSize: 14,
    color: Colors.dark,
    flex: 1,
  },
  costByIAValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.dark,
  },
  // Estilos para gráfico tipo pizza
  pieChartContainer: {
    marginBottom: 20,
  },
  pieChartItem: {
    marginBottom: 12,
  },
  pieChartLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pieChartColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pieChartLabel: {
    fontSize: 14,
    color: Colors.dark,
  },
  pieChartBarContainer: {
    height: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  pieChartBar: {
    height: '100%',
    borderRadius: 10,
  },
  pieChartPercentage: {
    position: 'absolute',
    right: 10,
    fontSize: 12,
    fontWeight: '500',
    color: Colors.white,
  },
  pieChartValue: {
    fontSize: 12,
    color: Colors.lightText,
  },
  // Estilos para chamadas por tipo
  callsByTypeContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  callsByTypeTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.dark,
  },
  callsByTypeList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  callsByTypeItem: {
    flexDirection: 'row',
    width: '50%',
    marginBottom: 8,
  },
  callsByTypeLabel: {
    fontSize: 13,
    color: Colors.dark,
    marginRight: 5,
  },
  callsByTypeValue: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.dark,
  },
  // Estilos para gráfico de tendências
  trendChartContainer: {
    marginBottom: 20,
  },
  trendChartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.dark,
  },
  trendChartContent: {
    flexDirection: 'row',
    height: 200,
    marginBottom: 20,
  },
  trendChartYAxis: {
    width: 50,
    height: '100%',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: 10,
  },
  trendChartYLabel: {
    fontSize: 10,
    color: Colors.lightText,
  },
  trendChartScrollContent: {
    paddingBottom: 10,
  },
  trendChartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: '100%',
  },
  trendChartBarWrapper: {
    alignItems: 'center',
    marginHorizontal: 6,
  },
  trendChartBarContainer: {
    width: 30,
    height: '85%',
    justifyContent: 'flex-end',
  },
  trendChartBar: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  trendChartXLabel: {
    fontSize: 10,
    color: Colors.lightText,
    marginTop: 5,
  },
  // Estilos para resumo de tendência
  trendSummaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
  },
  trendSummaryTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.dark,
  },
  trendSummaryContent: {

  },
  trendSummaryText: {
    fontSize: 13,
    color: Colors.dark,
    marginBottom: 8,
  },
  trendIndicator: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 8,
  },
  trendIndicatorText: {
    color: Colors.white,
    fontWeight: '500',
    fontSize: 12,
  },
  // Estilos para histórico de chamadas
  historyContainer: {
    marginBottom: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: Colors.dark,
  },
  historyList: {
    paddingBottom: 20,
  },
  historyItem: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  historyItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  historyItemType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyItemTypeIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  historyItemTypeText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.dark,
  },
  historyItemTokens: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  historyItemPrompt: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 8,
  },
  historyItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  historyItemCategory: {
    fontSize: 12,
    color: Colors.lightText,
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  historyItemDate: {
    fontSize: 12,
    color: Colors.lightText,
  },
  // Containers vazios
  emptyTrendsContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyTrendsText: {
    color: Colors.lightText,
    textAlign: 'center',
  },
  emptyHistoryContainer: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  emptyHistoryText: {
    color: Colors.lightText,
    textAlign: 'center',
  },
  // Estilos para detalhes de chamada
  callDetailsContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  callDetailsContent: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    width: '90%',
    maxHeight: '90%',
    padding: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  callDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.lightGray,
    paddingBottom: 10,
  },
  callDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  callDetailsCloseButton: {
    padding: 5,
  },
  callDetailsCloseButtonText: {
    fontSize: 24,
    color: Colors.dark,
  },
  callDetailsSummary: {
    alignItems: 'center',
    marginBottom: 20,
  },
  callDetailsIABadge: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 10,
  },
  callDetailsIABadgeText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  callDetailsDate: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 5,
  },
  callDetailsCategory: {
    fontSize: 14,
    color: Colors.dark,
  },
  callDetailsMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
  },
  callDetailsMetricItem: {
    alignItems: 'center',
  },
  callDetailsMetricLabel: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 5,
  },
  callDetailsMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  callDetailsSection: {
    marginBottom: 20,
  },
  callDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  callDetailsPromptContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  callDetailsPromptText: {
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  callDetailsResponseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  callDetailsResponseText: {
    fontSize: 14,
    color: Colors.dark,
    lineHeight: 20,
  },
  callDetailsConfigList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  callDetailsConfigItem: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  callDetailsConfigLabel: {
    fontSize: 14,
    color: Colors.dark,
    fontWeight: '500',
    width: 120,
  },
  callDetailsConfigValue: {
    fontSize: 14,
    color: Colors.dark,
  },

  // Estilos do Conhecimento
  conhecimentoContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f8f9fc',
  },
  conhecimentoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  conhecimentoSubtitle: {
    fontSize: 16,
    color: Colors.lightText,
    marginBottom: 25,
  },
  categoriasGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  categoriaCard: {
    width: '48%',
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
  categoriaIcon: {
    fontSize: 36,
    marginBottom: 10,
  },
  categoriaNome: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.dark,
    textAlign: 'center',
  },
  meusConhecimentosButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 20,
  },
  meusConhecimentosButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  topicoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  topicoHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 10,
  },
  topicosContainer: {
    marginTop: 10,
  },
  topicoItem: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  topicoNome: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.dark,
  },
  topicoArrow: {
    fontSize: 20,
    color: Colors.primary,
  },
  reviewContainer: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  reviewHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginLeft: 10,
  },
  reviewTitleContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    margin: 15,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  reviewTitleInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  topicosSection: {
    backgroundColor: Colors.white,
    padding: 15,
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  topicosHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  topicosTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
  },
  topicosActions: {
    flexDirection: 'row',
  },
  topicoActionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginLeft: 8,
  },
  topicoActionButtonText: {
    fontSize: 12,
    color: Colors.dark,
  },
  topicosPreview: {
    flexDirection: 'row',
    marginTop: 5,
  },
  topicoChip: {
    backgroundColor: Colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
    marginRight: 8,
  },
  topicoChipText: {
    fontSize: 12,
    color: Colors.white,
  },
  conteudoPreviewContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  conteudoPreviewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.dark,
    marginBottom: 10,
  },
  conteudoPreview: {
    backgroundColor: '#f9f9f9',
    padding: 15,
    borderRadius: 8,
    maxHeight: 300,
  },
  conteudoPreviewText: {
    fontSize: 14,
    lineHeight: 20,
    color: Colors.dark,
  },
  reviewActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    margin: 15,
    marginTop: 0,
  },
  reviewActionButton: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  reviewActionPrimary: {
    backgroundColor: Colors.primary,
  },
  reviewActionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.dark,
  },
  // Estilos do Modal de Tópico Personalizado
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 20,
    width: '100%',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.mediumGray,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
    marginLeft: 10,
  },
  modalButtonCancel: {
    backgroundColor: '#f0f0f0',
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonTextCancel: {
    color: Colors.dark,
  },
  modalButtonTextConfirm: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  // Estilos dos Detalhes de Conhecimento
  conhecimentoDetails: {
    flex: 1,
    backgroundColor: '#f8f9fc',
  },
  conhecimentoDetailsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark,
    padding: 15,
  },
  conhecimentoDetailsDate: {
    fontSize: 14,
    color: Colors.lightText,
    paddingHorizontal: 15,
    marginTop: -10,
    marginBottom: 15,
  },
  topicosNav: {
    backgroundColor: Colors.white,
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  topicoNavItem: {
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginHorizontal: 5,
    backgroundColor: '#f0f0f0',
  },
  topicoNavItemActive: {
    backgroundColor: Colors.primary,
  },
  topicoNavText: {
    fontSize: 14,
    color: Colors.dark,
  },
  topicoNavTextActive: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  conhecimentoConteudo: {
    flex: 1,
    backgroundColor: Colors.white,
    margin: 15,
    padding: 15,
    borderRadius: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  conhecimentoConteudoText: {
    fontSize: 16,
    lineHeight: 24,
    color: Colors.dark,
  },
  shareButton: {
    padding: 10,
  },
  shareButtonText: {
    fontSize: 20,
    color: Colors.white,
  },
  // Estilos da Lista de Conhecimentos
  searchContainer: {
    backgroundColor: Colors.white,
    margin: 15,
    padding: 10,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.dark,
  },
  searchClear: {
    padding: 5,
  },
  searchClearText: {
    fontSize: 20,
    color: Colors.lightText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  fabButtonText: {
    fontSize: 26,
    color: Colors.white,
  },
  conhecimentoListItem: {
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  conhecimentoListItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  conhecimentoListItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    flex: 1,
  },
  conhecimentoListItemDelete: {
    padding: 5,
  },
  conhecimentoListItemDeleteText: {
    fontSize: 20,
    color: Colors.danger,
  },
  conhecimentoListItemDate: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 10,
  },
  conhecimentoListItemPreview: {
    fontSize: 14,
    color: Colors.dark,
    marginBottom: 10,
  },
  conhecimentoListItemTopicos: {
    flexDirection: 'row',
    marginTop: 5,
  },
  conhecimentoListItemTopico: {
    backgroundColor: Colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
    marginRight: 8,
  },
  conhecimentoListItemTopicoText: {
    fontSize: 12,
    color: Colors.white,
  },
  conhecimentoListItemTopicoMore: {
    backgroundColor: '#f0f0f0',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 15,
  },
  conhecimentoListItemTopicoMoreText: {
    fontSize: 12,
    color: Colors.dark,
  },
  // Estilos do Chatbot (Mock)
  chatbotContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  chatbotText: {
    fontSize: 16,
    color: Colors.dark,
    textAlign: 'center',
    marginBottom: 20,
  },
  chatbotButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  chatbotButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
    // Estilos da tela de entrevista
  entrevistaContainer: {
    flex: 1,
    backgroundColor: '#f5f7fa',
  },
  progressoContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
  },
  progressoTrack: {
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    flex: 1,
    marginRight: 10,
  },
  progressoFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  progressoTexto: {
    fontSize: 12,
    color: Colors.dark,
    fontWeight: '500',
  },
  mensagensLista: {
    padding: 15,
    paddingBottom: 20,
  },
  mensagemEntrevista: {
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    maxWidth: '80%',
  },
  mensagemRecrutador: {
    backgroundColor: Colors.primary,
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
  },
  mensagemUsuario: {
    backgroundColor: Colors.white,
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  textoMensagem: {
    fontSize: 16,
    lineHeight: 22,
  },
  textoMensagemRecrutador: {
    color: Colors.white,
  },
  textoMensagemUsuario: {
    color: Colors.dark,
  },
  tipoPerguntaBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  tipoPerguntaTexto: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: Colors.white,
    padding: 10,
    paddingBottom: Platform.OS === 'ios' ? 30 : 10,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
    maxHeight: 200,
    textAlignVertical: 'top',
    marginBottom: 10,
    fontSize: 16,
  },
  enviarButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  enviarButtonDisabled: {
    backgroundColor: '#bdbdbd',
  },
  enviarButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  feedbackContainer: {
    backgroundColor: Colors.white,
    padding: 15,
    paddingBottom: Platform.OS === 'ios' ? 30 : 15,
    borderTopWidth: 1,
    borderTopColor: Colors.mediumGray,
    maxHeight: '60%',
  },
  feedbackTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: Colors.dark,
  },
  feedbackScrollView: {
    maxHeight: '80%',
  },
  continuarButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  continuarButtonText: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  
  // Estilos da tela de avaliação final
  avaliacaoFinalContainer: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f5f7fa',
  },
  avaliacaoHeader: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    alignItems: 'center',
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
  },
  avaliacaoTitulo: {
    fontSize: 22,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 15,
  },
  pontuacaoContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  pontuacaoLabel: {
    fontSize: 16,
    color: Colors.dark,
    marginBottom: 5,
  },
  pontuacaoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  pontuacaoValor: {
    fontSize: 32,
    fontWeight: 'bold',
    color: Colors.white,
  },
  pontuacaoMax: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  chanceSucessoContainer: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
  },
  chanceSucessoTexto: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  secaoAvaliacao: {
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
  },
  secaoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.mediumGray,
    paddingBottom: 5,
  },
  pontoItem: {
    marginBottom: 12,
  },
  pontoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 4,
  },
  pontoExemplo: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  recomendacaoItem: {
    flexDirection: 'row',
    marginBottom: 10,
    alignItems: 'flex-start',
  },
  recomendacaoNumero: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 'bold',
    marginRight: 10,
  },
  recomendacaoTexto: {
    flex: 1,
    fontSize: 15,
    color: Colors.dark,
    lineHeight: 22,
  },
  avaliacaoDetalheItem: {
    marginBottom: 10,
  },
  avaliacaoDetalheTitulo: {
    fontSize: 15,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 3,
  },
  avaliacaoDetalheTexto: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  conclusaoContainer: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.info,
  },
  conclusaoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.dark,
    marginBottom: 5,
  },
  conclusaoTexto: {
    fontSize: 15,
    color: '#01579b',
    lineHeight: 22,
  },
  botaoEncerrar: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 30,
  },
  textoEncerrar: {
    color: Colors.white,
    fontWeight: 'bold',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 20,
    textAlign: 'center',
    fontSize: 16,
    color: Colors.dark,
  },
  ...additionalStyles  // Novos estilos adicionados
});

export default styles;