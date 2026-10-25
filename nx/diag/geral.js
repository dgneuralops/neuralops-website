/* Diagnóstico Neural (geral) — configuração da vertical. Versão muda quando perguntas ou pesos mudam. */
(function () {
  var MANUAL = { v: 'naosei', l: 'Não sei', risk: 2, lowConf: true };
  var REV = [
    { v: 'ate50', l: 'Até R$ 50 mil', cs: 0 },
    { v: '50a100', l: 'R$ 50 mil a R$ 100 mil', cs: 1 },
    { v: '100a300', l: 'R$ 100 mil a R$ 300 mil', cs: 2 },
    { v: '300a700', l: 'R$ 300 mil a R$ 700 mil', cs: 3 },
    { v: '700a1500', l: 'R$ 700 mil a R$ 1,5 milhão', cs: 3 },
    { v: 'acima1500', l: 'Acima de R$ 1,5 milhão', cs: 2, review: true },
    { v: 'naoinformar', l: 'Prefiro não informar', cs: 0 }
  ];

  var DIM_FROM_PRIORITY = { atender: 'atendimento', manual: 'eficiencia', integrar: 'integracao', dados: 'gestao', depend: 'dependencia' };
  var DIM_FROM_PAIN = { atendimento: 'atendimento', manual: 'eficiencia', sistemas: 'integracao', dados: 'gestao', pessoas: 'dependencia' };

  var cfg = {
    id: 'geral',
    version: 'geral-1.0',
    shortName: 'Diagnóstico Neural',
    reportName: 'Diagnóstico Neural',
    entity: 'empresa',
    companyLabel: 'Empresa',
    storageKey: 'nxdiag_geral',
    paths: { landing: '/diagnostico/', quiz: '/diagnostico/quiz/', result: '/diagnostico/resultado/' },
    footNote: 'Gratuito · Sem cadastro para começar · Resultado orientativo, não é um diagnóstico técnico definitivo.',
    dimsTitle: 'Sinais por área da operação',

    questions: [
      { id: 'G01', title: 'Qual destas opções melhor descreve sua empresa?', reportLabel: 'Setor', noAuto: false,
        options: [
          { v: 'saude', l: 'Saúde e clínicas' }, { v: 'comercio', l: 'Comércio e e-commerce' }, { v: 'servicos', l: 'Serviços profissionais' },
          { v: 'industria', l: 'Indústria ou distribuição' }, { v: 'agro', l: 'Agro' }, { v: 'tecnologia', l: 'Tecnologia' }, { v: 'outro', l: 'Outro setor' }
        ],
        branch: { when: function (v) { return v === 'saude'; }, text: 'Temos uma análise específica para clínicas e operações de saúde.', label: 'Fazer diagnóstico para clínicas', href: '/saude/diagnostico/' }
      },
      { id: 'G02', title: 'Qual é o faturamento médio mensal aproximado da empresa?', help: 'Usamos esta resposta só para entender o porte. Ela não muda a análise da operação.', reportLabel: 'Faturamento mensal', options: REV },
      { id: 'G03', title: 'Quantas pessoas participam das atividades operacionais da empresa?', reportLabel: 'Pessoas na operação',
        options: [{ v: '1a3', l: '1 a 3' }, { v: '4a10', l: '4 a 10' }, { v: '11a20', l: '11 a 20' }, { v: '21a50', l: '21 a 50' }, { v: '50mais', l: 'Mais de 50' }] },
      { id: 'G04', title: 'Hoje, qual destas situações mais limita sua empresa?', reportLabel: 'Principal limitação declarada',
        options: [
          { v: 'atendimento', l: 'Atendimento e oportunidades comerciais' }, { v: 'manual', l: 'Excesso de tarefas manuais' }, { v: 'sistemas', l: 'Sistemas desconectados' },
          { v: 'dados', l: 'Falta de indicadores e dados confiáveis' }, { v: 'pessoas', l: 'Dependência de pessoas específicas' }, { v: 'crescimento', l: 'Dificuldade de acompanhar o crescimento' },
          { v: 'naosei', l: 'Não sei exatamente onde está o problema' }
        ] },
      { id: 'G05', scored: true, title: 'Quanto da rotina da sua equipe depende de tarefas manuais ou repetitivas?', help: 'Pense em atividades que alguém repete do mesmo jeito todos os dias: copiar dados, responder as mesmas perguntas, montar planilhas.', reportLabel: 'Rotina manual ou repetitiva',
        options: [{ v: 'pouco', l: 'Muito pouco', risk: 0 }, { v: 'pequena', l: 'Uma parte pequena', risk: 1 }, { v: 'relevante', l: 'Uma parte relevante', risk: 2 }, { v: 'maior', l: 'A maior parte', risk: 3 }, { v: 'naosei', l: 'Não sei medir', risk: 2, lowConf: true }],
        insight: function (v, o) { return o && o.risk >= 2 && !o.lowConf ? 'Quando tarefas repetitivas crescem junto com a demanda, a capacidade da operação pode ficar limitada.' : null; } },
      { id: 'G06', scored: true, title: 'As ferramentas que sua empresa utiliza compartilham informações automaticamente?', help: 'Por exemplo: quando um cliente fecha uma compra, os dados aparecem sozinhos no financeiro e no CRM, sem alguém digitar de novo.', reportLabel: 'Ferramentas compartilham informações',
        options: [{ v: 'maioria', l: 'Sim, a maioria', risk: 0 }, { v: 'algumas', l: 'Algumas', risk: 1 }, { v: 'poucas', l: 'Poucas', risk: 2 }, { v: 'nenhuma', l: 'Quase nenhuma', risk: 3 }, MANUAL],
        insight: function (v, o) { return o && o.risk >= 2 && !o.lowConf ? 'Processos desconectados podem aumentar retrabalho.' : null; } },
      { id: 'G07', scored: true, title: 'Sua equipe precisa copiar informações entre sistemas, mensagens ou planilhas?', reportLabel: 'Cópia de informações entre sistemas',
        options: [{ v: 'raro', l: 'Raramente', risk: 0 }, { v: 'semana', l: 'Algumas vezes por semana', risk: 1 }, { v: 'dia', l: 'Todos os dias', risk: 2 }, { v: 'muitas', l: 'Muitas vezes ao dia', risk: 3 }, MANUAL] },
      { id: 'G08', scored: true, title: 'Como sua empresa acompanha solicitações de clientes e oportunidades comerciais?', reportLabel: 'Acompanhamento de clientes e oportunidades',
        options: [{ v: 'estruturado', l: 'Em um processo estruturado, com indicadores', risk: 0 }, { v: 'ferramentas', l: 'Com ferramentas, mas ainda depende de trabalho manual', risk: 1 }, { v: 'mensagens', l: 'Principalmente por mensagens e planilhas', risk: 2 }, { v: 'semPadrao', l: 'Sem um acompanhamento padronizado', risk: 3 }, { v: 'na', l: 'Não se aplica', na: true }],
        insight: function (v, o) { return o && o.risk >= 2 ? 'Sem acompanhamento estruturado, é difícil medir o que acontece depois do primeiro contato com o cliente.' : null; } },
      { id: 'G09', scored: true, title: 'O que acontece quando um colaborador importante está ausente?', reportLabel: 'Ausência de colaborador importante',
        options: [{ v: 'normal', l: 'Os processos continuam normalmente', risk: 0 }, { v: 'lento', l: 'Algumas atividades ficam mais lentas', risk: 1 }, { v: 'compromete', l: 'Parte importante da operação fica comprometida', risk: 2 }, { v: 'para', l: 'Determinados processos praticamente param', risk: 3 }],
        insight: function (v, o) { return o && o.risk >= 2 ? 'Quando o conhecimento fica concentrado em poucas pessoas, a operação fica mais exposta a ausências e sobrecarga.' : null; } },
      { id: 'G10', scored: true, title: 'Você consegue consultar os principais indicadores do negócio sem precisar montar relatórios manualmente?', help: 'Indicadores são números como vendas do mês, tempo de atendimento ou pedidos pendentes.', reportLabel: 'Consulta de indicadores',
        options: [{ v: 'sim', l: 'Sim, com dados confiáveis', risk: 0 }, { v: 'parcial', l: 'Parcialmente', risk: 1 }, { v: 'pedir', l: 'Preciso pedir relatórios ou reunir planilhas', risk: 2 }, { v: 'nao', l: 'Não tenho visibilidade suficiente', risk: 3 }, MANUAL],
        insight: function (v, o) { return o && o.risk >= 2 ? 'Organizar os dados costuma ser um passo importante antes de análises com IA.' : null; } },
      { id: 'G11', title: 'Se pudesse melhorar apenas uma área nos próximos 90 dias, qual escolheria?', reportLabel: 'Prioridade para 90 dias',
        options: [{ v: 'atender', l: 'Responder e acompanhar clientes' }, { v: 'manual', l: 'Reduzir tarefas manuais' }, { v: 'integrar', l: 'Integrar ferramentas' }, { v: 'dados', l: 'Ter dados confiáveis para decidir' }, { v: 'depend', l: 'Diminuir dependência de colaboradores' }, { v: 'geral', l: 'Melhorar a eficiência da operação como um todo' }] },
      { id: 'G12', title: 'Quando você pretende começar a resolver esses problemas?', reportLabel: 'Quando pretende começar',
        options: [{ v: 'imediato', l: 'Imediatamente', cs: 3 }, { v: '30d', l: 'Nos próximos 30 dias', cs: 3 }, { v: '90d', l: 'Nos próximos 90 dias', cs: 2 }, { v: 'pesquisando', l: 'Estou pesquisando possibilidades', cs: 0 }, { v: 'indefinido', l: 'Ainda não defini', cs: 0 }] }
    ],

    dimensions: [
      { id: 'eficiencia', label: 'Eficiência operacional', q: [['G05', 1], ['G07', 0.5]],
        content: { title: 'Sua equipe pode estar gastando tempo demais mantendo processos manuais.', diag: 'As respostas indicam recorrência de atividades que dependem de execução manual. Vale investigar quais tarefas consomem mais horas e quais podem ser simplificadas.', rec: 'Mapear as atividades mais frequentes, estimar o esforço envolvido e avaliar automação por impacto e viabilidade.', strength: 'Rotina com pouca dependência de tarefas manuais repetitivas.' } },
      { id: 'integracao', label: 'Integração de sistemas', q: [['G06', 1], ['G07', 0.5]],
        content: { title: 'Seus sistemas podem estar criando trabalho em vez de eliminar.', diag: 'Informações distribuídas entre ferramentas podem aumentar retrabalho, divergências e dificuldade de acompanhamento.', rec: 'Mapear o fluxo das informações e avaliar integrações com as ferramentas existentes.', strength: 'Ferramentas que já compartilham boa parte das informações.' } },
      { id: 'atendimento', label: 'Atendimento e oportunidades', q: [['G08', 1]],
        content: { title: 'Oportunidades comerciais podem estar dependendo demais de acompanhamento manual.', diag: 'As respostas indicam possível fragilidade no registro, organização ou continuidade das interações com clientes.', rec: 'Padronizar etapas do atendimento e medir tempos de resposta e evolução das oportunidades.', strength: 'Acompanhamento de clientes e oportunidades com processo estruturado.' } },
      { id: 'dependencia', label: 'Dependência operacional', q: [['G09', 1]],
        content: { title: 'Alguns processos podem depender demais de pessoas específicas.', diag: 'Quando atividades críticas não são padronizadas, a ausência ou sobrecarga de determinados colaboradores pode comprometer a continuidade.', rec: 'Documentar processos críticos e identificar onde automação e centralização de informações podem reduzir essa dependência.', strength: 'Operação que continua funcionando quando alguém se ausenta.' } },
      { id: 'gestao', label: 'Inteligência de gestão', q: [['G10', 1]],
        content: { title: 'Você pode estar tomando decisões sem visibilidade suficiente da operação.', diag: 'As respostas mostram que informações importantes podem exigir consolidação manual ou não estar disponíveis de forma estruturada.', rec: 'Definir indicadores prioritários e organizar fontes de dados antes de implementar análises mais avançadas.', strength: 'Indicadores principais disponíveis sem montagem manual.' } }
    ],

    priorityDim: function (a) { return DIM_FROM_PRIORITY[a.G11] || DIM_FROM_PAIN[a.G04] || null; },

    commercial: {
      revenueQ: 'G02', urgencyQ: 'G12',
      complexity: function (a, sc) {
        var size = ['1a3', '4a10', '11a20', '21a50', '50mais'].indexOf(a.G03);
        var top = sc.top ? sc.top.score : 0;
        if (size >= 2 && top >= 50) return 3;
        if (size >= 1 && top >= 25) return 2;
        if (top >= 25) return 1;
        return 0;
      }
    },

    mainPain: function (a) { var o = this.questions[3].options.filter(function (x) { return x.v === a.G04; })[0]; return o ? o.l : null; },

    profileRows: function (a) {
      var pick = function (qi, v) { var o = cfg.questions[qi].options.filter(function (x) { return x.v === v; })[0]; return o ? o.l : '—'; };
      return [['Setor', pick(0, a.G01)], ['Equipe operacional', pick(2, a.G03)]];
    },

    report: function (a, sc) {
      var top = sc.top, second = sc.second;
      var dimById = function (id) { return sc.dims.filter(function (d) { return d.id === id; })[0]; };
      var R = { recs: [], strengths: [] };
      var sector = { saude: 'saúde', comercio: 'comércio', servicos: 'serviços', industria: 'indústria', agro: 'agro', tecnologia: 'tecnologia' }[a.G01];

      if (sc.structured) {
        R.heroTitle = 'Suas respostas mostram <span class="green">poucos sinais de fragilidade</span> na operação.';
        R.heroSub = 'Nenhuma área ficou acima de 25 pontos. O próximo passo é avaliar eficiência, qualidade dos dados e oportunidades de integração e melhoria contínua.';
        R.focusKicker = 'Leitura geral'; R.focusTitle = 'Operação com bases organizadas.';
        R.focusText = 'Pelas respostas, os processos principais já têm alguma estrutura. Isso não descarta oportunidades: em operações organizadas, os ganhos costumam vir de otimização e de análises sobre dados que já existem.';
        R.focusRec = 'Avaliar eficiência, qualidade dos dados e oportunidades de integração e melhoria contínua.';
      } else {
        var c = top.def.content;
        R.heroTitle = 'Seu principal ponto de atenção pode estar em <span class="green">' + top.short + '.</span>';
        R.heroSub = 'Com base nas respostas, identificamos áreas que merecem uma análise mais detalhada antes de priorizar investimentos em tecnologia.';
        R.focusKicker = 'Principal ponto de atenção · ' + top.label;
        R.focusTitle = c.title; R.focusText = c.diag; R.focusRec = null;
      }
      var needsMeasure = a.G10 === 'pedir' || a.G10 === 'nao' || a.G10 === 'naosei';
      if (needsMeasure) R.recs.push('Organizar a medição primeiro: definir de 3 a 5 indicadores prioritários e de onde cada número vem. Sem isso, não há como quantificar impacto.');
      sc.ranked.forEach(function (d) {
        if (d.score < 25 || (needsMeasure && d.id === 'gestao')) return;
        R.recs.push(d.def.content.rec);
      });

      var pd = cfg.priorityDim(a);
      if (pd && top && !sc.structured && pd !== top.id) {
        var pdim = dimById(pd);
        R.mismatch = 'Você indicou ' + pdim.short + ' como prioridade, enquanto suas respostas sugerem atenção adicional em ' + top.short + '. Vale olhar as duas antes de decidir por onde começar.';
      }

      var g10 = sc.dims.filter(function (d) { return d.id === 'gestao'; })[0];
      if (needsMeasure && !sc.structured && top.id !== 'gestao') {
        // a área principal vem primeiro; a medição logo depois
        var m = R.recs.shift(); R.recs.splice(1, 0, m);
      }
      if (a.G06 === 'maioria') R.recs.push('Como boa parte das ferramentas já compartilha informações, priorizar otimização, governança dos dados e análises sobre a base existente.');
      if (sc.lowAnswers >= 2) R.recs.push('Várias respostas foram “não sei”. Levantar esses números já é um primeiro passo de diagnóstico.');
      if (sc.structured) R.recs.push('Escolher um processo de alto volume e medir tempo e retrabalho reais para encontrar ganhos de otimização.', 'Revisar a qualidade e a padronização dos dados que já são coletados.');
      R.recs = R.recs.filter(function (r, i, arr) { return arr.indexOf(r) === i; });
      if (R.recs.length < 3) R.recs.push('Agendar uma conversa de diagnóstico para validar estas hipóteses com dados reais da operação.');

      sc.dims.forEach(function (d) { if (d.score != null && d.score < 25) R.strengths.push(d.def.content.strength); });
      if (g10 && g10.low) R.callout = 'Você indicou não saber como estão os indicadores. Por isso, a análise de gestão tem visibilidade limitada.';

      R.cta = {
        title: 'Quer descobrir quais desses gargalos realmente estão afetando sua empresa?',
        text: 'Em uma conversa de diagnóstico, podemos entender seus processos, avaliar os dados disponíveis e identificar o que merece ser investigado primeiro' + (sector ? ' em uma operação de ' + sector : '') + '.',
        primary: 'Agendar análise com a NeuralOps', secondary: 'Receber meu relatório por email'
      };
      return R;
    },

    limitations: [
      'As respostas são autodeclaradas. O relatório é uma triagem preliminar, não um diagnóstico técnico definitivo.',
      'Algumas áreas são avaliadas com uma única pergunta. Nesses casos, o resultado aparece como sinal preliminar.',
      'Nenhum dado operacional foi analisado. Não há projeção financeira porque não existem dados suficientes para isso.',
      'A viabilidade de integrações e automações depende de APIs, permissões e análise técnica de cada ferramenta.'
    ]
  };
  window.NXDiag.register(cfg);
})();
