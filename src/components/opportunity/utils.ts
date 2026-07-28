// Planilha de Oportunidade - Utility Functions

import type { OpportunityRecord } from './types';
import { COLUMN_MAP, SHEET_NAMES } from './constants';

export function parseDate(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === 'number') {
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + value * 24 * 60 * 60 * 1000);
  }

  const dateStr = String(value).trim();

  const match1 = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (match1) {
    const [, day, month, year] = match1;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const match2 = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match2) {
    const [, year, month, day] = match2;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.startsWith('#') || trimmed === '' || trimmed === '-') return 0;
    const normalized = trimmed.replace(',', '.').trim();
    const num = parseFloat(normalized);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function parseCriticidade(value: string): string {
  const raw = value.toLowerCase().trim();
  if (raw === 'alta' || raw === 'alto') return 'Alta';
  if (raw === 'média' || raw === 'media' || raw === 'medio' || raw === 'médio') return 'Média';
  return 'Baixa';
}

export function determineStatus(
  notaFiscal: string,
  dataVenda: Date | null,
  pedidoCompra: string,
  ordemManutencao: string,
  quantidadeFaturada: number = 0,
  quantidadePedida: number = 0,
  qty: number = 0
): OpportunityRecord['status'] {
  const qtdPedida = quantidadePedida || qty;
  const hasFaturamento = quantidadeFaturada > 0;

  if (hasFaturamento && qtdPedida > 0 && quantidadeFaturada < qtdPedida) return 'faturado_parcial';
  if (hasFaturamento && (qtdPedida === 0 || quantidadeFaturada >= qtdPedida)) return 'vendido';
  if (notaFiscal || dataVenda) return 'vendido';
  if (pedidoCompra) return 'com_po_sem_faturamento';
  if (ordemManutencao) return 'com_om';
  return 'sem_om';
}

export function getStockInfo(record: OpportunityRecord) {
  const qtdPedida = record.quantidadePedida || record.qty;
  const isLundin = record.origemAba?.toLowerCase().includes('lundin');
  const importacaoQtd = record.importacao || 0;

  let estoqueDisponivel = 0;
  let localEstoque = '';
  let precisaTransferencia = false;

  if (isLundin) {
    if (record.lic >= qtdPedida) {
      estoqueDisponivel = record.lic;
      localEstoque = 'LIC';
    } else if (record.betim >= qtdPedida) {
      estoqueDisponivel = record.betim;
      localEstoque = 'Betim';
      precisaTransferencia = true;
    } else if ((record.lic + record.betim) >= qtdPedida) {
      estoqueDisponivel = record.lic + record.betim;
      localEstoque = 'LIC+Betim';
      precisaTransferencia = true;
    } else if (importacaoQtd >= qtdPedida) {
      estoqueDisponivel = importacaoQtd;
      localEstoque = 'Importação';
    } else {
      estoqueDisponivel = record.lic + record.betim + importacaoQtd;
      localEstoque = 'Insuficiente';
    }
  } else {
    if (record.betim >= qtdPedida) {
      estoqueDisponivel = record.betim;
      localEstoque = 'Betim';
    } else if (importacaoQtd >= qtdPedida) {
      estoqueDisponivel = importacaoQtd;
      localEstoque = 'Importação';
    } else if ((record.betim + importacaoQtd) >= qtdPedida) {
      estoqueDisponivel = record.betim + importacaoQtd;
      localEstoque = 'Betim+Imp';
    } else {
      estoqueDisponivel = record.betim + importacaoQtd;
      localEstoque = 'Insuficiente';
    }
  }

  const saldo = qtdPedida - estoqueDisponivel;
  const coberturaTotal = estoqueDisponivel >= qtdPedida;

  let bgColor = '#dc3545';
  let textColor = 'white';

  if (coberturaTotal && !precisaTransferencia) {
    bgColor = '#28a745';
  } else if (coberturaTotal && precisaTransferencia) {
    bgColor = '#ffc107';
    textColor = '#333';
  } else if (saldo > 0 && estoqueDisponivel > 0) {
    bgColor = '#fd7e14';
  }

  return { estoqueDisponivel, localEstoque, precisaTransferencia, saldo, coberturaTotal, bgColor, textColor };
}

export function formatDateBR(date: Date | null): string {
  if (!date) return '';
  return date.toLocaleDateString('pt-BR');
}
