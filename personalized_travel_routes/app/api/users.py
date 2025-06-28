from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from passlib.context import CryptContext

from database.db import get_db
from database.models import User 
from app import schemas 

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password):
    return pwd_context.hash(password)


def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)


router = APIRouter(
    prefix="/users", 
    tags=["users"], 
)

@router.post("/register", response_model=schemas.User)
def register_user(user_data: schemas.UserCreate, db: Session = Depends(get_db)):
    
    db_user = db.query(User).filter(User.email == user_data.email).first()
    if db_user:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")
    
    hashed_password = get_password_hash(user_data.password)

    new_user = User(email=user_data.email, password_hash=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user) 

    return new_user 

@router.post("/login") 
def login_user(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    
    user = db.query(User).filter(User.email == user_data.email).first()

    
    if not user or not verify_password(user_data.password, user.password_hash):
         raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")
    
    return {"message": "Login successful", "user_id": user.id} 

@router.get("/profile/{user_id}", response_model=schemas.User)
def get_user_profile(user_id: int, db: Session = Depends(get_db)):
     user = db.query(User).filter(User.id == user_id).first()
     if user is None:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
     return user 

@router.put("/profile/{user_id}", response_model=schemas.User)
def update_user_profile(user_id: int, user_update_data: schemas.UserUpdate, db: Session = Depends(get_db)):
     user = db.query(User).filter(User.id == user_id).first()
     if user is None:
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

     if user_update_data.interests is not None:
         user.interests = user_update_data.interests
     if user_update_data.travel_style is not None:
         user.travel_style = user_update_data.travel_style
     if user_update_data.budget is not None:
         user.budget = user_update_data.budget
     if user_update_data.budget_currency is not None:
         user.budget_currency = user_update_data.budget_currency

     db.commit()
     db.refresh(user) 

     return user