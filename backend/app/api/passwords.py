from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..db.database import get_db
from ..models.models import User, StoredPassword
from ..schemas.schemas import StoredPasswordCreate, StoredPassword as StoredPasswordSchema
from ..core.auth import get_current_user
from ..utils.crypto import encrypt_password, decrypt_password, generate_key
import base64

router = APIRouter()

@router.post("/passwords", response_model=StoredPasswordSchema)
def create_password(
    password_data: StoredPasswordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )

    try:
        # Check if a password already exists for this website and username
        existing_password = db.query(StoredPassword).filter(
            StoredPassword.user_id == current_user.id,
            StoredPassword.website == password_data.website,
            StoredPassword.username == password_data.username
        ).first()

        if existing_password:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Duplicate entry: A password already exists for {password_data.website} with username {password_data.username}. Would you like to update it?"
            )

        # Generate encryption key from master password
        salt, key = generate_key(current_user.hashed_password)
        
        # Encrypt the password
        encrypted_password, iv = encrypt_password(password_data.password, key)
        
        # Create new stored password
        db_password = StoredPassword(
            user_id=current_user.id,
            website=password_data.website,
            username=password_data.username,
            encrypted_password=encrypted_password,
            salt=base64.b64encode(salt).decode(),  # Store salt as base64 string
            iv=iv
        )
        db.add(db_password)
        db.commit()
        db.refresh(db_password)
        return db_password
    except HTTPException as he:
        raise he
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@router.get("/passwords", response_model=List[StoredPasswordSchema])
def get_passwords(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    passwords = db.query(StoredPassword).filter(
        StoredPassword.user_id == current_user.id
    ).all()
    return passwords

@router.get("/passwords/{password_id}")
def get_password(
    password_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    password = db.query(StoredPassword).filter(
        StoredPassword.id == password_id,
        StoredPassword.user_id == current_user.id
    ).first()
    
    if not password:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found"
        )
    
    # Generate key using stored salt
    salt = base64.b64decode(password.salt)
    _, key = generate_key(current_user.hashed_password, salt)
    
    # Decrypt password
    decrypted_password = decrypt_password(password.encrypted_password, password.iv, key)
    
    return {
        "id": password.id,
        "website": password.website,
        "username": password.username,
        "password": decrypted_password
    }

@router.delete("/passwords/{password_id}")
def delete_password(
    password_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    password = db.query(StoredPassword).filter(
        StoredPassword.id == password_id,
        StoredPassword.user_id == current_user.id
    ).first()
    
    if not password:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Password not found"
        )
    
    db.delete(password)
    db.commit()
    return {"message": "Password deleted successfully"}

@router.put("/passwords/update")
def update_password(
    password_data: StoredPasswordCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Find the existing password
    existing_password = db.query(StoredPassword).filter(
        StoredPassword.user_id == current_user.id,
        StoredPassword.website == password_data.website,
        StoredPassword.username == password_data.username
    ).first()

    if not existing_password:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No password found for {password_data.website} with username {password_data.username}"
        )

    # Generate new encryption key
    salt, key = generate_key(current_user.hashed_password)
    
    # Encrypt the new password
    encrypted_password, iv = encrypt_password(password_data.password, key)
    
    # Update the password
    existing_password.encrypted_password = encrypted_password
    existing_password.salt = base64.b64encode(salt).decode()
    existing_password.iv = iv
    
    db.commit()
    db.refresh(existing_password)
    
    return {"message": "Password updated successfully"} 