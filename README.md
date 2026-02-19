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

### Backend Setup (Local Development)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`

### Frontend Setup (Local Development)

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

## Docker Deployment

### Prerequisites
- Docker (v20+) or Podman
- Docker Compose (v2.0+) or podman-compose

### Quick Start with Docker Compose

```bash
cd /ai/python/morpho

# Build and start the container
docker compose up -d --build

# View logs
docker compose logs -f morpho

# Stop the application
docker compose down
```

The application will be available at `http://localhost:8080` with:
- **Frontend UI** (main application)
- API Documentation at `/docs`
- Health check at `/health`

**Note**: The database is stored in the container filesystem (`/app/data/budget.db`). Data persists across container restarts only if you add a volume mount. See the Data Persistence section below.

### Environment Variables

The following environment variables can be configured in `docker-compose.yml` or via the UI:

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHONUNBUFFERED` | Disable Python output buffering | `1` |
| `PYTHONDONTWRITEBYTECODE` | Prevent Python from writing .pyc files | `1` |
| `PORT` | Server port (frontend + backend API) | `8080` |

For LLM API keys, configure them through the Settings page in the UI after deployment.

### Manual Docker Build

```bash
# Build the image
docker build -t morpho-budget-tracker .

# Run with data persistence
docker run -d \
  --name morpho \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e PYTHONUNBUFFERED=1 \
  morpho-budget-tracker
```

### Manual Docker Build

```bash
# Build the image
docker build -t morpho-budget-tracker .

# Run the container
docker run -d \
  --name morpho \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -e PYTHONUNBUFFERED=1 \
  morpho-budget-tracker
```

### Environment Variables

The following environment variables can be configured (or set via the UI):

| Variable | Description | Default |
|----------|-------------|---------|
| `PYTHONUNBUFFERED` | Disable Python output buffering | `1` |
| `PYTHONDONTWRITEBYTECODE` | Prevent Python from writing .pyc files | `1` |
| `PORT` | Server port (frontend + backend API) | `8080` |

For LLM API keys, configure them through the Settings page in the UI after deployment.

### Data Persistence

The SQLite database is stored in `/app/data` inside the container. To persist data across container restarts, add a volume mount to your `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
```

Or for manual docker runs:
```bash
-v $(pwd)/data:/app/data
```

Your data will be saved in the `./data` directory on your host machine.

**User Permissions**: The container runs as a non-root user (`appuser`) with UID/GID 1000 by default. For bind mounts to work correctly, ensure the host `./data` directory is writable by this user (e.g., `chmod 775 ./data` or use a named volume).

## Development

### Backend Development

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The backend will be available at `http://localhost:8000`.

### Frontend Development

```bash
cd frontend
npm install
npm run dev
```

The frontend development server will be available at `http://localhost:5173` and will proxy API requests to the backend (default: http://localhost:8000).

## Project Structure

```
morpho/
├── backend/
│   ├── app/              # FastAPI application
│   │   └── main.py       # Main FastAPI app
│   ├── models/           # Database models
│   ├── routers/          # API endpoints
│   ├── services/         # Business logic
│   ├── requirements.txt  # Python dependencies
│   └── financial_data.db
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── hooks/        # Custom hooks
│   │   ├── utils/        # Utility functions
│   │   └── App.tsx       # Main React app
│   ├── public/
│   ├── package.json
│   └── vite.config.ts
├── data/                 # Persistent data (database)
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## License

MIT
