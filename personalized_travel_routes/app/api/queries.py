from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload, aliased
from sqlalchemy.orm.attributes import flag_modified
from typing import Optional, List, Union
from datetime import date

from database.db import get_db
from database.models import Query as DBQuery 
from database.models import Route as DBRoute, RouteLocationMap, Location, Activity

from app import schemas
from app.nlp.processor import extract_travel_info
from app.routing.generator import generate_route

print("DEBUG: Loading app/api/queries.py module")

router = APIRouter(
    prefix="/queries",
    tags=["queries"],
)

print("DEBUG: APIRouter 'queries' defined")

@router.post("/", response_model=Union[schemas.FullRouteDetailsResponse, schemas.ClarificationRequired]) 
def process_and_save_query(
    structured_query: schemas.StructuredQuery,
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID", description="ID of the authenticated user") 
):
    print(f"DEBUG: POST /queries/ endpoint reached for user_id: {x_user_id}")
    nlp_results = extract_travel_info(structured_query.query_text)

    all_destinations = set(structured_query.destination) 
    all_destinations.update(nlp_results.get("destination", [])) 

    if not all_destinations:
        print("Destination not found. Returning ClarificationRequired response.")
        return schemas.ClarificationRequired(
            message="А где бы вы хотели отдохнуть?", 
            missing_fields=["destination"] 
        )

    parameters_to_save_initial = {
         "interests": nlp_results.get("interests", []),
         "travel_style": nlp_results.get("travel_style"),
         "destination": list(all_destinations),
         "raw_entities": nlp_results.get("raw_entities", []),
         "start_date": structured_query.start_date.isoformat() if structured_query.start_date else None,
         "end_date": structured_query.end_date.isoformat() if structured_query.end_date else None,
         "budget": structured_query.budget,
         "budget_currency": structured_query.budget_currency
    }

    user_id = x_user_id 

    db_query_obj = DBQuery( 
        user_id=user_id,
        query_text=structured_query.query_text,
        parameters=parameters_to_save_initial 
    )

    try:
        db.add(db_query_obj)
        db.commit()
        db.refresh(db_query_obj)
        print(f"Initial Query saved with ID: {db_query_obj.id} for user {user_id}")
    except Exception as e:
        db.rollback()
        print(f"Error saving initial query: {e}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to save initial query: {str(e)}")

    db_route_generated: Optional[DBRoute] = None 

    try:
        status_code_gen, message_gen, route_text_generated, db_route_generated = generate_route(
            destinations=list(all_destinations),
            start_date=structured_query.start_date,
            end_date=structured_query.end_date,
            budget=structured_query.budget,
            budget_currency=structured_query.budget_currency,
            interests=nlp_results.get("interests", []),
            travel_style=nlp_results.get("travel_style"),
            user_id=user_id,
            query_id=db_query_obj.id,
            db_session=db
        )
        print(f"Route generation result: Status={status_code_gen}, Message='{message_gen}', Route ID={db_route_generated.id if db_route_generated else 'None'} for user {user_id}")

        if status_code_gen != 200:
             raise HTTPException(status_code=status_code_gen, detail=message_gen)

        if db_route_generated is None:
             print("Error: generate_route returned status 200 but db_route_generated is None.")
             raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Internal generation error: Route object is missing.")

        try:           
             current_parameters = dict(db_query_obj.parameters) 
             current_parameters['route_id'] = db_route_generated.id
             
             db_query_obj.parameters = current_parameters 
             flag_modified(db_query_obj, "parameters") 

             db.commit()
             db.refresh(db_query_obj) 
             print(f"Successfully updated parameters for query {db_query_obj.id}. route_id in DB parameters: {db_query_obj.parameters.get('route_id')}.")
        except Exception as e:
             db.rollback()
             print(f"Warning: Failed to update query {db_query_obj.id} parameters with route_id: {e}")



        route_locations_map_entries = db.query(RouteLocationMap).options(
            joinedload(RouteLocationMap.location),
            joinedload(RouteLocationMap.activity)  
        ).filter(RouteLocationMap.route_id == db_route_generated.id).order_by(RouteLocationMap.visit_order).all()

        locations_on_route_list = []
        for rlm_entry in route_locations_map_entries:
            location_obj = rlm_entry.location
            activity_obj = rlm_entry.activity
            
            if location_obj:
                locations_on_route_list.append(schemas.RouteLocationDetail(
                    map_id=rlm_entry.id, 
                    location_id=location_obj.id,
                    location_name=location_obj.name,
                    location_description=location_obj.description,
                    location_type=location_obj.type,
                    activity_id=activity_obj.id if activity_obj else None,
                    activity_name=activity_obj.name if activity_obj else None,
                    activity_description=activity_obj.description if activity_obj else None,
                    visit_order=rlm_entry.visit_order,
                ))

        full_response_data = {
            "query_id": db_query_obj.id,
            "route_id": db_route_generated.id,
            "route_text": route_text_generated,
            "total_cost": db_route_generated.total_cost,
            "total_cost_currency": db_route_generated.total_cost_currency,
            "duration_days": db_route_generated.duration_days,
            "is_finalized": db_route_generated.is_finalized, 
            "locations_on_route": locations_on_route_list  
        }
        
        return schemas.FullRouteDetailsResponse(**full_response_data)

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        db.rollback() 
        print(f"Critical error during route generation or response formation for user {x_user_id}, query {db_query_obj.id}: {e}")
        import traceback
        traceback.print_exc() 
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"An unexpected error occurred: {str(e)}")


@router.get("/history/{user_id}", response_model=List[schemas.Query])
def get_user_queries(user_id: int, db: Session = Depends(get_db)):
    user_db_queries = db.query(DBQuery).filter(DBQuery.user_id == user_id).order_by(DBQuery.created_at.desc()).all()
    return user_db_queries