import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronUp, ChevronDown, Download, Zap, Shield } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

// Imported from App.tsx
import {
  LanguageContext,
  cn,
  convertGregorianToBS,
  formatCurrency,
  generateProfessionalPDF,
  saveEncryptedPdf,
  TransactionsContext,
  Transaction
} from '../App';


export const getPLStatement = async (businessId: string, startDate?: string, endDate?: string) => {
  let query = supabase.from('transactions').select(`
    amount,
    type,
    categories (name)
  `).eq('business_id', businessId);

  if (startDate) {
    query = query.gte('date', startDate);
  }
  if (endDate) {
    query = query.lte('date', endDate);
  }

  const { data, error } = await query;
  if (error) {
    console.error('Failed to fetch P&L data:', error);
    return null;
  }

  const plData = {
    revenue: [] as { name: string, val: number }[],
    cogs: [] as { name: string, val: number }[],
    operatingExpenses: [] as { name: string, val: number }[]
  };

  const categoryTotals: Record<string, number> = {};
  const cogsKeywords = ['raw material', 'labor', 'production', 'cogs', 'inventory', 'supplier', 'manufacturing', 'freight', 'direct'];

  data?.forEach((tx: any) => {
    const catName = tx.categories?.name || 'Uncategorized';
    const amount = Number(tx.amount);
    const key = `${tx.type}_${catName}`;
    categoryTotals[key] = (categoryTotals[key] || 0) + amount;
  });

  Object.entries(categoryTotals).forEach(([key, val]) => {
    const [type, ...nameParts] = key.split('_');
    const name = nameParts.join('_');
    
    if (type === 'Inflow') {
      plData.revenue.push({ name, val });
    } else {
      const isCogs = cogsKeywords.some(kw => name.toLowerCase().includes(kw));
      if (isCogs) {
         plData.cogs.push({ name, val: -val });
      } else {
         plData.operatingExpenses.push({ name, val: -val });
      }
    }
  });

  const revTotal = plData.revenue.reduce((acc, i) => acc + i.val, 0);
  const cogsTotal = plData.cogs.reduce((acc, i) => acc + i.val, 0);
  const grossProfit = revTotal + cogsTotal;
  const expTotal = plData.operatingExpenses.reduce((acc, i) => acc + i.val, 0);
  const netProfit = grossProfit + expTotal;

  return {
    plList: [
      {
        category: "Revenue",
        total: formatCurrency(revTotal),
        items: plData.revenue.map(i => ({ ...i, val: formatCurrency(i.val) }))
      },
      {
        category: "COGS",
        total: formatCurrency(cogsTotal),
        items: plData.cogs.map(i => ({ ...i, val: formatCurrency(i.val) }))
      },
      {
        category: "Gross Profit",
        total: formatCurrency(grossProfit),
        isResult: true,
        items: []
      },
      {
        category: "Operating Expenses",
        total: formatCurrency(expTotal),
        items: plData.operatingExpenses.map(i => ({ ...i, val: formatCurrency(i.val) }))
      },
      {
        category: "Net Profit",
        total: formatCurrency(netProfit),
        isResult: true,
        highlight: true,
        items: []
      }
    ],
    rawTotals: {
      revTotal,
      cogsTotal,
      expTotal
    }
  };
};

export function PLSection({ section }: { section: any }) {
  const [isOpen, setIsOpen] = useState(true);
  const hasItems = section.items && section.items.length > 0;

  return (
    <div className={cn(
      "border-b border-white/5",
      section.highlight ? "bg-intelligence/5 border-l-4 border-l-intelligence" : "",
      section.isResult ? "border-brand border-2 my-2 bg-brand/5" : ""
    )}>
      <button
        onClick={() => hasItems && setIsOpen(!isOpen)}
        className={cn(
          "w-full flex items-center justify-between p-6 hover:bg-white/[0.02] transition-colors",
          !hasItems && "cursor-default"
        )}
      >
        <div className="flex items-center gap-4">
          {hasItems && (
            isOpen ? <ChevronUp size={16} className="text-intelligence" /> : <ChevronDown size={16} className="text-gray-600" />
          )}
          {!hasItems && <div className="w-4" />}
          <h3 className={cn(
            "text-sm font-black uppercase tracking-widest",
            section.isResult ? "text-white" : "text-gray-400"
          )}>
            {section.category}
          </h3>
        </div>
        <p className={cn(
          "font-mono font-bold italic",
          section.highlight ? "text-intelligence text-xl" :
            section.isResult ? "text-white text-lg" : "text-gray-500"
        )}>
          {section.total}
        </p>
      </button>

      <AnimatePresence>
        {isOpen && hasItems && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-black/20"
          >
            <div className="px-16 py-4 space-y-3">
              {section.items.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-center text-xs font-mono group">
                  <span className="text-gray-600 group-hover:text-gray-400 transition-colors">{item.name}</span>
                  <div className="flex-1 mx-4 border-b border-white/5 border-dotted"></div>
                  <span className="text-gray-400">{item.val}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function PandLView({ dateFormat, transactions: propTransactions }: { dateFormat: 'AD' | 'BS', transactions?: Transaction[] }) {
  const { t } = React.useContext(LanguageContext);
  const { transactions: contextTransactions } = React.useContext(TransactionsContext);
  const transactions = propTransactions || contextTransactions || [];
  const [range, setRange] = useState<'This Month' | 'Last Month' | 'This Quarter' | 'Custom'>('This Month');
  const [customDates, setCustomDates] = useState({ start: '', end: '' });
  
  const [plData, setPlData] = useState<any[]>([]);
  const [taxData, setTaxData] = useState({ taxableSales: 0, vatCollected: 0, rawCogs: 0, rawExp: 0, taxablePurchases: 0, vatPaid: 0, netVATPayable: 0 });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchPL = async () => {
      setIsLoading(true);
      try {
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        const now = new Date();
        if (range === 'This Month') {
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        } else if (range === 'Last Month') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (range === 'This Quarter') {
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
        } else if (range === 'Custom' && customDates.start && customDates.end) {
          startDate = new Date(customDates.start);
          endDate = new Date(customDates.end);
        }

        let filtered = transactions;
        if (startDate && endDate) {
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          const startMs = startDate.getTime();
          const endMs = endDate.getTime();
          filtered = transactions.filter(tx => {
            const txDate = new Date(tx.date).getTime();
            return txDate >= startMs && txDate <= endMs;
          });
        }

        const localPlData = {
          revenue: [] as { name: string, val: number }[],
          cogs: [] as { name: string, val: number }[],
          operatingExpenses: [] as { name: string, val: number }[]
        };

        const categoryTotals: Record<string, number> = {};
        const cogsKeywords = ['raw material', 'labor', 'production', 'cogs', 'inventory', 'supplier', 'manufacturing', 'freight', 'direct'];

        filtered.forEach((tx: any) => {
          const catName = tx.category || 'Uncategorized';
          const amount = Number(tx.amount);
          const key = `${tx.type}_${catName}`;
          categoryTotals[key] = (categoryTotals[key] || 0) + amount;
        });

        Object.entries(categoryTotals).forEach(([key, val]) => {
          const [type, ...nameParts] = key.split('_');
          const name = nameParts.join('_');
          if (type === 'Inflow') {
            localPlData.revenue.push({ name, val });
          } else {
            const isCogs = cogsKeywords.some(kw => name.toLowerCase().includes(kw));
            if (isCogs) {
               localPlData.cogs.push({ name, val: -val });
            } else {
               localPlData.operatingExpenses.push({ name, val: -val });
            }
          }
        });

        const revTotal = localPlData.revenue.reduce((acc, i) => acc + i.val, 0);
        const cogsTotal = localPlData.cogs.reduce((acc, i) => acc + i.val, 0);
        const grossProfit = revTotal + cogsTotal;
        const expTotal = localPlData.operatingExpenses.reduce((acc, i) => acc + i.val, 0);
        const netProfit = grossProfit + expTotal;

        const localPlList = [
          {
            category: "Revenue",
            total: formatCurrency(revTotal),
            items: localPlData.revenue.map(i => ({ ...i, val: formatCurrency(i.val) }))
          },
          {
            category: "COGS",
            total: formatCurrency(cogsTotal),
            items: localPlData.cogs.map(i => ({ ...i, val: formatCurrency(i.val) }))
          },
          {
            category: "Gross Profit",
            total: formatCurrency(grossProfit),
            isResult: true,
            items: []
          },
          {
            category: "Operating Expenses",
            total: formatCurrency(expTotal),
            items: localPlData.operatingExpenses.map(i => ({ ...i, val: formatCurrency(i.val) }))
          },
          {
            category: "Net Profit",
            total: formatCurrency(netProfit),
            isResult: true,
            highlight: true,
            items: []
          }
        ];

        setPlData(localPlList);

        const taxableSales = revTotal;
        const vatCollected = taxableSales * 0.13;
        const rawCogs = cogsTotal;
        const rawExp = expTotal;
        const taxablePurchases = (Math.abs(rawCogs) + Math.abs(rawExp)) * 0.6;
        const vatPaid = taxablePurchases * 0.13;
        const netVATPayable = vatCollected - vatPaid;
        setTaxData({ taxableSales, vatCollected, rawCogs, rawExp, taxablePurchases, vatPaid, netVATPayable });
      } catch (err) {
        console.error('Error fetching P&L', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPL();
  }, [range, customDates, transactions]);

  const { taxableSales, vatCollected, rawCogs, rawExp, taxablePurchases, vatPaid, netVATPayable } = taxData;

  const exportPDF = () => {
    if ((window as any).requestPdfPassword) {
      (window as any).requestPdfPassword((pwd: string | null) => {
        if (pwd === null) return;
        const businessName = localStorage.getItem('business_name') || 'NEPAL VENTURES GLOBAL';
        const period = `${range}${range === 'Custom' ? ` (${customDates.start} to ${customDates.end})` : ''}`;
        
        const body: any[] = [];
        plData.forEach(section => {
          body.push([section.category.toUpperCase(), '', section.total]);
          section.items.forEach(item => {
            body.push([`   ${item.name}`, '', item.val]);
          });
          body.push(['', '', '']); // spacer
        });

        generateProfessionalPDF(
          'Profit & Loss Statement',
          period,
          [['Category', 'Details', 'Value']],
          body,
          `PL_Statement_${businessName.replace(/\s/g, '_')}.pdf`,
          [0, 242, 255],
          pwd
        );
      });
    }
  };

  const exportVATPDF = () => {
    if ((window as any).requestPdfPassword) {
      (window as any).requestPdfPassword(async (pwd: string | null) => {
        if (pwd === null) return;
        const doc = new jsPDF();
        const businessName = localStorage.getItem('business_name') || 'NEPAL VENTURES GLOBAL';
        const panNumber = localStorage.getItem('pan_number') || 'XXXXXXXXX';
        // IRD Nepal Schedule 10 header
        doc.setFillColor(230, 245, 255);
        doc.rect(14, 12, 182, 38, 'F');
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 50, 150);
        doc.text('GOVERNMENT OF NEPAL', 105, 20, { align: 'center' });
        doc.text('MINISTRY OF FINANCE - INLAND REVENUE DEPARTMENT', 105, 26, { align: 'center' });
        doc.setFontSize(13); doc.setTextColor(0, 0, 0);
        doc.text('VALUE ADDED TAX (VAT) RETURN FORM', 105, 34, { align: 'center' });
        doc.setFontSize(8); doc.setFont('helvetica', 'normal');
        doc.text('(Schedule 10 - Value Added Tax Rules, 2053)', 105, 40, { align: 'center' });
        // Taxpayer info
        doc.setFontSize(10); doc.setTextColor(40, 40, 40);
        doc.text('Taxpayer: ' + businessName, 14, 55);
        doc.text('PAN: ' + panNumber, 14, 61);
        const bsNow = dateFormat === 'BS' ? convertGregorianToBS(new Date().toISOString().split('T')[0]) : new Date().toLocaleDateString();
        let periodLabel: string = range;
        if (range === 'Custom' && customDates.start && customDates.end) {
          periodLabel = dateFormat === 'BS'
            ? convertGregorianToBS(customDates.start) + ' to ' + convertGregorianToBS(customDates.end)
            : customDates.start + ' to ' + customDates.end;
        }
        doc.text('Tax Period: ' + periodLabel, 14, 67);
        doc.text('Generated: ' + bsNow, 14, 73);
        // IRD-format table with NPR values
        const fmtNPR = (v: number) => {
          const s = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(v));
          return v < 0 ? '(' + s + ')' : s;
        };
        const vatBody = [
          ['1', 'Taxable Sales (Domestic)', fmtNPR(taxableSales), '13%', fmtNPR(vatCollected)],
          ['2', 'Tax Exempt Sales', fmtNPR(0), 'Exempt', fmtNPR(0)],
          ['3', 'Export (Zero Rated)', fmtNPR(0), '0%', fmtNPR(0)],
          ['4', 'Total Sales', fmtNPR(taxableSales), '-', fmtNPR(vatCollected)],
          ['5', 'Taxable Purchases & Imports', fmtNPR(taxablePurchases), '13%', fmtNPR(vatPaid)],
          ['6', 'Exempt Purchases', fmtNPR(0), 'Exempt', fmtNPR(0)],
          ['7', 'Total Purchases', fmtNPR(taxablePurchases), '-', fmtNPR(vatPaid)],
          ['8', 'Net VAT Payable / (Refundable)', '-', '-', fmtNPR(netVATPayable)],
        ];
        autoTable(doc, {
          startY: 80,
          head: [['S.N.', 'Particulars', 'Taxable Value (NPR)', 'Rate', 'VAT Amount (NPR)']],
          body: vatBody,
          theme: 'grid',
          headStyles: { fillColor: [0, 50, 150], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
          styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
          columnStyles: { 0: { cellWidth: 12, halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'center' }, 4: { halign: 'right' } }
        });
        await saveEncryptedPdf(doc, `VAT_IRD_${businessName.replace(/\s/g, '_')}.pdf`, pwd);
      });
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-end">
        <div>
          <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-intelligence mb-2">{t('Statement of Earnings')}</h4>
          <h2 className="text-5xl font-black italic uppercase">{t('PROFIT & LOSS ANALYSIS')}</h2>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex flex-col gap-2 items-end">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1">
              {['This Month', 'Last Month', 'This Quarter', 'Custom'].map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r as any)}
                  className={cn(
                    "px-4 py-2 text-[9px] font-black uppercase tracking-widest transition-all",
                    range === r ? "bg-intelligence text-black shadow-[0_0_15px_rgba(0,242,255,0.3)]" : "text-gray-500 hover:text-white"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            {range === 'Custom' && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-4 mt-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">Start</span>
                  <input
                    type="date"
                    value={customDates.start}
                    onChange={(e) => setCustomDates({ ...customDates, start: e.target.value })}
                    className="bg-black/40 border border-white/10 text-[10px] text-white px-3 py-1 focus:outline-none focus:border-intelligence/50 font-mono"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-mono text-gray-500 uppercase tracking-widest">End</span>
                  <input
                    type="date"
                    value={customDates.end}
                    onChange={(e) => setCustomDates({ ...customDates, end: e.target.value })}
                    className="bg-black/40 border border-white/10 text-[10px] text-white px-3 py-1 focus:outline-none focus:border-intelligence/50 font-mono"
                  />
                </div>
              </motion.div>
            )}
          </div>
          <button
            onClick={exportPDF}
            className="bg-intelligence text-black px-8 py-4 font-black text-[10px] uppercase tracking-widest flex items-center gap-3 hover:shadow-[0_0_20px_rgba(0,242,255,0.4)] transition-all h-fit"
          >
            <Download size={16} />
            EXPORT_PDF
          </button>
        </div>
      </div>

      <div className="glass border-white/5 overflow-hidden p-2">
        {plData.map((section, i) => (
          <PLSection key={i} section={section} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass p-8 border-white/5 bg-intelligence/[0.02]">
          <div className="flex items-center gap-3 mb-6">
            <Zap className="text-intelligence" size={16} />
            <h4 className="text-[10px] font-black uppercase tracking-widest text-intelligence">Efficiency Metrics</h4>
          </div>
          <div className="space-y-6">
            {[
              { label: "Gross Margin", val: "64.8%", trend: "+2.1%" },
              { label: "Operating Margin", val: "41.9%", trend: "+0.4%" },
              { label: "Tax Optimization", val: "84%", trend: "STABLE" }
            ].map((m, i) => (
              <div key={i} className="flex justify-between items-center">
                <p className="text-[10px] font-mono text-gray-500 uppercase">{m.label}</p>
                <div className="flex items-center gap-4">
                  <p className="text-lg font-mono font-bold text-white italic">{m.val}</p>
                  <span className="text-[9px] font-black text-intelligence">{m.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="glass p-8 border-white/5 bg-white/[0.01]">
          <p className="text-[10px] font-mono text-gray-600 uppercase mb-4 tracking-widest">Auditor Notes</p>
          <p className="text-xs text-gray-500 font-mono leading-relaxed uppercase">
            All figures adjusted for quantum variance. Revenue recognition follows G-SEC protocols. COGS includes accelerated depreciation on hardware clusters. Net profit remains within target corridors despite increased R&D allocation.
          </p>
        </div>
      </div>

      {/* VAT Compliance Report Section */}
      <div className="pt-12 border-t border-white/5 space-y-6">
        <div className="flex justify-between items-end">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-intelligence mb-2">{t('Tax Compliance Protocol')}</h4>
            <h2 className="text-3xl font-black italic uppercase">{t('VAT_REPORT_SUMMARY')}</h2>
          </div>
          <button
            onClick={exportVATPDF}
            className="bg-intelligence/20 border border-intelligence/40 text-intelligence px-6 py-3 font-black text-[9px] uppercase tracking-widest flex items-center gap-2 hover:bg-intelligence hover:text-black transition-all animate-pulse shadow-[0_0_15px_rgba(0,242,255,0.1)]"
          >
            <Download size={14} className="text-intelligence" />
            {t('EXPORT_VAT_PDF')}
          </button>
        </div>

        <div className="glass border-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02]">
                <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('Tax Parameter')}</th>
                <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest">{t('Rate/Basis')}</th>
                <th className="p-6 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">
                  {t(localStorage.getItem('is_demo_mode') === 'true' || localStorage.getItem('primary_currency') === 'NPR' ? 'Value (NPR)' : 'Value (USD)')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 text-xs font-bold text-white uppercase">{t('Taxable Sales')}</td>
                <td className="p-6 text-xs font-mono text-gray-500">{t('Based on Revenue Streams')}</td>
                <td className="p-6 text-right font-mono font-bold text-xs text-white">{formatCurrency(taxableSales)}</td>
              </tr>
              <tr className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 text-xs font-bold text-white uppercase">{t('VAT Collected (13%)')}</td>
                <td className="p-6 text-xs font-mono text-intelligence">{t('13% of Taxable Sales')}</td>
                <td className="p-6 text-right font-mono font-bold text-xs text-intelligence">+{formatCurrency(vatCollected)}</td>
              </tr>
              <tr className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 text-xs font-bold text-white uppercase">{t('Taxable Purchases')}</td>
                <td className="p-6 text-xs font-mono text-gray-500">{t('Based on COGS & Operational Inputs')}</td>
                <td className="p-6 text-right font-mono font-bold text-xs text-white">{formatCurrency(taxablePurchases)}</td>
              </tr>
              <tr className="hover:bg-white/[0.01] transition-colors">
                <td className="p-6 text-xs font-bold text-white uppercase">{t('VAT Paid')}</td>
                <td className="p-6 text-xs font-mono text-brand">{t('13% of Taxable Purchases')}</td>
                <td className="p-6 text-right font-mono font-bold text-xs text-brand">-{formatCurrency(vatPaid)}</td>
              </tr>
              <tr className="bg-intelligence/5 border-l-4 border-l-intelligence hover:bg-intelligence/10 transition-colors">
                <td className="p-6 text-xs font-black text-white uppercase italic">{t('Net VAT Payable')}</td>
                <td className="p-6 text-xs font-mono text-gray-400">{t('VAT Collected - VAT Paid')}</td>
                <td className="p-6 text-right font-mono font-black text-sm text-intelligence">{formatCurrency(netVATPayable)}</td>
              </tr>
            </tbody>
          </table>
          <div className="p-6 border-t border-white/5 bg-black/20 flex items-center gap-2">
            <Shield size={12} className="text-gray-600 animate-pulse" />
            <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider">{t('As per IRD Nepal guidelines')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
