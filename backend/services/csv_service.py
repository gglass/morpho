import pandas as pd
from datetime import datetime
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
from models.database import Transaction, Category, CSVImport
from models.schemas import TransactionCreate
import re

class CSVImportService:
    """Service for importing and parsing CSV files from banks."""
    
    COLUMN_MAPPINGS = {
        'date': ['date', 'transaction date', 'posting date', 'date posted', 'trans date', 'transaction_date', 'posted'],
        'description': ['description', 'transaction', 'memo', 'description', 'payee', 'name', 'merchant', 'transaction description'],
        'amount': ['amount', 'transaction amount', 'amount ($)', 'debit', 'credit', 'transaction amount($)'],
        'category': ['category', 'type', 'transaction type'],
        'account': ['account', 'account name', 'account number']
    }
    
    def __init__(self, db: Session):
        self.db = db
    
    def detect_columns(self, df: pd.DataFrame) -> Dict[str, str]:
        """Automatically detect column mappings based on common names."""
        detected = {}
        df_columns_lower = {col.lower().strip(): col for col in df.columns}
        
        for field, possible_names in self.COLUMN_MAPPINGS.items():
            for name in possible_names:
                if name in df_columns_lower:
                    detected[field] = df_columns_lower[name]
                    break
        
        return detected
    
    def parse_amount(self, amount_value) -> float:
        """Parse amount value, handling various formats."""
        if pd.isna(amount_value):
            return 0.0
        
        if isinstance(amount_value, (int, float)):
            return float(amount_value)
        
        amount_str = str(amount_value).strip()
        amount_str = re.sub(r'[$€£¥,]', '', amount_str)
        
        if amount_str.startswith('(') and amount_str.endswith(')'):
            amount_str = '-' + amount_str[1:-1]
        
        try:
            return float(amount_str)
        except ValueError:
            return 0.0
    
    def parse_date(self, date_value) -> Optional[datetime]:
        """Parse date value, trying multiple formats."""
        if pd.isna(date_value):
            return None
        
        if isinstance(date_value, datetime):
            return date_value
        
        date_str = str(date_value).strip()
        
        formats = [
            '%Y-%m-%d',
            '%m/%d/%Y',
            '%m/%d/%y',
            '%d/%m/%Y',
            '%d/%m/%y',
            '%Y/%m/%d',
            '%m-%d-%Y',
            '%m-%d-%y',
            '%d-%m-%Y',
            '%d-%m-%y',
            '%b %d, %Y',
            '%B %d, %Y',
            '%d %b %Y',
            '%d %B %Y'
        ]
        
        for fmt in formats:
            try:
                return datetime.strptime(date_str, fmt)
            except ValueError:
                continue
        
        try:
            return pd.to_datetime(date_value)
        except:
            return None
    
    def import_csv(self, file_path: str, account_name: Optional[str] = None,
                   column_mapping: Optional[Dict[str, str]] = None) -> CSVImport:
        """Import transactions from a CSV file."""
        print(f"\n=== CSV IMPORT START ===")
        print(f"File: {file_path}")
        
        csv_import = CSVImport(
            filename=file_path.split('/')[-1],
            account_name=account_name,
            status="processing"
        )
        self.db.add(csv_import)
        self.db.commit()
        
        try:
            import csv as csv_module
            rows_list = []
            headers = None
            with open(file_path, 'r') as f:
                reader = csv_module.reader(f)
                headers = next(reader)
                for row in reader:
                    if len(row) > len(headers):
                        row = row[:len(headers)]
                    rows_list.append(row)
            
            df = pd.DataFrame(rows_list, columns=headers)
            csv_import.row_count = len(df)
            print(f"Total rows in CSV: {len(df)}")
            print(f"Columns detected: {list(df.columns)}")
            print(f"First row sample:")
            for col in df.columns[:4]:
                print(f"  {col}: {df[col].iloc[0]}")
            
            if not column_mapping:
                column_mapping = self.detect_columns(df)
            
            print(f"Column mapping: {column_mapping}")
            
            if 'date' not in column_mapping or 'description' not in column_mapping:
                raise ValueError(f"Could not detect required columns. Found: {list(df.columns)}")
            
            imported_count = 0
            skipped_count = 0
            error_count = 0
            
            for idx, (_, row) in enumerate(df.iterrows()):
                try:
                    transaction = self._create_transaction_from_row(
                        row, column_mapping, account_name, csv_import.id
                    )
                    if transaction:
                        self.db.add(transaction)
                        imported_count += 1
                    else:
                        skipped_count += 1
                        if skipped_count <= 3:
                            print(f"  Row {idx} skipped (no valid transaction): date={row.get(column_mapping.get('date'))}, desc={row.get(column_mapping.get('description'))}, amt={row.get(column_mapping.get('amount'))}")
                except Exception as e:
                    error_count += 1
                    if error_count <= 3:
                        print(f"  Row {idx} error: {e}")
                    continue
            
            self.db.commit()
            
            print(f"Import results: {imported_count} imported, {skipped_count} skipped, {error_count} errors")
            
            csv_import.imported_count = imported_count
            csv_import.status = "completed"
            csv_import.completed_at = datetime.utcnow()
            
        except Exception as e:
            print(f"✗ CSV Import failed: {e}")
            import traceback
            traceback.print_exc()
            csv_import.status = "error"
            csv_import.error_message = str(e)
        
        self.db.commit()
        print(f"=== CSV IMPORT END ===\n")
        return csv_import
    
    def _create_transaction_from_row(self, row: pd.Series, column_mapping: Dict[str, str],
                                      account_name: Optional[str], csv_import_id: int) -> Optional[Transaction]:
        """Create a Transaction object from a CSV row."""
        date_col = column_mapping.get('date')
        if not date_col:
            return None
        
        # Debug: print column mapping vs actual row values
        date_raw = row.get(date_col)
        date = self.parse_date(date_raw)
        if not date:
            print(f"    Failed to parse date from '{date_col}': {date_raw}")
            return None
        
        desc_col = column_mapping.get('description')
        description = str(row.get(desc_col, '')).strip()
        if not description:
            print(f"    No description in '{desc_col}'")
            return None
        
        amount = 0.0
        if 'amount' in column_mapping:
            amount_raw = row.get(column_mapping['amount'])
            amount = self.parse_amount(amount_raw)
            print(f"    Row: date={date_col}:{date_raw} desc={desc_col}:{description[:50]} amt={column_mapping.get('amount')}:{amount_raw}")
        
        amount_col = column_mapping.get('amount')
        if amount_col and amount == 0:
            for col in row.index:
                col_lower = str(col).lower()
                if 'debit' in col_lower or 'withdrawal' in col_lower:
                    debit = self.parse_amount(row.get(col))
                    if debit > 0:
                        amount = -debit
                        break
                elif 'credit' in col_lower or 'deposit' in col_lower:
                    credit = self.parse_amount(row.get(col))
                    if credit > 0:
                        amount = credit
                        break
        
        if amount == 0:
            print(f"    Skipping row: amount is 0. Columns: {dict(row)}")
            return None
        
        existing = self.db.query(Transaction).filter(
            Transaction.date == date,
            Transaction.description == description,
            Transaction.amount == amount,
            Transaction.account_name == account_name
        ).first()
        
        if existing:
            return None
        
        transaction = Transaction(
            date=date,
            description=description,
            original_description=description,
            amount=amount,
            account_name=account_name or column_mapping.get('account'),
            is_income=amount > 0,
            is_categorized=False,
            csv_import_id=csv_import_id
        )
        
        return transaction
