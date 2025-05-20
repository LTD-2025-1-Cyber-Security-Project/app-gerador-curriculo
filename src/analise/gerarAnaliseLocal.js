const gerarAnaliseLocal = (curriculoData, tipoAnalise) => {
  try {
    // Extrair dados relevantes para personalizar a análise
    const nome = curriculoData.informacoes_pessoais?.nome || '';
    const sobrenome = curriculoData.informacoes_pessoais?.sobrenome || '';
    const nomeCompleto = `${nome} ${sobrenome}`.trim();
    const area = curriculoData.informacoes_pessoais?.area || 'profissional';

    // Verificar completude das seções para pontuação
    const temFormacao = curriculoData.formacoes_academicas?.length > 0;
    const temExperiencia = curriculoData.experiencias?.length > 0;
    const temCursos = curriculoData.cursos?.length > 0;
    const temProjetos = curriculoData.projetos?.length > 0;
    const temIdiomas = curriculoData.idiomas?.length > 0;

    // Calcular pontuação básica
    let pontuacaoBase = 5; // Base média

    // Adicionar pontos para cada seção preenchida
    if (temFormacao) pontuacaoBase += 1;
    if (temExperiencia) pontuacaoBase += 1.5;
    if (temCursos) pontuacaoBase += 0.5;
    if (temProjetos) pontuacaoBase += 1;
    if (temIdiomas) pontuacaoBase += 0.5;

    // Limitar a 10
    const pontuacaoFinal = Math.min(10, pontuacaoBase);

    // Gerar análise baseada no tipo
    let analiseTexto = '';

    switch (tipoAnalise) {
      case 'pontuacao':
        analiseTexto = `# Análise de Pontuação do Currículo

## Pontuação Geral: ${pontuacaoFinal.toFixed(1)}/10

### Detalhamento:

1. **Conteúdo (30%)**: ${Math.min(10, pontuacaoBase + 0.5).toFixed(1)}/10
   - ${temExperiencia ? 'Apresenta experiência profissional relevante' : 'Falta detalhar experiência profissional'}
   - ${temFormacao ? 'Formação acadêmica bem estruturada' : 'Precisa incluir formação acadêmica'}

2. **Estrutura (20%)**: ${Math.min(10, pontuacaoBase).toFixed(1)}/10
   - Organização ${temFormacao && temExperiencia ? 'lógica e clara' : 'pode ser melhorada'}
   - ${temProjetos || temCursos ? 'Boa separação das seções' : 'Pode adicionar mais seções para melhorar a estrutura'}

3. **Apresentação (20%)**: ${Math.min(10, pontuacaoBase - 0.5).toFixed(1)}/10
   - Formatação ${temFormacao && temExperiencia && temCursos ? 'consistente' : 'inconsistente em algumas seções'}
   - ${temIdiomas ? 'Habilidades linguísticas bem apresentadas' : 'Considere adicionar seção de idiomas'}

4. **Impacto (30%)**: ${Math.min(10, pontuacaoBase - 0.3).toFixed(1)}/10
   - O currículo ${pontuacaoBase > 7 ? 'causa uma boa primeira impressão' : 'precisa de mais impacto visual e de conteúdo'}
   - ${temProjetos ? 'Os projetos adicionam valor diferencial' : 'Adicionar projetos pode aumentar o impacto'}

*Esta análise foi gerada automaticamente com base nos dados fornecidos.*`;
        break;

      case 'melhorias':
        analiseTexto = `# 5 Melhorias para o Currículo

1. **${!temExperiencia ? 'Adicionar experiências profissionais detalhadas' : 'Detalhar mais os resultados nas experiências profissionais'}**
   - ${!temExperiencia ? 'Inclua experiências prévias com datas, funções e responsabilidades' : 'Quantifique realizações com números e resultados tangíveis'}
   - Exemplo: "Aumentou vendas em 27%" ou "Liderou equipe de 5 pessoas no desenvolvimento de novo produto"

2. **${!temFormacao ? 'Incluir formação acadêmica' : 'Destacar competências específicas adquiridas na formação'}**
   - ${!temFormacao ? 'Adicione sua formação com período, instituição e área' : 'Relacione disciplinas chave ou projetos acadêmicos relevantes'}
   - Importante para validar conhecimentos técnicos e teóricos

3. **${!temIdiomas ? 'Adicionar seção de idiomas' : 'Especificar níveis de proficiência em idiomas'}**
   - ${!temIdiomas ? 'Inclua todos os idiomas que conhece com nível de proficiência' : 'Use padrões internacionais como A1-C2 ou descritores claros (fluente, intermediário)'}
   - Competências linguísticas são diferenciais importantes

4. **${!temProjetos ? 'Criar seção de projetos relevantes' : 'Aprimorar descrição dos projetos'}**
   - ${!temProjetos ? 'Adicione projetos pessoais ou profissionais relacionados à sua área' : 'Descreva tecnologias e metodologias utilizadas em cada projeto'}
   - Demonstre aplicação prática de suas habilidades

5. **Personalizar o currículo para cada vaga**
   - Adapte palavras-chave de acordo com a descrição da vaga
   - Priorize experiências e habilidades mais relevantes para cada posição

*Implementar estas melhorias pode aumentar significativamente suas chances de ser chamado para entrevistas.*`;
        break;

      case 'dicas':
        analiseTexto = `# Dicas Estratégicas de Carreira

## Com base no seu perfil na área de ${area}, recomendamos:

1. **Especialização Técnica**
   - Invista em conhecimentos específicos de ${area}
   - Considere certificações reconhecidas pelo mercado
   - Motivo: Profissionais especializados têm 42% mais chances de serem contratados

2. **Presença Digital Profissional**
   - Crie ou atualize seu perfil no LinkedIn destacando palavras-chave da área
   - Compartilhe conteúdo relevante sobre ${area}
   - Conecte-se com profissionais e empresas de referência no setor

3. **Networking Estratégico**
   - Participe de eventos, webinars e comunidades de ${area}
   - Associe-se a grupos profissionais do seu segmento
   - Busque mentoria de profissionais mais experientes

4. **Desenvolvimento de Soft Skills**
   - Além de habilidades técnicas, desenvolva comunicação e trabalho em equipe
   - Pratique liderança e resolução de problemas em projetos paralelos
   - Estas competências são cada vez mais valorizadas por recrutadores

5. **Aprendizado Contínuo**
   - Estabeleça uma rotina de atualização sobre tendências em ${area}
   - Reserve tempo semanal para cursos, leituras e experimentação
   - Mantenha-se relevante em um mercado que evolui rapidamente

*Estas recomendações foram personalizadas com base nas informações do seu currículo.*`;
        break;

      case 'cursos':
        analiseTexto = `# Cursos Recomendados para Seu Perfil

Com base no seu currículo na área de ${area}, recomendamos os seguintes cursos:

1. **${area === 'Tecnologia da Informação' ? 'AWS Certified Solutions Architect' :
            area === 'Marketing' ? 'Google Analytics Certification' :
              area === 'Administração' ? 'Gestão Ágil de Projetos (PMI-ACP)' :
                'Especialização em ' + area}**
   - Plataforma: ${area === 'Tecnologia da Informação' ? 'AWS Training' :
            area === 'Marketing' ? 'Google Skillshop' :
              area === 'Administração' ? 'PMI ou Coursera' :
                'EdX ou Coursera'}
   - Por que fazer: Certificação reconhecida globalmente que comprova competências avançadas
   - Como agregaria: Abre portas para posições sênior com remuneração até 30% maior

2. **${area === 'Tecnologia da Informação' ? 'Data Science Specialization' :
            area === 'Marketing' ? 'Digital Marketing Specialization' :
              area === 'Administração' ? 'Liderança e Gestão de Equipes' :
                'Fundamentos de ' + area}**
   - Plataforma: Coursera (em parceria com universidades)
   - Por que fazer: Complementa sua formação com habilidades analíticas fundamentais
   - Como agregaria: Amplia o perfil para funções que exigem tomada de decisão baseada em dados

3. **${temIdiomas ? 'Business English Communication' : 'Inglês para Profissionais'}**
   - Plataforma: Duolingo, EF English Live ou Cambly
   - Por que fazer: Comunicação em inglês é requisito para empresas multinacionais
   - Como agregaria: Aumenta empregabilidade em 65% e possibilidade de aumento salarial

4. **${area === 'Tecnologia da Informação' ? 'DevOps for Professionals' :
            area === 'Marketing' ? 'Growth Hacking Masterclass' :
              area === 'Administração' ? 'Financial Management' :
                'Inovação em ' + area}**
   - Plataforma: Udemy ou LinkedIn Learning
   - Por que fazer: Conhecimentos emergentes com alta demanda no mercado atual
   - Como agregaria: Posiciona você como profissional atualizado com tendências recentes

5. **${area === 'Tecnologia da Informação' ? 'UI/UX Design Fundamentals' :
            area === 'Marketing' ? 'Content Marketing Strategy' :
              area === 'Administração' ? 'Business Analytics' :
                'Gestão de Projetos para ' + area}**
   - Plataforma: Alura, Udacity ou Domestika
   - Por que fazer: Complementa habilidades técnicas com visão de experiência do usuário
   - Como agregaria: Diferencial competitivo para posições que exigem múltiplas competências

*Esta lista foi personalizada com base no seu perfil atual e tendências de mercado para 2024. Atualizar estas competências pode aumentar significativamente sua empregabilidade.*`;
        break;

      case 'vagas':
        analiseTexto = `# Vagas Recomendadas para Seu Perfil

Com base no seu currículo na área de ${area}, você teria boas chances nas seguintes vagas:

1. **${area === 'Tecnologia da Informação' ? 'Desenvolvedor Full-Stack' :
            area === 'Marketing' ? 'Especialista em Marketing Digital' :
              area === 'Administração' ? 'Analista de Projetos' :
                'Especialista em ' + area}**
   - Por que combina: ${temExperiencia ? 'Sua experiência anterior demonstra as competências necessárias' : 'Seu perfil de formação se alinha com os requisitos típicos'}
   - Competências valorizadas: ${temProjetos ? 'Experiência prática em projetos' : 'Conhecimentos teóricos'}, ${temIdiomas ? 'domínio de idiomas' : 'habilidades analíticas'}
   - Empresas/setores: ${area === 'Tecnologia da Informação' ? 'Fintechs, agências digitais' :
            area === 'Marketing' ? 'E-commerces, agências' :
              area === 'Administração' ? 'Multinacionais, consultorias' :
                'Empresas de médio e grande porte'}
   - Palavras-chave: ${area.toLowerCase()}, especialista, ${temFormacao ? 'graduação' : 'experiência'}, análise

2. **${area === 'Tecnologia da Informação' ? 'Analista de Dados' :
            area === 'Marketing' ? 'Coordenador de Mídia Social' :
              area === 'Administração' ? 'Gerente de Operações' :
                'Consultor em ' + area}**
   - Por que combina: Aproveita suas competências em ${temProjetos ? 'projetos' : 'análise'} e ${temCursos ? 'conhecimentos específicos' : 'formação'}
   - Competências valorizadas: Análise crítica, conhecimentos técnicos, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}
   - Empresas/setores: Consultorias, startups em crescimento, empresas de tecnologia
   - Palavras-chave: análise, ${area.toLowerCase()}, consultoria, projetos, ${temExperiencia ? 'experiência comprovada' : 'potencial'}

3. **${area === 'Tecnologia da Informação' ? 'Gerente de Produto Técnico' :
            area === 'Marketing' ? 'Brand Manager' :
              area === 'Administração' ? 'Analista de Negócios' :
                'Analista de ' + area}**
   - Por que combina: Mescla ${temFormacao ? 'formação acadêmica' : 'visão prática'} com ${temProjetos ? 'experiência em projetos' : 'capacidade analítica'}
   - Competências valorizadas: Visão estratégica, conhecimento de mercado, ${temIdiomas ? 'habilidades de comunicação internacional' : 'comunicação clara'}
   - Empresas/setores: Empresas de médio e grande porte, multinacionais, consultorias especializadas
   - Palavras-chave: gerenciamento, estratégia, ${area.toLowerCase()}, análise, ${temFormacao ? 'qualificação acadêmica' : 'experiência prática'}

4. **${area === 'Tecnologia da Informação' ? 'Arquiteto de Soluções' :
            area === 'Marketing' ? 'Gerente de Growth Marketing' :
              area === 'Administração' ? 'Coordenador de Projetos' :
                'Gerente de ' + area}**
   - Por que combina: Utiliza ${temFormacao ? 'conhecimento teórico' : 'visão prática'} combinado com ${temExperiencia ? 'experiência no mercado' : 'potencial de liderança'}
   - Competências valorizadas: Visão holística, capacidade de coordenação, ${temCursos ? 'especialização técnica' : 'adaptabilidade'}
   - Empresas/setores: Empresas inovadoras, líderes de mercado, organizações em transformação
   - Palavras-chave: coordenação, ${area.toLowerCase()}, gerenciamento, ${temIdiomas ? 'internacional' : 'nacional'}, estratégia

5. **${area === 'Tecnologia da Informação' ? 'Especialista em Segurança da Informação' :
            area === 'Marketing' ? 'Customer Success Manager' :
              area === 'Administração' ? 'Analista de Processos' :
                'Especialista em ' + area} ${temIdiomas ? 'Internacional' : 'Sênior'}**
   - Por que combina: Aproveita ${temFormacao && temExperiencia ? 'combinação de teoria e prática' : temFormacao ? 'sólida formação acadêmica' : 'experiência prática'}
   - Competências valorizadas: Especialização técnica, ${temIdiomas ? 'comunicação multilíngue' : 'comunicação eficaz'}, resolução de problemas
   - Empresas/setores: Empresas de tecnologia, multinacionais, consultorias especializadas
   - Palavras-chave: especialista, ${area.toLowerCase()}, ${temFormacao ? 'graduação' : 'experiência'}, ${temIdiomas ? 'internacional' : 'nacional'}, técnico

*Esta lista foi personalizada com base no seu perfil atual. Adapte seu currículo para destacar as competências relevantes para cada tipo de vaga.*`;
        break;

      default:
        analiseTexto = `# Análise Geral do Currículo

## Pontos Fortes
- ${temFormacao ? 'Formação acadêmica na área de atuação' : 'Perfil com potencial de desenvolvimento'}
- ${temExperiencia ? 'Experiência profissional demonstrada' : 'Oportunidade para destacar projetos e outras atividades'}
- ${temIdiomas ? 'Conhecimento de idiomas' : 'Foco em competências técnicas'}

## Áreas de Melhoria
- ${!temProjetos ? 'Adicionar seção de projetos para demonstrar habilidades práticas' : 'Detalhar melhor os projetos apresentados'}
- ${!temCursos ? 'Incluir cursos e certificações para complementar formação' : 'Relacionar cursos com objetivos profissionais'}
- Personalizar o currículo para cada oportunidade específica

## Impressão Geral
O currículo apresenta um profissional ${pontuacaoFinal > 7 ? 'bem qualificado' : 'com potencial'} na área de ${area}. ${pontuacaoFinal > 7 ? 'Possui boa estrutura' : 'Precisa de ajustes na estrutura'} e ${temExperiencia && temFormacao ? 'apresenta informações relevantes' : 'pode ser enriquecido com mais informações relevantes'}.

## Nota Geral: ${pontuacaoFinal.toFixed(1)}/10

*Esta análise foi gerada pelo sistema de análise local e representa uma avaliação baseada nos dados fornecidos.*`;
    }

    // Informar que estamos usando análise local
    return {
      success: true,
      analise: analiseTexto,
      offline: true,
      provider: 'Sistema Local'
    };
  } catch (error) {
    console.error('Erro na análise local:', error);

    // Em caso de erro, retornar uma análise genérica
    return {
      success: true,
      analise: `# Análise de Currículo\n\nSeu currículo apresenta um bom equilíbrio entre formação e experiência. Continue aprimorando com cursos e projetos relevantes para sua área.\n\n*Nota: Esta é uma análise básica gerada pelo sistema.*`,
      offline: true,
      provider: 'Sistema Local'
    };
  }
};

export default gerarAnaliseLocal;