import os
import json
import re
from typing import List, Dict, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from models.database import Transaction, Category, LLMConfiguration

try:
    import openai
except ImportError:
    openai = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import ollama
except ImportError:
    ollama = None

BATCH_SIZE = 10


class LLMService:
    def __init__(self, db: Session):
        self.db = db
        self.config = self._get_active_config()
    
    def _get_active_config(self) -> Optional[LLMConfiguration]:
        """Retrieves the active LLM configuration from the database."""
        if not self.db:
            print("Error: Database session not available.")
            return None
        try:
            return self.db.query(LLMConfiguration).filter(LLMConfiguration.is_active == True).first()
        except Exception as e:
            print(f"Error fetching LLM config: {e}")
            return None

    def categorize_transactions(self, transactions: List[Transaction]) -> List[Dict]:
        """Categorize multiple transactions using the configured LLM with batch processing."""
        print(f"\n=== CATEGORIZE TRANSACTIONS ===")
        print(f"Total transactions to categorize: {len(transactions)}")
        
        if not self.config:
            print("Warning: No active LLM configuration found. Categorization will not work.")
            return [{"success": False, "error": "No active LLM configuration", "transaction_id": t.id if t else None} for t in transactions]
        
        print(f"Using LLM config: {self.config.provider} - {self.config.model_name}")
        
        if not transactions:
            print("No transactions to process")
            return []
        
        all_categories = self.db.query(Category).all()
        print(f"Found {len(all_categories)} categories")
        category_context = self._build_category_context(all_categories)
        
        all_results = []
        
        for i in range(0, len(transactions), BATCH_SIZE):
            batch = transactions[i:i + BATCH_SIZE]
            print(f"\nProcessing batch {i//BATCH_SIZE + 1} with {len(batch)} transactions (IDs: {[t.id for t in batch]})")
            batch_results = self._categorize_batch(batch, category_context)
            print(f"Batch results: {batch_results}")
            all_results.extend(batch_results)
        
        print(f"=== END CATEGORIZE TRANSACTIONS ===\n")
        return all_results

    def _categorize_batch(self, transactions: List[Transaction], category_context: str) -> List[Dict]:
        """Categorize a batch of transactions in a single LLM call."""
        if not self.config:
            return [{"success": False, "error": "No active LLM configuration", "transaction_id": t.id} for t in transactions]
        
        provider = self.config.provider.lower()
        batch_prompt = self._build_batch_prompt(transactions, category_context)
        
        api_key = getattr(self.config, 'api_key', None)
        base_url = getattr(self.config, 'base_url', None)
        model_name = getattr(self.config, 'model_name', None)
        temperature = getattr(self.config, 'temperature', 0.3)
        max_tokens = getattr(self.config, 'max_tokens', 4000)
        
        if max_tokens < 2000:
            print(f"Warning: max_tokens was {max_tokens}, increasing to 2000 for batch processing")
            max_tokens = 2000
        
        llm_response = None
        error_msg = None
        
        try:
            if provider == "openai" and openai:
                client_kwargs = {}
                if base_url:
                    if not base_url.endswith('/v1'):
                        base_url = base_url.rstrip('/') + '/v1'
                    client_kwargs["base_url"] = base_url
                if api_key:
                    client_kwargs["api_key"] = api_key
                else:
                    client_kwargs["api_key"] = "not-needed"
                
                client = openai.OpenAI(**client_kwargs)
                result = client.chat.completions.create(
                    model=model_name or "gpt-3.5-turbo",
                    messages=[{"role": "user", "content": batch_prompt}],
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                llm_response = result.choices[0].message.content
                
            elif provider == "anthropic" and anthropic:
                client_kwargs = {}
                if api_key:
                    client_kwargs["api_key"] = api_key
                else:
                    client_kwargs["api_key"] = "not-needed"
                if base_url:
                    if not base_url.endswith('/v1'):
                        base_url = base_url.rstrip('/') + '/v1'
                    client_kwargs["base_url"] = base_url
                
                client = anthropic.Anthropic(**client_kwargs)
                response = client.messages.create(
                    model=model_name or "claude-3-haiku-20240307",
                    max_tokens=max_tokens,
                    temperature=temperature,
                    messages=[{"role": "user", "content": batch_prompt}]
                )
                llm_response = response.content[0].text
                
            elif provider == "ollama" and ollama:
                import ollama as ollama_module
                
                ollama_base_url = base_url or "http://localhost:11434"
                original_host = os.environ.get("OLLAMA_HOST")
                
                try:
                    os.environ["OLLAMA_HOST"] = ollama_base_url.rstrip('/')
                    response = ollama_module.generate(
                        model=model_name or "llama2",
                        prompt=batch_prompt,
                        options={
                            "temperature": temperature,
                            "num_predict": max_tokens
                        }
                    )
                    llm_response = response['response']
                finally:
                    if original_host is not None:
                        if original_host:
                            os.environ["OLLAMA_HOST"] = original_host
                        else:
                            os.environ.pop("OLLAMA_HOST", None)
            else:
                error_msg = f"Provider {provider} not available or library not installed"
        
        except Exception as e:
            error_msg = f"{provider} API error: {str(e)}"
            print(f"Error during LLM call: {error_msg}")
        
        if error_msg:
            print(f"✗ Error occurred: {error_msg}")
            return [{"success": False, "error": error_msg, "transaction_id": t.id} for t in transactions]
        
        if not llm_response:
            print(f"✗ No response from LLM")
            return [{"success": False, "error": "No response from LLM", "transaction_id": t.id} for t in transactions]
        
        print(f"✓ Received LLM response ({len(llm_response)} chars)")
        return self._parse_batch_result(transactions, llm_response)
    
    def _build_category_context(self, categories: List[Category]) -> str:
        """Build a string representation of the category hierarchy."""
        context = []
        
        parent_categories = sorted(
            [c for c in categories if c.parent_id is None],
            key=lambda c: (c.name.lower() == 'income', c.name)
        )
        
        for parent in parent_categories:
            subcats = sorted(
                [c for c in categories if c.parent_id == parent.id],
                key=lambda c: c.name
            )
            if subcats:
                subcat_names = ", ".join([s.name for s in subcats])
                context.append(f"{parent.name} (subcategories: {subcat_names})")
            else:
                context.append(parent.name)
        
        return "; ".join(context)
    
    def _build_batch_prompt(self, transactions: List[Transaction], category_context: str) -> str:
        """Build the categorization prompt for a batch of transactions."""
        transactions_str = ""
        for i, t in enumerate(transactions, 1):
            transactions_str += f"""
Transaction {i}:
- ID: {t.id}
- Description: {t.description}
- Amount: ${abs(t.amount):.2f}
- Date: {t.date.strftime('%Y-%m-%d')}
- Account: {t.account_name or 'Unknown'}
"""
        
        return f"""You are a financial transaction categorization assistant. Categorize the following transactions.

{transactions_str}

Available categories:
{category_context}

For EACH transaction, return a JSON object with:
- "transaction_id": The transaction ID
- "category": The main category name (must be from available categories)
- "subcategory": The subcategory name if applicable, or null
- "is_income": true if this is income, false if expense
- "confidence": A number from 0-1 indicating your confidence
- "clean_description": A cleaned, more readable version of the description

Return a JSON array of objects (one per transaction), no other text. Example format:
[
  {{"transaction_id": 1, "category": "Food", "subcategory": "Groceries", "is_income": false, "confidence": 0.95, "clean_description": "Grocery Store"}},
  {{"transaction_id": 2, "category": "Income", "subcategory": null, "is_income": true, "confidence": 1.0, "clean_description": "Direct Deposit"}}
]"""

    def _parse_batch_result(self, transactions: List[Transaction], llm_response: str) -> List[Dict]:
        """Parse and apply the LLM response to transactions."""
        results = []
        
        print(f"\n=== PARSE BATCH RESULT ===")
        print(f"Processing {len(transactions)} transactions")
        print(f"LLM Response (first 1000 chars): {llm_response[:1000]}")
        
        try:
            response_data = json.loads(llm_response)
            print(f"✓ Successfully parsed JSON")
            print(f"Response data type: {type(response_data)}")
            print(f"Response data: {response_data}")
            
            if not isinstance(response_data, list):
                response_data = [response_data]
            
            print(f"Processing {len(response_data)} items from response")
            transaction_map = {t.id: t for t in transactions}
            print(f"Transaction map: {list(transaction_map.keys())}")
            
            for item in response_data:
                transaction_id = item.get("transaction_id")
                print(f"\nProcessing item with transaction_id: {transaction_id}")
                transaction = transaction_map.get(transaction_id)
                
                if not transaction:
                    print(f"✗ Transaction {transaction_id} not found in map")
                    results.append({
                        "success": False,
                        "error": f"Transaction {transaction_id} not found",
                        "transaction_id": transaction_id
                    })
                    continue
                
                try:
                    category_name = item.get("category", "Other")
                    subcategory_name = item.get("subcategory")
                    is_income = item.get("is_income", transaction.amount > 0)
                    confidence = item.get("confidence", 0.5)
                    clean_description = item.get("clean_description", transaction.description)
                    
                    print(f"  Category: {category_name}, Subcategory: {subcategory_name}, Income: {is_income}")
                    
                    category = self.db.query(Category).filter(
                        Category.name == category_name,
                        Category.parent_id.is_(None)
                    ).first()
                    
                    if not category:
                        print(f"  Category '{category_name}' not found, using 'Other'")
                        category = self.db.query(Category).filter(
                            Category.name == "Other"
                        ).first()
                    
                    print(f"  Found category: {category.name if category else 'None'} (ID: {category.id if category else 'None'})")
                    
                    subcategory = None
                    if subcategory_name and category:
                        subcategory = self.db.query(Category).filter(
                            Category.name == subcategory_name,
                            Category.parent_id == category.id
                        ).first()
                        print(f"  Found subcategory: {subcategory.name if subcategory else 'None'} (ID: {subcategory.id if subcategory else 'None'})")
                    
                    transaction.category_id = category.id if category else None
                    transaction.subcategory_id = subcategory.id if subcategory else None
                    transaction.is_income = is_income
                    transaction.is_categorized = True
                    transaction.llm_provider = self.config.provider
                    transaction.confidence_score = confidence
                    transaction.description = clean_description
                    
                    self.db.commit()
                    print(f"  ✓ Transaction {transaction_id} committed to database")
                    
                    results.append({
                        "success": True,
                        "transaction_id": transaction_id,
                        "category": category_name,
                        "subcategory": subcategory_name,
                        "confidence": confidence
                    })
                    
                except Exception as e:
                    print(f"✗ Error processing transaction {transaction_id}: {e}")
                    import traceback
                    traceback.print_exc()
                    results.append({
                        "success": False,
                        "error": f"Failed to apply categorization: {str(e)}",
                        "transaction_id": transaction_id
                    })
        
        except json.JSONDecodeError as e:
            print(f"✗ Failed to parse LLM response as JSON: {e}")
            print(f"Response was: {llm_response[:1000]}")
            return [{"success": False, "error": f"Invalid JSON response from LLM", "transaction_id": t.id} for t in transactions]
        
        except Exception as e:
            print(f"✗ Error parsing batch result: {e}")
            import traceback
            traceback.print_exc()
            return [{"success": False, "error": f"Error processing results: {str(e)}", "transaction_id": t.id} for t in transactions]
        
        print(f"\n=== END PARSE BATCH RESULT ===\n")
        return results