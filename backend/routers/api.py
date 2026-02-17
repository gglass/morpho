import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import os
import shutil

from models.database import get_db, Transaction, Category, LLMConfiguration, CSVImport, init_db
from models.schemas import (
    TransactionResponse, TransactionCreate, TransactionUpdate,
    CategoryResponse, CategoryCreate,
    LLMConfigResponse, LLMConfigCreate,
    CategorizeRequest, CategorizeResponse,
    SankeyData, TransactionFilter, CSVImportResponse
)
from services.llm_service import LLMService
from services.csv_service import CSVImportService
from services.analytics_service import AnalyticsService

router = APIRouter()

# Initialize database on startup
@router.on_event("startup")
async def startup_event():
    init_db()
    # Create default categories if none exist
    db = next(get_db())
    create_default_categories(db)

def create_default_categories(db: Session):
    """Create default categories if they don't exist."""
    default_categories = [
        # Income
        {"name": "Income", "color": "#10B981", "icon": "dollar-sign", "is_system": True},
        
        # Expense categories
        {"name": "Housing", "color": "#F59E0B", "icon": "home", "is_system": True, "subs": ["Rent", "Mortgage", "Utilities", "Home Insurance", "Home Maintenance"]},
        {"name": "Food", "color": "#EF4444", "icon": "utensils", "is_system": True, "subs": ["Groceries", "Restaurants", "Fast Food", "Coffee"]},
        {"name": "Transportation", "color": "#3B82F6", "icon": "car", "is_system": True, "subs": ["Gas", "Public Transit", "Car Maintenance", "Parking"]},
        {"name": "Shopping", "color": "#8B5CF6", "icon": "shopping-bag", "is_system": True, "subs": ["Clothing", "Electronics", "Household", "Personal Care"]},
        {"name": "Entertainment", "color": "#EC4899", "icon": "film", "is_system": True, "subs": ["Streaming", "Movies", "Games", "Events"]},
        {"name": "Health", "color": "#14B8A6", "icon": "heart", "is_system": True, "subs": ["Medical", "Pharmacy", "Gym", "Health Insurance"]},
        {"name": "Financial", "color": "#6366F1", "icon": "credit-card", "is_system": True, "subs": ["Investments", "Fees", "Interest"]},
        {"name": "Education", "color": "#F97316", "icon": "book", "is_system": True, "subs": ["Tuition", "Books", "Courses"]},
        {"name": "Travel", "color": "#06B6D4", "icon": "plane", "is_system": True, "subs": ["Flights", "Hotels", "Car Rental", "Activities"]},
        {"name": "Other", "color": "#6B7280", "icon": "more-horizontal", "is_system": True},
    ]
    
    existing = db.query(Category).first()
    if existing:
        return
    
    for cat_data in default_categories:
        subs = cat_data.pop("subs", [])
        parent = Category(**cat_data)
        db.add(parent)
        db.flush()
        
        for sub_name in subs:
            sub = Category(
                name=sub_name,
                color=cat_data["color"],
                parent_id=parent.id,
                is_system=True
            )
            db.add(sub)
    
    db.commit()

# Transaction routes
@router.get("/transactions", response_model=List[TransactionResponse])
def get_transactions(
    skip: int = 0,
    limit: int = 50,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    category_id: Optional[int] = None,
    is_income: Optional[bool] = None,
    search: Optional[str] = None,
    account_name: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get transactions with optional filtering."""
    count_query = db.query(Transaction)
    
    if start_date:
        count_query = count_query.filter(Transaction.date >= start_date)
    if end_date:
        count_query = count_query.filter(Transaction.date <= end_date)
    if category_id is not None:
        if category_id == -1:
            count_query = count_query.filter(Transaction.category_id.is_(None))
        else:
            count_query = count_query.filter(Transaction.category_id == category_id)
    if is_income is not None:
        count_query = count_query.filter(Transaction.is_income == is_income)
    if account_name:
        count_query = count_query.filter(Transaction.account_name == account_name)
    if search:
        count_query = count_query.filter(Transaction.description.ilike(f"%{search}%"))
    
    total_count = count_query.count()
    
    effective_skip = skip
    if limit > 0 and total_count > 0:
        max_valid_skip = max(0, ((total_count + limit - 1) // limit - 1) * limit)
        effective_skip = min(skip, max_valid_skip)
    
    query = db.query(Transaction)
    
    if start_date:
        query = query.filter(Transaction.date >= start_date)
    if end_date:
        query = query.filter(Transaction.date <= end_date)
    if category_id is not None:
        if category_id == -1:
            query = query.filter(Transaction.category_id.is_(None))
        else:
            query = query.filter(Transaction.category_id == category_id)
    if is_income is not None:
        query = query.filter(Transaction.is_income == is_income)
    if account_name:
        query = query.filter(Transaction.account_name == account_name)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    
    query = query.order_by(Transaction.date.desc())
    transactions = query.offset(effective_skip).limit(limit).all()
    return transactions

@router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
def get_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Get a single transaction by ID."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return transaction

@router.post("/transactions", response_model=TransactionResponse)
def create_transaction(transaction: TransactionCreate, db: Session = Depends(get_db)):
    """Create a new transaction."""
    db_transaction = Transaction(**transaction.dict())
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    db: Session = Depends(get_db)
):
    """Update a transaction."""
    db_transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not db_transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    update_data = transaction_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_transaction, field, value)
    
    db.commit()
    db.refresh(db_transaction)
    return db_transaction

@router.delete("/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, db: Session = Depends(get_db)):
    """Delete a transaction."""
    transaction = db.query(Transaction).filter(Transaction.id == transaction_id).first()
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    return {"message": "Transaction deleted"}

# Category routes
@router.get("/categories", response_model=List[CategoryResponse])
def get_categories(db: Session = Depends(get_db)):
    """Get all categories."""
    categories = db.query(Category).filter(Category.parent_id.is_(None)).all()
    return categories

@router.post("/categories", response_model=CategoryResponse)
def create_category(category: CategoryCreate, db: Session = Depends(get_db)):
    """Create a new category."""
    db_category = Category(**category.dict())
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# LLM Configuration routes
@router.get("/llm-configs", response_model=List[LLMConfigResponse])
def get_llm_configs(db: Session = Depends(get_db)):
    """Get all LLM configurations."""
    configs = db.query(LLMConfiguration).all()
    return configs

@router.post("/llm-configs", response_model=LLMConfigResponse)
def create_llm_config(config: LLMConfigCreate, db: Session = Depends(get_db)):
    """Create a new LLM configuration."""
    # If setting as active, deactivate others
    if config.is_active:
        db.query(LLMConfiguration).update({LLMConfiguration.is_active: False})
    
    db_config = LLMConfiguration(**config.dict())
    db.add(db_config)
    db.commit()
    db.refresh(db_config)
    return db_config

@router.put("/llm-configs/{config_id}", response_model=LLMConfigResponse)
def update_llm_config(config_id: int, config_update: LLMConfigCreate, db: Session = Depends(get_db)):
    """Update an LLM configuration."""
    db_config = db.query(LLMConfiguration).filter(LLMConfiguration.id == config_id).first()
    if not db_config:
        raise HTTPException(status_code=404, detail="Configuration not found")
    
    # If setting as active, deactivate others
    if config_update.is_active:
        db.query(LLMConfiguration).filter(LLMConfiguration.id != config_id).update({LLMConfiguration.is_active: False})
    
    update_data = config_update.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_config, field, value)
    
    db.commit()
    db.refresh(db_config)
    return db_config

# Categorization routes
@router.post("/categorize", response_model=CategorizeResponse)
def categorize_transactions(request: CategorizeRequest, db: Session = Depends(get_db)):
    """Categorize transactions using the active LLM configuration."""
    transactions = db.query(Transaction).filter(Transaction.id.in_(request.transaction_ids)).all()
    
    if not transactions:
        raise HTTPException(status_code=404, detail="No transactions found")
    
    llm_service = LLMService(db)
    results = llm_service.categorize_transactions(transactions)
    
    success_count = sum(1 for r in results if r.get("success"))
    failed_count = len(results) - success_count
    
    return CategorizeResponse(
        categorized_count=success_count,
        failed_count=failed_count,
        results=results
    )

@router.post("/categorize-uncategorized")
def categorize_uncategorized(limit: int = 10000, db: Session = Depends(get_db)):
    """Categorize all uncategorized transactions."""
    print(f"\n>>> /categorize-uncategorized endpoint called with limit={limit}")
    
    transactions = db.query(Transaction).filter(
        Transaction.category_id.is_(None)
    ).limit(limit).all()
    
    print(f"Found {len(transactions)} uncategorized transactions")
    
    if not transactions:
        print("No transactions to categorize")
        return {"message": "No uncategorized transactions found"}
    
    print(f"Transaction IDs: {[t.id for t in transactions]}")
    
    llm_service = LLMService(db)
    results = llm_service.categorize_transactions(transactions)
    
    success_count = sum(1 for r in results if r.get("success"))
    
    print(f"\n>>> /categorize-uncategorized completed: {success_count} successes, {len(results) - success_count} failures")
    
    return {
        "processed": len(results),
        "categorized": success_count,
        "failed": len(results) - success_count
    }

# Analytics routes
@router.get("/analytics/sankey", response_model=SankeyData)
def get_sankey_data(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    db: Session = Depends(get_db)
):
    """Get data for Sankey diagram."""
    service = AnalyticsService(db)
    return service.get_sankey_data(start_date, end_date)

@router.get("/transactions/count")
def get_transaction_count(
    category_id: Optional[int] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Get count of transactions with optional filtering."""
    query = db.query(Transaction)
    
    if category_id is not None:
        # -1 means uncategorized (category_id IS NULL)
        if category_id == -1:
            query = query.filter(Transaction.category_id.is_(None))
        else:
            query = query.filter(Transaction.category_id == category_id)
    if search:
        query = query.filter(Transaction.description.ilike(f"%{search}%"))
    
    return {"count": query.count()}


@router.get("/analytics/summary")
def get_summary(db: Session = Depends(get_db)):
    """Get summary statistics."""
    service = AnalyticsService(db)
    
    # Get total income and expenses
    total_income = db.query(Transaction).filter(Transaction.amount > 0).with_entities(
        func.sum(Transaction.amount)
    ).scalar() or 0
    
    total_expenses = db.query(Transaction).filter(Transaction.amount < 0).with_entities(
        func.sum(Transaction.amount)
    ).scalar() or 0
    
    uncategorized_count = service.get_uncategorized_count()
    
    return {
        "total_income": round(total_income, 2),
        "total_expenses": round(abs(total_expenses), 2),
        "net": round(total_income + total_expenses, 2),
        "transaction_count": db.query(Transaction).count(),
        "uncategorized_count": uncategorized_count
    }

@router.get("/analytics/monthly")
def get_monthly_summary(months: int = 12, db: Session = Depends(get_db)):
    """Get monthly income/expense summary."""
    service = AnalyticsService(db)
    return service.get_monthly_summary(months)


@router.post("/analytics/insights")
def generate_insights(request: dict, db: Session = Depends(get_db)):
    service = AnalyticsService(db)
    
    query = request.get("query", "")
    start_date_str = request.get("start_date")
    end_date_str = request.get("end_date")
    
    # Parse date filters if provided
    start_date = None
    end_date = None
    
    if start_date_str:
        try:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            pass
    
    if end_date_str:
        try:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00'))
        except (ValueError, TypeError):
            pass
    
    return service.generate_insights(query, start_date, end_date)

# CSV Import routes
@router.post("/import/csv")
async def import_csv(
    file: UploadFile = File(...),
    account_name: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """Import transactions from a CSV file."""
    # Save uploaded file temporarily
    temp_path = f"/tmp/{file.filename}"
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    # Import
    service = CSVImportService(db)
    result = service.import_csv(temp_path, account_name)
    
    # Clean up temp file
    os.remove(temp_path)
    
    return result

@router.get("/imports", response_model=List[CSVImportResponse])
def get_imports(db: Session = Depends(get_db)):
    """Get import history."""
    imports = db.query(CSVImport).order_by(CSVImport.created_at.desc()).all()
    return imports

@router.delete("/imports/{import_id}")
def delete_import(import_id: int, db: Session = Depends(get_db)):
    import_record = db.query(CSVImport).filter(CSVImport.id == import_id).first()
    if not import_record:
        raise HTTPException(status_code=404, detail="Import not found")
    

    
    db.query(Transaction).filter(Transaction.csv_import_id == import_id).delete(synchronize_session=False)
    db.delete(import_record)
    db.commit()
    return {"message": "Import deleted"}

# Model fetching routes
@router.get("/models")
def get_models(provider: str, base_url: Optional[str] = None):
    """Fetch available models from a provider's OpenAI-compatible API."""
    try:
        import httpx
        
        if provider == "ollama" or not base_url:
            # Ollama uses /models endpoint
            url = f"{base_url or 'http://localhost:11434'}/api/models"
        else:
            # Generic OpenAI-compatible API
            url = f"{base_url.rstrip('/')}/v1/models"
        
        with httpx.Client(timeout=5.0) as client:
            response = client.get(url)
            response.raise_for_status()
            
            data = response.json()
            
            if provider == "ollama" or not base_url:
                # Ollama format: {"models": [{"model": "name"}, ...]}
                models = [m["model"] for m in data.get("models", [])]
            else:
                # OpenAI format: {"data": [{"id": "name"}, ...]}
                models = [m["id"] for m in data.get("data", [])]
            
            return {"provider": provider, "models": list(set(models))}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch models: {str(e)}")
