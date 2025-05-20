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

const curriculoAnaliseStyles = StyleSheet.create({
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

  introContainer: {
    backgroundColor: ProfessionalColors.cardBackground,
    margin: 16,
    marginBottom: 24,
    borderRadius: 10,
    padding: 20,
    ...sharedStyles.cardShadow
  },

  introTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: ProfessionalColors.textDark,
    marginBottom: 12,
  },

  introText: {
    fontSize: 15,
    lineHeight: 22,
    color: ProfessionalColors.textMedium,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 16,
  },

  curriculoCard: {
    backgroundColor: ProfessionalColors.cardBackground,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 8,
    padding: 0,
    overflow: 'hidden',
    ...sharedStyles.cardShadow
  },

  curriculoCardContent: {
    padding: 16,
  },

  curriculoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },

  curriculoCardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ProfessionalColors.textDark,
    flex: 1,
  },

  curriculoCardDate: {
    fontSize: 13,
    color: ProfessionalColors.textLight,
    marginTop: 4,
  },

  curriculoCardBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 15,
    backgroundColor: ProfessionalColors.primary,
    alignSelf: 'flex-start',
    marginTop: 6,
  },

  curriculoCardBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },

  curriculoCardStats: {
    flexDirection: 'row',
    marginTop: 12,
    flexWrap: 'wrap',
  },

  curriculoCardStatItem: {
    backgroundColor: 'rgba(78, 115, 223, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },

  curriculoCardStatText: {
    color: ProfessionalColors.primary,
    fontSize: 12,
    fontWeight: '500',
  },

  curriculoCardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: ProfessionalColors.border,
  },

  curriculoCardButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  curriculoCardButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ProfessionalColors.primary,
    marginLeft: 6,
  },

  curriculoCardButtonDivider: {
    width: 1,
    backgroundColor: ProfessionalColors.border,
  },

  analyzeButton: {
    backgroundColor: ProfessionalColors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 30,
    ...sharedStyles.cardShadow
  },

  analyzeButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
    marginLeft: 8,
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
});

export default {
  curriculoAnaliseStyles
};