from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.primitives import padding
from cryptography.hazmat.backends import default_backend
from passlib.context import CryptContext
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives import hashes
import os
import base64

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Generate password hash."""
    return pwd_context.hash(password)

def generate_key(master_password: str, salt: bytes = None) -> tuple[bytes, bytes]:
    """Generate encryption key from master password using PBKDF2."""
    if salt is None:
        salt = os.urandom(16)
    
    # Use PBKDF2 to derive a key from the master password
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,  # 256 bits for AES-256
        salt=salt,
        iterations=100000,
        backend=default_backend()
    )
    
    key = kdf.derive(master_password.encode())
    return salt, key

def encrypt_password(password: str, key: bytes) -> tuple[str, str]:
    """Encrypt a password using AES-256-CBC."""
    # Generate random IV
    iv = os.urandom(16)
    
    # Pad the password
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(password.encode()) + padder.finalize()
    
    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend()
    )
    
    # Encrypt
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()
    
    # Return base64 encoded encrypted data and IV
    return (
        base64.b64encode(encrypted_data).decode(),
        base64.b64encode(iv).decode()
    )

def decrypt_password(encrypted_password: str, iv: str, key: bytes) -> str:
    """Decrypt a password using AES-256-CBC."""
    # Decode base64
    encrypted_data = base64.b64decode(encrypted_password)
    iv = base64.b64decode(iv)
    
    # Create cipher
    cipher = Cipher(
        algorithms.AES(key),
        modes.CBC(iv),
        backend=default_backend()
    )
    
    # Decrypt
    decryptor = cipher.decryptor()
    padded_data = decryptor.update(encrypted_data) + decryptor.finalize()
    
    # Unpad
    unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
    data = unpadder.update(padded_data) + unpadder.finalize()
    
    return data.decode() 