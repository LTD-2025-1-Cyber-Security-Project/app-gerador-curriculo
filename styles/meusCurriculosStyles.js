import React, { useState, useEffect, useRef, createContext, useContext } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
import ProfessionalColors from './ProfessionalColors';
import sharedStyles from './sharedStyles';

const meusCurriculosStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ProfessionalColors.backgroundLight,
  },

  header: {
    backgroundColor: ProfessionalColors.cardBackground,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: ProfessionalColors.border,
    ...sharedStyles.cardShadow
  },

  headerTitle: {
    color: ProfessionalColors.textDark,
    fontSize: 18,
    fontWeight: '600',
  },

  backButton: {
    marginRight: 15,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  backButtonText: {
    fontSize: 22,
    color: ProfessionalColors.primary,
    fontWeight: '600',
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },

  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  headerActionIcon: {
    fontSize: 20,
    color: ProfessionalColors.primary,
  },

  searchContainer: {
    backgroundColor: ProfessionalColors.cardBackground,
    margin: 16,
    marginBottom: 20,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...sharedStyles.cardShadow
  },

  searchIcon: {
    fontSize: 20,
    color: ProfessionalColors.textLight,
    marginRight: 10,
  },

  searchInput: {
    flex: 1,
    fontSize: 15,
    color: ProfessionalColors.textDark,
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
  },

  sectionActionText: {
    fontSize: 14,
    color: ProfessionalColors.primary,
  },

  curriculoCard: {
    backgroundColor: ProfessionalColors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    overflow: 'hidden',
    ...sharedStyles.cardShadow
  },

  curriculoCardContent: {
    padding: 16,
  },

  curriculoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  curriculoCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    marginBottom: 4,
    flex: 1,
  },

  curriculoCardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  curriculoCardMetaIcon: {
    fontSize: 14,
    color: ProfessionalColors.textLight,
    marginRight: 6,
  },

  curriculoCardMetaText: {
    fontSize: 13,
    color: ProfessionalColors.textLight,
  },

  curriculoCardDetails: {
    backgroundColor: 'rgba(78, 115, 223, 0.05)',
    padding: 12,
    borderRadius: 6,
    marginTop: 8,
  },

  curriculoCardDetailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },

  curriculoCardDetailsLabel: {
    fontSize: 14,
    color: ProfessionalColors.textMedium,
    fontWeight: '500',
    width: 100,
  },

  curriculoCardDetailsValue: {
    fontSize: 14,
    color: ProfessionalColors.textDark,
    flex: 1,
  },

  curriculoCardTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },

  curriculoCardTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    marginRight: 8,
    marginBottom: 8,
  },

  curriculoCardTagText: {
    fontSize: 12,
    color: ProfessionalColors.primary,
    fontWeight: '500',
  },

  curriculoCardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: ProfessionalColors.border,
  },

  curriculoCardAction: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  curriculoCardActionText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },

  curriculoCardActionPrimary: {
    color: ProfessionalColors.primary,
  },

  curriculoCardActionSecondary: {
    color: ProfessionalColors.secondary,
  },

  curriculoCardActionDanger: {
    color: ProfessionalColors.danger,
  },

  curriculoCardDivider: {
    width: 1,
    backgroundColor: ProfessionalColors.border,
  },

  menuOptions: {
    backgroundColor: ProfessionalColors.cardBackground,
    borderRadius: 8,
    width: 180,
    ...sharedStyles.cardShadow
  },

  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  menuOptionText: {
    fontSize: 15,
    marginLeft: 10,
    color: ProfessionalColors.textDark,
  },

  menuOptionDanger: {
    color: ProfessionalColors.danger,
  },

  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ProfessionalColors.primary,
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
    color: 'white',
  },

  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 30,
  },

  emptyStateIcon: {
    width: 80,
    height: 80,
    marginBottom: 20,
    tintColor: 'rgba(78, 115, 223, 0.2)',
  },

  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ProfessionalColors.textDark,
    marginBottom: 10,
    textAlign: 'center',
  },

  emptyStateText: {
    textAlign: 'center',
    color: ProfessionalColors.textMedium,
    marginBottom: 24,
    fontSize: 15,
    lineHeight: 22,
  },

  emptyStateButton: {
    backgroundColor: ProfessionalColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    ...sharedStyles.cardShadow
  },

  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },

  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default {
 meusCurriculosStyles 
}