import { DataTable } from '../types/dataset';

export function getSampleDatasets(): DataTable[] {
  // Table 1: Transaksi Penjualan Multi-Region (includes 19-digit tracking codes, leading zero IDs, and blank cells for Fill Down)
  const salesRows = [
    { _rowIndex: 1, No_Transaksi: 'TRX-001', No_Resi_19_Digit: '9876543210987654321', Wilayah: 'DKI Jakarta', Nama_Produk: 'Laptop Pro 16 Inch', Qty: 2, Harga_Satuan: 18500000, Total_Bayar: 37000000, Status: 'SELESAI', ID_Pelanggan: 'CUST-001', Tanggal: '2024-01-15' },
    { _rowIndex: 2, No_Transaksi: 'TRX-002', No_Resi_19_Digit: '9876543210987654322', Wilayah: null, Nama_Produk: 'Wireless Mouse RGB', Qty: 5, Harga_Satuan: 250000, Total_Bayar: 1250000, Status: 'SELESAI', ID_Pelanggan: 'CUST-002', Tanggal: '2024-01-16' },
    { _rowIndex: 3, No_Transaksi: 'TRX-003', No_Resi_19_Digit: '9876543210987654323', Wilayah: null, Nama_Produk: 'Mechanical Keyboard TKL', Qty: 2, Harga_Satuan: 850000, Total_Bayar: 1700000, Status: 'PROSES', ID_Pelanggan: 'CUST-003', Tanggal: '2024-01-18' },
    { _rowIndex: 4, No_Transaksi: 'TRX-004', No_Resi_19_Digit: '9876543210987654324', Wilayah: 'Jawa Barat', Nama_Produk: 'Monitor 4K 27 Inch', Qty: 1, Harga_Satuan: 4500000, Total_Bayar: 4500000, Status: 'SELESAI', ID_Pelanggan: 'CUST-001', Tanggal: '2024-01-20' },
    { _rowIndex: 5, No_Transaksi: 'TRX-005', No_Resi_19_Digit: '9876543210987654325', Wilayah: null, Nama_Produk: 'USB-C Docking Station', Qty: 3, Harga_Satuan: 650000, Total_Bayar: 1950000, Status: 'SELESAI', ID_Pelanggan: 'CUST-004', Tanggal: '2024-01-22' },
    { _rowIndex: 6, No_Transaksi: 'TRX-006', No_Resi_19_Digit: '9876543210987654326', Wilayah: 'Jawa Timur', Nama_Produk: 'Ergonomic Desk Chair', Qty: 2, Harga_Satuan: 2200000, Total_Bayar: 4400000, Status: 'BATAL', ID_Pelanggan: 'CUST-005', Tanggal: '2024-01-25' },
    { _rowIndex: 7, No_Transaksi: 'TRX-007', No_Resi_19_Digit: '9876543210987654327', Wilayah: null, Nama_Produk: 'Noise Cancelling Headset', Qty: 4, Harga_Satuan: 1200000, Total_Bayar: 4800000, Status: 'SELESAI', ID_Pelanggan: 'CUST-002', Tanggal: '2024-01-28' },
    { _rowIndex: 8, No_Transaksi: 'TRX-008', No_Resi_19_Digit: '9876543210987654328', Wilayah: 'Bali', Nama_Produk: 'Webcam 1080p HD', Qty: 6, Harga_Satuan: 400000, Total_Bayar: 2400000, Status: 'SELESAI', ID_Pelanggan: 'CUST-006', Tanggal: '2024-02-01' },
    { _rowIndex: 9, No_Transaksi: 'TRX-009', No_Resi_19_Digit: '9876543210987654329', Wilayah: null, Nama_Produk: 'Laptop Stand Alumunium', Qty: 10, Harga_Satuan: 150000, Total_Bayar: 1500000, Status: 'SELESAI', ID_Pelanggan: 'CUST-003', Tanggal: '2024-02-03' },
    { _rowIndex: 10, No_Transaksi: 'TRX-010', No_Resi_19_Digit: '9876543210987654330', Wilayah: 'Sumatera Utara', Nama_Produk: 'External SSD 1TB NVMe', Qty: 2, Harga_Satuan: 1600000, Total_Bayar: 3200000, Status: 'PROSES', ID_Pelanggan: 'CUST-007', Tanggal: '2024-02-05' },
  ];

  const salesTable: DataTable = {
    id: 'tbl_sample_sales',
    name: 'Transaksi_Penjualan_Q1',
    sourceFileName: 'Laporan_Penjualan_2024.xlsx',
    sourceSheetName: 'Penjualan_Q1',
    columns: [
      { name: 'No_Transaksi', originalName: 'No_Transaksi', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'No_Resi_19_Digit', originalName: 'No_Resi_19_Digit', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Wilayah', originalName: 'Wilayah', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Nama_Produk', originalName: 'Nama_Produk', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Qty', originalName: 'Qty', type: 'NUMBER', inferredType: 'NUMBER' },
      { name: 'Harga_Satuan', originalName: 'Harga_Satuan', type: 'NUMBER', inferredType: 'NUMBER' },
      { name: 'Total_Bayar', originalName: 'Total_Bayar', type: 'NUMBER', inferredType: 'NUMBER' },
      { name: 'Status', originalName: 'Status', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'ID_Pelanggan', originalName: 'ID_Pelanggan', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Tanggal', originalName: 'Tanggal', type: 'DATE', inferredType: 'DATE' },
    ],
    rows: salesRows,
    totalRows: salesRows.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Table 2: Master Pelanggan & Audit Duplikasi (includes exact duplicates & fuzzy typo duplicates & leading zero phone)
  const customerRows = [
    { _rowIndex: 1, ID_Pelanggan: 'CUST-001', NIK_16_Digit: '3171012304950001', Nama_Perusahaan: 'PT Maju Bersama', Email: 'finance@majubersama.co.id', No_HP: '081288889999', Kota: 'Jakarta Selatan', Level: 'PLATINUM' },
    { _rowIndex: 2, ID_Pelanggan: 'CUST-002', NIK_16_Digit: '3171012304950002', Nama_Perusahaan: 'CV Citra Mandiri', Email: 'admin@citramandiri.com', No_HP: '081377771234', Kota: 'Bandung', Level: 'GOLD' },
    { _rowIndex: 3, ID_Pelanggan: 'CUST-003', NIK_16_Digit: '3171012304950003', Nama_Perusahaan: 'PT Sinar Jaya Abadi', Email: 'procurement@sinarjaya.id', No_HP: '085699994321', Kota: 'Surabaya', Level: 'SILVER' },
    // Exact duplicate of CUST-001 by Email & NIK
    { _rowIndex: 4, ID_Pelanggan: 'CUST-001B', NIK_16_Digit: '3171012304950001', Nama_Perusahaan: 'PT Maju Bersama', Email: 'finance@majubersama.co.id', No_HP: '081288889999', Kota: 'Jakarta Selatan', Level: 'PLATINUM' },
    // Fuzzy typo duplicate of PT Sinar Jaya Abadi
    { _rowIndex: 5, ID_Pelanggan: 'CUST-008', NIK_16_Digit: '3171012304950008', Nama_Perusahaan: 'PT. Sinar Jaya Abadi Tbk', Email: 'procurement@sinarjaya.id', No_HP: '085699994321', Kota: 'Surabaya', Level: 'GOLD' },
    { _rowIndex: 6, ID_Pelanggan: 'CUST-004', NIK_16_Digit: '3171012304950004', Nama_Perusahaan: 'PT Global Niaga Asia', Email: 'info@globalniaga.com', No_HP: '081122334455', Kota: 'Semarang', Level: 'BRONZE' },
    { _rowIndex: 7, ID_Pelanggan: 'CUST-005', NIK_16_Digit: '3171012304950005', Nama_Perusahaan: 'CV Karya Utama', Email: 'karyautama@gmail.com', No_HP: '081987654321', Kota: 'Malang', Level: 'SILVER' },
    // Exact duplicate of CUST-005 by Email
    { _rowIndex: 8, ID_Pelanggan: 'CUST-005X', NIK_16_Digit: '3171012304950005', Nama_Perusahaan: 'CV Karya Utama Jaya', Email: 'karyautama@gmail.com', No_HP: '081987654321', Kota: 'Malang', Level: 'SILVER' },
    { _rowIndex: 9, ID_Pelanggan: 'CUST-006', NIK_16_Digit: '3171012304950006', Nama_Perusahaan: 'PT Samudera Logistik', Email: 'contact@samudera.co.id', No_HP: '087811229988', Kota: 'Denpasar', Level: 'PLATINUM' },
    { _rowIndex: 10, ID_Pelanggan: 'CUST-007', NIK_16_Digit: '3171012304950007', Nama_Perusahaan: 'UD Berkah Makmur', Email: 'berkahmakmur@yahoo.com', No_HP: '085299881122', Kota: 'Medan', Level: 'BRONZE' },
  ];

  const customerTable: DataTable = {
    id: 'tbl_sample_customers',
    name: 'Master_Pelanggan_Audit',
    sourceFileName: 'Database_Pelanggan_2024.xlsx',
    sourceSheetName: 'Master_Customer',
    columns: [
      { name: 'ID_Pelanggan', originalName: 'ID_Pelanggan', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'NIK_16_Digit', originalName: 'NIK_16_Digit', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Nama_Perusahaan', originalName: 'Nama_Perusahaan', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Email', originalName: 'Email', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'No_HP', originalName: 'No_HP', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Kota', originalName: 'Kota', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Level', originalName: 'Level', type: 'TEXT', inferredType: 'TEXT' },
    ],
    rows: customerRows,
    totalRows: customerRows.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  // Table 3: Mutasi Bank (for testing Table Reconciliation / Diff against Transaksi_Penjualan_Q1)
  const bankRows = [
    { _rowIndex: 1, No_Transaksi: 'TRX-001', Nominal_Transfer: 37000000, Nama_Pengirim: 'PT Maju Bersama', Bank: 'BCA', Status_Klaim: 'MATCHED' },
    { _rowIndex: 2, No_Transaksi: 'TRX-002', Nominal_Transfer: 1250000, Nama_Pengirim: 'CV Citra Mandiri', Bank: 'Mandiri', Status_Klaim: 'MATCHED' },
    // Mismatch in amount (1.700.000 vs 1.650.000)
    { _rowIndex: 3, No_Transaksi: 'TRX-003', Nominal_Transfer: 1650000, Nama_Pengirim: 'PT Sinar Jaya', Bank: 'BCA', Status_Klaim: 'KURANG_BAYAR' },
    { _rowIndex: 4, No_Transaksi: 'TRX-004', Nominal_Transfer: 4500000, Nama_Pengirim: 'PT Maju Bersama', Bank: 'BCA', Status_Klaim: 'MATCHED' },
    // Missing in Sales (Extra transaction in bank statement)
    { _rowIndex: 5, No_Transaksi: 'TRX-999', Nominal_Transfer: 5000000, Nama_Pengirim: 'PT Sumber Rejeki', Bank: 'BRI', Status_Klaim: 'UNREGISTERED' },
  ];

  const bankTable: DataTable = {
    id: 'tbl_sample_bank',
    name: 'Rekening_Koran_Bank_Q1',
    sourceFileName: 'Mutasi_BCA_Januari.csv',
    sourceSheetName: 'Sheet1',
    columns: [
      { name: 'No_Transaksi', originalName: 'No_Transaksi', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Nominal_Transfer', originalName: 'Nominal_Transfer', type: 'NUMBER', inferredType: 'NUMBER' },
      { name: 'Nama_Pengirim', originalName: 'Nama_Pengirim', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Bank', originalName: 'Bank', type: 'TEXT', inferredType: 'TEXT' },
      { name: 'Status_Klaim', originalName: 'Status_Klaim', type: 'TEXT', inferredType: 'TEXT' },
    ],
    rows: bankRows,
    totalRows: bankRows.length,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return [salesTable, customerTable, bankTable];
}
