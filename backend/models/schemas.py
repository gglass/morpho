from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class CategoryBase(BaseModel):
    name: str
    color: Optional[str] = "#3B82F6"
    icon: Optional[str] = None
    parent_id: Optional[int] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryResponse(CategoryBase):
    id: int
    is_system: bool
    created_at: datetime
    subcategories: List["CategoryResponse"] = []
    
    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    date: datetime
    description: str
    amount: float
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    account_name: Optional[str] = None
    is_income: bool = False

class TransactionCreate(TransactionBase):
    original_description: Optional[str] = None

class TransactionUpdate(BaseModel):
    description: Optional[str] = None
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None
    is_income: Optional[bool] = None

class TransactionResponse(TransactionBase):
    id: int
    original_description: Optional[str]
    is_categorized: bool
    llm_provider: Optional[str]
    confidence_score: Optional[float]
    created_at: datetime
    updated_at: datetime
    category: Optional[CategoryResponse] = None
    subcategory: Optional[CategoryResponse] = None
    
    class Config:
        from_attributes = True

class LLMConfigBase(BaseModel):
    provider: str = Field(..., description="LLM provider: openai, anthropic, ollama")
    api_key: Optional[str] = None
    model_name: str
    base_url: Optional[str] = None
    is_active: bool = False
    temperature: float = Field(default=0.3, ge=0, le=2)
    max_tokens: int = Field(default=500, ge=100, le=4000)

class LLMConfigCreate(LLMConfigBase):
    pass

class LLMConfigResponse(LLMConfigBase):
    id: int
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

class CategorizeRequest(BaseModel):
    transaction_ids: List[int]

class CategorizeResponse(BaseModel):
    categorized_count: int
    failed_count: int
    results: List[dict]

class SankeyNode(BaseModel):
    category_id: Optional[int] = None
    id: int
    name: str
    color: Optional[str] = None

class SankeyLink(BaseModel):
    source: int
    target: int
    value: float
    color: Optional[str] = None

class SankeyData(BaseModel):
    nodes: List[SankeyNode]
    links: List[SankeyLink]

class TransactionFilter(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    category_id: Optional[int] = None
    is_income: Optional[bool] = None
    search: Optional[str] = None
    account_name: Optional[str] = None

class CSVImportResponse(BaseModel):
    id: int
    filename: str
    account_name: Optional[str]
    row_count: int
    imported_count: int
    status: str
    error_message: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True

# Resolve forward reference
CategoryResponse.model_rebuild()
