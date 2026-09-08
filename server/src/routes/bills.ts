import { Router, Response } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { v4 as uuidv4 } from 'uuid';
import { query, queryOne, execute, transaction } from '../database/db.js';
import { AuthenticatedRequest, authenticateToken, requireRole, getAuthorizedSocietyId } from '../middleware/auth.js';
import { extractDataFromBillText, parseCsvContent } from '../services/billParser.js';
import { config } from '../config/index.js';
import { Bill } from '../types/index.js';
import { logAuditEvent } from '../services/audit.js';

export const billsRouter = Router();

// Ensure upload directory exists
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}

// Multer storage configuration with MIME validation
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `bill-${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (_req, file, cb) => {
    const allowedExts = ['.pdf', '.csv', '.xlsx', '.xls', '.txt', '.png', '.jpg'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, CSV, and Excel files are accepted.'));
    }
  }
});

// 1. Get all bills with search, filter, and pagination
billsRouter.get('/', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { meterId, period, search, page = '1', limit = '10' } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10));
    const limitNum = Math.max(1, Math.min(100, parseInt(limit as string, 10)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE b.society_id = ?';
    const params: any[] = [societyId];

    if (meterId) {
      whereClause += ' AND b.meter_id = ?';
      params.push(meterId);
    }

    if (period) {
      whereClause += ' AND b.billing_period LIKE ?';
      params.push(`%${period}%`);
    }

    if (search) {
      whereClause += ' AND (b.billing_period LIKE ? OR m.name LIKE ? OR m.meter_number LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const countSql = `
      SELECT COUNT(*) as total 
      FROM bills b 
      LEFT JOIN meters m ON b.meter_id = m.id 
      ${whereClause}
    `;
    const countResult = query<{ total: number }>(countSql, params);
    const totalCount = countResult[0]?.total || 0;

    const billsSql = `
      SELECT b.*, m.name as meter_name, m.meter_number
      FROM bills b
      LEFT JOIN meters m ON b.meter_id = m.id
      ${whereClause}
      ORDER BY b.billing_period DESC, b.created_at DESC
      LIMIT ? OFFSET ?
    `;
    const bills = query(billsSql, [...params, limitNum, offset]);

    res.json({
      bills,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limitNum)
      }
    });
  } catch (err: any) {
    console.error('Fetch bills error:', err);
    res.status(500).json({ error: 'Failed to retrieve bills.' });
  }
});

// 1.1 Get single bill by ID (Strict society isolation)
billsRouter.get('/:id', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    const bill = queryOne(
      `SELECT b.*, m.name as meter_name, m.meter_number 
       FROM bills b 
       LEFT JOIN meters m ON b.meter_id = m.id 
       WHERE b.id = ? AND b.society_id = ?`,
      [id, societyId]
    );

    if (!bill) {
      res.status(404).json({ error: 'Bill record not found.' });
      return;
    }

    res.json(bill);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to retrieve bill record.' });
  }
});

// 1.2 Check for duplicate bill before saving (Requirement 8)
billsRouter.post('/check-duplicate', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { meter_id, billing_period, units_kwh, bill_amount } = req.body;

    if (!billing_period) {
      res.json({ isDuplicate: false });
      return;
    }

    const existing = queryOne<Bill>(
      `SELECT id, billing_period, units_kwh, bill_amount, verified 
       FROM bills 
       WHERE society_id = ? AND billing_period = ? ${meter_id ? 'AND meter_id = ?' : ''}`,
      meter_id ? [societyId, billing_period.trim(), meter_id] : [societyId, billing_period.trim()]
    );

    if (existing) {
      res.json({
        isDuplicate: true,
        existingBill: existing,
        message: `A bill for this meter and billing period (${billing_period}) already exists (${existing.units_kwh.toLocaleString()} kWh, ₹${existing.bill_amount.toLocaleString()}).`
      });
    } else {
      res.json({ isDuplicate: false });
    }
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to check duplicate bill.' });
  }
});

// 1.3 Export Bills as CSV (Requirement 68)
billsRouter.get('/export/csv', authenticateToken, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const bills = query<any>(
      `SELECT b.billing_period, m.name as meter_name, m.meter_number, b.units_kwh, b.bill_amount, 
              b.fixed_charges, b.energy_charges, b.verified, b.verified_by, b.created_at
       FROM bills b
       LEFT JOIN meters m ON b.meter_id = m.id
       WHERE b.society_id = ?
       ORDER BY b.billing_period DESC`,
      [societyId]
    );

    let csv = 'Billing Period,Meter Name,Meter Number,Units (kWh),Bill Amount (INR),Fixed Charges (INR),Energy Charges (INR),Verified,Verified By,Date Added\n';
    bills.forEach((b: any) => {
      csv += `"${b.billing_period}","${b.meter_name || 'Main Meter'}","${b.meter_number || 'N/A'}",${b.units_kwh},${b.bill_amount},${b.fixed_charges || 0},${b.energy_charges || 0},"${b.verified ? 'Yes' : 'No'}","${b.verified_by || 'Admin'}","${b.created_at}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="wattwise-bills-${Date.now()}.csv"`);
    res.status(200).send(csv);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to export CSV.' });
  }
});

// 2. Upload file & Extract metadata (DOES NOT SAVE - Returns for verification screen)
billsRouter.post('/upload', authenticateToken, requireRole('society_admin', 'committee_member'), upload.single('billFile'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please select a bill file to upload.' });
      return;
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    const fileUrl = `/uploads/${req.file.filename}`;

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      const csvData = parseCsvContent(content);
      res.json({
        type: 'csv',
        fileUrl,
        fileName: req.file.originalname,
        headers: csvData.headers,
        sampleRows: csvData.rows.slice(0, 3),
        totalRows: csvData.totalRows
      });
      return;
    }

    // For PDF / text files: Read buffer and extract DISCOM parameters
    let textContent = '';
    try {
      textContent = fs.readFileSync(filePath, 'utf8');
    } catch {
      textContent = '';
    }

    // Generate extracted fields
    const extracted = extractDataFromBillText(textContent, req.file.originalname);

    res.json({
      type: 'bill_extracted',
      fileUrl,
      fileName: req.file.originalname,
      extracted,
      message: 'Bill processed. Please verify the extracted values before saving.'
    });
  } catch (err: any) {
    console.error('Bill upload error:', err);
    res.status(500).json({ error: 'Failed to process file. Please try again or enter details manually.' });
  }
});

// 3. Confirm & Save Verified Bill (Verification Screen confirmation)
billsRouter.post('/verify', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const {
      meter_id,
      billing_period,
      units_kwh,
      bill_amount,
      fixed_charges,
      energy_charges,
      due_date,
      file_url,
      file_name,
      notes
    } = req.body;

    // Strict validation
    if (!billing_period) {
      res.status(400).json({ error: 'Billing period is required.' });
      return;
    }
    const units = parseFloat(units_kwh);
    const amount = parseFloat(bill_amount);

    if (isNaN(units) || units <= 0) {
      res.status(400).json({ error: 'Units consumed must be a positive number.' });
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'Bill amount must be greater than 0.' });
      return;
    }

    // Default to main meter if not provided
    let targetMeterId = meter_id;
    if (!targetMeterId) {
      const defaultMeter = queryOne('SELECT id FROM meters WHERE society_id = ? LIMIT 1', [societyId]);
      targetMeterId = defaultMeter?.id || null;
    }

    const billId = `bill-${uuidv4().slice(0, 8)}`;
    const user = queryOne('SELECT name FROM users WHERE id = ?', [req.user!.userId]);

    transaction(() => {
      execute(
        `INSERT INTO bills (id, society_id, meter_id, billing_period, units_kwh, bill_amount, fixed_charges, energy_charges, due_date, file_url, file_name, verified, verified_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          billId,
          societyId,
          targetMeterId,
          billing_period.trim(),
          units,
          amount,
          parseFloat(fixed_charges || '0'),
          parseFloat(energy_charges || amount),
          due_date || null,
          file_url || null,
          file_name || null,
          user?.name || 'Administrator',
          notes || 'Confirmed via verification screen'
        ]
      );

      // Record in consumption table
      execute(
        `INSERT INTO consumption (id, society_id, meter_id, period, units_kwh, source)
         VALUES (?, ?, ?, ?, ?, 'bill')`,
        [`cons-${uuidv4().slice(0, 8)}`, societyId, targetMeterId, billing_period.trim(), units]
      );

      // Notification
      execute(
        `INSERT INTO notifications (id, society_id, title, message, type, link)
         VALUES (?, ?, 'New Verified Electricity Bill', ?, 'bill_uploaded', '/bills')`,
        [`notif-${uuidv4().slice(0, 8)}`, societyId, `Bill for ${billing_period} (${units.toLocaleString()} kWh) verified and recorded.`]
      );
    });

    const saved = queryOne<Bill>('SELECT * FROM bills WHERE id = ?', [billId]);
    res.status(201).json({
      message: 'Electricity bill verified and recorded successfully.',
      bill: saved
    });
  } catch (err: any) {
    console.error('Verify bill error:', err);
    res.status(500).json({ error: 'Failed to save confirmed bill.' });
  }
});

// 4. Manual Bill Entry (Strict form validation)
billsRouter.post('/manual', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const {
      meter_id,
      billing_period,
      units_kwh,
      bill_amount,
      fixed_charges,
      energy_charges,
      due_date,
      notes
    } = req.body;

    if (!billing_period) {
      res.status(400).json({ error: 'Billing period is required.' });
      return;
    }

    const units = parseFloat(units_kwh);
    const amount = parseFloat(bill_amount);

    if (isNaN(units) || units <= 0) {
      res.status(400).json({ error: 'Units consumed must be a positive number.' });
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      res.status(400).json({ error: 'Bill amount must be greater than 0.' });
      return;
    }

    let targetMeterId = meter_id;
    if (!targetMeterId) {
      const defaultMeter = queryOne('SELECT id FROM meters WHERE society_id = ? LIMIT 1', [societyId]);
      targetMeterId = defaultMeter?.id || null;
    }

    const billId = `bill-${uuidv4().slice(0, 8)}`;
    const user = queryOne('SELECT name FROM users WHERE id = ?', [req.user!.userId]);

    transaction(() => {
      execute(
        `INSERT INTO bills (id, society_id, meter_id, billing_period, units_kwh, bill_amount, fixed_charges, energy_charges, due_date, verified, verified_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [
          billId,
          societyId,
          targetMeterId,
          billing_period.trim(),
          units,
          amount,
          parseFloat(fixed_charges || '0'),
          parseFloat(energy_charges || amount),
          due_date || null,
          user?.name || 'Administrator',
          notes || 'Manual entry'
        ]
      );

      execute(
        `INSERT INTO consumption (id, society_id, meter_id, period, units_kwh, source)
         VALUES (?, ?, ?, ?, ?, 'manual')`,
        [`cons-${uuidv4().slice(0, 8)}`, societyId, targetMeterId, billing_period.trim(), units]
      );
    });

    const saved = queryOne<Bill>('SELECT * FROM bills WHERE id = ?', [billId]);
    res.status(201).json({ message: 'Manual bill entered successfully.', bill: saved });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to record manual bill.' });
  }
});

// 5. CSV Batch Import with column mapping
billsRouter.post('/import-csv', authenticateToken, requireRole('society_admin', 'committee_member'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { rows, mapping } = req.body;

    if (!Array.isArray(rows) || rows.length === 0) {
      res.status(400).json({ error: 'No rows provided for import.' });
      return;
    }

    // Default meter
    const defaultMeter = queryOne('SELECT id FROM meters WHERE society_id = ? LIMIT 1', [societyId]);
    const meterId = defaultMeter?.id || null;

    let importedCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    transaction(() => {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const period = row[mapping.billing_period] || row['billing_period'] || row['period'];
        const unitsRaw = row[mapping.units_kwh] || row['units_kwh'] || row['units'];
        const amountRaw = row[mapping.bill_amount] || row['bill_amount'] || row['amount'];

        const units = parseFloat(unitsRaw);
        const amount = parseFloat(amountRaw);

        if (!period || isNaN(units) || units <= 0 || isNaN(amount) || amount <= 0) {
          errorCount++;
          errors.push(`Row ${i + 1}: Invalid period or non-positive numerical values`);
          continue;
        }

        const billId = `bill-${uuidv4().slice(0, 8)}`;
        execute(
          `INSERT INTO bills (id, society_id, meter_id, billing_period, units_kwh, bill_amount, fixed_charges, energy_charges, verified, verified_by, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 'CSV Import', 'Imported via CSV Wizard')`,
          [
            billId,
            societyId,
            meterId,
            period.toString().trim(),
            units,
            amount,
            parseFloat(row[mapping.fixed_charges] || '0'),
            parseFloat(row[mapping.energy_charges] || amount)
          ]
        );

        execute(
          `INSERT INTO consumption (id, society_id, meter_id, period, units_kwh, source)
           VALUES (?, ?, ?, ?, ?, 'import')`,
          [`cons-${uuidv4().slice(0, 8)}`, societyId, meterId, period.toString().trim(), units]
        );

        importedCount++;
      }
    });

    res.json({
      message: `Import completed: ${importedCount} records successfully imported.`,
      importedCount,
      errorCount,
      errors: errors.slice(0, 5)
    });
  } catch (err: any) {
    console.error('CSV import error:', err);
    res.status(500).json({ error: 'Failed to process CSV import.' });
  }
});

// 5.1 Edit bill with audit logging (Requirement 44)
billsRouter.put('/:id', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;
    const { units_kwh, bill_amount, fixed_charges, energy_charges, reason } = req.body;

    const existing = queryOne<Bill>('SELECT * FROM bills WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!existing) {
      res.status(404).json({ error: 'Bill record not found.' });
      return;
    }

    const newUnits = units_kwh !== undefined ? parseFloat(units_kwh) : existing.units_kwh;
    const newAmount = bill_amount !== undefined ? parseFloat(bill_amount) : existing.bill_amount;

    if (isNaN(newUnits) || newUnits <= 0 || isNaN(newAmount) || newAmount <= 0) {
      res.status(400).json({ error: 'Units and amount must be positive numbers.' });
      return;
    }

    execute(
      `UPDATE bills 
       SET units_kwh = ?, bill_amount = ?, fixed_charges = ?, energy_charges = ?, updated_at = datetime('now')
       WHERE id = ? AND society_id = ?`,
      [
        newUnits,
        newAmount,
        fixed_charges !== undefined ? parseFloat(fixed_charges) : existing.fixed_charges,
        energy_charges !== undefined ? parseFloat(energy_charges) : existing.energy_charges,
        id,
        societyId
      ]
    );

    // Audit log edit (Requirement 44)
    logAuditEvent({
      societyId,
      userId: req.user!.userId,
      eventType: 'bill_edited',
      entityType: 'bill',
      entityId: id,
      metadata: {
        billing_period: existing.billing_period,
        previous_units_kwh: existing.units_kwh,
        new_units_kwh: newUnits,
        previous_bill_amount: existing.bill_amount,
        new_bill_amount: newAmount,
        reason: reason || 'Routine tariff reconciliation'
      }
    });

    const updated = queryOne<Bill>('SELECT * FROM bills WHERE id = ?', [id]);
    res.json({ message: 'Bill updated successfully.', bill: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update bill.' });
  }
});

// 6. Delete bill (Society Admin only)
billsRouter.delete('/:id', authenticateToken, requireRole('society_admin'), async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const societyId = getAuthorizedSocietyId(req);
    const { id } = req.params;

    const existing = queryOne<Bill>('SELECT * FROM bills WHERE id = ? AND society_id = ?', [id, societyId]);
    if (!existing) {
      res.status(404).json({ error: 'Bill record not found.' });
      return;
    }

    execute('DELETE FROM bills WHERE id = ? AND society_id = ?', [id, societyId]);

    // Audit log deletion
    logAuditEvent({
      societyId,
      userId: req.user!.userId,
      eventType: 'bill_deleted',
      entityType: 'bill',
      entityId: id,
      metadata: {
        billing_period: existing.billing_period,
        units_kwh: existing.units_kwh,
        bill_amount: existing.bill_amount
      }
    });

    res.json({ message: 'Bill removed successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete bill.' });
  }
});
