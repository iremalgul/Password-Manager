from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from ..models.models import Base
from .database import SQLALCHEMY_DATABASE_URL

def init_db():
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.drop_all(bind=engine)  # Drop all tables first
    Base.metadata.create_all(bind=engine)  # Create all tables
    print("Database initialized successfully!")

if __name__ == "__main__":
    init_db() 