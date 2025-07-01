from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_
from typing import List, Optional

from database.db import get_db
from database.models import User as DBUser, Location as DBLocation, Activity as DBActivity
from app import schemas

router_recommendations = APIRouter(
    prefix="/recommendations",
    tags=["recommendations"],
)

MAX_RECOMMENDATIONS = 15

@router_recommendations.get("/personalized", response_model=List[schemas.RecommendedItem])
def get_personalized_recommendations(
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    user = db.query(DBUser).filter(DBUser.id == x_user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if not user.interests:
        return []

    user_interest_list = [interest.strip().lower() for interest in user.interests.split(';') if interest.strip()]
    if not user_interest_list:
        return []

    recommended_items_dict = {} 

    location_conditions = [DBLocation.type.ilike(f"%{interest}%") for interest in user_interest_list]
    
    db_locations = db.query(DBLocation).filter(
        or_(*location_conditions)
    ).order_by(DBLocation.rating.desc().nulls_last()).limit(MAX_RECOMMENDATIONS).all()

    for loc in db_locations:
        key = ("location", loc.id)
        if key not in recommended_items_dict:
            recommended_items_dict[key] = schemas.RecommendedItem(
                id=loc.id,
                name=loc.name,
                item_type="location",
                description=loc.description,
                rating=loc.rating,
                city=loc.city,
                country=loc.country
            )

    if len(recommended_items_dict) < MAX_RECOMMENDATIONS:
        activity_conditions = [DBActivity.activity_type.ilike(f"%{interest}%") for interest in user_interest_list]
        
        db_activities_query = db.query(DBActivity).join(
            DBLocation, DBActivity.location_id == DBLocation.id
        ).options(
            joinedload(DBActivity.location) 
        ).filter(
            or_(*activity_conditions)
        )
        
        db_activities_query = db_activities_query.order_by(
            DBLocation.rating.isnot(None).desc(),
            DBLocation.rating.desc().nulls_last()  
        )
        
        activities_to_fetch_limit = (MAX_RECOMMENDATIONS - len(recommended_items_dict)) * 2 + 5 
        db_activities = db_activities_query.limit(activities_to_fetch_limit).all()

        for act in db_activities:
            if len(recommended_items_dict) >= MAX_RECOMMENDATIONS:
                break

            key_activity = ("activity", act.id)
            key_location_of_activity = ("location", act.location_id) if act.location else None

            if key_activity not in recommended_items_dict and \
               (key_location_of_activity is None or key_location_of_activity not in recommended_items_dict):
                recommended_items_dict[key_activity] = schemas.RecommendedItem(
                    id=act.id,
                    name=f"{act.name} (в {act.location.name if act.location else 'Неизвестно'})",
                    item_type="activity",
                    description=act.description,
                    rating=act.location.rating if act.location and act.location.rating is not None else None,
                    city=act.location.city if act.location else None,
                    country=act.location.country if act.location else None
                )
    
    final_recommendations = list(recommended_items_dict.values())
    return final_recommendations[:MAX_RECOMMENDATIONS]