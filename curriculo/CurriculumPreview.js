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

export default CurriculumPreview;