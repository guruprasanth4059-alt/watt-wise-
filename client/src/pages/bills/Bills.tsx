import React, { useEffect, useState, useRef } from 'react';
import { api } from '../../api/client';
import { Bill, Meter } from '../../types';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/common/Button';
import { Badge } from '../../components/common/Badge';
import { VerificationModal } from '../../components/bill/VerificationModal';
import { CsvMappingWizard } from '../../components/bill/CsvMappingWizard';
import { ManualBillModal } from '../../components/bill/ManualBillModal';
import { SkeletonTable } from '../../components/common/SkeletonLoader';
import { useAuth } from '../../context/AuthContext';
import {
  Upload,
  PlusCircle,
  FileSpreadsheet,
  Search,
  Receipt,
  FileCheck,
  Trash2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

interface BillsProps {
  onNavigate: (path: string) => void;
}

export const Bills: React.FC<BillsProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [bills, setBills] = useState<Bill[]>([]);
  const [meters, setMeters] = useState<Meter[]>([]);
  const [totalBills, setTotalBills] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMeter, setSelectedMeter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Modal states
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [uploadedFileInfo, setUploadedFileInfo] = useState<{ fileUrl?: string; fileName?: string }>({});

  const [csvWizardOpen, setCsvWizardOpen] = useState(false);
  const [csvData, setCsvData] = useState<{ headers: string[]; sampleRows: any[]; totalRows: number }>({
    headers: [],
    sampleRows: [],
    totalRows: 0
  });

  const [manualModalOpen, setManualModalOpen] = useState(false);

  const fetchBills = async () => {
    setIsLoading(true);
    try {
      let queryParams = `?page=${currentPage}&limit=8`;
      if (searchQuery) queryParams += `&search=${encodeURIComponent(searchQuery)}`;
      if (selectedMeter) queryParams += `&meterId=${encodeURIComponent(selectedMeter)}`;

      const res = await api.get<{ bills: Bill[]; pagination: { total: number } }>(`/bills${queryParams}`);
      setBills(res.bills);
      setTotalBills(res.pagination.total);
    } catch (err) {
      console.error('Failed to fetch bills:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMeters = async () => {
    try {
      const data = await api.get<Meter[]>('/meters');
      setMeters(data);
    } catch (err) {
      console.error('Failed to fetch meters:', err);
    }
  };

  useEffect(() => {
    fetchMeters();
  }, []);

  useEffect(() => {
    fetchBills();
  }, [currentPage, selectedMeter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchBills();
  };

  // Handle File Upload Dropzone
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('billFile', file);

    setIsUploading(true);
    setFeedbackMessage(null);

    try {
      const res = await api.upload<any>('/bills/upload', formData);

      if (res.type === 'csv') {
        setCsvData({
          headers: res.headers,
          sampleRows: res.sampleRows,
          totalRows: res.totalRows
        });
        setCsvWizardOpen(true);
      } else {
        // PDF / Image OCR Extraction -> Opens Verification Modal
        setExtractedData(res.extracted);
        setUploadedFileInfo({
          fileUrl: res.fileUrl,
          fileName: res.fileName
        });
        setVerificationModalOpen(true);
      }
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Unable to read this bill. Please check the file or enter the values manually.'
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Confirm extracted bill
  const handleConfirmExtractedBill = async (confirmedData: any) => {
    try {
      await api.post('/bills/verify', confirmedData);
      setFeedbackMessage({
        type: 'success',
        text: 'Bill verified and successfully committed to society records.'
      });
      fetchBills();
    } catch (err: any) {
      throw err;
    }
  };

  // Submit manual bill
  const handleManualBillSubmit = async (billData: any) => {
    try {
      await api.post('/bills/manual', billData);
      setFeedbackMessage({
        type: 'success',
        text: 'Manual electricity bill recorded successfully.'
      });
      fetchBills();
    } catch (err: any) {
      throw err;
    }
  };

  // Import CSV batch
  const handleCsvImport = async (mapping: Record<string, string>) => {
    try {
      const res = await api.post<any>('/bills/import-csv', {
        rows: csvData.sampleRows, // backend handles full import or sample mapping
        mapping
      });
      setFeedbackMessage({
        type: 'success',
        text: res.message || 'Spreadsheet records imported successfully.'
      });
      fetchBills();
    } catch (err: any) {
      throw err;
    }
  };

  // Delete bill
  const handleDeleteBill = async (id: string) => {
    if (!window.confirm('Are you sure you want to remove this bill entry?')) return;
    try {
      await api.delete(`/bills/${id}`);
      setFeedbackMessage({
        type: 'success',
        text: 'Bill entry removed.'
      });
      fetchBills();
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'Failed to delete bill.'
      });
    }
  };

  const canEdit = user?.role === 'society_admin' || user?.role === 'committee_member';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Electricity Bill Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ingest invoices via PDF OCR extraction, CSV batch import, or manual ledger entry.
          </p>
        </div>

        {canEdit && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setManualModalOpen(true)}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Manual Entry
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              isLoading={isUploading}
              icon={<Upload className="w-4 h-4" />}
            >
              Upload Bill / CSV
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".pdf,.csv,.xlsx,.xls,.txt"
              className="hidden"
            />
          </div>
        )}
      </div>

      {/* Status Feedback Banner */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Ingestion Dropzone Banner (Section 16 & 18) */}
      {canEdit && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/70 p-6 rounded-2xl text-center cursor-pointer transition-all space-y-2"
        >
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Click or drag an Electricity Bill (PDF, CSV, XLSX) to upload
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Our intelligent parser reads billing period, consumption units (kWh), and tariff charges. You will review and confirm the extracted values before saving.
          </p>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearch} className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search period or meter..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </form>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMeter}
            onChange={e => {
              setSelectedMeter(e.target.value);
              setCurrentPage(1);
            }}
            className="text-xs px-3 py-1.5 border border-slate-300 rounded-lg bg-white focus:outline-none w-full sm:w-auto"
          >
            <option value="">All Meters</option>
            {meters.map(m => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bill History Table (Section 20) */}
      <Card className="p-0 overflow-hidden">
        {isLoading ? (
          <SkeletonTable />
        ) : bills.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-500">
            No electricity bills match your query. Upload a bill to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Billing Period</th>
                  <th className="p-3.5">Meter Panel</th>
                  <th className="p-3.5">Units (kWh)</th>
                  <th className="p-3.5">Total Bill (₹)</th>
                  <th className="p-3.5">Verification</th>
                  <th className="p-3.5">Logged Date</th>
                  {canEdit && <th className="p-3.5 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="p-3.5 font-bold text-slate-900">{bill.billing_period}</td>
                    <td className="p-3.5">
                      <p className="font-semibold text-slate-800">{bill.meter_name || 'Main Panel'}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{bill.meter_number || 'BESCOM'}</p>
                    </td>
                    <td className="p-3.5 font-bold text-emerald-700">
                      {bill.units_kwh.toLocaleString()} kWh
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      ₹{bill.bill_amount.toLocaleString()}
                    </td>
                    <td className="p-3.5">
                      <Badge variant="emerald" size="sm">
                        <FileCheck className="w-3 h-3" />
                        Verified
                      </Badge>
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {bill.created_at ? bill.created_at.slice(0, 10) : 'N/A'}
                    </td>
                    {canEdit && (
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteBill(bill.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {totalBills > 8 && (
          <div className="p-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Showing {bills.length} of {totalBills} recorded bills</span>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={currentPage * 8 >= totalBills}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Verification Modal (Section 16) */}
      {extractedData && (
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          extractedData={extractedData}
          meters={meters}
          fileUrl={uploadedFileInfo.fileUrl}
          fileName={uploadedFileInfo.fileName}
          onConfirm={handleConfirmExtractedBill}
        />
      )}

      {/* CSV Import Wizard Modal (Section 18) */}
      <CsvMappingWizard
        isOpen={csvWizardOpen}
        onClose={() => setCsvWizardOpen(false)}
        headers={csvData.headers}
        sampleRows={csvData.sampleRows}
        totalRows={csvData.totalRows}
        onImport={handleCsvImport}
      />

      {/* Manual Bill Modal (Section 19) */}
      <ManualBillModal
        isOpen={manualModalOpen}
        onClose={() => setManualModalOpen(false)}
        meters={meters}
        onSubmit={handleManualBillSubmit}
      />
    </div>
  );
};
