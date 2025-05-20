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

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const DashboardStack = createStackNavigator();
const ConfigStack = createStackNavigator();
const ConfigAvStack = createStackNavigator();
const AuthContext = createContext();
const useAuth = () => useContext(AuthContext);
const AuthStack = createStackNavigator();
const AppStack = createStackNavigator();
const RootStack = createStackNavigator();

const processMessage = (message, currentStep, cvData) => {
  // Se não temos dados do CV ainda, inicializar
  const data = cvData || { ...initialCVData };

  // Para permitir pular campos com "não sei"
  const isSkipping = ['não sei', 'nao sei', 'n sei', 'ns', 'desconheço', 'desconheco'].includes(message.toLowerCase());

  // Processamento baseado na etapa atual
  switch (currentStep) {
    case 'boas_vindas':
      if (['oi', 'olá', 'ola', 'começar', 'iniciar', 'hello', 'hi'].includes(message.toLowerCase())) {
        return {
          response: "Olá! Eu sou o CurriculoBot, seu assistente para criar um currículo profissional. Vamos começar com suas informações pessoais. Como posso te chamar?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      } else {
        return {
          response: "Olá! Sou o CurriculoBot, seu assistente para criar um currículo profissional. Digite 'começar' quando estiver pronto para iniciar.",
          nextStep: 'boas_vindas',
          options: ['Começar'],
          cvData: data
        };
      }

    case 'nome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu nome. Poderia repetir por favor?",
          nextStep: 'nome',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.nome = message.trim();

      return {
        response: `Prazer em conhecê-lo, ${message.trim()}! Agora, qual é o seu sobrenome?`,
        nextStep: 'sobrenome',
        options: [],
        cvData: data
      };

    case 'sobrenome':
      if (!message.trim()) {
        return {
          response: "Desculpe, não consegui entender seu sobrenome. Poderia repetir por favor?",
          nextStep: 'sobrenome',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.sobrenome = message.trim();

      return {
        response: "Ótimo! Agora, qual é o seu endereço de e-mail?",
        nextStep: 'email',
        options: [],
        cvData: data
      };

    case 'email':
      if (!message.includes('@')) {
        return {
          response: "Hmm, isso não parece um endereço de e-mail válido. Por favor, inclua um '@' no seu e-mail.",
          nextStep: 'email',
          options: [],
          cvData: data
        };
      }

      data.informacoes_pessoais.email = message.trim();

      return {
        response: "Excelente! Agora, qual é o seu endereço?",
        nextStep: 'endereco',
        options: ['Não sei'],
        cvData: data
      };

    case 'endereco':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Desculpe, não consegui entender seu endereço. Poderia repetir por favor?",
          nextStep: 'endereco',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.informacoes_pessoais.endereco = message.trim();
      }

      return {
        response: "Qual é o seu CEP? (Digite 'não sei' caso não saiba ou prefira não informar)",
        nextStep: 'cep',
        options: ['Não sei'],
        cvData: data
      };

    case 'cep':
      if (!isSkipping) {
        // Validação básica de CEP (formato XXXXX-XXX ou XXXXXXXX)
        const cepRegex = /^[0-9]{5}-?[0-9]{3}$/;
        
        if (cepRegex.test(message.trim())) {
          data.informacoes_pessoais.cep = message.trim();
        } else if (message.trim() !== '') {
          return {
            response: "O CEP informado parece estar em formato inválido. Por favor, digite novamente no formato XXXXX-XXX ou XXXXXXXX. Ou digite 'não sei' para pular.",
            nextStep: 'cep',
            options: ['Não sei'],
            cvData: data
          };
        }
      }

      return {
        response: "Perfeito! Agora, qual é a sua área de atuação profissional?",
        nextStep: 'area',
        options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
        cvData: data
      };

    case 'area':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Desculpe, não consegui entender sua área profissional. Poderia repetir por favor?",
          nextStep: 'area',
          options: ['Tecnologia da Informação', 'Saúde', 'Educação', 'Engenharia', 'Direito', 'Marketing', 'Administração', 'Outro'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.informacoes_pessoais.area = message.trim();
      }

      return {
        response: "Você tem um site pessoal ou portfólio? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
        nextStep: 'site',
        options: ['Não sei', 'Não tenho'],
        cvData: data
      };

    case 'site':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.site = message.trim();
      }

      return {
        response: "Você tem um perfil no LinkedIn? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
        nextStep: 'linkedin',
        options: ['Não sei', 'Não tenho'],
        cvData: data
      };

    case 'linkedin':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.linkedin = message.trim();
      }

      // Verificar se é da área de tecnologia para perguntar sobre GitHub
      if (data.informacoes_pessoais.area &&
        ['tecnologia', 'tecnologia da informação', 'ti', 'desenvolvimento', 'programação']
          .includes(data.informacoes_pessoais.area.toLowerCase())) {
        return {
          response: "Você tem uma conta no GitHub? Se sim, qual é o endereço? (Digite 'não sei' se não tiver)",
          nextStep: 'github',
          options: ['Não sei', 'Não tenho'],
          cvData: data
        };
      } else {
        return {
          response: "Vamos prosseguir. O que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    case 'github':
      if (!['não', 'nao', 'no', 'n'].includes(message.toLowerCase()) && !isSkipping) {
        data.informacoes_pessoais.github = message.trim();
      }

      return {
        response: "Agora, conte um pouco sobre você. Descreva brevemente sua trajetória profissional, acadêmica ou objetivos pessoais. Esse texto será um resumo que aparecerá no início do seu currículo.",
        nextStep: 'resumo_profissional',
        options: [],
        cvData: data
      };

    case 'resumo_profissional':
      // Salvar o resumo profissional
      data.resumo_profissional = message.trim();

      return {
        response: "Obrigado por compartilhar sua trajetória! Agora, o que você prefere adicionar primeiro? (Você pode finalizar a qualquer momento digitando 'finalizar')",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'escolher_proximo':
      const option = message.toLowerCase();

      if (option.includes('finalizar') || option.includes('concluir') || option.includes('pronto')) {
        return {
          response: "Deseja finalizar seu currículo? Todas as informações já foram salvas.",
          nextStep: 'finalizar',
          options: ['Sim, finalizar', 'Não, continuar editando'],
          cvData: data
        };
      } else if (option.includes('formação') || option.includes('formacao')) {
        return {
          response: "Vamos adicionar uma formação acadêmica. Qual é a instituição de ensino?",
          nextStep: 'formacao_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('experiência') || option.includes('experiencia')) {
        return {
          response: "Vamos adicionar uma experiência profissional. Qual foi o cargo ou posição?",
          nextStep: 'experiencia_cargo',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('curso') || option.includes('certificado')) {
        return {
          response: "Vamos adicionar um curso ou certificado. Qual é o nome do curso?",
          nextStep: 'curso_nome',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('projeto')) {
        return {
          response: "Vamos adicionar um projeto. Qual é o nome do projeto?",
          nextStep: 'projeto_nome',
          options: ['Não sei'],
          cvData: data
        };
      } else if (option.includes('idioma')) {
        return {
          response: "Vamos adicionar um idioma. Qual idioma você conhece?",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro', 'Não sei'],
          cvData: data
        };
      } else {
        return {
          response: "Desculpe, não entendi sua escolha. O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    case 'formacao_instituicao':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da instituição de ensino.",
          nextStep: 'formacao_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar nova formação acadêmica
      const novaFormacao = {
        instituicao: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual diploma ou grau você obteve? (Ex: Bacharel, Tecnólogo, Mestrado)",
        nextStep: 'formacao_diploma',
        options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico', 'Não sei'],
        cvData: {
          ...data,
          formacao_atual: novaFormacao
        }
      };

    case 'formacao_diploma':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o tipo de diploma ou grau obtido.",
          nextStep: 'formacao_diploma',
          options: ['Bacharel', 'Licenciatura', 'Tecnólogo', 'Mestrado', 'Doutorado', 'Técnico', 'Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.diploma = message.trim();
      }

      return {
        response: "Qual foi a área de estudo ou curso?",
        nextStep: 'formacao_area',
        options: ['Não sei'],
        cvData: data
      };

    case 'formacao_area':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a área de estudo ou curso.",
          nextStep: 'formacao_area',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.area_estudo = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'formacao_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'formacao_data_inicio':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'formacao_data_inicio',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.formacao_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'formacao_data_fim',
        options: ['Cursando', 'Não sei'],
        cvData: data
      };

    case 'formacao_data_fim':
      if (!isSkipping) {
        data.formacao_atual.data_fim = message.toLowerCase() === 'cursando' ? 'Atual' : message.trim();
      }

      // Adicionar a formação à lista e limpar a formação atual
      if (!data.formacoes_academicas) {
        data.formacoes_academicas = [];
      }

      data.formacoes_academicas.push(data.formacao_atual);
      delete data.formacao_atual;

      return {
        response: "Formação acadêmica adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'experiencia_cargo':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o cargo ou posição ocupada, ou escolha uma das opções abaixo.",
          nextStep: 'experiencia_cargo',
          options: ['Voltar para menu principal', 'Não tenho experiência', 'Não sei'],
          cvData: data
        };
      }

      // Inicializar nova experiência profissional
      const novaExperiencia = {
        cargo: isSkipping ? '' : message.trim()
      };

      return {
        response: "Em qual empresa ou organização você trabalhou?",
        nextStep: 'experiencia_empresa',
        options: ['Não sei'],
        cvData: {
          ...data,
          experiencia_atual: novaExperiencia
        }
      };

    case 'experiencia_empresa':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da empresa ou organização.",
          nextStep: 'experiencia_empresa',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.experiencia_atual.empresa = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA)",
        nextStep: 'experiencia_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'experiencia_data_inicio':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe a data de início no formato MM/AAAA.",
          nextStep: 'experiencia_data_inicio',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.experiencia_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de término? (formato: MM/AAAA, ou digite 'atual' se ainda estiver neste emprego)",
        nextStep: 'experiencia_data_fim',
        options: ['Atual', 'Não sei'],
        cvData: data
      };

    case 'experiencia_data_fim':
      if (!isSkipping) {
        data.experiencia_atual.data_fim = message.toLowerCase() === 'atual' ? 'Atual' : message.trim();
      }

      // Adicionar a experiência à lista e limpar a experiência atual
      if (!data.experiencias) {
        data.experiencias = [];
      }

      data.experiencias.push(data.experiencia_atual);
      delete data.experiencia_atual;

      return {
        response: "Experiência profissional adicionada com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Curso
    case 'curso_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome do curso ou certificado.",
          nextStep: 'curso_nome',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar novo curso
      const novoCurso = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual instituição ofereceu este curso?",
        nextStep: 'curso_instituicao',
        options: ['Não sei'],
        cvData: {
          ...data,
          curso_atual: novoCurso
        }
      };

    case 'curso_instituicao':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome da instituição.",
          nextStep: 'curso_instituicao',
          options: ['Não sei'],
          cvData: data
        };
      }

      if (!isSkipping) {
        data.curso_atual.instituicao = message.trim();
      }

      return {
        response: "Qual foi a data de início? (formato: MM/AAAA, ou digite 'não sei' se não lembrar)",
        nextStep: 'curso_data_inicio',
        options: ['Não sei'],
        cvData: data
      };

    case 'curso_data_inicio':
      if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei' && !isSkipping) {
        data.curso_atual.data_inicio = message.trim();
      }

      return {
        response: "Qual foi a data de conclusão? (formato: MM/AAAA, ou digite 'cursando' se ainda estiver em andamento)",
        nextStep: 'curso_data_fim',
        options: ['Cursando', 'Não sei'],
        cvData: data
      };

    case 'curso_data_fim':
      if (!isSkipping) {
        if (message.toLowerCase() === 'cursando') {
          data.curso_atual.data_fim = 'Atual';
        } else if (message.toLowerCase() !== 'não sei' && message.toLowerCase() !== 'nao sei') {
          data.curso_atual.data_fim = message.trim();
        }
      }

      // Adicionar o curso à lista e limpar o curso atual
      if (!data.cursos) {
        data.cursos = [];
      }

      data.cursos.push(data.curso_atual);
      delete data.curso_atual;

      return {
        response: "Curso adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Projeto
    case 'projeto_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o nome do projeto.",
          nextStep: 'projeto_nome',
          options: ['Não sei'],
          cvData: data
        };
      }

      // Inicializar novo projeto
      const novoProjeto = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Quais habilidades ou tecnologias você utilizou neste projeto? (separadas por vírgula)",
        nextStep: 'projeto_habilidades',
        options: ['Não sei'],
        cvData: {
          ...data,
          projeto_atual: novoProjeto
        }
      };

    case 'projeto_habilidades':
      if (!isSkipping) {
        data.projeto_atual.habilidades = message.trim();
      }

      return {
        response: "Descreva brevemente este projeto:",
        nextStep: 'projeto_descricao',
        options: ['Não sei'],
        cvData: data
      };

    case 'projeto_descricao':
      if (!isSkipping) {
        data.projeto_atual.descricao = message.trim();
      }

      // Adicionar o projeto à lista e limpar o projeto atual
      if (!data.projetos) {
        data.projetos = [];
      }

      data.projetos.push(data.projeto_atual);
      delete data.projeto_atual;

      return {
        response: "Projeto adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    // Idioma
    case 'idioma_nome':
      if (!message.trim() && !isSkipping) {
        return {
          response: "Por favor, informe o idioma.",
          nextStep: 'idioma_nome',
          options: ['Inglês', 'Espanhol', 'Francês', 'Alemão', 'Italiano', 'Mandarim', 'Japonês', 'Outro', 'Não sei'],
          cvData: data
        };
      }

      // Inicializar novo idioma
      const novoIdioma = {
        nome: isSkipping ? '' : message.trim()
      };

      return {
        response: "Qual é o seu nível neste idioma?",
        nextStep: 'idioma_nivel',
        options: ['Básico', 'Intermediário', 'Avançado', 'Fluente', 'Nativo', 'Não sei'],
        cvData: {
          ...data,
          idioma_atual: novoIdioma
        }
      };

    case 'idioma_nivel':
      if (!isSkipping) {
        data.idioma_atual.nivel = message.trim();
      }

      // Adicionar o idioma à lista e limpar o idioma atual
      if (!data.idiomas) {
        data.idiomas = [];
      }

      data.idiomas.push(data.idioma_atual);
      delete data.idioma_atual;

      return {
        response: "Idioma adicionado com sucesso! O que você gostaria de adicionar agora?",
        nextStep: 'escolher_proximo',
        options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
        cvData: data
      };

    case 'finalizar':
      if (['sim', 'sim, finalizar', 'yes', 's', 'y'].includes(message.toLowerCase())) {
        return {
          response: "Seu currículo foi finalizado com sucesso! Você pode acessá-lo na aba 'Meus Currículos'. Obrigado por usar o CurriculoBot!",
          nextStep: 'concluido',
          options: ['Iniciar Novo Currículo'],
          cvData: data,
          isFinished: true
        };
      } else {
        return {
          response: "O que você gostaria de adicionar agora?",
          nextStep: 'escolher_proximo',
          options: ['Formação Acadêmica', 'Experiência Profissional', 'Cursos e Certificados', 'Projetos', 'Idiomas', 'Finalizar'],
          cvData: data
        };
      }

    default:
      return {
        response: "Parece que tivemos um problema. Vamos recomeçar. Como posso ajudar com seu currículo?",
        nextStep: 'boas_vindas',
        options: ['Começar'],
        cvData: initialCVData
      };
  }
};

export default processMessage;