from sqlalchemy import create_engine, Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime

Base = declarative_base()

DATABASE_URL = "sqlite:////app/data/budget.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    color = Column(String, default="#3B82F6")
    icon = Column(String, nullable=True)
    parent_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    is_system = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    parent = relationship("Category", remote_side=[id], backref="subcategories")

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(DateTime, nullable=False)
    description = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    subcategory_id = Column(Integer, ForeignKey("categories.id"), nullable=True)
    account_name = Column(String, nullable=True)
    original_description = Column(String, nullable=True)
    is_income = Column(Boolean, default=False)
    is_categorized = Column(Boolean, default=False)
    llm_provider = Column(String, nullable=True)
    confidence_score = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    csv_import_id = Column(Integer, ForeignKey("csv_imports.id"), nullable=True)
    
    category = relationship("Category", foreign_keys=[category_id])
    subcategory = relationship("Category", foreign_keys=[subcategory_id])
    csv_import = relationship("CSVImport", back_populates="transactions")

class LLMConfiguration(Base):
    __tablename__ = "llm_configurations"
    
    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, nullable=False)  # openai, anthropic, ollama
    api_key = Column(String, nullable=True)
    model_name = Column(String, nullable=False)
    base_url = Column(String, nullable=True)  # For Ollama or custom endpoints
    is_active = Column(Boolean, default=False)
    temperature = Column(Float, default=0.3)
    max_tokens = Column(Integer, default=500)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class CSVImport(Base):
    __tablename__ = "csv_imports"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, nullable=False)
    account_name = Column(String, nullable=True)
    row_count = Column(Integer, default=0)
    imported_count = Column(Integer, default=0)
    status = Column(String, default="pending")  # pending, processing, completed, error
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)
    
    transactions = relationship("Transaction", back_populates="csv_import")

def init_db():
    Base.metadata.create_all(bind=engine)
    
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
