// Configuração da Black 2026: áreas, campos lançados por dia, metas e tarefas iniciais.
// Este arquivo é usado pelo servidor (Node) e pelo navegador.
(function (root) {
  const FRENTES_PF = [
    { id: 'vip', nome: 'Lista VIP', inicio: '2026-10-22', fim: '2026-10-31' },
    { id: 'esquenta', nome: 'Esquenta Black', inicio: '2026-10-20', fim: '2026-10-31' },
    { id: 'november', nome: 'Black November', inicio: '2026-11-01', fim: '2026-11-30' },
    { id: 'indicacao', nome: 'Black Indicação', inicio: '2026-11-03', fim: '2026-11-30' },
  ];

  const PERIODOS = [
    { id: 'tudo', nome: 'Campanha toda', inicio: '2026-10-17', fim: '2026-11-30' },
    { id: 'outubro', nome: 'Outubro (VIP + Esquenta)', inicio: '2026-10-17', fim: '2026-10-31' },
    { id: 'november', nome: 'Black November', inicio: '2026-11-01', fim: '2026-11-30' },
    { id: 'semana', nome: 'Últimos 7 dias', dinamico: 7 },
    { id: 'hoje', nome: 'Hoje', dinamico: 1 },
  ];

  const FASES = [
    { inicio: '2026-10-17', fim: '2026-10-19', nome: 'Curiosidade', texto: 'Perfil preto e vídeos sem anunciar a Black' },
    { inicio: '2026-10-20', fim: '2026-10-21', nome: 'Esquenta Black aberto', texto: 'Página, grupo e preparação dos parceiros' },
    { inicio: '2026-10-22', fim: '2026-10-31', nome: 'Lista VIP + Esquenta Black', texto: 'Lotes de 200 por dia útil até 28/10 · condições até 31/10' },
    { inicio: '2026-11-01', fim: '2026-11-22', nome: 'Black November', texto: 'Preço Black · Black Indicação a partir de 03/11' },
    { inicio: '2026-11-23', fim: '2026-11-27', nome: 'Semana da Black Friday', texto: 'Pico de mídia e microinfluenciador' },
    { inicio: '2026-11-28', fim: '2026-11-30', nome: 'Última chamada', texto: 'A Black termina segunda, 30/11' },
  ];

  // Tipos de campo: n = número inteiro, r = valor em reais
  const AREAS = [
    {
      id: 'operacional', nome: 'Operacional', dono: 'Maria',
      descricao: 'Onboarding, primeira entrega, satisfação e cashback da Black Indicação.',
      grafico: { campo: 'onboarding_7d', nome: 'Onboardings concluídos em 7 dias' },
      secoes: [
        { nome: 'Entrada das vendas', campos: [
          { id: 'vendas_recebidas', nome: 'Vendas recebidas do comercial' },
          { id: 'recebidas_mesmo_dia', nome: 'Recebidas no mesmo dia da venda' },
        ] },
        { nome: 'Onboarding', campos: [
          { id: 'boas_vindas_24h', nome: 'Boas-vindas enviadas em até 24h' },
          { id: 'checklist_ok', nome: 'Checklists de documentos concluídos' },
          { id: 'onboarding_7d', nome: 'Onboardings concluídos em até 7 dias' },
          { id: 'onboarding_atrasado', nome: 'Onboardings atrasados (mais de 7 dias)' },
        ] },
        { nome: 'Primeira entrega', campos: [
          { id: 'entregas_prazo', nome: 'Primeiras apurações entregues no prazo' },
          { id: 'entregas_atraso', nome: 'Primeiras apurações entregues com atraso' },
        ] },
        { nome: 'Satisfação', campos: [
          { id: 'pesquisas', nome: 'Pesquisas de satisfação respondidas' },
          { id: 'notas_9_10', nome: 'Notas 9 ou 10' },
          { id: 'notas_baixas', nome: 'Notas de 0 a 6' },
          { id: 'motivos_saida', nome: 'Motivos de saída registrados (Lista VIP)' },
        ] },
        { nome: 'Black Indicação', campos: [
          { id: 'convidados', nome: 'Clientes convidados para indicar' },
          { id: 'cashback_liberado', nome: 'Cashbacks liberados' },
          { id: 'cashback_prazo', nome: 'Cashbacks liberados em até 7 dias' },
          { id: 'cashback_resgatado', nome: 'Cashback resgatado em outros produtos', tipo: 'r' },
        ] },
      ],
    },
    {
      id: 'marketing', nome: 'Marketing', dono: 'Marketing',
      descricao: 'Inscritos, leads por canal, conteúdo, tráfego, e-mail e depoimentos.',
      grafico: { campo: 'inscritos', nome: 'Inscritos no Esquenta' },
      secoes: [
        { nome: 'Esquenta Black', campos: [
          { id: 'inscritos', nome: 'Inscritos na página' },
          { id: 'grupo_entradas', nome: 'Entradas no grupo' },
          { id: 'grupo_saidas', nome: 'Saídas do grupo' },
        ] },
        { nome: 'Leads por canal', campos: [
          { id: 'lead_organico', nome: 'Instagram e redes (orgânico)' },
          { id: 'lead_trafego', nome: 'Tráfego pago' },
          { id: 'lead_parceiros', nome: 'Links de parceiros' },
          { id: 'lead_grupos', nome: 'Grupos e Comunidade CDT' },
          { id: 'lead_email', nome: 'E-mail marketing' },
        ] },
        { nome: 'Conteúdo', campos: [
          { id: 'posts', nome: 'Posts publicados (feed e Reels)' },
          { id: 'stories', nome: 'Stories publicados' },
          { id: 'alcance', nome: 'Contas alcançadas' },
          { id: 'interacoes', nome: 'Interações (curtidas, comentários, compart.)' },
          { id: 'seguidores_novos', nome: 'Novos seguidores' },
        ] },
        { nome: 'Tráfego pago', campos: [
          { id: 'investimento', nome: 'Investimento do dia', tipo: 'r' },
          { id: 'cliques', nome: 'Cliques' },
        ] },
        { nome: 'E-mail', campos: [
          { id: 'email_enviados', nome: 'E-mails enviados' },
          { id: 'email_aberturas', nome: 'Aberturas' },
          { id: 'email_cliques', nome: 'Cliques' },
        ] },
        { nome: 'Prova social e parceiros', campos: [
          { id: 'depoimentos', nome: 'Depoimentos recebidos' },
          { id: 'parceiros_ativos', nome: 'Parceiros que divulgaram' },
        ] },
      ],
    },
    {
      id: 'comercial_pf', nome: 'Comercial PF', dono: 'Gustavo',
      descricao: 'Lista VIP, inscritos do Esquenta, leads da Black November e indicados.',
      grafico: { campo: 'vendas_total', nome: 'Vendas por dia' },
      secoes: [
        { nome: 'Por frente', matriz: {
          linhas: FRENTES_PF.map(f => ({ id: f.id, nome: f.nome })),
          colunas: [
            { id: 'contatos', nome: 'Contatos feitos' },
            { id: 'respostas', nome: 'Respostas' },
            { id: 'propostas', nome: 'Propostas' },
            { id: 'followups', nome: 'Follow-ups' },
            { id: 'vendas', nome: 'Vendas' },
            { id: 'valor', nome: 'Valor vendido', tipo: 'r' },
          ],
        } },
        { nome: 'Velocidade de resposta', campos: [
          { id: 'leads_recebidos', nome: 'Leads recebidos no dia' },
          { id: 'leads_1h', nome: 'Respondidos em até 1h útil' },
        ] },
        { nome: 'Vendas por pacote', campos: [
          { id: 'p01', nome: 'Pacote 01 · B3 ou Forex' },
          { id: 'p02', nome: 'Pacote 02 · B3 + M.I.' },
          { id: 'p03', nome: 'Pacote 03 · Cripto' },
          { id: 'p04', nome: 'Pacote 04 · Personalizado' },
        ] },
        { nome: 'Recompra', campos: [
          { id: 'upgrades', nome: 'Upgrades de pacote' },
          { id: 'cruzadas', nome: 'Vendas de outros produtos do grupo' },
        ] },
      ],
    },
    {
      id: 'comercial_pj', nome: 'Comercial PJ', dono: 'Kerolen',
      descricao: 'Black PJ: diagnóstico online e em reunião, devolutiva e contrato.',
      grafico: { campo: 'contratos', nome: 'Contratos por dia' },
      secoes: [
        { nome: 'Aquisição', campos: [
          { id: 'inscricoes', nome: 'Inscrições no diagnóstico' },
          { id: 'contato_24h', nome: 'Inscritos contatados em até 24h' },
        ] },
        { nome: 'Diagnóstico (teste de outubro)', campos: [
          { id: 'diag_online', nome: 'Diagnósticos online concluídos' },
          { id: 'diag_reuniao', nome: 'Diagnósticos feitos em reunião' },
          { id: 'devolutivas', nome: 'Reuniões de devolutiva' },
        ] },
        { nome: 'Fechamento', campos: [
          { id: 'propostas', nome: 'Propostas enviadas' },
          { id: 'followups', nome: 'Follow-ups' },
          { id: 'contratos_online', nome: 'Contratos vindos do diagnóstico online' },
          { id: 'contratos_reuniao', nome: 'Contratos vindos do diagnóstico em reunião' },
          { id: 'valor_mensal', nome: 'Honorário mensal fechado', tipo: 'r' },
          { id: 'valor_unico', nome: 'Serviços avulsos (abertura, holding)', tipo: 'r' },
        ] },
        { nome: 'Pós-venda', campos: [
          { id: 'nutricao', nome: 'Não convertidos colocados em nutrição' },
          { id: 'servicos_extra', nome: 'Serviços adicionais vendidos' },
        ] },
      ],
    },
  ];

  const METAS = [
    { id: 'vip_contatos', nome: 'Lista VIP: contatos feitos', valor: 1000, tipo: 'n', area: 'comercial_pf' },
    { id: 'vip_vendas', nome: 'Lista VIP: vendas', valor: 50, tipo: 'n', area: 'comercial_pf' },
    { id: 'esquenta_conv', nome: 'Esquenta: % de inscritos que compram', valor: 10, tipo: '%', area: 'comercial_pf' },
    { id: 'november_vendas', nome: 'Black November: vendas (0 = definir)', valor: 0, tipo: 'n', area: 'comercial_pf' },
    { id: 'indicacao_conv', nome: 'Indicação: % que fecha', valor: 30, tipo: '%', area: 'comercial_pf' },
    { id: 'resposta_1h', nome: 'Leads respondidos em até 1h', valor: 90, tipo: '%', area: 'comercial_pf' },
    { id: 'faturamento', nome: 'Faturamento PF da Black (0 = definir)', valor: 0, tipo: 'r', area: 'comercial_pf' },
    { id: 'inscritos', nome: 'Esquenta: inscritos', valor: 300, tipo: 'n', area: 'marketing' },
    { id: 'depoimentos', nome: 'Depoimentos recebidos', valor: 15, tipo: 'n', area: 'marketing' },
    { id: 'cpl', nome: 'Custo máximo por lead do tráfego (0 = definir)', valor: 0, tipo: 'r', area: 'marketing' },
    { id: 'onboarding_7d', nome: 'Onboarding concluído em 7 dias', valor: 90, tipo: '%', area: 'operacional' },
    { id: 'entregas_prazo', nome: 'Primeira apuração no prazo', valor: 95, tipo: '%', area: 'operacional' },
    { id: 'cashback_prazo', nome: 'Cashback liberado em até 7 dias', valor: 100, tipo: '%', area: 'operacional' },
    { id: 'convidados', nome: 'Clientes convidados para a Indicação (0 = definir)', valor: 0, tipo: 'n', area: 'operacional' },
    { id: 'pj_conv', nome: 'Black PJ: % de devolutivas que viram contrato', valor: 25, tipo: '%', area: 'comercial_pj' },
    { id: 'pj_vagas', nome: 'Black PJ: vagas do diagnóstico (0 = definir)', valor: 0, tipo: 'n', area: 'comercial_pj' },
    { id: 'pj_24h', nome: 'Black PJ: inscritos contatados em 24h', valor: 100, tipo: '%', area: 'comercial_pj' },
  ];

  const TAREFAS = [
    ['geral', '2026-10-19', 'Marcelo', 'Aprovar preços VIP e Esquenta'],
    ['geral', '2026-10-19', 'Todas as áreas', 'Confirmar o dono de cada área no painel'],
    ['marketing', '2026-10-19', 'Marketing', 'Vídeo “Amanhã” no ar'],
    ['marketing', '2026-10-20', 'Marketing', 'Gravar vídeo de abertura e vídeo da página'],
    ['marketing', '2026-10-20', 'Marketing', 'Página de inscrição e grupo do Esquenta no ar'],
    ['comercial_pf', '2026-10-20', 'Eduardo Oliveira', 'Lista VIP limpa e classificada entregue até 12h'],
    ['marketing', '2026-10-21', 'Marketing', 'Arte e link próprio para cada parceiro'],
    ['marketing', '2026-10-21', 'Marketing', 'Roteiro de mensagem da Lista VIP para o comercial'],
    ['geral', '2026-10-21', 'Luis', 'Ligar para os parceiros e enviar o kit'],
    ['marketing', '2026-10-22', 'Marketing', 'Lançamento nos grupos (WhatsApp, Comunidade, canal)'],
    ['marketing', '2026-10-22', 'Gestor de tráfego', 'Tráfego do Esquenta no ar'],
    ['comercial_pf', '2026-10-22', 'Comercial PF', 'Lista VIP · lote 1 de 200'],
    ['comercial_pf', '2026-10-23', 'Comercial PF', 'Lista VIP · lote 2 de 200'],
    ['comercial_pf', '2026-10-26', 'Comercial PF', 'Lista VIP · lote 3 de 200'],
    ['comercial_pf', '2026-10-27', 'Comercial PF', 'Lista VIP · lote 4 de 200'],
    ['comercial_pf', '2026-10-28', 'Comercial PF', 'Lista VIP · lote 5 de 200'],
    ['comercial_pj', '2026-10-24', 'Kerolen', 'Validar a Black PJ e a oferta com o Marcelo'],
    ['comercial_pj', '2026-10-24', 'Kerolen', 'Definir o número de vagas do diagnóstico'],
    ['geral', '2026-10-28', 'Todas as áreas', 'Checkpoint: escolher os canais da Black November'],
    ['comercial_pf', '2026-10-30', 'Comercial PF', 'Aviso “a condição VIP acaba amanhã”'],
    ['operacional', '2026-10-31', 'Financeiro e Gustavo', 'Regras do cashback aprovadas (%, teto, validade)'],
    ['marketing', '2026-10-31', 'Marketing', 'E-mail, arte e link de indicação por cliente'],
    ['marketing', '2026-10-31', 'Marketing', 'Página da Black PJ com vídeo e formulário'],
    ['comercial_pj', '2026-10-31', 'Kerolen', 'Comparar diagnóstico online x reunião e escolher o caminho'],
    ['marketing', '2026-11-01', 'Marketing', 'Abertura da Black November (e-mail, redes, grupo, tráfego)'],
    ['operacional', '2026-11-02', 'Maria', 'Lista de clientes satisfeitos para a Indicação'],
    ['operacional', '2026-11-03', 'Maria', 'Convite da Black Indicação por e-mail e WhatsApp'],
    ['marketing', '2026-11-06', 'Marketing', 'Microinfluenciador contratado'],
    ['operacional', '2026-11-07', 'Maria', '100% dos clientes satisfeitos convidados'],
    ['marketing', '2026-11-23', 'Marketing', 'Semana da Black Friday: pico de mídia'],
    ['marketing', '2026-11-28', 'Marketing', 'Última chamada (28 a 30/11)'],
  ].map(([area, prazo, dono, titulo]) => ({ area, prazo, dono, titulo }));

  const CONFIG = { FRENTES_PF, PERIODOS, FASES, AREAS, METAS, TAREFAS, INICIO: '2026-10-17', FIM: '2026-11-30' };
  if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
  else root.CDT = CONFIG;
})(this);
