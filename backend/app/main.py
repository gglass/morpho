from fastapi import FastAPI
from routers.api import router as api_router

app = FastAPI()
app.include_router(api_router, prefix='/api')

# Health check endpoint
@app.get("/health")
def health_check():
    return {"status": "ok"}