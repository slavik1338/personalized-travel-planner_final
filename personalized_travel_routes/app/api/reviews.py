from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from typing import List

from database.db import get_db
from database.models import Review as DBReview, User as DBUser, Location as DBLocation, Activity as DBActivity
from app import schemas

router_reviews = APIRouter(
    prefix="/reviews",
    tags=["reviews"],
)

@router_reviews.post("/", response_model=schemas.ReviewDisplay, status_code=status.HTTP_201_CREATED)
def create_review(
    review_data: schemas.ReviewCreate,
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    user = db.query(DBUser).filter(DBUser.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if review_data.location_id:
        target = db.query(DBLocation).filter(DBLocation.id == review_data.location_id).first()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location with id {review_data.location_id} not found")
    elif review_data.activity_id:
        target = db.query(DBActivity).filter(DBActivity.id == review_data.activity_id).first()
        if not target:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Activity with id {review_data.activity_id} not found")
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Either location_id or activity_id must be provided")

    existing_review = db.query(DBReview).filter(
        DBReview.user_id == x_user_id,
        DBReview.location_id == review_data.location_id if review_data.location_id else None,
        DBReview.activity_id == review_data.activity_id if review_data.activity_id else None
    ).first()
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this item."
        )

    db_review = DBReview(
        **review_data.model_dump(exclude_unset=True),
        user_id=x_user_id
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@router_reviews.get("/location/{location_id}", response_model=List[schemas.ReviewDisplay])
def get_reviews_for_location(location_id: int, db: Session = Depends(get_db)):
    location = db.query(DBLocation).filter(DBLocation.id == location_id).first()
    if not location:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Location not found")

    reviews = db.query(DBReview).filter(DBReview.location_id == location_id).order_by(DBReview.review_date.desc()).all()
    return reviews

@router_reviews.get("/activity/{activity_id}", response_model=List[schemas.ReviewDisplay])
def get_reviews_for_activity(activity_id: int, db: Session = Depends(get_db)):
    activity = db.query(DBActivity).filter(DBActivity.id == activity_id).first()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity not found")

    reviews = db.query(DBReview).filter(DBReview.activity_id == activity_id).order_by(DBReview.review_date.desc()).all()
    return reviews

@router_reviews.get("/user/{user_id}", response_model=List[schemas.ReviewDisplay])
def get_reviews_by_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(DBUser).filter(DBUser.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    reviews = db.query(DBReview).filter(DBReview.user_id == user_id).order_by(DBReview.review_date.desc()).all()
    return reviews
