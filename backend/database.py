import os
import uuid
from datetime import datetime

from sqlalchemy import create_engine, Column, String, Text, DateTime, Boolean, ForeignKey, inspect, text
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./support.db")

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def gen_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    name = Column(String, nullable=True)
    role = Column(String, default="Support Agent")
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Conversation(Base):
    __tablename__ = "conversations"
    id = Column(String, primary_key=True, default=gen_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")
    ticket = relationship("Ticket", back_populates="conversation", uselist=False, cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"
    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    role = Column(String)  # "customer" or "ai"
    text = Column(Text)
    timestamp = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="messages")


class Ticket(Base):
    __tablename__ = "tickets"
    id = Column(String, primary_key=True, default=gen_uuid)
    conversation_id = Column(String, ForeignKey("conversations.id"))
    user_id = Column(String, ForeignKey("users.id"), nullable=True, index=True)
    intent = Column(String, default="General inquiry")
    category = Column(String, default="General")
    urgency = Column(String, default="low")       # low | medium | high
    sentiment = Column(String, default="neutral")  # positive | neutral | negative
    escalate = Column(Boolean, default=False)
    status = Column(String, default="open")        # open | pending | resolved | escalated
    created_at = Column(DateTime, default=datetime.utcnow)

    conversation = relationship("Conversation", back_populates="ticket")


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _run_lightweight_migrations():
    """
    Base.metadata.create_all() only creates tables that don't exist yet —
    it does NOT add new columns to a table that's already on disk. This
    adds columns introduced after the original schema to any existing
    database without touching current rows/data:
      - users.name / users.role / users.is_admin
      - conversations.user_id / tickets.user_id (data-isolation fix —
        rows created before this migration will have user_id = NULL and
        will simply no longer show up for any user, since every query
        now filters by the logged-in user's id. Nothing is deleted.)
    """
    inspector = inspect(engine)
    table_names = inspector.get_table_names()

    table_migrations = {
        "users": {
            "name": "ALTER TABLE users ADD COLUMN name VARCHAR",
            "role": "ALTER TABLE users ADD COLUMN role VARCHAR",
            "is_admin": "ALTER TABLE users ADD COLUMN is_admin BOOLEAN DEFAULT 0",
        },
        "conversations": {
            "user_id": "ALTER TABLE conversations ADD COLUMN user_id VARCHAR",
        },
        "tickets": {
            "user_id": "ALTER TABLE tickets ADD COLUMN user_id VARCHAR",
        },
    }

    with engine.begin() as conn:
        for table, migrations in table_migrations.items():
            if table not in table_names:
                continue
            existing_columns = {col["name"] for col in inspector.get_columns(table)}
            for column, ddl in migrations.items():
                if column not in existing_columns:
                    conn.execute(text(ddl))


def init_db():
    Base.metadata.create_all(bind=engine)
    _run_lightweight_migrations()
