# Budget Tracker

A self-hosted budget tracking application inspired by Monarch Money. Features AI-powered transaction categorization, interactive Sankey diagrams, and a modern responsive UI.

## Features

- **CSV Import**: Upload bank transaction CSV files with auto-detection of columns
- **AI-Powered Categorization**: Automatically categorize transactions using configurable LLM providers (OpenAI, Anthropic, Ollama)
- **Interactive Sankey Diagrams**: Visualize money flow from income to expenses with drill-down capabilities
- **Transaction Management**: Edit, categorize, and search through all transactions
- **Responsive Design**: Modern UI that works on desktop and mobile
- **Privacy-First**: Self-hosted with local SQLite database

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **SQLAlchemy** - ORM for database operations
- **SQLite** - Local database storage
- **Pandas** - CSV parsing and data processing

### Frontend
- **React 18** - UI library with TypeScript
- **Tailwind CSS** - Utility-first styling
- **TanStack Query** - Data fetching and caching
- **Plotly.js** - Interactive Sankey diagrams
- **Recharts** - Bar charts and visualizations

### AI Integration
- **OpenAI GPT** - Cloud-based categorization
- **Anthropic Claude** - Alternative cloud provider
- **Ollama** - Local LLM support for privacy

## Quick Start

### Prerequisites
- Python 3.9+
- Node.js 18+

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the server
python -m uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Usage

1. **Configure LLM Provider**: Go to Settings and add your LLM configuration (OpenAI API key, Anthropic key, or Ollama local endpoint)

2. **Import Transactions**: Use the Import page to upload your bank CSV files. The app auto-detects common column formats.

3. **Auto-Categorize**: After import, use the AI auto-categorization feature to automatically classify transactions.

4. **View Analytics**: Check the Dashboard and Analytics pages to see your spending breakdown via interactive Sankey diagrams and charts.

5. **Manage Transactions**: Use the Transactions page to search, filter, and manually edit transaction categories.

## CSV Format Support

The app supports various bank CSV formats with auto-detection for:
- Date columns (various formats)
- Description/Memo columns
- Amount columns (single or separate debit/credit)
- Account name columns

## AI Categorization

The app uses LLMs to intelligently categorize transactions based on:
- Transaction description
- Amount and date
- Historical patterns

Categories include: Housing, Food, Transportation, Shopping, Entertainment, Health, Financial, Education, Travel, and more.

## License

MIT
