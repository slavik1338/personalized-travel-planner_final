from pydantic import BaseModel, Field, model_validator
from typing import List, Optional, Any, Tuple, Union
from datetime import datetime, date, timedelta


class UserCreate(BaseModel):
    email: str
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserUpdate(BaseModel):
    interests: Optional[str] = None 
    travel_style: Optional[str] = None
    budget: Optional[float] = Field(None, ge=0)
    budget_currency: Optional[str] = None

class User(BaseModel):
    id: int
    email: str
    interests: Optional[str] = None
    travel_style: Optional[str] = None
    budget: Optional[float] = None
    budget_currency: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True 

class StructuredQuery(BaseModel):
    query_text: str 
    start_date: date 
    end_date: date   
    budget: Optional[float] = Field(None, ge=0) 
    budget_currency: Optional[str] = None 
    destination: List[str] = Field(default_factory=list) 

class ExtractedParams(BaseModel):
    interests: List[str] = Field(default_factory=list) 
    travel_style: Optional[str] = None 
    destination: List[str] = Field(default_factory=list) 
    raw_entities: Optional[List[Tuple[str, str]]] = None 
    route_id: Optional[int] = None
    start_date: Optional[str] = None 
    end_date: Optional[str] = None   
    budget: Optional[float] = None
    budget_currency: Optional[str] = None

class QueryCreate(BaseModel):
     user_id: int
     query_text: str
     parameters: ExtractedParams 

class Query(QueryCreate): 
     id: int
     created_at: datetime

     class Config:
         from_attributes = True 

class ClarificationRequired(BaseModel):
    status: str = "clarification_required"
    message: str 
    missing_fields: List[str] 

class RouteDetailsResponse(BaseModel):
     query_id: Optional[int] = None 
     route_id: int 
     route_text: str 
     is_finalized: bool = False

     total_cost: Optional[float] = None
     total_cost_currency: Optional[str] = None
     duration_days: Optional[int] = None
    
class RouteLocationDetail(BaseModel):
    map_id: int
    location_id: int
    location_name: str
    location_description: Optional[str] = None
    location_type: Optional[str] = None
    activity_id: Optional[int] = None
    activity_name: Optional[str] = None
    activity_description: Optional[Optional[str]] = None
    visit_order: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    visit_duration_hours: Optional[float] = Field(None, ge=0)

    class Config:
        from_attributes = True

class FullRouteDetailsResponse(RouteDetailsResponse): 
     locations_on_route: List[RouteLocationDetail] = []


class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5, description="Rating from 1 to 5")
    comment: Optional[str] = Field(None, description="Optional comment for the review")

class ReviewCreate(ReviewBase):
    location_id: Optional[int] = Field(None, description="ID of the location being reviewed")
    activity_id: Optional[int] = Field(None, description="ID of the activity being reviewed")

    @model_validator(mode='after')
    def check_exclusive_target(cls, values):
        # В Pydantic v2 model_validator получает саму модель (или её данные)
        # values здесь будет экземпляром ReviewCreate или словарем, в зависимости от контекста
        # Доступ к полям как к атрибутам, если values - это модель
        location_id = getattr(values, 'location_id', None)
        activity_id = getattr(values, 'activity_id', None)

        if location_id is not None and activity_id is not None:
            raise ValueError('Cannot provide both location_id and activity_id. Review target must be exclusive.')
        if location_id is None and activity_id is None:
            raise ValueError('Must provide either location_id or activity_id for the review.')
        return values

class ReviewDisplay(ReviewBase):
    id: int
    user_id: int
    location_id: Optional[int] = None
    activity_id: Optional[int] = None
    review_date: datetime

    class Config:
        from_attributes = True 


class SearchResultItem(BaseModel):
    id: int
    name: str
    item_type: str
    description: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    class Config:
        from_attributes = True

class RecommendedItem(BaseModel):
    id: int
    name: str
    item_type: str  
    description: Optional[str] = None
    rating: Optional[float] = None
    city: Optional[str] = None
    country: Optional[str] = None

    class Config:
        from_attributes = True

class POIReplacementRequest(BaseModel):
    new_item_type: str = Field(..., pattern="^(location|activity)$") # Валидация значения
    new_item_id: int

class POIAdditionRequest(BaseModel):
    item_type: str = Field(..., pattern="^(location|activity)$")
    item_id: int
    #add_after_map_id: Optional[int] = None