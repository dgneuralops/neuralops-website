/* Diagnóstico de Vazamentos Comerciais — NeuralOps Saúde. Não coleta dados de pacientes. */
(function () {
  var DIM_FROM_PRIORITY = { rapido: 'velocidade', triagem: 'triagem', orcamentos: 'continuidade', sobrecarga: 'triagem', integrar: 'integracao', indicadores: 'integracao' };

  var PROFILES = {
    velocidade: { code: 'A', name: 'Gargalo de atendimento', text: 'Seu atendimento pode estar demorando mais do que o necessário para responder e organizar solicitações.', recs: ['Medir tempos de resposta reais.', 'Avaliar cobertura fora do expediente.', 'Padronizar triagem.', 'Investigar automações adequadas.'] },
    continuidade: { code: 'B', name: 'Gargalo de acompanhamento', text: 'Parte das oportunidades pode estar ficando sem acompanhamento estruturado após a primeira interação.', recs: ['Medir orçamentos enviados.', 'Identificar pendências.', 'Registrar motivos de perda.', 'Padronizar continuidade comercial.'] },
    integracao: { code: 'C', name: 'Gargalo de dados', text: 'Sua clínica pode estar operando sem visibilidade suficiente sobre o que acontece com as oportunidades.', recs: ['Organizar etapas comerciais.', 'Definir indicadores.', 'Estruturar registros.', 'Avaliar integrações.'] },
    triagem: { code: 'D', name: 'Gargalo de processos', text: 'A operação pode depender excessivamente de tarefas manuais e procedimentos pouco padronizados.', recs: ['Mapear fluxos.', 'Identificar tarefas recorrentes.', 'Definir padrões.', 'Avaliar automações.'] },
    estruturada: { code: 'E', name: 'Operação mais estruturada', text: 'As respostas mostram que sua clínica já possui alguns processos organizados.', recs: ['Avaliar eficiência, qualidade dos dados e oportunidades de integração e melhoria contínua.'] }
  };

  var cfg = {
    id: 'saude',
    version: 'saude-1.0',
    shortName: 'Diagnóstico de Vazamentos Comerciais',
    reportName: 'NeuralOps Saúde',
    entity: 'clínica',
    companyLabel: 'Clínica ou empresa',
    storageKey: 'nxdiag_saude',
    paths: { landing: '/saude/diagnostico/', quiz: '/saude/diagnostico/quiz/', result: '/saude/diagnostico/resultado/' },
    footNote: 'Não pedimos dados de pacientes · Resultado orientativo, baseado nas suas respostas.',
    dimsTitle: 'Sinais por etapa do atendimento',

    questions: [
      { id: 'S01', title: 'Qual tipo de operação melhor descreve sua clínica?', reportLabel: 'Tipo de operação',
        options: [{ v: 'popular', l: 'Clínica popular ou centro médico' }, { v: 'especialidades', l: 'Clínica de especialidades' }, { v: 'diagnostico', l: 'Centro de diagnóstico ou exames' }, { v: 'odonto', l: 'Clínica odontológica' }, { v: 'rede', l: 'Rede com múltiplas unidades' }, { v: 'outro', l: 'Outro serviço de saúde' }] },
      { id: 'S02', title: 'Qual é o faturamento médio mensal aproximado da operação?', help: 'Usamos esta resposta só para entender o porte. Ela não entra na análise do atendimento.', reportLabel: 'Faturamento mensal',
        options: [{ v: 'ate50', l: 'Até R$ 50 mil', cs: 0 }, { v: '50a100', l: 'R$ 50 mil a R$ 100 mil', cs: 1 }, { v: '100a300', l: 'R$ 100 mil a R$ 300 mil', cs: 2 }, { v: '300a700', l: 'R$ 300 mil a R$ 700 mil', cs: 3 }, { v: '700a1500', l: 'R$ 700 mil a R$ 1,5 milhão', cs: 3 }, { v: 'acima1500', l: 'Acima de R$ 1,5 milhão', cs: 2, review: true }, { v: 'naoinformar', l: 'Prefiro não informar', cs: 0 }] },
      { id: 'S03', title: 'Quantos contatos sua clínica recebe aproximadamente por mês?', help: 'Conte mensagens, ligações e formulários de pessoas interessadas em consultas ou exames. Volume alto não é problema por si só.', reportLabel: 'Contatos por mês',
        options: [{ v: 'm200', l: 'Menos de 200' }, { v: '200a500', l: '200 a 500' }, { v: '501a1000', l: '501 a 1.000' }, { v: '1001a2500', l: '1.001 a 2.500' }, { v: '2500mais', l: 'Mais de 2.500' }, { v: 'naosei', l: 'Não sabemos', lowConf: true }] },
      { id: 'S04', title: 'Por onde chegam a maioria das solicitações?', reportLabel: 'Canal principal',
        options: [{ v: 'whatsapp', l: 'WhatsApp' }, { v: 'telefone', l: 'Telefone' }, { v: 'redes', l: 'Instagram ou redes sociais' }, { v: 'site', l: 'Site ou formulário' }, { v: 'varios', l: 'Vários canais com volumes semelhantes' }] },
      { id: 'S04b', optional: true, showIf: function (a) { return !!a.S04; }, title: 'Qual ferramenta sua equipe utiliza para atender?', help: 'Pergunta opcional. Ajuda a entender o ponto de partida; nenhuma ferramenta específica é obrigatória.', reportLabel: 'Ferramenta de atendimento',
        options: [{ v: 'wabusiness', l: 'WhatsApp Business' }, { v: 'chatwoot', l: 'Chatwoot' }, { v: 'crm', l: 'CRM ou plataforma de atendimento' }, { v: 'proprio', l: 'Sistema próprio' }, { v: 'outra', l: 'Outra' }, { v: 'naosei', l: 'Não sei' }] },
      { id: 'S05', scored: true, title: 'Quanto tempo um paciente costuma esperar pela primeira resposta humana durante o expediente?', help: 'Uma estimativa já ajuda. Se a clínica não mede, tudo bem responder “não sabemos”.', reportLabel: 'Espera pela primeira resposta humana (estimativa)',
        options: [{ v: 'ate5', l: 'Até 5 minutos', risk: 0 }, { v: '6a15', l: 'De 6 a 15 minutos', risk: 1 }, { v: '16a60', l: 'De 16 a 60 minutos', risk: 2 }, { v: '60mais', l: 'Mais de 60 minutos', risk: 3 }, { v: 'naosei', l: 'Não sabemos', lowConf: true }],
        insight: function (v, o) { return o && o.lowConf ? 'Tudo bem. Medir o tempo real em uma amostra de conversas é um bom primeiro passo para saber onde a espera acontece.' : null; } },
      { id: 'S06', scored: true, title: 'O que acontece quando alguém procura a clínica fora do horário comercial?', reportLabel: 'Contato fora do horário comercial',
        options: [{ v: 'estruturado', l: 'Recebe atendimento inicial estruturado', risk: 0 }, { v: 'automatica', l: 'Recebe mensagem automática e aguarda', risk: 1 }, { v: 'retorno', l: 'Recebe resposta quando a equipe retorna', risk: 2 }, { v: 'semFluxo', l: 'Não temos um fluxo definido', risk: 3 }, { v: 'naosei', l: 'Não sei', lowConf: true }],
        insight: function (v, o) { return o && o.risk >= 1 ? 'Um atendimento inicial bem estruturado pode ajudar a registrar a demanda mesmo quando a equipe não está disponível.' : null; } },
      { id: 'S07', scored: true, title: 'Como a equipe identifica qual consulta ou exame o paciente procura?', help: 'Estamos falando da triagem administrativa do atendimento, não de avaliação clínica.', reportLabel: 'Identificação de consulta ou exame',
        options: [{ v: 'estruturado', l: 'Processo estruturado com registro', risk: 0 }, { v: 'padrao', l: 'Perguntas manuais com algum padrão', risk: 1 }, { v: 'cadaUm', l: 'Cada atendente conduz de uma maneira', risk: 2 }, { v: 'semPadrao', l: 'Não existe um padrão definido', risk: 3 }] },
      { id: 'S08', scored: true, title: 'O que acontece depois que um paciente recebe um orçamento e não fecha imediatamente?', reportLabel: 'Acompanhamento após orçamento',
        options: [{ v: 'estruturado', l: 'Existe acompanhamento estruturado e registrado', risk: 0 }, { v: 'manual', l: 'A equipe acompanha manualmente', risk: 1 }, { v: 'alguns', l: 'Acompanhamos apenas alguns contatos', risk: 2 }, { v: 'semProcesso', l: 'Não temos um processo definido', risk: 3 }, { v: 'naosei', l: 'Não sabemos', lowConf: true }],
        insight: function (v, o) { return o && (o.risk >= 1 || o.lowConf) ? 'Sem uma rotina de acompanhamento, fica difícil distinguir pacientes que desistiram daqueles que ainda precisam de informações.' : null; } },
      { id: 'S09', scored: true, title: 'Sua clínica sabe quantos orçamentos permanecem sem conclusão?', reportLabel: 'Controle de orçamentos sem conclusão',
        options: [{ v: 'painel', l: 'Sim, acompanhamos em painel ou relatório', risk: 0 }, { v: 'estimativa', l: 'Temos uma estimativa', risk: 1 }, { v: 'manual', l: 'Precisamos verificar manualmente', risk: 2 }, { v: 'nao', l: 'Não temos esse controle', risk: 3 }] },
      { id: 'S10', scored: true, title: 'Quando um paciente não fecha, sua clínica registra o motivo?', reportLabel: 'Registro do motivo de não fechamento',
        options: [{ v: 'estruturado', l: 'Sim, de forma estruturada', risk: 0 }, { v: 'parte', l: 'Em parte dos casos', risk: 1 }, { v: 'informal', l: 'Apenas informalmente', risk: 2 }, { v: 'nao', l: 'Não registramos', risk: 3 }],
        insight: function (v, o) { return o && o.risk >= 1 ? 'Saber por que uma oportunidade não avança pode ajudar a separar problemas de preço, disponibilidade, atendimento e outras causas.' : null; } },
      { id: 'S11', scored: true, title: 'As ferramentas de atendimento, agenda e gestão comercial compartilham informações?', reportLabel: 'Ferramentas compartilham informações',
        options: [{ v: 'sim', l: 'Sim, de forma estruturada', risk: 0 }, { v: 'algumas', l: 'Algumas estão integradas', risk: 1 }, { v: 'copiar', l: 'A equipe precisa copiar muitas informações', risk: 2 }, { v: 'isolados', l: 'Os sistemas funcionam de forma isolada', risk: 3 }, { v: 'naosei', l: 'Não sei', lowConf: true }] },
      { id: 'S12', scored: true, title: 'Você consegue acompanhar conversas, orçamentos, vendas e motivos de perda em um mesmo ambiente ou conjunto confiável de relatórios?', reportLabel: 'Visão integrada de conversas, orçamentos e vendas',
        options: [{ v: 'sim', l: 'Sim', risk: 0 }, { v: 'parcial', l: 'Parcialmente', risk: 1 }, { v: 'manual', l: 'Precisamos montar relatórios manuais', risk: 2 }, { v: 'nao', l: 'Não temos essa visibilidade', risk: 3 }] },
      { id: 'S13', title: 'Para fechar: prioridade e momento.', help: 'Estas respostas personalizam o relatório. Elas não entram na pontuação.',
        parts: [
          { id: 'S13a', title: 'Qual melhoria teria mais valor para sua clínica neste momento?', reportLabel: 'Melhoria de maior valor',
            options: [{ v: 'rapido', l: 'Responder mais rápido' }, { v: 'triagem', l: 'Organizar triagem de consultas e exames' }, { v: 'orcamentos', l: 'Acompanhar orçamentos' }, { v: 'sobrecarga', l: 'Reduzir sobrecarga das atendentes' }, { v: 'integrar', l: 'Integrar ferramentas' }, { v: 'indicadores', l: 'Ter mais indicadores de gestão' }] },
          { id: 'S13b', title: 'Quando você pretende começar?', reportLabel: 'Quando pretende começar',
            options: [{ v: 'imediato', l: 'Imediatamente', cs: 3 }, { v: '30d', l: 'Nos próximos 30 dias', cs: 3 }, { v: '90d', l: 'Nos próximos 90 dias', cs: 2 }, { v: 'avaliando', l: 'Ainda estou avaliando', cs: 0 }] }
        ] }
    ],

    dimensions: [
      { id: 'velocidade', label: 'Velocidade e cobertura', short: 'velocidade e cobertura do atendimento', q: [['S05', 1], ['S06', 1]],
        content: { diag: PROFILES.velocidade.text, rec: 'Medir tempos de resposta reais, avaliar cobertura fora do expediente e investigar automações adequadas.', strength: 'Primeira resposta rápida e cobertura fora do expediente.' } },
      { id: 'triagem', label: 'Organização da triagem', short: 'organização da triagem', q: [['S07', 1]],
        content: { diag: PROFILES.triagem.text, rec: 'Mapear o fluxo de triagem, definir um padrão de perguntas e registro e avaliar automações.', strength: 'Triagem de consultas e exames com padrão e registro.' } },
      { id: 'continuidade', label: 'Continuidade comercial', short: 'acompanhamento de orçamentos', q: [['S08', 1], ['S09', 1], ['S10', 1]],
        content: { diag: PROFILES.continuidade.text, rec: 'Medir orçamentos enviados, identificar pendências, registrar motivos de perda e padronizar a continuidade comercial.', strength: 'Orçamentos acompanhados e motivos de perda registrados.' } },
      { id: 'integracao', label: 'Integração e gestão de dados', short: 'integração e gestão de dados', q: [['S11', 1], ['S12', 1]],
        content: { diag: PROFILES.integracao.text, rec: 'Organizar etapas comerciais, definir indicadores, estruturar registros e avaliar integrações.', strength: 'Ferramentas conectadas e visão confiável do funil.' } }
    ],

    priorityDim: function (a) { return DIM_FROM_PRIORITY[a.S13a] || null; },

    commercial: {
      revenueQ: 'S02', urgencyQ: 'S13b',
      complexity: function (a, sc) {
        var vol = ['m200', '200a500', '501a1000', '1001a2500', '2500mais'].indexOf(a.S03);
        var top = sc.top ? sc.top.score : 0;
        if (vol >= 2 && top >= 50) return 3;
        if (vol >= 1 && top >= 25) return 2;
        if (top >= 25 || vol >= 1) return 1;
        return 0;
      }
    },

    mainPain: function (a) {
      var o = cfg.questions[13].parts[0].options.filter(function (x) { return x.v === a.S13a; })[0];
      return o ? o.l : null;
    },

    profileRows: function (a) {
      var pick = function (qi, v) { var o = cfg.questions[qi].options.filter(function (x) { return x.v === v; })[0]; return o ? o.l : '—'; };
      return [['Operação', pick(0, a.S01)], ['Contatos/mês', pick(2, a.S03)], ['Canal principal', pick(3, a.S04)]];
    },

    report: function (a, sc) {
      var top = sc.top, second = sc.second, R = { recs: [], strengths: [] };
      var p = sc.structured ? PROFILES.estruturada : PROFILES[top.id];
      if (sc.structured) {
        R.heroTitle = 'Sua clínica mostra <span class="green">processos já organizados</span> nas respostas.';
        R.heroSub = 'Nenhuma etapa ficou acima de 25 pontos. Ainda assim, vale avaliar eficiência, qualidade dos dados e oportunidades de melhoria contínua.';
      } else {
        R.heroTitle = 'Sua clínica pode ter oportunidades de melhoria em <span class="green">' + top.short + '.</span>';
        R.heroSub = 'Analisamos suas respostas e identificamos aspectos da operação que merecem investigação.';
      }
      R.focusKicker = 'Perfil ' + p.code + ' · ' + (sc.structured ? 'Leitura geral' : 'Principal hipótese de gargalo');
      R.focusTitle = p.name; R.focusText = p.text; R.focusRec = null;
      R.recs = p.recs.slice();
      if (!sc.structured && second && second.score >= 25) R.recs.splice(2, 0, 'Também merece atenção, ' + second.label.toLowerCase() + ': ' + PROFILES[second.id].recs[0].toLowerCase());

      var noData = a.S09 === 'nao' || a.S09 === 'manual' || a.S12 === 'nao' || a.S12 === 'manual' || a.S10 === 'nao';
      if (noData) {
        R.callout = 'Não existem dados suficientes para quantificar o impacto financeiro. O primeiro passo recomendado é organizar a medição.';
        if (sc.structured || (top.id !== 'integracao' && top.id !== 'continuidade')) R.recs.unshift('Organizar a medição: registrar orçamentos enviados, status e motivo de cada perda.');
      }
      if (a.S11 === 'sim' && a.S12 === 'sim') R.recs.push('Como as ferramentas já compartilham informações, priorizar análises sobre os dados existentes e governança dos registros.');
      R.recs = R.recs.filter(function (r, i, arr) { return arr.indexOf(r) === i; });

      var pd = cfg.priorityDim(a);
      if (pd && !sc.structured && pd !== top.id) {
        var pdim = sc.dims.filter(function (d) { return d.id === pd; })[0];
        R.mismatch = 'Você indicou ' + pdim.short + ' como prioridade, enquanto suas respostas sugerem atenção adicional em ' + top.short + '. Vale olhar as duas antes de decidir por onde começar.';
      }
      sc.dims.forEach(function (d) { if (d.score != null && d.score < 25) R.strengths.push(d.def.content.strength); });

      R.cta = {
        title: 'Quer descobrir o que realmente está acontecendo no atendimento da sua clínica?',
        text: 'Uma análise aprofundada pode ajudar a validar os gargalos, entender os dados disponíveis e priorizar as melhorias que fazem sentido para sua operação.',
        primary: 'Agendar análise com a NeuralOps', secondary: 'Receber relatório por email'
      };
      return R;
    },

    limitations: [
      'As respostas são autodeclaradas e os tempos informados são estimativas, não medições reais.',
      'Um orçamento que não avançou não significa, por si só, uma oportunidade perdida.',
      'A etapa de triagem é avaliada com uma única pergunta e aparece como sinal preliminar.',
      'Nenhum dado de paciente foi solicitado. O diagnóstico trata do atendimento administrativo e comercial, não de assistência clínica.',
      'Não há projeção financeira: ela exigiria dados operacionais que este diagnóstico não analisa.'
    ]
  };
  window.NXDiag.register(cfg);
})();
