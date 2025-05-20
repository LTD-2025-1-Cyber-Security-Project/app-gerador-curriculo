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
import analisarCurriculoComIA from '../curriculo/analisarCurriculoComIA';

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

export default EditarCurriculoScreen;