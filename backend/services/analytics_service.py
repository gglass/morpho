import json
import os
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from models.database import Transaction, Category, LLMConfiguration
from models.schemas import SankeyData, SankeyNode, SankeyLink

try:
    from openai import OpenAI
except ImportError:
    OpenAI = None

try:
    import anthropic
except ImportError:
    anthropic = None

try:
    import ollama
except ImportError:
    ollama = None


class AnalyticsService:
    """Service for generating analytics and Sankey diagram data."""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_sankey_data(self, start_date: Optional[datetime] = None,
                       end_date: Optional[datetime] = None) -> SankeyData:
        """Generate Sankey diagram data for income and expenses flow."""
        
        query = self.db.query(Transaction)
        
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        
        transactions = query.all()
        
        # Separate income and expenses
        income_total = sum(t.amount for t in transactions if t.amount > 0)
        expense_transactions = [t for t in transactions if t.amount < 0]
        expense_total = abs(sum(t.amount for t in expense_transactions))
        
        # Build nodes
        nodes = []
        node_index = {}
        
        # Add income node
        nodes.append(SankeyNode(id=0, name="Income", color="#10B981"))
        node_index["income"] = 0
        
        # Add category nodes
        current_idx = 1
        
        # Group expenses by category
        category_expenses = {}
        for t in expense_transactions:
            cat_id = t.category_id if t.category_id else -1
            if cat_id not in category_expenses:
                category_expenses[cat_id] = {
                    'amount': 0,
                    'category': t.category,
                    'subcategories': {}
                }
            category_expenses[cat_id]['amount'] += abs(t.amount)
            
            # Track subcategories
            subcat_id = t.subcategory_id if t.subcategory_id else None
            if subcat_id:
                if subcat_id not in category_expenses[cat_id]['subcategories']:
                    category_expenses[cat_id]['subcategories'][subcat_id] = {
                        'amount': 0,
                        'subcategory': t.subcategory
                    }
                category_expenses[cat_id]['subcategories'][subcat_id]['amount'] += abs(t.amount)
        
        # Add uncategorized if exists
        if -1 in category_expenses:
            nodes.append(SankeyNode(id=current_idx, name="Uncategorized", color="#9CA3AF", category_id=-1))
            node_index[-1] = current_idx
            current_idx += 1
        
        # Add categorized categories
        for cat_id, data in category_expenses.items():
            if cat_id == -1:
                continue
            
            cat = data['category']
            color = cat.color if cat else "#6B7280"
            
            nodes.append(SankeyNode(id=current_idx, name=cat.name if cat else "Unknown", color=color, category_id=cat_id))
            node_index[cat_id] = current_idx
            current_idx += 1
            
            # Add subcategory nodes
            for subcat_id, subcat_data in data['subcategories'].items():
                subcat = subcat_data['subcategory']
                subcat_color = subcat.color if subcat else color
                
                nodes.append(SankeyNode(
                    id=current_idx,
                    name=subcat.name if subcat else "Other",
                    color=subcat_color,
                    category_id=cat_id
                ))
                node_index[f"{cat_id}_{subcat_id}"] = current_idx
                current_idx += 1
        
        # Add expense sink node
        nodes.append(SankeyNode(id=current_idx, name="Expenses", color="#EF4444"))
        node_index["expenses"] = current_idx
        expense_node_idx = current_idx
        current_idx += 1
        
        # Build links
        links = []
        
        # Link income to categories
        for cat_id, data in category_expenses.items():
            if data['amount'] > 0:
                target_idx = node_index.get(cat_id)
                if target_idx is not None:
                    links.append(SankeyLink(
                        source=0,  # Income node
                        target=target_idx,
                        value=round(data['amount'], 2),
                        color="rgba(16, 185, 129, 0.3)"
                    ))
                    
                    # Link category to subcategories
                    for subcat_id, subcat_data in data['subcategories'].items():
                        if subcat_data['amount'] > 0:
                            subcat_idx = node_index.get(f"{cat_id}_{subcat_id}")
                            if subcat_idx is not None:
                                links.append(SankeyLink(
                                    source=target_idx,
                                    target=subcat_idx,
                                    value=round(subcat_data['amount'], 2),
                                    color="rgba(107, 114, 128, 0.3)"
                                ))
                                
                                # Link subcategory to expenses sink
                                links.append(SankeyLink(
                                    source=subcat_idx,
                                    target=expense_node_idx,
                                    value=round(subcat_data['amount'], 2),
                                    color="rgba(239, 68, 68, 0.3)"
                                ))
                    
                    # If no subcategories, link directly to expenses
                    if not data['subcategories']:
                        links.append(SankeyLink(
                            source=target_idx,
                            target=expense_node_idx,
                            value=round(data['amount'], 2),
                            color="rgba(239, 68, 68, 0.3)"
                        ))
        
        return SankeyData(nodes=nodes, links=links)
    
    def get_category_breakdown(self, start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> List[dict]:
        """Get expense breakdown by category."""
        
        query = self.db.query(
            Category.id,
            Category.name,
            Category.color,
            func.sum(Transaction.amount).label('total')
        ).join(Transaction, Transaction.category_id == Category.id)
        
        query = query.filter(Transaction.amount < 0)
        
        if start_date:
            query = query.filter(Transaction.date >= start_date)
        if end_date:
            query = query.filter(Transaction.date <= end_date)
        
        query = query.group_by(Category.id, Category.name, Category.color)
        query = query.order_by(func.sum(Transaction.amount))
        
        results = query.all()
        
        return [
            {
                "id": r.id,
                "name": r.name,
                "color": r.color,
                "total": abs(r.total),
                "percentage": 0  # Will calculate after we have all data
            }
            for r in results
        ]
    
    def get_monthly_summary(self, months: int = 12) -> List[dict]:
        """Get monthly income and expense summary."""
        
        query = self.db.query(
            extract('year', Transaction.date).label('year'),
            extract('month', Transaction.date).label('month'),
            func.sum(Transaction.amount).label('total')
        ).group_by(
            extract('year', Transaction.date),
            extract('month', Transaction.date)
        ).order_by(
            extract('year', Transaction.date).desc(),
            extract('month', Transaction.date).desc()
        ).limit(months)
        
        results = query.all()
        
        summary = []
        for r in results:
            month_date = datetime(int(r.year), int(r.month), 1)
            summary.append({
                "month": month_date.strftime("%Y-%m"),
                "income": max(0, r.total),
                "expense": abs(min(0, r.total)),
                "net": r.total
            })
        
        return list(reversed(summary))
    
    def get_uncategorized_count(self) -> int:
        """Get count of uncategorized transactions."""
        return self.db.query(Transaction).filter(
            Transaction.category_id.is_(None)
        ).count()

    def generate_insights(self, query: str, start_date: Optional[datetime] = None,
                          end_date: Optional[datetime] = None) -> dict:
        """Generate insights from transactions using LLM."""
        
        # Get active LLM config
        llm_config = self.db.query(LLMConfiguration).filter(
            LLMConfiguration.is_active == True
        ).first()
        
        if not llm_config:
            return {"error": "No active LLM configuration found"}
        
        # Build transaction data for context
        transactions_query = self.db.query(Transaction)
        
        if start_date:
            transactions_query = transactions_query.filter(Transaction.date >= start_date)
        if end_date:
            transactions_query = transactions_query.filter(Transaction.date <= end_date)
        
        transactions = transactions_query.all()
        
        # Build category information
        categories = self.db.query(Category).all()
        category_context = self._build_category_context_for_insights(categories)
        
        # Format transactions for prompt
        transactions_str = self._format_transactions_for_prompt(transactions)
        
        # Build the prompt with current date context
        prompt = self._build_insight_prompt(query, transactions_str, category_context, datetime.now())
        
        # Call LLM
        try:
            response = self._call_llm(llm_config, prompt)
            
            return {
                "success": True,
                "insight": response,
                "transaction_count": len(transactions),
                "query": query
            }
        except Exception as e:
            return {"error": str(e)}
    
    def generate_insights_mcp(self, query: str, start_date: Optional[datetime] = None,
                              end_date: Optional[datetime] = None) -> dict:
        """Generate insights using MCP tool calling with agentic loop."""
        
        from services.tool_calling_service import ToolCallingService
        
        llm_config = self.db.query(LLMConfiguration).filter(
            LLMConfiguration.is_active == True
        ).first()
        
        if not llm_config:
            return {"error": "No active LLM configuration found"}
        
        tool_service = ToolCallingService(self.db)
        
        # Build the prompt with tools info
        start_date_str = start_date.strftime("%Y-%m-%d") if start_date else None
        end_date_str = end_date.strftime("%Y-%m-%d") if end_date else None
        
        prompt = tool_service.build_prompt_with_tools(query, start_date_str, end_date_str)
        
        # Call LLM with tools using agentic loop
        try:
            response = self._call_llm_with_tools_agentic_loop(
                llm_config, prompt, tool_service.tools, tool_service
            )
            
            return {
                "success": True,
                "response": response,
                "query": query,
                "tool_calls_used": True
            }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {"error": str(e)}

    def _build_category_context_for_insights(self, categories: List[Category]) -> str:
        """Build category context string for insights generation."""
        parent_cats = sorted(
            [c for c in categories if c.parent_id is None],
            key=lambda c: c.name
        )
        
        lines = []
        for cat in parent_cats:
            subcats = sorted(
                [c for c in categories if c.parent_id == cat.id],
                key=lambda c: c.name
            )
            if subcats:
                subcat_names = ", ".join([s.name for s in subcats])
                lines.append(f"- {cat.name} (subcategories: {subcat_names})")
            else:
                lines.append(f"- {cat.name}")
        
        return "\n".join(lines)

    def _format_transactions_for_prompt(self, transactions: List[Transaction]) -> str:
        """Format transactions as a readable string for the prompt."""
        if not transactions:
            return "No transactions found."
        
        lines = [f"Total transactions: {len(transactions)}", ""]
        
        # Group by category
        cat_transactions = {}
        for t in transactions:
            cat_name = t.category.name if t.category else "Uncategorized"
            if cat_name not in cat_transactions:
                cat_transactions[cat_name] = []
            cat_transactions[cat_name].append(t)
        
        for cat_name, txns in sorted(cat_transactions.items(), key=lambda x: -sum(abs(t.amount) for t in x[1]))[:10]:
            total = sum(t.amount for t in txns)
            lines.append(f"### {cat_name} (${abs(total):,.2f})")
            
            # Show top 3 transactions per category
            sorted_txns = sorted(txns, key=lambda t: abs(t.amount), reverse=True)[:3]
            for t in sorted_txns:
                date_str = t.date.strftime('%Y-%m-%d')
                desc = t.description[:50] + "..." if len(t.description) > 50 else t.description
                lines.append(f"  - {date_str}: {desc} (${abs(t.amount):,.2f})")
            
            if len(txns) > 3:
                lines.append(f"  ... and {len(txns) - 3} more transactions")
            lines.append("")
        
        return "\n".join(lines)

    def _build_insight_prompt(self, query: str, transactions_str: str,
                              category_context: str, current_date: Optional[datetime] = None) -> str:
        """Build the prompt for insight generation."""
        if not current_date:
            current_date = datetime.now()
        
        date_context = f"Current Date: {current_date.strftime('%Y-%m-%d')}\n\n"
        
        return f"""You are a financial data analyst. Analyze the following transaction data and answer the user's question.

{date_context}Transaction Summary:
{transactions_str}

Available Categories:
{category_context}

User Question: {query}

Instructions:
1. Base your answer ONLY on the transaction data provided above
2. If the data doesn't contain enough information, state that clearly
3. Use specific numbers and percentages when possible
4. Format responses clearly with bullet points or numbered lists where appropriate
5. If asking for comparisons, provide relative context (e.g., "X is Y% of your total spending")
6. For subscription services, look for recurring patterns in descriptions and amounts
7. When answering date-based questions (e.g., "this month", "last quarter"), use the current date provided above

Answer:"""

    def _call_llm_with_tools_agentic_loop(self, config: LLMConfiguration, prompt: str, tools: list, tool_service) -> str:
        """Call LLM with tools in a loop until it returns final answer (not tool calls)."""
        import re
        
        provider = config.provider.lower()
        model_name = config.model_name
        max_iterations = 5
        iteration = 0
        
        messages = [
            {"role": "system", "content": "You are a financial data analyst. Use the provided tools to answer questions about transactions."},
            {"role": "user", "content": prompt}
        ]
        
        while iteration < max_iterations:
            iteration += 1
            print(f"\n[AGENTIC LOOP] Iteration {iteration}/{max_iterations}")
            
            try:
                if provider == "openai":
                    from openai import OpenAI
                    
                    client_kwargs = {}
                    base_url = getattr(config, 'base_url', None)
                    api_key = getattr(config, 'api_key', None)
                    
                    if base_url:
                        if not base_url.endswith('/v1'):
                            base_url = base_url.rstrip('/') + '/v1'
                        client_kwargs["base_url"] = base_url
                    if api_key:
                        client_kwargs["api_key"] = api_key
                    else:
                        client_kwargs["api_key"] = "not-needed"
                    
                    client = OpenAI(**client_kwargs)
                    
                    response = client.chat.completions.create(
                        model=model_name,
                        messages=messages,
                        temperature=getattr(config, 'temperature', 0.3),
                        max_tokens=getattr(config, 'max_tokens', 2000),
                        tools=[{"type": "function", "function": t["function"]} for t in tools]
                    )
                    
                    choice = response.choices[0]
                    message = choice.message
                    
                    tool_calls_found = False
                    
                    if hasattr(message, 'tool_calls') and message.tool_calls:
                        tool_calls_found = True
                        print(f"[AGENTIC LOOP] LLM called {len(message.tool_calls)} tool(s)")
                        
                        messages.append({"role": "assistant", "content": message.content or ""})
                        
                        for tool_call in message.tool_calls:
                            tool_name = tool_call.function.name
                            try:
                                args = tool_call.function.arguments
                                if isinstance(args, str):
                                    tool_args = json.loads(args)
                                else:
                                    tool_args = args if args else {}
                                
                                print(f"  - Executing {tool_name} with args: {list(tool_args.keys())}")
                                result = tool_service.execute_tool(tool_name, tool_args)
                                
                                messages.append({
                                    "role": "tool",
                                    "content": json.dumps(result),
                                    "tool_call_id": tool_call.id
                                })
                            except Exception as e:
                                print(f"  - Error executing {tool_name}: {str(e)}")
                                messages.append({
                                    "role": "tool",
                                    "content": json.dumps({"error": str(e)}),
                                    "tool_call_id": tool_call.id
                                })
                    else:
                        content = message.content or ""
                        tool_call_pattern = r'\{\s*"name"\s*:\s*"([^"]+)"[^}]*"arguments"\s*:\s*(\{[^}]+\})\s*\}'
                        matches = re.findall(tool_call_pattern, content, re.DOTALL)
                        
                        if matches:
                            tool_calls_found = True
                            print(f"[AGENTIC LOOP] LLM made {len(matches)} tool call(s) in text")
                            
                            messages.append({"role": "assistant", "content": content})
                            
                            for tool_name, args_str in matches:
                                try:
                                    tool_args = json.loads(args_str)
                                    print(f"  - Executing {tool_name}")
                                    result = tool_service.execute_tool(tool_name, tool_args)
                                    
                                    messages.append({
                                        "role": "tool",
                                        "content": json.dumps(result),
                                        "tool_call_id": f"manual_{len(messages)}"
                                    })
                                except Exception as e:
                                    print(f"  - Error executing {tool_name}: {str(e)}")
                                    messages.append({
                                        "role": "tool",
                                        "content": json.dumps({"error": str(e)}),
                                        "tool_call_id": f"manual_{len(messages)}"
                                    })
                    
                    if not tool_calls_found:
                        print(f"[AGENTIC LOOP] No tool calls found - returning final answer")
                        return message.content or ""
                    
                elif provider == "anthropic":
                    import anthropic
                    
                    client = anthropic.Anthropic(api_key=config.api_key)
                    response = client.messages.create(
                        model=model_name,
                        max_tokens=getattr(config, 'max_tokens', 2000),
                        temperature=getattr(config, 'temperature', 0.3),
                        messages=messages
                    )
                    return response.content[0].text
                
                elif provider == "ollama":
                    return self._call_llm(config, prompt)
                
            except Exception as e:
                print(f"[AGENTIC LOOP] Error: {str(e)}")
                raise
        
        print(f"[AGENTIC LOOP] Max iterations ({max_iterations}) reached")
        return "I was unable to complete the analysis within the iteration limit."
    
    def _call_llm(self, config: LLMConfiguration, prompt: str) -> str:
        """Call the configured LLM with the prompt."""
        provider = config.provider.lower()
        model_name = config.model_name
        
        try:
            if provider == "openai":
                client_kwargs = {}
                base_url = getattr(config, 'base_url', None)
                api_key = getattr(config, 'api_key', None)
                
                if base_url:
                    if not base_url.endswith('/v1'):
                        base_url = base_url.rstrip('/') + '/v1'
                    client_kwargs["base_url"] = base_url
                if api_key:
                    client_kwargs["api_key"] = api_key
                else:
                    client_kwargs["api_key"] = "not-needed"
                
                client = OpenAI(**client_kwargs)
                response = client.chat.completions.create(
                    model=model_name,
                    messages=[{"role": "user", "content": prompt}],
                    temperature=getattr(config, 'temperature', 0.3),
                    max_tokens=getattr(config, 'max_tokens', 1000)
                )
                return response.choices[0].message.content
                
            elif provider == "anthropic":
                client = anthropic.Anthropic(api_key=config.api_key)
                response = client.messages.create(
                    model=model_name,
                    max_tokens=getattr(config, 'max_tokens', 1000),
                    temperature=getattr(config, 'temperature', 0.3),
                    messages=[{"role": "user", "content": prompt}]
                )
                return response.content[0].text
                
            elif provider == "ollama":
                # Set Ollama host temporarily
                original_host = os.environ.get("OLLAMA_HOST")
                try:
                    if config.base_url:
                        os.environ["OLLAMA_HOST"] = config.base_url.rstrip('/')
                    
                    response = ollama.generate(
                        model=model_name,
                        prompt=prompt,
                        options={
                            "temperature": getattr(config, 'temperature', 0.3),
                            "num_predict": getattr(config, 'max_tokens', 1000)
                        }
                    )
                    return response['response']
                except Exception as ollama_error:
                    # Re-raise with more context
                    raise Exception(f"Ollama connection failed: {str(ollama_error)}")
                finally:
                    if original_host is not None:
                        os.environ["OLLAMA_HOST"] = original_host
                    elif "OLLAMA_HOST" in os.environ:
                        del os.environ["OLLAMA_HOST"]
            else:
                raise ValueError(f"Unsupported LLM provider: {provider}")
                
        except Exception as e:
            # Don't wrap the error - return it directly for better debugging
            raise Exception(f"LLM API error ({provider}/{model_name}): {str(e)}")
