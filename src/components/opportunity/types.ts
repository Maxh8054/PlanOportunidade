// Planilha de Oportunidade - Types

export interface OpportunityRecord {
  id: number;
  origemAba: string;
  empresa: string;
  cliente: string;
  descricao: string;
  equipamento: string;
  dataAbertura: Date | null;
  mes: string;
  pn: string;
  partname: string;
  qty: number;
  criticidade: string;
  betim: number;
  lic: number;
  emEstoque: string;
  importacao: number;
  dataTroca: Date | null;
  dataAberturaOM: Date | null;
  ordemManutencao: string;
  pedidoCompra: string;
  requisicaoCompra: string;
  previsaoChegada: Date | null;
  notaFiscal: string;
  dataVenda: Date | null;
  followUpComercial: string;
  followUpLocal: string;
  dataFollowUp: Date | null;
  vinculoPasSvs: string;
  numeroPedido: string;
  dataRecebimentoPedido: Date | null;
  tipoPedido: string;
  dataEntregaSolicitada: Date | null;
  partNumber: string;
  replace: string;
  descricao1: string;
  quantidadePedida: number;
  disponibilidade: string;
  quantidadeFaturada: number;
  numeroCigam: string;
  numeroProcessoImportacao: string;
  numeroNF: string;
  dataEmissaoNF: Date | null;
  observacao: string;
  status: 'sem_om' | 'com_om' | 'com_po_sem_faturamento' | 'faturado_parcial' | 'vendido';
  diasEmAberto: number;
  diasParaEntrega: number | null;
  estoqueDisponivel: number;
}

export type ExportType = 'completo' | 'servicos';
export type EstoqueFilterType = 'all' | 'lic' | 'betim';
