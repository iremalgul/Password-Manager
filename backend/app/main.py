from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .api import users, passwords
from .db.database import engine, Base

# Create database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Password Manager API")

# Configure CORS for Chrome extension
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],  # Allow requests from Chrome extension
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api", tags=["users"])
app.include_router(passwords.router, prefix="/api", tags=["passwords"])

@app.get("/")
async def root():
    return {"message": "Password Manager API is running"} 