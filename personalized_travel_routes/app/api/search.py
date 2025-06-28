# app/api/search.py
from fastapi import APIRouter, Depends, Query as FastAPIQuery
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, func as sql_func
from typing import List, Dict, Any, Tuple, Optional

from database.db import get_db
from database.models import Location as DBLocation, Activity as DBActivity
from app import schemas # Для schemas.SearchResultItem

router_search = APIRouter(
    prefix="/search",
    tags=["search"],
)


@router_search.get("/items", response_model=List[schemas.SearchResultItem])
def search_poi_items(
    query: str = FastAPIQuery(None, min_length=2, description="Search query for POI names or descriptions"),
    item_type: Optional[str] = FastAPIQuery(None, pattern="^(location|activity)$", description="Filter by item type"),
    limit: int = FastAPIQuery(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    if not query and not item_type: # Если нет ни строки поиска, ни типа, возвращаем пустоту или ошибку
         # или можно возвращать, например, популярные, если query пуст
        return []

    results_dict: Dict[Tuple[str, int], schemas.SearchResultItem] = {}

    # Поиск по локациям
    if not item_type or item_type == "location":
        loc_query = db.query(DBLocation)
        if query:
            loc_query = loc_query.filter(
                or_(
                    DBLocation.name.ilike(f"%{query}%"),
                    DBLocation.description.ilike(f"%{query}%")
                )
            )
        locations = loc_query.order_by(sql_func.coalesce(DBLocation.rating, 0).desc()).limit(limit).all()
        for loc in locations:
            key = ("location", loc.id)
            if key not in results_dict:
                results_dict[key] = schemas.SearchResultItem(
                    id=loc.id, name=loc.name, item_type="location",
                    description=loc.description, city=loc.city, country=loc.country
                    # rating=loc.rating # Если добавишь rating в SearchResultItem
                )
    
    # Поиск по активностям
    if not item_type or item_type == "activity":
        if len(results_dict) < limit: # Продолжаем поиск, только если еще не набрали лимит
            act_query = db.query(DBActivity).options(joinedload(DBActivity.location))
            if query:
                act_query = act_query.filter(
                    or_(
                        DBActivity.name.ilike(f"%{query}%"),
                        DBActivity.description.ilike(f"%{query}%")
                    )
                )
            # Сортировка активностей, например, по имени или по рейтингу связанной локации
            activities = act_query.order_by(DBActivity.name).limit(limit - len(results_dict)).all()
            for act in activities:
                key = ("activity", act.id)
                # Не добавляем активность, если ее локация уже есть в результатах как локация
                # (чтобы избежать "Эрмитаж" и "Экскурсия в Эрмитаже", если ищут "Эрмитаж")
                # или если сама активность уже добавлена
                key_loc_of_act = ("location", act.location_id) if act.location_id else None
                
                if key not in results_dict and (not key_loc_of_act or key_loc_of_act not in results_dict) :
                    results_dict[key] = schemas.SearchResultItem(
                        id=act.id,
                        name=f"{act.name}{' (в ' + act.location.name + ')' if act.location else ''}",
                        item_type="activity",
                        description=act.description,
                        city=act.location.city if act.location else None,
                        country=act.location.country if act.location else None
                        # rating=act.location.rating if act.location else None
                    )
                    if len(results_dict) >= limit:
                        break
    
    return list(results_dict.values())