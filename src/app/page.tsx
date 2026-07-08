'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Upload,
  FileSpreadsheet,
  Download,
  ShoppingCart,
  BarChart3,
  Target,
  Package,
  Wrench,
  TrendingUp,
  Filter,
  ChevronDown,
  X,
  MessageSquare,
  Plus,
  MessageCircle,
  FileJson,
  Clock,
  CheckCircle,
  RefreshCw,
  Settings,
  Trash2,
  GripVertical,
  History,
  CalendarDays,
} from 'lucide-react';
import { PasswordModal } from '@/components/PasswordModal';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FilterDropdown } from '@/components/FilterDropdown';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { OpportunityRecord, FollowUpEntry } from '@/components/opportunity/types';
import {
  SHEET_NAMES,
  SHEET_DISPLAY_NAMES,
  COLORS,
  CRITICITY_COLORS,
  STATUS_CONFIG,
  PIE_COLORS,
  MONTHS,
  COLUMN_MAP,
  COLUMNS_BY_ORIGIN,
  DEFAULT_COLUMNS_BY_ORIGIN,
} from '@/components/opportunity/constants';
import {
  parseDate,
  parseNumber,
  parseCriticidade,
  determineStatus,
  getStockInfo,
  formatDateBR,
} from '@/components/opportunity/utils';

// Sortable Column Item for Drag and Drop
function SortableColumnItem({ column, onRemove }: { column: { key: string; label: string }; onRemove: (key: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: column.key });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-md hover:bg-slate-100 transition-colors">
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 shrink-0">
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm text-slate-700 truncate">{column.label}</span>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50 shrink-0" onClick={() => onRemove(column.key)}>
        <X className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// Stock Badge Component
function AnaliseEstoqueBadge({ record }: { record: OpportunityRecord }) {
  const info = getStockInfo(record);
  return (
    <div className="flex flex-col items-center gap-1">
      <Badge style={{ backgroundColor: info.bgColor, color: info.textColor }}>
        {info.localEstoque}
      </Badge>
      <span className="text-xs text-slate-500">
        {info.coberturaTotal ? '✓' : `Falta: ${info.saldo}`}
      </span>
    </div>
  );
}

export default function SalesOpportunityDashboard() {
  const [data, setData] = useState<OpportunityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasLoadedRef = useRef(false);

  // Column configuration state
  const [visibleColumns, setVisibleColumns] = useState<string[]>([]);
  const [showColumnConfigModal, setShowColumnConfigModal] = useState(false);
  const [showColumnConfigPassword, setShowColumnConfigPassword] = useState(false);
  const [tempVisibleColumns, setTempVisibleColumns] = useState<string[]>([]);
  const sensors = useSensors(useSensor(PointerSensor));

  // Dynamic Excel column headers per origin (columns not in COLUMNS_BY_ORIGIN)
  const [excelHeadersByOrigin, setExcelHeadersByOrigin] = useState<Record<string, { key: string; label: string }[]>>({});

  // Helper: parse dates from JSON
  const parseDates = (d: Record<string, unknown>, index: number): Record<string, unknown> => {
    const parsed: Record<string, unknown> = {
      ...d,
      id: index + 1,
      dataAbertura: d.dataAbertura ? new Date(d.dataAbertura as string) : null,
      dataTroca: d.dataTroca ? new Date(d.dataTroca as string) : null,
      dataAberturaOM: d.dataAberturaOM ? new Date(d.dataAberturaOM as string) : null,
      previsaoChegada: d.previsaoChegada ? new Date(d.previsaoChegada as string) : null,
      dataVenda: d.dataVenda ? new Date(d.dataVenda as string) : null,
      dataFollowUp: d.dataFollowUp ? new Date(d.dataFollowUp as string) : null,
      dataRecebimentoPedido: d.dataRecebimentoPedido ? new Date(d.dataRecebimentoPedido as string) : null,
      dataEntregaSolicitada: d.dataEntregaSolicitada ? new Date(d.dataEntregaSolicitada as string) : null,
      dataEmissaoNF: d.dataEmissaoNF ? new Date(d.dataEmissaoNF as string) : null,
      dataDisponibilidade: d.dataDisponibilidade ? new Date(d.dataDisponibilidade as string) : null,
    };
    // Parse dates in extraFields
    if (d.extraFields && typeof d.extraFields === 'object') {
      const ef = d.extraFields as Record<string, unknown>;
      const parsedEf: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(ef)) {
        if (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/)) {
          parsedEf[k] = new Date(v);
        } else {
          parsedEf[k] = v;
        }
      }
      parsed.extraFields = parsedEf;
    }
    return parsed;
  };

  // Helper: serialize dates to JSON
  const serializeData = (records: OpportunityRecord[]) => records.map(d => {
    const serialized: Record<string, unknown> = {
      ...d,
      dataAbertura: d.dataAbertura?.toISOString() || null,
      dataTroca: d.dataTroca?.toISOString() || null,
      dataAberturaOM: d.dataAberturaOM?.toISOString() || null,
      previsaoChegada: d.previsaoChegada?.toISOString() || null,
      dataVenda: d.dataVenda?.toISOString() || null,
      dataFollowUp: d.dataFollowUp?.toISOString() || null,
      dataRecebimentoPedido: d.dataRecebimentoPedido?.toISOString() || null,
      dataEntregaSolicitada: d.dataEntregaSolicitada?.toISOString() || null,
      dataEmissaoNF: d.dataEmissaoNF?.toISOString() || null,
      dataDisponibilidade: (d as unknown as Record<string, unknown>).dataDisponibilidade instanceof Date ? (d as unknown as Record<string, unknown>).dataDisponibilidade : null,
    };
    // Serialize dates in extraFields
    if (d.extraFields) {
      const serializedEf: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(d.extraFields)) {
        if (v instanceof Date) {
          serializedEf[k] = v.toISOString();
        } else {
          serializedEf[k] = v;
        }
      }
      serialized.extraFields = serializedEf;
    }
    return serialized;
  });

  // Load from API on mount
  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    loadData();
  }, []);

  async function loadData() {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/dashboard-data');
      const json = await res.json();
      if (json.data && Array.isArray(json.data) && json.data.length > 0) {
        const parsed = json.data.map((d: Record<string, unknown>, i: number) => parseDates(d, i) as OpportunityRecord);
        setData(parsed);
        if (json.excelHeadersByOrigin) {
          setExcelHeadersByOrigin(json.excelHeadersByOrigin);
        }
        setLastSync(json.updatedAt ? new Date(json.updatedAt).toLocaleString('pt-BR') : new Date().toLocaleString('pt-BR'));
      } else {
        // Fallback to localStorage
        try {
          const saved = localStorage.getItem('dashboard_oportunidades_data');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.data && Array.isArray(parsed.data)) {
              setData(parsed.data.map((d: Record<string, unknown>, i: number) => parseDates(d, i) as OpportunityRecord));
            }
            if (parsed.excelHeadersByOrigin) {
              setExcelHeadersByOrigin(parsed.excelHeadersByOrigin);
            }
          }
        } catch { /* ignore */ }
      }
    } catch {
      // API not available (local dev) - fallback to localStorage
      try {
        const saved = localStorage.getItem('dashboard_oportunidades_data');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.data && Array.isArray(parsed.data)) {
            setData(parsed.data.map((d: Record<string, unknown>, i: number) => parseDates(d, i) as OpportunityRecord));
          }
          if (parsed.excelHeadersByOrigin) {
            setExcelHeadersByOrigin(parsed.excelHeadersByOrigin);
          }
        }
      } catch { /* ignore */ }
    } finally {
      setIsSyncing(false);
    }
  }

  // Column config is now loaded based on origin in the useEffect above

  // Save to API + localStorage whenever data changes
  useEffect(() => {
    if (data.length === 0) return;
    // Always save to localStorage
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      data: serializeData(data),
      excelHeadersByOrigin,
    };
    localStorage.setItem('dashboard_oportunidades_data', JSON.stringify(exportData));
    // Try to save to API (don't await, fire and forget)
    fetch('/api/dashboard-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: serializeData(data), totalRecords: data.length }),
    }).then(res => res.json()).then(json => {
      if (json.success) {
        setLastSync(new Date().toLocaleString('pt-BR'));
      } else {
        console.error('Sync failed:', json.error);
      }
    }).catch(err => {
      console.error('Sync failed:', err);
    });
  }, [data]);

  // Overview Filters
  const [empresaFilter, setEmpresaFilter] = useState<string[]>([]);
  const [clienteFilter, setClienteFilter] = useState<string[]>([]);
  const [equipamentoFilter, setEquipamentoFilter] = useState<string[]>([]);
  const [criticidadeFilter, setCriticidadeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [periodFilter, setPeriodFilter] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [estoqueFilter, setEstoqueFilter] = useState<string[]>([]);
  const [rankingType, setRankingType] = useState<'inspecao' | 'venda'>('inspecao');
  const [chartYearFilter, setChartYearFilter] = useState<string>('');
  const [showOverviewFilters, setShowOverviewFilters] = useState(false);
  const [showOppFilters, setShowOppFilters] = useState(false);

  // Opportunities Tab Filters (multi-select)
  const [oppMonthFilter, setOppMonthFilter] = useState<string[]>([]);
  const [oppYearFilter, setOppYearFilter] = useState<string[]>([]);
  const [oppClienteFilter, setOppClienteFilter] = useState<string[]>([]);
  const [oppStatusFilter, setOppStatusFilter] = useState<string[]>([]);
  const [oppCriticidadeFilter, setOppCriticidadeFilter] = useState<string[]>([]);
  const [oppDiasFilter, setOppDiasFilter] = useState<string[]>([]);
  const [oppAnaliseFilter, setOppAnaliseFilter] = useState<string[]>([]);
  const [oppPrazoFilter, setOppPrazoFilter] = useState<string[]>([]);
  const [oppSearchTerm, setOppSearchTerm] = useState('');
  const [oppOrigemFilter, setOppOrigemFilter] = useState<string[]>(() => {
    const lundinIdx = SHEET_NAMES.findIndex(n => n.toLowerCase().includes('lundin'));
    return lundinIdx >= 0 ? [SHEET_NAMES[lundinIdx]] : (SHEET_NAMES.length > 0 ? [SHEET_NAMES[0]] : []);
  });

  // Follow Up Modal State
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpRecord, setFollowUpRecord] = useState<OpportunityRecord | null>(null);
  const [followUpText, setFollowUpText] = useState('');
  const [followUpDataBaseFim, setFollowUpDataBaseFim] = useState('');
  const [applyToAllPedido, setApplyToAllPedido] = useState(false);
  const [applyToAllOM, setApplyToAllOM] = useState(false);
  const [deleteMode, setDeleteMode] = useState(false);
  const [deleteIndex, setDeleteIndex] = useState<number | null>(null);

  // JSON import state
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const [showJsonImportModal, setShowJsonImportModal] = useState(false);
  const [pendingJsonFile, setPendingJsonFile] = useState<File | null>(null);

  // Available filter options
  const empresas = useMemo(() => [...new Set(data.map(d => d.empresa).filter(Boolean))].sort(), [data]);
  const clientes = useMemo(() => [...new Set(data.map(d => d.cliente).filter(Boolean))].sort(), [data]);
  const equipamentos = useMemo(() => [...new Set(data.map(d => d.equipamento).filter(Boolean))].sort(), [data]);
  const criticidades = useMemo(() => [...new Set(data.map(d => d.criticidade).filter(Boolean))].sort(), [data]);
  const origens = useMemo(() => [...new Set(data.map(d => d.origemAba).filter(Boolean))].sort(), [data]);

  // Memoized option arrays for FilterDropdowns
  const empresaOptions = useMemo(() => empresas.map(e => ({ value: e, label: e })), [empresas]);
  const clienteOptions = useMemo(() => clientes.map(c => ({ value: c, label: c })), [clientes]);
  const equipamentoOptions = useMemo(() => equipamentos.map(e => ({ value: e, label: e })), [equipamentos]);
  const criticidadeOptions = useMemo(() => criticidades.map(c => ({ value: c, label: c })), [criticidades]);
  const statusOptions = useMemo(() => Object.entries(STATUS_CONFIG).map(([k, v]) => ({ value: k, label: v.label })), []);
  const origemOptions = useMemo(() => origens.map(o => ({ value: o, label: o.replace('PAS SVS ', '') })), [origens]);
  const monthOptions = useMemo(() => MONTHS.map(m => ({ value: m.value, label: m.label })), []);
  const diasOptions = useMemo(() => [
    { value: '<30', label: '< 30 dias' },
    { value: '30-60', label: '30-60 dias' },
    { value: '>60', label: '> 60 dias' },
    { value: '>90', label: '> 90 dias' },
  ] as const, []);
  const analiseOptions = useMemo(() => [
    { value: 'completos', label: 'Completos' },
    { value: 'incompletos', label: 'Incompletos' },
    { value: 'com_followup', label: 'Com Follow Up' },
    { value: 'sem_followup', label: 'Sem Follow Up' },
  ] as const, []);
  const prazoOptions = useMemo(() => [
    { value: 'atrasados', label: 'Atrasados' },
    { value: 'este_mes', label: 'Este Mês' },
    { value: 'futuro', label: 'Futuro' },
  ] as const, []);
  const periodoOptions = useMemo(() => [
    { value: '7d', label: 'Últimos 7 dias' },
    { value: '30d', label: 'Últimos 30 dias' },
    { value: '90d', label: 'Últimos 90 dias' },
    { value: '2024', label: '2024' },
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
  ] as const, []);
  const estoqueOptions = useMemo(() => [
    { value: 'lic', label: 'Com LIC' },
    { value: 'betim', label: 'Com Betim' },
  ] as const, []);

  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.forEach(d => {
      if (d.dataAbertura) years.add(d.dataAbertura.getFullYear());
    });
    return Array.from(years).sort().map(y => y.toString());
  }, [data]);

  const yearOptions = useMemo(() => availableYears.map(y => ({ value: y, label: y })), [availableYears]);

  // Auto-select most recent year for chart
  const effectiveChartYear = chartYearFilter || (availableYears.length > 0 ? availableYears[availableYears.length - 1] : '');
  useEffect(() => {
    if (!chartYearFilter && availableYears.length > 0) {
      setChartYearFilter(availableYears[availableYears.length - 1]);
    }
  }, [availableYears]);

  // Overview filtered data
  const filteredData = useMemo(() => {
    let result = data;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      result = result.filter(d => {
        if (d.pn?.toLowerCase().includes(search)) return true;
        if (d.partname?.toLowerCase().includes(search)) return true;
        if (d.cliente?.toLowerCase().includes(search)) return true;
        if (d.descricao?.toLowerCase().includes(search)) return true;
        if (d.ordemManutencao?.toLowerCase().includes(search)) return true;
        if (d.pedidoCompra?.toLowerCase().includes(search)) return true;
        // Search in extra fields
        if (d.extraFields) {
          for (const v of Object.values(d.extraFields)) {
            if (v != null && String(v).toLowerCase().includes(search)) return true;
          }
        }
        // Search in follow-up texts
        if (d.followUps && d.followUps.length > 0) {
          for (const fu of d.followUps) {
            if (fu.text?.toLowerCase().includes(search)) return true;
          }
        }
        return false;
      });
    }
    if (empresaFilter.length > 0) result = result.filter(d => empresaFilter.includes(d.empresa));
    if (clienteFilter.length > 0) result = result.filter(d => clienteFilter.includes(d.cliente));
    if (equipamentoFilter.length > 0) result = result.filter(d => equipamentoFilter.includes(d.equipamento));
    if (criticidadeFilter.length > 0) result = result.filter(d => criticidadeFilter.includes(d.criticidade));
    if (statusFilter.length > 0) result = result.filter(d => {
      for (const s of statusFilter) {
        if (s === 'em_aberto' && d.status !== 'vendido') return true;
        if (s === 'sem_po' && (d.status === 'sem_om' || d.status === 'com_om')) return true;
        if (d.status === s) return true;
      }
      return false;
    });
    if (periodFilter.length > 0) {
      const now = new Date();
      result = result.filter(d => {
        if (!d.dataAbertura) return false;
        for (const p of periodFilter) {
          const filterDate = new Date();
          switch (p) {
            case '7d': filterDate.setDate(now.getDate() - 7); if (d.dataAbertura >= filterDate) return true; break;
            case '30d': filterDate.setDate(now.getDate() - 30); if (d.dataAbertura >= filterDate) return true; break;
            case '90d': filterDate.setDate(now.getDate() - 90); if (d.dataAbertura >= filterDate) return true; break;
            case '2024': if (d.dataAbertura.getFullYear() === 2024) return true; break;
            case '2025': if (d.dataAbertura.getFullYear() === 2025) return true; break;
            case '2026': if (d.dataAbertura.getFullYear() === 2026) return true; break;
          }
        }
        return false;
      });
    }
    if (estoqueFilter.length > 0) {
      result = result.filter(d => {
        for (const e of estoqueFilter) {
          if (e === 'lic' && d.lic > 0) return true;
          if (e === 'betim' && d.betim > 0) return true;
        }
        return false;
      });
    }
    return result;
  }, [data, searchTerm, empresaFilter, clienteFilter, equipamentoFilter, criticidadeFilter, statusFilter, periodFilter, estoqueFilter]);

  // Opportunities Tab filtered data
  const oppFilteredData = useMemo(() => {
    let result = data;
    if (oppSearchTerm) {
      const search = oppSearchTerm.toLowerCase();
      result = result.filter(d => {
        if (d.pn?.toLowerCase().includes(search)) return true;
        if (d.partname?.toLowerCase().includes(search)) return true;
        if (d.cliente?.toLowerCase().includes(search)) return true;
        if (d.descricao?.toLowerCase().includes(search)) return true;
        if (d.extraFields) {
          for (const v of Object.values(d.extraFields)) {
            if (v != null && String(v).toLowerCase().includes(search)) return true;
          }
        }
        // Search in follow-up texts
        if (d.followUps && d.followUps.length > 0) {
          for (const fu of d.followUps) {
            if (fu.text?.toLowerCase().includes(search)) return true;
          }
        }
        return false;
      });
    }
    if (oppOrigemFilter.length > 0) result = result.filter(d => oppOrigemFilter.includes(d.origemAba));
    // Origem filter is always required - if somehow empty, show nothing
    if (oppOrigemFilter.length === 0) return [];
    if (oppMonthFilter.length > 0) result = result.filter(d => d.dataAbertura && oppMonthFilter.includes(String(d.dataAbertura.getMonth() + 1)));
    if (oppYearFilter.length > 0) result = result.filter(d => d.dataAbertura && oppYearFilter.includes(String(d.dataAbertura.getFullYear())));
    if (oppClienteFilter.length > 0) result = result.filter(d => oppClienteFilter.includes(d.cliente));
    if (oppStatusFilter.length > 0) result = result.filter(d => {
      for (const s of oppStatusFilter) {
        if (s === 'em_aberto' && d.status !== 'vendido') return true;
        if (s === 'sem_po' && (d.status === 'sem_om' || d.status === 'com_om')) return true;
        if (d.status === s) return true;
      }
      return false;
    });
    if (oppCriticidadeFilter.length > 0) result = result.filter(d => oppCriticidadeFilter.includes(d.criticidade));
    if (oppDiasFilter.length > 0) {
      result = result.filter(d => {
        for (const f of oppDiasFilter) {
          if (f === '<30' && d.diasEmAberto < 30) return true;
          if (f === '30-60' && d.diasEmAberto >= 30 && d.diasEmAberto <= 60) return true;
          if (f === '>60' && d.diasEmAberto > 60) return true;
          if (f === '>90' && d.diasEmAberto > 90) return true;
        }
        return false;
      });
    }
    if (oppAnaliseFilter.length > 0) {
      result = result.filter(d => {
        for (const f of oppAnaliseFilter) {
          if (f === 'completos' && d.quantidadeFaturada > 0 && d.quantidadeFaturada >= d.qty) return true;
          if (f === 'incompletos' && (d.quantidadeFaturada === 0 || d.quantidadeFaturada < d.qty)) return true;
          if (f === 'com_followup' && (d.followUpComercial || d.followUpLocal || (d.followUps && d.followUps.length > 0))) return true;
          if (f === 'sem_followup' && !d.followUpComercial && !d.followUpLocal && (!d.followUps || d.followUps.length === 0)) return true;
        }
        return false;
      });
    }
    if (oppPrazoFilter.length > 0) {
      const now = new Date();
      const cm = now.getMonth();
      const cy = now.getFullYear();
      result = result.filter(d => {
        for (const f of oppPrazoFilter) {
          if (f === 'atrasados' && d.dataEntregaSolicitada && d.dataEntregaSolicitada < now && d.status !== 'vendido') return true;
          if (f === 'este_mes' && d.dataEntregaSolicitada && d.dataEntregaSolicitada.getMonth() === cm && d.dataEntregaSolicitada.getFullYear() === cy) return true;
          if (f === 'futuro' && d.dataEntregaSolicitada && d.dataEntregaSolicitada > now) return true;
        }
        return false;
      });
    }
    return result;
  }, [data, oppSearchTerm, oppMonthFilter, oppYearFilter, oppClienteFilter, oppStatusFilter, oppCriticidadeFilter, oppDiasFilter, oppAnaliseFilter, oppPrazoFilter, oppOrigemFilter]);

  // Current columns based on selected origin
  const currentOriginColumns = useMemo(() => {
    const origin = oppOrigemFilter.length > 0 ? oppOrigemFilter[0] : SHEET_NAMES[0];
    return COLUMNS_BY_ORIGIN[origin] || [];
  }, [oppOrigemFilter]);

  // All available columns = predefined + dynamic Excel columns
  const allAvailableColumns = useMemo(() => {
    const origin = oppOrigemFilter.length > 0 ? oppOrigemFilter[0] : SHEET_NAMES[0];
    const predefined = COLUMNS_BY_ORIGIN[origin] || [];
    const dynamic = excelHeadersByOrigin[origin] || [];
    const predefinedKeys = new Set(predefined.map(c => c.key));
    const extraDynamic = dynamic.filter(c => !predefinedKeys.has(c.key));
    return [...predefined, ...extraDynamic];
  }, [oppOrigemFilter, excelHeadersByOrigin]);

  // When origin changes, reset visible columns to origin defaults (only if user hasn't customized)
  useEffect(() => {
    const origin = oppOrigemFilter.length > 0 ? oppOrigemFilter[0] : SHEET_NAMES[0];
    const savedConfig = localStorage.getItem('dashboard_oportunidades_columns');
    if (savedConfig) {
      const parsed = JSON.parse(savedConfig) as { origin?: string; columns?: string[] } | string[];
      // Check if saved config has origin info and matches current
      if (Array.isArray(parsed)) {
        // Old format without origin - reset to defaults for current origin
        const defaults = DEFAULT_COLUMNS_BY_ORIGIN[origin] || [];
        setVisibleColumns(defaults);
      } else if (parsed.origin === origin && parsed.columns) {
        setVisibleColumns(parsed.columns);
      } else {
        const defaults = DEFAULT_COLUMNS_BY_ORIGIN[origin] || [];
        setVisibleColumns(defaults);
      }
    } else {
      const defaults = DEFAULT_COLUMNS_BY_ORIGIN[origin] || [];
      setVisibleColumns(defaults);
    }
  }, [oppOrigemFilter]);


  // KPIs
  const kpis = useMemo(() => {
    const totalLinhas = filteredData.length;
    const totalQty = filteredData.reduce((sum, d) => sum + d.qty, 0);
    const totalPedidos = new Set(filteredData.filter(d => d.pedidoCompra).map(d => d.pedidoCompra)).size;
    const totalOMs = new Set(filteredData.filter(d => d.ordemManutencao).map(d => d.ordemManutencao)).size;
    return { totalLinhas, totalQty, totalPedidos, totalOMs };
  }, [filteredData]);

  // Opportunities KPIs
  const oppKpis = useMemo(() => {
    const totalLinhas = oppFilteredData.length;
    const totalQty = oppFilteredData.reduce((sum, d) => sum + d.qty, 0);
    const totalPedidos = new Set(oppFilteredData.filter(d => d.pedidoCompra).map(d => d.pedidoCompra)).size;
    const totalOMs = new Set(oppFilteredData.filter(d => d.ordemManutencao).map(d => d.ordemManutencao)).size;
    const linhasFiltradas = oppFilteredData.length;
    const totalEmAberto = oppFilteredData.filter(d => d.status !== 'vendido' && d.status !== 'faturado_parcial').length;
    const totalVendido = oppFilteredData.reduce((sum, d) => sum + d.quantidadeFaturada, 0);
    const totalNF = new Set(oppFilteredData.filter(d => d.notaFiscal).map(d => d.notaFiscal)).size;
    const faturadoParcial = oppFilteredData.filter(d => d.status === 'faturado_parcial').length;
    return { totalLinhas, totalQty, totalPedidos, totalOMs, linhasFiltradas, totalEmAberto, totalVendido, totalNF, faturadoParcial };
  }, [oppFilteredData]);

  // Charts data
  const clientChartData = useMemo(() => {
    const clientData: Record<string, { qty: number; vendido: number }> = {};
    filteredData.forEach(d => {
      if (d.cliente) {
        if (!clientData[d.cliente]) clientData[d.cliente] = { qty: 0, vendido: 0 };
        clientData[d.cliente].qty += d.qty;
        if (d.status === 'vendido') clientData[d.cliente].vendido += d.qty;
      }
    });
    return Object.entries(clientData)
      .sort((a, b) => b[1].qty - a[1].qty)
      .slice(0, 10)
      .map(([name, d]) => ({ name, Quantidade: d.qty, Vendido: d.vendido }));
  }, [filteredData]);

  const equipmentChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => { if (d.equipamento) counts[d.equipamento] = (counts[d.equipamento] || 0) + d.qty; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, value]) => ({ name, value }));
  }, [filteredData]);

  const criticityChartData = useMemo(() => {
    const counts: Record<string, number> = { 'Baixa': 0, 'Média': 0, 'Alta': 0 };
    filteredData.forEach(d => {
      if (d.criticidade === 'Alta') counts['Alta']++;
      else if (d.criticidade === 'Média') counts['Média']++;
      else counts['Baixa']++;
    });
    return [
      { name: 'Baixa', value: counts['Baixa'], color: CRITICITY_COLORS['Baixa'] },
      { name: 'Média', value: counts['Média'], color: CRITICITY_COLORS['Média'] },
      { name: 'Alta', value: counts['Alta'], color: CRITICITY_COLORS['Alta'] },
    ].filter(d => d.value > 0);
  }, [filteredData]);

  const statusChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredData.forEach(d => { counts[d.status] = (counts[d.status] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name: STATUS_CONFIG[name]?.label || name, value }));
  }, [filteredData]);

  const monthlyChartData = useMemo(() => {
    const monthCounts: Record<string, number> = {};
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    filteredData.forEach(d => {
      if (d.dataAbertura) {
        if (effectiveChartYear && d.dataAbertura.getFullYear() !== parseInt(effectiveChartYear)) return;
        const key = `${monthNames[d.dataAbertura.getMonth()]}/${d.dataAbertura.getFullYear()}`;
        monthCounts[key] = (monthCounts[key] || 0) + d.qty;
      }
    });
    return Object.entries(monthCounts)
      .sort((a, b) => {
        const [aM, aY] = a[0].split('/');
        const [bM, bY] = b[0].split('/');
        return (parseInt(aY) * 12 + monthNames.indexOf(aM)) - (parseInt(bY) * 12 + monthNames.indexOf(bM));
      })
      .map(([name, value]) => ({ name, value }));
  }, [filteredData, effectiveChartYear]);

  const origemChartData = useMemo(() => {
    const counts: Record<string, number> = {};
    data.forEach(d => {
      if (d.origemAba) { const label = d.origemAba.replace('PAS SVS ', ''); counts[label] = (counts[label] || 0) + 1; }
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [data]);

  // Ranking data - only by equipamento (column D)
  const rankingData = useMemo(() => {
    const items: Record<string, { inspecao: number; venda: number }> = {};
    filteredData.forEach(d => {
      if (!d.equipamento) return;
      const name = d.equipamento;
      if (!items[name]) items[name] = { inspecao: 0, venda: 0 };
      items[name].inspecao += d.qty;
      items[name].venda += d.quantidadeFaturada;
    });
    return Object.entries(items)
      .sort((a, b) => b[1][rankingType] - a[1][rankingType])
      .map(([name, counts], i) => ({ position: i + 1, name, inspecao: counts.inspecao, venda: counts.venda }));
  }, [filteredData, rankingType]);

  // File handling
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setShowPasswordModal(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImportConfirmed = async () => {
    if (!pendingFile) return;
    setIsLoading(true);
    try {
      const fileData = await pendingFile.arrayBuffer();
      const workbook = XLSX.read(fileData);
      const allParsedData: OpportunityRecord[] = [];
      let globalId = 1;
      const allDynamicHeaders: Record<string, { key: string; label: string }[]> = {};

      for (const sheetName of SHEET_NAMES) {
        const actualSheetName = workbook.SheetNames.find(n => n.toLowerCase() === sheetName.toLowerCase());
        if (!actualSheetName) { console.warn(`Aba "${sheetName}" não encontrada`); continue; }
        const worksheet = workbook.Sheets[actualSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][];
        if (jsonData.length < 2) continue;
        const headers = jsonData[0] as string[];
        const columnIndices: Record<string, number> = {};
        const dynamicHeaders: { key: string; label: string }[] = [];
        const headerKeyMap: Record<string, string> = {}; // original header -> final key (mapped or raw)
        headers.forEach((header, index) => {
          const headerStr = header?.toString().trim();
          if (!headerStr) return;
          const mappedKey = COLUMN_MAP[headerStr];
          if (mappedKey) {
            columnIndices[mappedKey] = index;
            headerKeyMap[headerStr] = mappedKey;
          } else {
            // Dynamic column - use original header as key
            const safeKey = headerStr;
            columnIndices[safeKey] = index;
            headerKeyMap[headerStr] = safeKey;
            dynamicHeaders.push({ key: safeKey, label: headerStr });
          }
        });

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[];
          if (!row || row.length === 0) continue;
          const getValue = (key: string): unknown => { const idx = columnIndices[key]; return idx !== undefined ? row[idx] : undefined; };
          const empresa = String(getValue('empresa') || '').trim();
          const cliente = String(getValue('cliente') || '').trim();
          const qty = parseNumber(getValue('qty'));
          const lic = parseNumber(getValue('lic'));
          const betim = parseNumber(getValue('betim'));
          const criticidade = parseCriticidade(String(getValue('criticidade') || 'Baixa'));
          const dataAbertura = parseDate(getValue('dataAbertura'));
          const dataVenda = parseDate(getValue('dataVenda'));
          const notaFiscal = String(getValue('notaFiscal') || getValue('numeroNF') || '').trim();
          const pedidoCompra = String(getValue('pedidoCompra') || '').trim();
          const previsaoChegada = parseDate(getValue('previsaoChegada'));
          const ordemManutencao = String(getValue('ordemManutencao') || '').trim();
          const quantidadePedida = parseNumber(getValue('quantidadePedida'));
          const quantidadeFaturada = parseNumber(getValue('quantidadeFaturada'));
          const status = determineStatus(notaFiscal, dataVenda, pedidoCompra, ordemManutencao, quantidadeFaturada, quantidadePedida, qty);
          const diasEmAberto = dataAbertura ? Math.floor((Date.now() - dataAbertura.getTime()) / (1000 * 60 * 60 * 24)) : 0;
          const diasParaEntrega = previsaoChegada ? Math.floor((previsaoChegada.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;

          // Collect extra fields (unmapped columns)
          const extraFields: Record<string, string | number | Date | null> = {};
          for (const [headerStr, colKey] of Object.entries(headerKeyMap)) {
            const mappedKey = COLUMN_MAP[headerStr];
            if (!mappedKey) {
              const idx = columnIndices[colKey];
              if (idx !== undefined && row[idx] !== undefined) {
                const val = row[idx];
                if (val instanceof Date) {
                  extraFields[colKey] = val;
                } else if (typeof val === 'number') {
                  extraFields[colKey] = val;
                } else {
                  extraFields[colKey] = String(val ?? '').trim() || null;
                }
              }
            }
          }

          const record: OpportunityRecord = {
            id: globalId++, origemAba: sheetName, empresa, cliente,
            descricao: String(getValue('descricao') || '').trim(),
            equipamento: String(getValue('equipamento') || '').trim(),
            dataAbertura, mes: String(getValue('mes') || '').trim(),
            pn: String(getValue('pn') || '').trim(),
            partname: String(getValue('partname') || '').trim(),
            qty, criticidade, betim, lic,
            emEstoque: String(getValue('emEstoque') || '').trim(),
            importacao: parseNumber(getValue('importacao')),
            dataTroca: parseDate(getValue('dataTroca')),
            dataAberturaOM: parseDate(getValue('dataAberturaOM')),
            ordemManutencao, pedidoCompra,
            requisicaoCompra: String(getValue('requisicaoCompra') || '').trim(),
            previsaoChegada, notaFiscal, dataVenda,
            followUpComercial: String(getValue('followUpComercial') || '').trim(),
            followUpLocal: '', dataFollowUp: null,
            vinculoPasSvs: String(getValue('vinculoPasSvs') || '').trim(),
            numeroPedido: String(getValue('numeroPedido') || '').trim(),
            dataRecebimentoPedido: parseDate(getValue('dataRecebimentoPedido')),
            tipoPedido: String(getValue('tipoPedido') || '').trim(),
            dataEntregaSolicitada: parseDate(getValue('dataEntregaSolicitada')),
            partNumber: String(getValue('partNumber') || '').trim(),
            replace: String(getValue('replace') || '').trim(),
            descricao1: String(getValue('descricao1') || '').trim(),
            quantidadePedida,
            disponibilidade: String(getValue('disponibilidade') || '').trim(),
            quantidadeFaturada,
            numeroCigam: String(getValue('numeroCigam') || '').trim(),
            numeroProcessoImportacao: String(getValue('numeroProcessoImportacao') || '').trim(),
            numeroNF: String(getValue('numeroNF') || '').trim(),
            dataEmissaoNF: parseDate(getValue('dataEmissaoNF')),
            observacao: String(getValue('observacao') || '').trim(),
            cliente1: String(getValue('cliente1') || '').trim(),
            quantidadeEmEstoque: parseNumber(getValue('quantidadeEmEstoque')),
            dataDisponibilidade: parseDate(getValue('dataDisponibilidade')),
            quantidadeAFaturar: parseNumber(getValue('quantidadeAFaturar')),
            status, diasEmAberto, diasParaEntrega,
            estoqueDisponivel: lic + betim,
            extraFields: Object.keys(extraFields).length > 0 ? extraFields : undefined,
          };
          if (empresa || cliente || record.pn) allParsedData.push(record);
        }
        allDynamicHeaders[sheetName] = dynamicHeaders;
      }
      allParsedData.sort((a, b) => (b.dataAbertura?.getTime() || 0) - (a.dataAbertura?.getTime() || 0));
      setExcelHeadersByOrigin(allDynamicHeaders);
      setData(allParsedData);
      setPendingFile(null);
      alert(`Importação concluída! ${allParsedData.length} registros carregados de ${SHEET_NAMES.filter(s => workbook.SheetNames.some(n => n.toLowerCase() === s.toLowerCase())).length} abas.`);
    } catch (error) {
      console.error('Erro ao importar:', error);
      alert('Erro ao importar arquivo! Verifique o formato.');
    } finally { setIsLoading(false); }
  };

  const exportToExcel = (tipo: 'completo' | 'servicos') => {
    if (data.length === 0) return;
    const wb = XLSX.utils.book_new();
    const dataByOrigin: Record<string, OpportunityRecord[]> = {};
    data.forEach(d => { if (!dataByOrigin[d.origemAba]) dataByOrigin[d.origemAba] = []; dataByOrigin[d.origemAba].push(d); });

    SHEET_NAMES.forEach(sheetName => {
      const sheetData = dataByOrigin[sheetName] || [];
      let exportData: Record<string, unknown>[];
      if (tipo === 'servicos') {
        exportData = sheetData.map(d => {
          const followUps = d.followUps || [];
          const latestFollowUp = followUps.length > 0 ? followUps[followUps.length - 1] : null;
          const latestDataBaseFim = latestFollowUp?.dataBaseFim
            ? new Date(latestFollowUp.dataBaseFim).toLocaleDateString('pt-BR')
            : (d.extraFields?.['Data-base do fim'] instanceof Date ? formatDateBR(d.extraFields['Data-base do fim'] as Date) : String(d.extraFields?.['Data-base do fim'] || ''));
          const allFollowUpText = followUps.map(fu => {
            const dt = new Date(fu.date).toLocaleString('pt-BR');
            const dbf = fu.dataBaseFim ? ` | Data-base fim: ${new Date(fu.dataBaseFim).toLocaleDateString('pt-BR')}` : '';
            return `[${dt}]${dbf}: ${fu.text}`;
          }).join('\n');
          return {
            'Empresa': d.empresa, 'Cliente': d.cliente, 'DESCRIÇÃO': d.descricao,
            'ID REPORT': d.extraFields?.['ID REPORT'] || '',
            'EQUIPAMENTO': d.equipamento, 'DATA ABERTURA': formatDateBR(d.dataAbertura),
            'Mês': d.mes, 'PN': d.pn, 'Partname': d.partname, 'QTY': d.qty,
            'CRITICIDADE': d.criticidade, 'EM ESTOQUE': d.emEstoque,
            'Data de troca': formatDateBR(d.dataTroca),
            'Data Abertura OM': formatDateBR(d.dataAberturaOM),
            'ORDEM DE MANUTENÇÃO': d.ordemManutencao, 'PEDIDO DE COMPRA': d.pedidoCompra,
            'REQUISIÇÃO DE COMPRA': d.requisicaoCompra,
            'PREVISÃO DE CHEGADA': formatDateBR(d.previsaoChegada),
            'NOTA FISCAL': d.notaFiscal, 'DAT.Venda': formatDateBR(d.dataVenda),
            'Follow Up/comercial': allFollowUpText || d.followUpComercial,
            'Status': STATUS_CONFIG[d.status]?.label || d.status,
            'Data-base do fim': latestDataBaseFim,
            'Situação no Pedido (nossa carteira)': d.extraFields?.['Situação no Pedido (nossa carteira)'] || d.extraFields?.['Situacao no Pedido (nossa carteira)'] || d.disponibilidade || '',
          };
        });
      } else {
        exportData = sheetData.map(d => {
          const followUps = d.followUps || [];
          const allFollowUpText = followUps.map(fu => {
            const dt = new Date(fu.date).toLocaleString('pt-BR');
            const dbf = fu.dataBaseFim ? ` | Data-base fim: ${new Date(fu.dataBaseFim).toLocaleDateString('pt-BR')}` : '';
            return `[${dt}]${dbf}: ${fu.text}`;
          }).join('\n');
          return {
            'Empresa': d.empresa, 'Cliente': d.cliente, 'DESCRIÇÃO': d.descricao,
            'EQUIPAMENTO': d.equipamento, 'DATA ABERTURA': formatDateBR(d.dataAbertura),
            'Mês': d.mes, 'PN': d.pn, 'Partname': d.partname, 'QTY': d.qty,
            'Quantidade Inspeção': d.qty, 'Quantidade pedida': d.quantidadePedida,
            'CRITICIDADE': d.criticidade, 'Betim': d.betim, 'LIC': d.lic,
            'EM ESTOQUE': d.emEstoque, 'Importação': d.importacao,
            'Data de troca': formatDateBR(d.dataTroca),
            'Data Abertura OM': formatDateBR(d.dataAberturaOM),
            'ORDEM DE MANUTENÇÃO': d.ordemManutencao, 'PEDIDO DE COMPRA': d.pedidoCompra,
            'REQUISIÇÃO DE COMPRA': d.requisicaoCompra,
            'PREVISÃO DE CHEGADA': formatDateBR(d.previsaoChegada),
            'NOTA FISCAL': d.notaFiscal, 'DAT.Venda': formatDateBR(d.dataVenda),
            'Follow Up/comercial': d.followUpComercial,
            'Follow Up Local': allFollowUpText || d.followUpLocal,
            'Data Follow Up': formatDateBR(d.dataFollowUp),
            'VÍNCULO PAS SVS': d.vinculoPasSvs, 'Número do pedido': d.numeroPedido,
            'Data de recebimento do pedido': formatDateBR(d.dataRecebimentoPedido),
            'Tipo do pedido': d.tipoPedido,
            'Data de entrega solicitada': formatDateBR(d.dataEntregaSolicitada),
            'Part number': d.partNumber, 'Replace': d.replace, 'Descrição.1': d.descricao1,
            'Disponibilidade': d.disponibilidade, 'Quantidade faturada': d.quantidadeFaturada,
            'Número do CIGAM': d.numeroCigam,
            'Número do processo importação': d.numeroProcessoImportacao,
            'Número da NF': d.numeroNF, 'Data de emissão da NF': formatDateBR(d.dataEmissaoNF),
            'Observação': d.observacao,
            ...(d.extraFields || {}),
          };
        });
      }
      const ws = XLSX.utils.json_to_sheet(exportData);
      const exportSheetName = tipo === 'servicos' ? (SHEET_DISPLAY_NAMES[sheetName] || sheetName) : sheetName;
      XLSX.utils.book_append_sheet(wb, ws, exportSheetName);
    });
    const suffix = tipo === 'servicos' ? '_servicos' : '_completo';
    XLSX.writeFile(wb, `oportunidades_export${suffix}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportToJSON = () => {
    if (data.length === 0) { alert('Nenhum dado para exportar!'); return; }
    const exportData = {
      exportDate: new Date().toISOString(),
      totalRecords: data.length,
      data: data.map(d => ({
        ...d,
        followUps: d.followUps || [],
        dataAbertura: d.dataAbertura?.toISOString() || null,
        dataTroca: d.dataTroca?.toISOString() || null,
        dataAberturaOM: d.dataAberturaOM?.toISOString() || null,
        previsaoChegada: d.previsaoChegada?.toISOString() || null,
        dataVenda: d.dataVenda?.toISOString() || null,
        dataFollowUp: d.dataFollowUp?.toISOString() || null,
        dataRecebimentoPedido: d.dataRecebimentoPedido?.toISOString() || null,
        dataEntregaSolicitada: d.dataEntregaSolicitada?.toISOString() || null,
        dataEmissaoNF: d.dataEmissaoNF?.toISOString() || null,
      })),
      excelHeadersByOrigin,
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_oportunidades_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleJsonFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setPendingJsonFile(file);
    setShowJsonImportModal(true);
    if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
  };

  const handleJsonImportConfirmed = async () => {
    if (!pendingJsonFile) return;
    setIsLoading(true);
    try {
      const text = await pendingJsonFile.text();
      const jsonData = JSON.parse(text);
      if (!jsonData.data || !Array.isArray(jsonData.data)) throw new Error('Formato inválido');
      const parsedData: OpportunityRecord[] = jsonData.data.map((d: Record<string, unknown>, index: number) => ({
        id: index + 1,
        origemAba: String(d.origemAba || ''), empresa: String(d.empresa || ''),
        cliente: String(d.cliente || ''), descricao: String(d.descricao || ''),
        equipamento: String(d.equipamento || ''),
        dataAbertura: d.dataAbertura ? new Date(d.dataAbertura as string) : null,
        mes: String(d.mes || ''), pn: String(d.pn || ''),
        partname: String(d.partname || ''), qty: Number(d.qty) || 0,
        criticidade: String(d.criticidade || 'Baixa'),
        betim: Number(d.betim) || 0, lic: Number(d.lic) || 0,
        emEstoque: String(d.emEstoque || ''), importacao: Number(d.importacao) || 0,
        dataTroca: d.dataTroca ? new Date(d.dataTroca as string) : null,
        dataAberturaOM: d.dataAberturaOM ? new Date(d.dataAberturaOM as string) : null,
        ordemManutencao: String(d.ordemManutencao || ''),
        pedidoCompra: String(d.pedidoCompra || ''),
        requisicaoCompra: String(d.requisicaoCompra || ''),
        previsaoChegada: d.previsaoChegada ? new Date(d.previsaoChegada as string) : null,
        notaFiscal: String(d.notaFiscal || ''),
        dataVenda: d.dataVenda ? new Date(d.dataVenda as string) : null,
        followUpComercial: String(d.followUpComercial || ''),
        followUpLocal: String(d.followUpLocal || ''),
        dataFollowUp: d.dataFollowUp ? new Date(d.dataFollowUp as string) : null,
        vinculoPasSvs: String(d.vinculoPasSvs || ''),
        numeroPedido: String(d.numeroPedido || ''),
        dataRecebimentoPedido: d.dataRecebimentoPedido ? new Date(d.dataRecebimentoPedido as string) : null,
        tipoPedido: String(d.tipoPedido || ''),
        dataEntregaSolicitada: d.dataEntregaSolicitada ? new Date(d.dataEntregaSolicitada as string) : null,
        partNumber: String(d.partNumber || ''), replace: String(d.replace || ''),
        descricao1: String(d.descricao1 || ''),
        quantidadePedida: Number(d.quantidadePedida) || 0,
        disponibilidade: String(d.disponibilidade || ''),
        quantidadeFaturada: Number(d.quantidadeFaturada) || 0,
        numeroCigam: String(d.numeroCigam || ''),
        numeroProcessoImportacao: String(d.numeroProcessoImportacao || ''),
        numeroNF: String(d.numeroNF || ''),
        dataEmissaoNF: d.dataEmissaoNF ? new Date(d.dataEmissaoNF as string) : null,
        observacao: String(d.observacao || ''),
        cliente1: String(d.cliente1 || ''),
        quantidadeEmEstoque: Number(d.quantidadeEmEstoque) || 0,
        dataDisponibilidade: d.dataDisponibilidade ? new Date(d.dataDisponibilidade as string) : null,
        quantidadeAFaturar: Number(d.quantidadeAFaturar) || 0,
        status: (d.status as OpportunityRecord['status']) || 'sem_om',
        diasEmAberto: Number(d.diasEmAberto) || 0,
        diasParaEntrega: d.diasParaEntrega ? Number(d.diasParaEntrega) : null,
        estoqueDisponivel: Number(d.estoqueDisponivel) || 0,
        extraFields: d.extraFields ? (() => {
          const ef: Record<string, string | number | Date | null> = {};
          for (const [k, v] of Object.entries(d.extraFields as Record<string, unknown>)) {
            if (v instanceof Date || (typeof v === 'string' && v.match(/^\d{4}-\d{2}-\d{2}T/))) {
              ef[k] = new Date(v as string);
            } else if (typeof v === 'number') {
              ef[k] = v;
            } else {
              ef[k] = v != null ? String(v) : null;
            }
          }
          return ef;
        })() : undefined,
        followUps: Array.isArray(d.followUps) ? d.followUps.map((fu: Record<string, unknown>) => ({
          text: String(fu.text || ''),
          date: String(fu.date || new Date().toISOString()),
          dataBaseFim: fu.dataBaseFim ? String(fu.dataBaseFim) : undefined,
        })) : [],
      }));
      setData(parsedData);
      if (jsonData.excelHeadersByOrigin) {
        setExcelHeadersByOrigin(jsonData.excelHeadersByOrigin);
      }
      setShowJsonImportModal(false);
      setPendingJsonFile(null);
      alert(`Importação JSON concluída! ${parsedData.length} registros carregados.`);
    } catch (error) {
      console.error('Erro ao importar JSON:', error);
      alert('Erro ao importar arquivo JSON! Verifique o formato.');
    } finally { setIsLoading(false); }
  };

  const clearFilters = () => {
    setEmpresaFilter([]); setClienteFilter([]); setEquipamentoFilter([]);
    setCriticidadeFilter([]); setStatusFilter([]); setPeriodFilter([]);
    setSearchTerm(''); setEstoqueFilter([]);
  };
  const clearOppFilters = () => {
    setOppMonthFilter([]); setOppYearFilter([]); setOppClienteFilter([]);
    setOppStatusFilter([]); setOppCriticidadeFilter([]); setOppDiasFilter([]);
    setOppAnaliseFilter([]); setOppPrazoFilter([]); setOppSearchTerm('');
  };
  const openFollowUpModal = (record: OpportunityRecord) => {
    setFollowUpRecord(record);
    setFollowUpText('');
    setFollowUpDataBaseFim('');
    setApplyToAllPedido(false);
    setApplyToAllOM(false);
    setDeleteMode(false);
    setDeleteIndex(null);
    setShowFollowUpModal(true);
  };
  const saveFollowUp = () => {
    if (!followUpRecord) return;

    // Delete a specific follow-up entry
    if (deleteMode && deleteIndex !== null) {
      setData(prevData => {
        return prevData.map(d => {
          if (d.id === followUpRecord.id) {
            const newFollowUps = [...(d.followUps || [])];
            newFollowUps.splice(deleteIndex, 1);
            return { ...d, followUps: newFollowUps };
          }
          return d;
        });
      });
      setShowFollowUpModal(false);
      setDeleteMode(false);
      setDeleteIndex(null);
      return;
    }

    // Delete all follow-ups for this record (or matching PO/OM)
    if (deleteMode && deleteIndex === null) {
      setData(prevData => {
        const applyToPedido = applyToAllPedido && followUpRecord.pedidoCompra;
        const applyToOM = applyToAllOM && followUpRecord.ordemManutencao;
        return prevData.map(d => {
          if ((applyToPedido && d.pedidoCompra === followUpRecord.pedidoCompra) ||
              (applyToOM && d.ordemManutencao === followUpRecord.ordemManutencao) ||
              (!applyToPedido && !applyToOM && d.id === followUpRecord.id)) {
            return { ...d, followUps: [], followUpLocal: '', dataFollowUp: null };
          }
          return d;
        });
      });
      setShowFollowUpModal(false);
      setDeleteMode(false);
      setDeleteIndex(null);
      return;
    }

    // Add new follow-up entry
    if (followUpText.trim()) {
      const newEntry: FollowUpEntry = {
        text: followUpText.trim(),
        date: new Date().toISOString(),
        dataBaseFim: followUpDataBaseFim || undefined,
      };

      const applyToPedido = applyToAllPedido && followUpRecord.pedidoCompra;
      const applyToOM = applyToAllOM && followUpRecord.ordemManutencao;

      setData(prevData => {
        return prevData.map(d => {
          if ((applyToPedido && d.pedidoCompra === followUpRecord.pedidoCompra) ||
              (applyToOM && d.ordemManutencao === followUpRecord.ordemManutencao) ||
              (!applyToPedido && !applyToOM && d.id === followUpRecord.id)) {
            const existing = d.followUps || [];
            const updatedFollowUps = [...existing, newEntry];
            return {
              ...d,
              followUps: updatedFollowUps,
              followUpLocal: newEntry.text,
              dataFollowUp: new Date(),
            };
          }
          return d;
        });
      });

      setFollowUpText('');
      setFollowUpDataBaseFim('');
    }

    setShowFollowUpModal(false);
    setFollowUpRecord(null);
    setFollowUpText('');
    setFollowUpDataBaseFim('');
    setApplyToAllPedido(false);
    setApplyToAllOM(false);
    setDeleteMode(false);
    setDeleteIndex(null);
  };

  const startDeleteMode = () => {
    setDeleteMode(true);
  };

  // Column configuration handlers
  const handleSaveColumnConfig = () => {
    // Only keep columns that belong to current origin
    const origin = oppOrigemFilter.length > 0 ? oppOrigemFilter[0] : SHEET_NAMES[0];
    const originKeys = allAvailableColumns.map(c => c.key);
    const filtered = tempVisibleColumns.filter(c => originKeys.includes(c));
    setVisibleColumns(filtered);
    localStorage.setItem('dashboard_oportunidades_columns', JSON.stringify({ origin, columns: filtered }));
    setShowColumnConfigModal(false);
  };

  useEffect(() => {
    if (showColumnConfigModal) {
      // Only include columns that belong to current origin
      const origin = oppOrigemFilter.length > 0 ? oppOrigemFilter[0] : SHEET_NAMES[0];
      const originKeys = allAvailableColumns.map(c => c.key);
      setTempVisibleColumns(visibleColumns.filter(c => originKeys.includes(c)));
    }
  }, [showColumnConfigModal, visibleColumns, oppOrigemFilter, allAvailableColumns]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setTempVisibleColumns((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const handleAddColumn = (key: string) => setTempVisibleColumns([...tempVisibleColumns, key]);
  const handleRemoveColumn = (key: string) => setTempVisibleColumns(tempVisibleColumns.filter(c => c !== key));
  const handleSelectAll = () => setTempVisibleColumns(allAvailableColumns.map(c => c.key));
  const handleClearAll = () => setTempVisibleColumns([]);

  // Helper to render table cells
  const renderTableCell = (record: OpportunityRecord, columnKey: string) => {
    switch (columnKey) {
      case 'id':
        return <TableCell className="text-xs text-slate-600">{record.id}</TableCell>;
      case 'origemAba':
        return <TableCell className="text-xs text-slate-600">{SHEET_DISPLAY_NAMES[record.origemAba] || record.origemAba}</TableCell>;
      case 'criticidade':
        return (
          <TableCell className="text-xs">
            <Badge style={{ backgroundColor: CRITICITY_COLORS[record.criticidade] || '#6c757d', color: 'white' }}>
              {record.criticidade}
            </Badge>
          </TableCell>
        );
      case 'estoque':
        return <TableCell className="text-xs"><AnaliseEstoqueBadge record={record} /></TableCell>;
      case 'status':
        return (
          <TableCell className="text-xs">
            <Badge style={{ backgroundColor: STATUS_CONFIG[record.status]?.color || '#6c757d', color: 'white' }}>
              {STATUS_CONFIG[record.status]?.label || record.status}
            </Badge>
          </TableCell>
        );
      case 'followUp': {
        const count = (record.followUps || []).length;
        return (
          <TableCell className="text-xs">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 px-2"
              onClick={() => openFollowUpModal(record)}
              title={count > 0 ? `${count} follow up(s) registrado(s)` : 'Adicionar Follow Up'}
            >
              <History className="h-3.5 w-3.5" style={{ color: count > 0 ? '#FF6600' : '#94a3b8' }} />
              {count > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-[16px] px-1 rounded-full text-[10px] font-bold" style={{ backgroundColor: '#FF6600', color: 'white' }}>
                  {count}
                </span>
              )}
            </Button>
          </TableCell>
        );
      }
      case 'dataAbertura':
      case 'dataTroca':
      case 'dataAberturaOM':
      case 'dataVenda':
      case 'dataEmissaoNF':
      case 'dataEntregaSolicitada':
      case 'dataDisponibilidade':
      case 'dataFollowUp':
      case 'dataRecebimentoPedido':
        return <TableCell className="text-xs text-slate-600">{formatDateBR(record[columnKey as keyof OpportunityRecord] as Date | null)}</TableCell>;
      case 'previsaoChegada':
        if (record.status === 'vendido') {
          return <TableCell className="text-xs text-slate-400">-</TableCell>;
        }
        return <TableCell className="text-xs text-slate-600">{formatDateBR(record.previsaoChegada)}</TableCell>;
      default:
        let value = record[columnKey as keyof OpportunityRecord];
        if (value === undefined || value === null || value === '') {
          // Check extra fields for dynamic columns
          if (record.extraFields && columnKey in record.extraFields) {
            const efVal = record.extraFields[columnKey];
            if (efVal instanceof Date) {
              return <TableCell className="text-xs text-slate-600">{formatDateBR(efVal)}</TableCell>;
            }
            return <TableCell className="text-xs text-slate-600">{String(efVal ?? '-')}</TableCell>;
          }
        }
        return <TableCell className="text-xs text-slate-600">{String(value || '-')}</TableCell>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b-4 border-slate-400 shadow-sm sticky top-0 z-50">
        <div className="w-full px-6 py-3 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-200 flex items-center justify-center shrink-0">
              <Target className="h-6 w-6 text-slate-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-700">Dashboard de Oportunidades</h1>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                {isSyncing && (
                  <><div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div><span>Sincronizando...</span></>
                )}
                {!isSyncing && lastSync && (
                  <>Última sinc: <span className="text-slate-600">{lastSync}</span></>
                )}
                {!isSyncing && !lastSync && (
                  <span>Aguardando dados...</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { jsonFileInputRef.current?.click(); }} disabled={isLoading}>
              <FileJson className="h-4 w-4" />
              Importar JSON
            </Button>
            <input
              ref={jsonFileInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleJsonFileSelect}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1.5" style={{ backgroundColor: '#FF6600', color: 'white' }}>
                  <Upload className="h-4 w-4" />
                  Importar Excel
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Nova Importação
                </DropdownMenuItem>
                <DropdownMenuItem onClick={loadData}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Recarregar do Servidor
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleFileSelect}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportToExcel('completo')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Completo
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportToExcel('servicos')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Exportar Serviços
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToJSON}>
                  <FileJson className="h-4 w-4 mr-2" /> Exportar JSON
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full px-4 py-6 overflow-x-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200">
              <TabsTrigger value="overview" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Visão Geral
              </TabsTrigger>
              <TabsTrigger value="opportunities" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                Oportunidades
              </TabsTrigger>
              <TabsTrigger value="ranking" className="gap-2">
                <TrendingUp className="h-4 w-4" />
                Ranking
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.primary }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Total de Linhas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-700">{kpis.totalLinhas}</div>
                  <p className="text-xs text-slate-400 mt-1">Registros de inspeção</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.success }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Quantidade Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-700">{kpis.totalQty}</div>
                  <p className="text-xs text-slate-400 mt-1">Peças inspecionadas</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.warning }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Pedidos de Compra
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-700">{kpis.totalPedidos}</div>
                  <p className="text-xs text-slate-400 mt-1">Pedidos únicos</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.info }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-slate-500 flex items-center gap-2">
                    <Wrench className="h-4 w-4" />
                    Ordens de Manutenção
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-slate-700">{kpis.totalOMs}</div>
                  <p className="text-xs text-slate-400 mt-1">OMs únicas</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters & Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Filters Panel */}
              <Card className="bg-white/90 backdrop-blur-sm lg:col-span-1">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                      <Filter className="h-5 w-5" />
                      Filtros
                    </CardTitle>
                    <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs text-slate-500">
                      Limpar tudo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Busca</label>
                    <Input
                      placeholder="PN, Descrição, Cliente..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Empresa</label>
                    <FilterDropdown
                      label="Todas"
                      options={empresaOptions}
                      selected={empresaFilter}
                      onChange={setEmpresaFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Cliente</label>
                    <FilterDropdown
                      label="Todos"
                      options={clienteOptions}
                      selected={clienteFilter}
                      onChange={setClienteFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Equipamento</label>
                    <FilterDropdown
                      label="Todos"
                      options={equipamentoOptions}
                      selected={equipamentoFilter}
                      onChange={setEquipamentoFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Criticidade</label>
                    <FilterDropdown
                      label="Todas"
                      options={criticidadeOptions}
                      selected={criticidadeFilter}
                      onChange={setCriticidadeFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <FilterDropdown
                      label="Todos"
                      options={statusOptions}
                      selected={statusFilter}
                      onChange={setStatusFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Período</label>
                    <FilterDropdown
                      label="Todos"
                      options={periodoOptions}
                      selected={periodFilter}
                      onChange={setPeriodFilter}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">Estoque</label>
                    <FilterDropdown
                      label="Todos"
                      options={estoqueOptions}
                      selected={estoqueFilter}
                      onChange={setEstoqueFilter}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Charts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Monthly Chart with Year Filter */}
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg font-semibold text-slate-700">
                        Evolução por Mês
                      </CardTitle>
                      <Select value={chartYearFilter} onValueChange={setChartYearFilter}>
                        <SelectTrigger className="w-32 h-8 text-sm">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map(year => (
                            <SelectItem key={year} value={year}>{year}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} />
                        <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                        <Bar dataKey="value" name="Quantidade" fill="#64748b" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Client Chart */}
                  <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-700">
                        Top 10 Clientes
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={clientChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="Quantidade" fill="#64748b" radius={[0, 4, 4, 0]} />
                          <Bar dataKey="Vendido" fill="#22c55e" radius={[0, 4, 4, 0]} />
                          <Legend />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Equipment Chart */}
                  <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-700">
                        Top 10 Equipamentos
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={equipmentChartData} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis type="number" tick={{ fill: '#64748b', fontSize: 11 }} />
                          <YAxis dataKey="name" type="category" tick={{ fill: '#64748b', fontSize: 11 }} width={80} />
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                          <Bar dataKey="value" fill="#64748b" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Criticity Chart */}
                  <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-700">
                        Distribuição por Criticidade
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={criticityChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            dataKey="value"
                          >
                            {criticityChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Status Chart */}
                  <Card className="bg-white/90 backdrop-blur-sm">
                    <CardHeader>
                      <CardTitle className="text-base font-semibold text-slate-700">
                        Distribuição por Status
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                          <Pie
                            data={statusChartData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={70}
                            dataKey="value"
                          >
                            {statusChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                            itemStyle={{ color: '#fff' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Origem Chart */}
                <Card className="bg-white/90 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold text-slate-700">
                      Distribuição por Origem
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={200}>
                      <PieChart>
                        <Pie
                          data={origemChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={70}
                          dataKey="value"
                        >
                          {origemChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px' }}
                          itemStyle={{ color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Opportunities Tab */}
          <TabsContent value="opportunities" className="space-y-6">
            {/* KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.primary }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">Linhas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{oppKpis.totalLinhas}</div>
                  <p className="text-xs text-slate-400">Total</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.success }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">Em Aberto</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{oppKpis.totalEmAberto}</div>
                  <p className="text-xs text-slate-400">Não vendidos</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.warning }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">QTY</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{oppKpis.totalQty}</div>
                  <p className="text-xs text-slate-400">Total inspeção</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.info }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">Vendido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{oppKpis.totalVendido}</div>
                  <p className="text-xs text-slate-400">Quantidade</p>
                </CardContent>
              </Card>
              <Card className="bg-white/90 backdrop-blur-sm border-l-4" style={{ borderLeftColor: COLORS.danger }}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-medium text-slate-500">NFs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-700">{oppKpis.totalNF}</div>
                  <p className="text-xs text-slate-400">Notas fiscais</p>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtros Avançados
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={clearOppFilters} className="text-xs text-slate-500">
                    Limpar tudo
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Busca</label>
                    <Input
                      placeholder="PN, Descrição, Cliente..."
                      value={oppSearchTerm}
                      onChange={(e) => setOppSearchTerm(e.target.value)}
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Origem</label>
                    <FilterDropdown
                      label="Selecione"
                      options={origemOptions}
                      selected={oppOrigemFilter}
                      onChange={(val) => {
                        setOppOrigemFilter(val);
                      }}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Mês</label>
                    <FilterDropdown
                      label="Todos"
                      options={monthOptions}
                      selected={oppMonthFilter}
                      onChange={setOppMonthFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Ano</label>
                    <FilterDropdown
                      label="Todos"
                      options={yearOptions}
                      selected={oppYearFilter}
                      onChange={setOppYearFilter}
                    />
                  </div>

                  <div className="min-w-[180px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Cliente</label>
                    <FilterDropdown
                      label="Todos"
                      options={clienteOptions}
                      selected={oppClienteFilter}
                      onChange={setOppClienteFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Status</label>
                    <FilterDropdown
                      label="Todos"
                      options={statusOptions}
                      selected={oppStatusFilter}
                      onChange={setOppStatusFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Criticidade</label>
                    <FilterDropdown
                      label="Todas"
                      options={criticidadeOptions}
                      selected={oppCriticidadeFilter}
                      onChange={setOppCriticidadeFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Dias em Aberto</label>
                    <FilterDropdown
                      label="Todos"
                      options={diasOptions}
                      selected={oppDiasFilter}
                      onChange={setOppDiasFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Análise</label>
                    <FilterDropdown
                      label="Todos"
                      options={analiseOptions}
                      selected={oppAnaliseFilter}
                      onChange={setOppAnaliseFilter}
                    />
                  </div>

                  <div className="min-w-[150px] space-y-2">
                    <label className="text-xs font-medium text-slate-600">Prazo</label>
                    <FilterDropdown
                      label="Todos"
                      options={prazoOptions}
                      selected={oppPrazoFilter}
                      onChange={setOppPrazoFilter}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-700">
                    Lista de Oportunidades ({oppFilteredData.length} registros)
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => setShowColumnConfigPassword(true)}
                    title="Configurar colunas"
                  >
                    <Settings className="h-4 w-4 text-slate-600" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto max-h-[600px]">
                  <Table>
                    <TableHeader className="sticky top-0 bg-slate-50 z-10">
                      <TableRow>
                        {visibleColumns.map((colKey) => {
                          const column = allAvailableColumns.find(c => c.key === colKey);
                          return column ? (
                            <TableHead key={colKey} className="text-xs font-semibold text-slate-600 whitespace-nowrap">
                              {column.label}
                            </TableHead>
                          ) : null;
                        })}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oppFilteredData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={visibleColumns.length} className="text-center text-slate-400 py-8">
                            Nenhum registro encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        oppFilteredData.map((record) => (
                          <TableRow key={record.id} className="hover:bg-slate-50/50">
                            {visibleColumns.map((colKey) => renderTableCell(record, colKey))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Ranking Tab */}
          <TabsContent value="ranking" className="space-y-6">
            <Card className="bg-white/90 backdrop-blur-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Ranking de Equipamentos
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-slate-600">Ordenar por:</label>
                    <Select value={rankingType} onValueChange={(v: 'inspecao' | 'venda') => setRankingType(v)}>
                      <SelectTrigger className="w-40 h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="inspecao">Quantidade Inspeção</SelectItem>
                        <SelectItem value="venda">Quantidade Vendida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-xs font-semibold text-slate-600 whitespace-nowrap w-20">Posição</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 whitespace-nowrap">Equipamento</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 whitespace-nowrap text-right">Qtd. Inspeção</TableHead>
                        <TableHead className="text-xs font-semibold text-slate-600 whitespace-nowrap text-right">Qtd. Vendida</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rankingData.map((item) => (
                        <TableRow key={item.name} className="hover:bg-slate-50/50">
                          <TableCell className="text-xs">
                            <div
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                item.position === 1 ? 'bg-amber-400 text-white' :
                                item.position === 2 ? 'bg-slate-400 text-white' :
                                item.position === 3 ? 'bg-amber-600 text-white' :
                                'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {item.position}
                            </div>
                          </TableCell>
                          <TableCell className="text-xs font-medium text-slate-700">{item.name}</TableCell>
                          <TableCell className="text-xs text-slate-600 text-right">{item.inspecao}</TableCell>
                          <TableCell className="text-xs text-slate-600 text-right">{item.venda}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 mt-auto">
        <div className="w-full flex items-center justify-between text-xs text-slate-500">
          <span>© 2025 Planilha de Oportunidade - Dashboard</span>
          <span>{data.length} registros carregados</span>
        </div>
      </footer>

      {/* Password Modal */}
      <PasswordModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        onConfirm={handleImportConfirmed}
        title="Importar Arquivo Excel"
        description="Digite a senha de administrador para importar os dados"
      />

      {/* Follow Up Modal */}
      <Dialog open={showFollowUpModal} onOpenChange={(open) => { if (!open) { setShowFollowUpModal(false); setDeleteMode(false); setDeleteIndex(null); } else { setShowFollowUpModal(true); } }}>
        <DialogContent className="sm:max-w-[600px] bg-white z-[100] flex flex-col max-h-[85vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" style={{ color: '#FF6600' }} />
              Follow Up - Histórico
            </DialogTitle>
            <DialogDescription>
              {followUpRecord && (
                <span className="text-sm">
                  <strong>PN:</strong> {followUpRecord.pn} | <strong>PO:</strong> {followUpRecord.pedidoCompra || 'N/A'} | <strong>OM:</strong> {followUpRecord.ordemManutencao || 'N/A'}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2">
            {/* Follow Up History List */}
            {followUpRecord && (followUpRecord.followUps || []).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Histórico de Follow Ups ({(followUpRecord.followUps || []).length})
                </h4>
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                  {[...(followUpRecord.followUps || [])].reverse().map((fu, revIdx) => {
                    const realIdx = (followUpRecord!.followUps || []).length - 1 - revIdx;
                    const fuDate = new Date(fu.date);
                    return (
                      <div
                        key={realIdx}
                        className={`relative border rounded-lg p-3 text-sm bg-slate-50 ${deleteMode ? 'cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors' : ''}`}
                        onClick={() => {
                          if (deleteMode) {
                            setDeleteIndex(realIdx);
                          }
                        }}
                      >
                        {deleteMode && (
                          <div className="absolute top-2 right-2">
                            {deleteIndex === realIdx ? (
                              <CheckCircle className="h-4 w-4 text-red-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                          <CalendarDays className="h-3 w-3" />
                          {fuDate.toLocaleString('pt-BR')}
                        </div>
                        <p className="text-slate-700 whitespace-pre-wrap pr-6">{fu.text}</p>
                        {fu.dataBaseFim && (
                          <div className="mt-2 flex items-center gap-2 text-xs">
                            <CalendarDays className="h-3 w-3 text-orange-500" />
                            <span className="text-orange-600 font-medium">Data-base do fim: {new Date(fu.dataBaseFim).toLocaleDateString('pt-BR')}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {followUpRecord && (followUpRecord.followUps || []).length === 0 && (
              <div className="text-center py-6 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Nenhum follow up registrado para este item
              </div>
            )}

            {/* Add New Follow Up */}
            {!deleteMode && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-slate-700">Novo Follow Up</h4>
                <Textarea
                  placeholder="Digite as informações de follow up..."
                  value={followUpText}
                  onChange={(e) => setFollowUpText(e.target.value)}
                  rows={3}
                />
                <div className="flex items-center gap-3">
                  <label className="text-sm text-slate-600 whitespace-nowrap">Data-base do fim:</label>
                  <Input
                    type="date"
                    value={followUpDataBaseFim}
                    onChange={(e) => setFollowUpDataBaseFim(e.target.value)}
                    className="h-8 text-sm max-w-[180px]"
                  />
                </div>

                {/* Apply to checkboxes */}
                {followUpRecord && (
                  <div className="space-y-2 pt-1">
                    {followUpRecord.pedidoCompra && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="apply-pedido"
                          checked={applyToAllPedido}
                          onCheckedChange={(checked) => setApplyToAllPedido(checked as boolean)}
                        />
                        <label htmlFor="apply-pedido" className="text-sm text-slate-600">
                          Aplicar a todos os itens do pedido <strong>{followUpRecord.pedidoCompra}</strong>
                        </label>
                      </div>
                    )}
                    {followUpRecord.ordemManutencao && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="apply-om"
                          checked={applyToAllOM}
                          onCheckedChange={(checked) => setApplyToAllOM(checked as boolean)}
                        />
                        <label htmlFor="apply-om" className="text-sm text-slate-600">
                          Aplicar a todos os itens da OM <strong>{followUpRecord.ordemManutencao}</strong>
                        </label>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Delete mode options */}
            {deleteMode && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <h4 className="text-sm font-semibold text-red-600">Modo de Exclusão</h4>
                <p className="text-xs text-slate-500">Clique em um follow up acima para selecioná-lo, ou use as opções abaixo:</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="delete-selected"
                      checked={deleteIndex === null && applyToAllPedido}
                      onCheckedChange={() => { setDeleteIndex(null); setApplyToAllPedido(true); setApplyToAllOM(false); }}
                    />
                    <label htmlFor="delete-selected" className="text-sm text-slate-600">
                      {followUpRecord?.pedidoCompra ? `Apagar todos do pedido ${followUpRecord.pedidoCompra}` : 'Apagar todos os follow ups deste item'}
                    </label>
                  </div>
                  {followUpRecord?.ordemManutencao && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="delete-om"
                        checked={deleteIndex === null && applyToAllOM}
                        onCheckedChange={() => { setDeleteIndex(null); setApplyToAllOM(true); setApplyToAllPedido(false); }}
                      />
                      <label htmlFor="delete-om" className="text-sm text-slate-600">
                        Apagar todos da OM <strong>{followUpRecord.ordemManutencao}</strong>
                      </label>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="delete-all-item"
                      checked={deleteIndex === null && !applyToAllPedido && !applyToAllOM}
                      onCheckedChange={() => { setDeleteIndex(null); setApplyToAllPedido(false); setApplyToAllOM(false); }}
                    />
                    <label htmlFor="delete-all-item" className="text-sm text-slate-600">
                      Apagar todos os follow ups deste item
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => { setShowFollowUpModal(false); setDeleteMode(false); setDeleteIndex(null); }}>
              Cancelar
            </Button>
            {!deleteMode && (followUpRecord?.followUps || []).length > 0 && (
              <Button onClick={() => { setDeleteMode(true); setDeleteIndex(null); }} className="bg-red-500 hover:bg-red-600 text-white">
                <Trash2 className="h-4 w-4 mr-2" />
                Apagar
              </Button>
            )}
            {deleteMode && (
              <Button variant="outline" onClick={() => { setDeleteMode(false); setDeleteIndex(null); }}>
                Voltar ao modo normal
              </Button>
            )}
            {!deleteMode && (
              <Button
                onClick={saveFollowUp}
                disabled={!followUpText.trim()}
                style={{ backgroundColor: followUpText.trim() ? '#FF6600' : undefined, color: followUpText.trim() ? 'white' : undefined }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Follow Up
              </Button>
            )}
            {deleteMode && (
              <Button onClick={saveFollowUp} className="bg-red-500 hover:bg-red-600 text-white">
                <Trash2 className="h-4 w-4 mr-2" />
                Confirmar Exclusão
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* JSON Import Modal */}
      <Dialog open={showJsonImportModal} onOpenChange={setShowJsonImportModal}>
        <DialogContent className="sm:max-w-[400px] bg-white z-[100]">
          <DialogHeader>
            <DialogTitle>Importar JSON</DialogTitle>
            <DialogDescription>
              Confirme a importação do arquivo JSON
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowJsonImportModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleJsonImportConfirmed} style={{ backgroundColor: '#FF6600', color: 'white' }}>
              Importar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Column Config Password Modal */}
      <PasswordModal
        open={showColumnConfigPassword}
        onOpenChange={setShowColumnConfigPassword}
        onConfirm={() => {
          setShowColumnConfigPassword(false);
          setShowColumnConfigModal(true);
        }}
        title="Configurar Colunas"
        description="Digite a senha de administrador para configurar as colunas"
      />

      {/* Column Configuration Modal */}
      <Dialog open={showColumnConfigModal} onOpenChange={setShowColumnConfigModal}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] bg-white z-[100] flex flex-col">
          <DialogHeader>
            <DialogTitle>Configurar Colunas</DialogTitle>
            <DialogDescription>
              Arraste para reordenar. Selecione quantas quiser e clique em Salvar.
              <span className="block mt-1 font-medium text-orange-600">
                Origem: {SHEET_DISPLAY_NAMES[oppOrigemFilter[0]] || oppOrigemFilter[0] || '-'}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-3 border-b">
            <Button variant="outline" size="sm" onClick={handleSelectAll}>Selecionar todas</Button>
            <Button variant="outline" size="sm" onClick={handleClearAll}>Limpar todas</Button>
            <span className="ml-auto text-sm text-slate-500">{tempVisibleColumns.length} de {allAvailableColumns.length} colunas</span>
          </div>
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0 overflow-hidden">
            <div className="flex flex-col min-h-0">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 shrink-0">Colunas Visíveis (arraste para reordenar)</h3>
              {tempVisibleColumns.length === 0 ? (
                <div className="flex-1 p-4 border-2 border-dashed border-slate-200 rounded-md text-center text-sm text-slate-400 flex items-center justify-center">Nenhuma coluna selecionada</div>
              ) : (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={tempVisibleColumns} strategy={verticalListSortingStrategy}>
                    <div className="space-y-1.5 overflow-y-auto pr-1 flex-1" style={{ maxHeight: 'calc(70vh - 200px)' }}>
                      {tempVisibleColumns.map((columnKey) => {
                        const column = allAvailableColumns.find(c => c.key === columnKey);
                        if (!column) return null;
                        return <SortableColumnItem key={columnKey} column={column} onRemove={handleRemoveColumn} />;
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </div>
            <div className="flex flex-col min-h-0">
              <h3 className="text-sm font-semibold text-slate-700 mb-2 shrink-0">Colunas Disponíveis</h3>
              <div className="space-y-1 overflow-y-auto pr-1 flex-1" style={{ maxHeight: 'calc(70vh - 200px)' }}>
                {allAvailableColumns.filter(col => !tempVisibleColumns.includes(col.key)).map((column) => (
                  <div key={column.key} className="flex items-center gap-2 p-1.5 hover:bg-slate-50 rounded-md transition-colors cursor-pointer" onClick={() => handleAddColumn(column.key)}>
                    <div className="h-4 w-4 border border-slate-300 rounded flex items-center justify-center shrink-0">
                      <Plus className="h-3 w-3 text-slate-400" />
                    </div>
                    <span className="text-sm text-slate-600 flex-1">{column.label}</span>
                  </div>
                ))}
                {allAvailableColumns.filter(col => !tempVisibleColumns.includes(col.key)).length === 0 && (
                  <div className="p-4 text-center text-sm text-slate-400">Todas as colunas selecionadas</div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setShowColumnConfigModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveColumnConfig} style={{ backgroundColor: '#FF6600', color: 'white' }}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
