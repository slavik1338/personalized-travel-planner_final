from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session, joinedload
from typing import Optional, List
from datetime import datetime, date 

from database.db import get_db
from database.models import (
    Route as DBRoute, 
    RouteLocationMap, 
    Location as DBLocation, 
    Activity as DBActivity,
    User as DBUser, 
    Query as DBQuery
)
from app import schemas
from app.services.currency import convert_currency
from app.routing.generator import format_route_text_with_days_times 
from sqlalchemy import func as sql_func


router_routes = APIRouter(
    prefix="/routes",
    tags=["routes"],
)

def _get_route_location_details_list(db_session: Session, route_id: int) -> List[schemas.RouteLocationDetail]:
    route_map_entries = db_session.query(RouteLocationMap).options(
        joinedload(RouteLocationMap.location),
        joinedload(RouteLocationMap.activity)
    ).filter(RouteLocationMap.route_id == route_id).order_by(RouteLocationMap.visit_order).all()

    details_list = []
    for rlm in route_map_entries:
        loc = rlm.location
        act = rlm.activity
        
        if not loc:
            continue


        details_list.append(schemas.RouteLocationDetail(
            map_id=rlm.id,
            location_id=loc.id,
            location_name=loc.name,
            location_description=loc.description,
            location_type=loc.type,
            activity_id=act.id if act else None,
            activity_name=act.name if act else None,
            activity_description=act.description if act else None,
            visit_order=rlm.visit_order,
            latitude=loc.latitude,
            longitude=loc.longitude,
            visit_duration_hours=None 
        ))
    return details_list


def _get_params_for_route_text_formatting(db_session: Session, route_obj: DBRoute):
    start_date_val = None
    if route_obj.start_date:
        start_date_val = route_obj.start_date
        if isinstance(start_date_val, datetime):
            start_date_val = start_date_val.date()

    destination_names = ["Обновленное направление"]
    if route_obj.query_id:
        source_query = db_session.query(DBQuery).filter(DBQuery.id == route_obj.query_id).first()
        if source_query:
            if source_query.parameters and isinstance(source_query.parameters, dict):
                dest_from_params = source_query.parameters.get('destination')
                if dest_from_params and isinstance(dest_from_params, list) and len(dest_from_params) > 0:
                    destination_names = dest_from_params
            elif source_query.query_text: 
                destination_names = [source_query.query_text.split(' ', 1)[0] if ' ' in source_query.query_text else source_query.query_text]

    return {
        "destination_names": destination_names,
        "start_date_obj": start_date_val,
        "trip_duration_days_total": route_obj.duration_days,
        "total_estimated_cost_user_currency": route_obj.total_cost if route_obj.total_cost is not None else 0.0,
        "budget_currency_str": route_obj.total_cost_currency if route_obj.total_cost_currency else "RUB"
    }


@router_routes.get("/{route_id}", response_model=schemas.FullRouteDetailsResponse) 
def get_route_details(
    route_id: int,
    db: Session = Depends(get_db),
    x_user_id: Optional[int] = Header(None, alias="X-User-ID"),
):
    print(f"--- Getting Route Details ---")
    print(f"Requested Route ID: {route_id}, User ID from header: {x_user_id}")

    if x_user_id is None: 
        print("Warning: X-User-ID header is missing for get_route_details!")

    route = db.query(DBRoute).options(
        joinedload(DBRoute.query) 
    ).filter(DBRoute.id == route_id).first()

    if route is None:
        print(f"Route with ID {route_id} NOT FOUND in database.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    
    print(f"Route found: ID={route.id}, Owner User ID={route.user_id}")

    if x_user_id is not None and route.user_id != x_user_id:
        print(f"Authorization FAILED: Route owner {route.user_id} does not match requesting user {x_user_id}.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this route")
    
    print(f"User {x_user_id} authorized for route {route_id}.")

    locations_on_route_list = _get_route_location_details_list(db, route_id)
    
    text_format_params = _get_params_for_route_text_formatting(db, route)
    generated_route_text = "Описание маршрута не удалось сформировать." 

    if text_format_params["start_date_obj"] and text_format_params["trip_duration_days_total"] is not None:
        try:
            generated_route_text = format_route_text_with_days_times(
                pois_on_route=locations_on_route_list,
                **text_format_params
            )
        except Exception as e:
            print(f"Error formatting route text in get_route_details for route {route.id}: {e}")
            import traceback
            traceback.print_exc()
    elif not locations_on_route_list:
        generated_route_text = f"Маршрут (ID: {route.id}) не содержит мест."


    response_data = {
         "query_id": route.query_id, 
         "route_id": route.id,
         "route_text": generated_route_text,
         "total_cost": route.total_cost,
         "total_cost_currency": route.total_cost_currency,
         "duration_days": route.duration_days,
         "is_finalized": route.is_finalized,
         "locations_on_route": locations_on_route_list,
    }
    print(f"Returning FullRouteDetailsResponse for route {route_id}")
    return schemas.FullRouteDetailsResponse(**response_data)


@router_routes.delete("/{route_id}/locations/{map_id}", response_model=schemas.FullRouteDetailsResponse)
def delete_poi_from_route(
    route_id: int,
    map_id: int, 
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    print(f"--- Deleting POI ---")
    print(f"User ID: {x_user_id}, Route ID: {route_id}, Map ID (RLM ID): {map_id}")

    route = db.query(DBRoute).options(
        joinedload(DBRoute.query) 
    ).filter(DBRoute.id == route_id).first()

    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.user_id != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this route")
    
    poi_to_delete = db.query(RouteLocationMap).filter(
        RouteLocationMap.id == map_id,
        RouteLocationMap.route_id == route_id 
    ).first()

    if not poi_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI map entry not found in this route")
    
    db.delete(poi_to_delete)
    db.flush() 
    
    all_remaining_pois_for_route = db.query(RouteLocationMap).filter(
        RouteLocationMap.route_id == route_id
    ).order_by(RouteLocationMap.visit_order.asc()).all()

    new_order = 0
    for poi_map_entry in all_remaining_pois_for_route:
        poi_map_entry.visit_order = new_order
        new_order += 1
    print(f"Re-ordered visit_order for route {route_id}. New count: {len(all_remaining_pois_for_route)}.")
    
    route.is_finalized = False

    total_cost_recalculated_rub = 0.0
    location_ids_in_route = [rlm.location_id for rlm in all_remaining_pois_for_route if rlm.location_id]
    activity_ids_in_route = [rlm.activity_id for rlm in all_remaining_pois_for_route if rlm.activity_id]

    if location_ids_in_route:
        locations_with_cost = db.query(DBLocation.cost, DBLocation.cost_currency).filter(DBLocation.id.in_(location_ids_in_route)).all()
        for cost, currency in locations_with_cost:
            if cost is not None and currency is not None: 
                converted_cost = convert_currency(cost, currency, "RUB")
                if converted_cost is not None:
                    total_cost_recalculated_rub += converted_cost
    
    if activity_ids_in_route:
        activities_with_cost = db.query(DBActivity.cost, DBActivity.cost_currency).filter(DBActivity.id.in_(activity_ids_in_route)).all()
        for cost, currency in activities_with_cost:
            if cost is not None and currency is not None: 
                converted_cost = convert_currency(cost, currency, "RUB")
                if converted_cost is not None:
                    total_cost_recalculated_rub += converted_cost
    
    route.total_cost = round(total_cost_recalculated_rub, 2) 
    route.total_cost_currency = "RUB"
    print(f"Recalculated total_cost for route {route_id}: {route.total_cost} RUB")

    
    try:
        db.commit()
        db.refresh(route) 
        print(f"Successfully committed deletion of POI {map_id} and updates for route {route_id}.")
    except Exception as e:
        db.rollback()
        print(f"Error during commit after deleting POI: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error after attempting to delete POI: {str(e)}")

    locations_on_route_list = _get_route_location_details_list(db, route.id)
    text_format_params = _get_params_for_route_text_formatting(db, route) 

    final_display_cost = text_format_params["total_estimated_cost_user_currency"] 
    final_display_currency = text_format_params["budget_currency_str"]         

    original_budget_currency = "RUB" 
    if route.query and route.query.parameters and isinstance(route.query.parameters, dict):
        original_budget_currency = route.query.parameters.get('budget_currency', "RUB")
    
    if original_budget_currency.upper() != "RUB" and final_display_cost is not None:
        converted_display_cost = convert_currency(final_display_cost, "RUB", original_budget_currency.upper())
        if converted_display_cost is not None:
            text_format_params["total_estimated_cost_user_currency"] = round(converted_display_cost, 2)
            text_format_params["budget_currency_str"] = original_budget_currency.upper()
        else: 
            text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost,2)
            text_format_params["budget_currency_str"] = "RUB"
    else: 
        text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost,2) if final_display_cost is not None else 0.0
        text_format_params["budget_currency_str"] = final_display_currency


    updated_route_text = "Описание маршрута не удалось сформировать."
    if text_format_params["start_date_obj"] and text_format_params["trip_duration_days_total"] is not None:
        try:
            updated_route_text = format_route_text_with_days_times(
                pois_on_route=locations_on_route_list,
                **text_format_params 
            )
        except Exception as e:
            print(f"Error formatting route text after delete for route {route.id}: {e}")
            import traceback
            traceback.print_exc()
    elif not locations_on_route_list:
        updated_route_text = f"Маршрут (ID: {route.id}) был обновлен. В маршруте не осталось мест."
    
    return schemas.FullRouteDetailsResponse(
        query_id=route.query_id,
        route_id=route.id,
        route_text=updated_route_text, 
        total_cost=text_format_params["total_estimated_cost_user_currency"], 
        total_cost_currency=text_format_params["budget_currency_str"],   
        duration_days=route.duration_days, 
        is_finalized=route.is_finalized,
        locations_on_route=locations_on_route_list
    )


@router_routes.post("/{route_id}/finalize", response_model=schemas.FullRouteDetailsResponse)
def finalize_route(
    route_id: int,
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    print(f"--- Finalizing Route ---")
    print(f"User ID: {x_user_id}, Route ID: {route_id}")

    route = db.query(DBRoute).options(
        joinedload(DBRoute.query) 
    ).filter(DBRoute.id == route_id).first()

    if not route:
        print(f"Route with ID {route_id} not found for finalization.")
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.user_id != x_user_id:
        print(f"User {x_user_id} not authorized to finalize route {route_id}.")
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to finalize this route")

    route.is_finalized = True 
    
    try:
        db.commit()
        db.refresh(route) 
        print(f"Route {route_id} finalized successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error during commit while finalizing route {route_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error finalizing route: {str(e)}")

    locations_on_route_list = _get_route_location_details_list(db, route.id)
    
    text_format_params = _get_params_for_route_text_formatting(db, route) 
    
    final_display_cost = text_format_params["total_estimated_cost_user_currency"] 
    final_display_currency = text_format_params["budget_currency_str"]         

    original_budget_currency = "RUB" 
    if route.query and route.query.parameters and isinstance(route.query.parameters, dict):
        
        original_budget_currency = route.query.parameters.get('budget_currency', "RUB")
        if not original_budget_currency: original_budget_currency = "RUB" 

    if original_budget_currency.upper() != "RUB" and final_display_cost is not None:
        converted_display_cost = convert_currency(final_display_cost, "RUB", original_budget_currency.upper())
        if converted_display_cost is not None:
            text_format_params["total_estimated_cost_user_currency"] = round(converted_display_cost, 2)
            text_format_params["budget_currency_str"] = original_budget_currency.upper()
        else: 
            text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost, 2)
            text_format_params["budget_currency_str"] = "RUB"
    elif final_display_cost is not None: 
         text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost, 2)
    else:
        text_format_params["total_estimated_cost_user_currency"] = 0.0

    finalized_route_text = "Описание маршрута не удалось сформировать." 
    if text_format_params["start_date_obj"] and text_format_params["trip_duration_days_total"] is not None:
        try:
            finalized_route_text = format_route_text_with_days_times(
                pois_on_route=locations_on_route_list,
                **text_format_params 
            )
        except Exception as e:
            print(f"Error formatting route text after finalize for route {route.id}: {e}")
            import traceback
            traceback.print_exc()
            finalized_route_text = f"Маршрут (ID: {route.id}) утвержден (ошибка форматирования текста)."
    elif not locations_on_route_list:
        finalized_route_text = f"Маршрут (ID: {route.id}) утвержден, но в нем нет мест."
    
    return schemas.FullRouteDetailsResponse(
        query_id=route.query_id,
        route_id=route.id,
        route_text=finalized_route_text, 
        total_cost=text_format_params["total_estimated_cost_user_currency"], 
        total_cost_currency=text_format_params["budget_currency_str"],  
        duration_days=route.duration_days, 
        is_finalized=route.is_finalized, 
        locations_on_route=locations_on_route_list
    )


@router_routes.put("/{route_id}/locations/{map_id_to_replace}", response_model=schemas.FullRouteDetailsResponse)
def replace_poi_in_route(
    route_id: int,
    map_id_to_replace: int,
    replacement_data: schemas.POIReplacementRequest, 
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    print(f"--- Replacing POI ---")
    print(f"User ID: {x_user_id}, Route ID: {route_id}, Map ID to replace: {map_id_to_replace}")
    print(f"Replacement data: {replacement_data}")

    route = db.query(DBRoute).options(
        joinedload(DBRoute.query) 
    ).filter(DBRoute.id == route_id).first()

    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.user_id != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this route")

    rlm_to_replace = db.query(RouteLocationMap).filter(
        RouteLocationMap.id == map_id_to_replace,
        RouteLocationMap.route_id == route_id
    ).first()

    if not rlm_to_replace:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="POI to replace not found in this route")

    new_location_id_to_set = None
    new_activity_id_to_set = None

    if replacement_data.new_item_type == "location":
        new_loc = db.query(DBLocation).filter(DBLocation.id == replacement_data.new_item_id).first()
        if not new_loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"New location with ID {replacement_data.new_item_id} not found.")
        new_location_id_to_set = new_loc.id
    elif replacement_data.new_item_type == "activity":
        new_act = db.query(DBActivity).options(joinedload(DBActivity.location)).filter(DBActivity.id == replacement_data.new_item_id).first()
        if not new_act:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"New activity with ID {replacement_data.new_item_id} not found.")
        if not new_act.location: 
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Activity {new_act.name} does not have an associated location.")
        new_location_id_to_set = new_act.location_id
        new_activity_id_to_set = new_act.id
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid new_item_type.")

    rlm_to_replace.location_id = new_location_id_to_set
    rlm_to_replace.activity_id = new_activity_id_to_set

    current_rlm_entries_for_cost = db.query(RouteLocationMap).filter(RouteLocationMap.route_id == route_id).all()
    
    total_cost_recalculated_rub = 0.0
    location_ids_in_route = [rlm.location_id for rlm in current_rlm_entries_for_cost if rlm.location_id]
    activity_ids_in_route = [rlm.activity_id for rlm in current_rlm_entries_for_cost if rlm.activity_id]

    if location_ids_in_route:
        locations_with_cost = db.query(DBLocation.cost, DBLocation.cost_currency).filter(DBLocation.id.in_(location_ids_in_route)).all()
        for cost, currency in locations_with_cost:
            if cost is not None and currency is not None:
                converted_cost = convert_currency(cost, currency, "RUB")
                if converted_cost is not None:
                    total_cost_recalculated_rub += converted_cost
    
    if activity_ids_in_route:
        
        activities_with_cost = db.query(DBActivity.cost, DBActivity.cost_currency).filter(DBActivity.id.in_(activity_ids_in_route)).all()
        for cost, currency in activities_with_cost:
            if cost is not None and currency is not None:
                converted_cost = convert_currency(cost, currency, "RUB")
                if converted_cost is not None:
                    total_cost_recalculated_rub += converted_cost

    route.total_cost = round(total_cost_recalculated_rub, 2)
    route.total_cost_currency = "RUB"
    print(f"Recalculated total_cost after replacement for route {route_id}: {route.total_cost} RUB")
    
    route.is_finalized = False

    try:
        db.commit()
        db.refresh(route)
        print(f"Successfully replaced POI {map_id_to_replace} in route {route_id}.")
    except Exception as e:
        db.rollback()
        print(f"Error during commit after replacing POI: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error after replacing POI: {str(e)}")

    locations_on_route_list = _get_route_location_details_list(db, route.id)
    text_format_params = _get_params_for_route_text_formatting(db, route)
    
    final_display_cost = text_format_params["total_estimated_cost_user_currency"]
    final_display_currency = text_format_params["budget_currency_str"]
    original_budget_currency = "RUB"
    if route.query and route.query.parameters and isinstance(route.query.parameters, dict):
        original_budget_currency = route.query.parameters.get('budget_currency', "RUB")
    if original_budget_currency.upper() != "RUB" and final_display_cost is not None:
        converted_display_cost = convert_currency(final_display_cost, "RUB", original_budget_currency.upper())
        if converted_display_cost is not None:
            text_format_params["total_estimated_cost_user_currency"] = round(converted_display_cost, 2)
            text_format_params["budget_currency_str"] = original_budget_currency.upper()
        else:
            text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost,2)
            text_format_params["budget_currency_str"] = "RUB"
    elif final_display_cost is not None:
         text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost, 2)
    else:
        text_format_params["total_estimated_cost_user_currency"] = 0.0


    updated_route_text = "Описание маршрута не удалось сформировать."
    if text_format_params["start_date_obj"] and text_format_params["trip_duration_days_total"] is not None:
        try:
            updated_route_text = format_route_text_with_days_times(
                pois_on_route=locations_on_route_list,
                **text_format_params
            )
        except Exception as e:
            print(f"Error formatting route text after replace for route {route.id}: {e}")
            import traceback
            traceback.print_exc()

    return schemas.FullRouteDetailsResponse(
        query_id=route.query_id,
        route_id=route.id,
        route_text=updated_route_text,
        total_cost=text_format_params["total_estimated_cost_user_currency"],
        total_cost_currency=text_format_params["budget_currency_str"],
        duration_days=route.duration_days,
        is_finalized=route.is_finalized,
        locations_on_route=locations_on_route_list
    )


@router_routes.post("/{route_id}/locations", response_model=schemas.FullRouteDetailsResponse, status_code=status.HTTP_201_CREATED)
def add_poi_to_route(
    route_id: int,
    addition_data: schemas.POIAdditionRequest,
    db: Session = Depends(get_db),
    x_user_id: int = Header(..., alias="X-User-ID")
):
    print(f"--- Adding POI to Route ---")
    print(f"User ID: {x_user_id}, Route ID: {route_id}")
    print(f"Addition data: {addition_data}")

    route = db.query(DBRoute).options(
        joinedload(DBRoute.query)
    ).filter(DBRoute.id == route_id).first()

    if not route:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Route not found")
    if route.user_id != x_user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized to modify this route")

    new_location_id_to_set = None
    new_activity_id_to_set = None
    poi_cost = 0.0 
    poi_cost_currency = "RUB"

    if addition_data.item_type == "location":
        new_loc = db.query(DBLocation).filter(DBLocation.id == addition_data.item_id).first()
        if not new_loc:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Location to add (ID {addition_data.item_id}) not found.")
        new_location_id_to_set = new_loc.id
        if new_loc.cost is not None and new_loc.cost_currency is not None:
            converted = convert_currency(new_loc.cost, new_loc.cost_currency, "RUB")
            if converted is not None: poi_cost = converted
            
    elif addition_data.item_type == "activity":
        new_act = db.query(DBActivity).options(joinedload(DBActivity.location)).filter(DBActivity.id == addition_data.item_id).first()
        if not new_act:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Activity to add (ID {addition_data.item_id}) not found.")
        if not new_act.location:
             raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Activity {new_act.name} does not have an associated location.")
        new_location_id_to_set = new_act.location_id
        new_activity_id_to_set = new_act.id
        if new_act.cost is not None and new_act.cost_currency is not None:
            converted = convert_currency(new_act.cost, new_act.cost_currency, "RUB")
            if converted is not None: poi_cost = converted
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid item_type for addition.")

    max_visit_order_result = db.query(sql_func.max(RouteLocationMap.visit_order)).filter(RouteLocationMap.route_id == route_id).scalar()
    new_visit_order = 0
    if max_visit_order_result is not None:
        new_visit_order = max_visit_order_result + 1
    
    new_rlm_entry = RouteLocationMap(
        route_id=route.id,
        location_id=new_location_id_to_set,
        activity_id=new_activity_id_to_set,
        visit_order=new_visit_order
    )
    db.add(new_rlm_entry)
    
    if route.total_cost is None: route.total_cost = 0.0 
    route.total_cost += poi_cost 
    route.total_cost = round(route.total_cost, 2)
    route.total_cost_currency = "RUB" 
    print(f"Updated total_cost after addition for route {route_id}: {route.total_cost} RUB")
    
    route.is_finalized = False

    try:
        db.commit()
        db.refresh(route)
        print(f"Successfully added new POI to route {route_id}. New RLM entry ID (approx): {new_rlm_entry.id if hasattr(new_rlm_entry, 'id') else 'N/A'}")
    except Exception as e:
        db.rollback()
        print(f"Error during commit after adding POI: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Database error after adding POI: {str(e)}")

    locations_on_route_list = _get_route_location_details_list(db, route.id)
    text_format_params = _get_params_for_route_text_formatting(db, route)
    
    final_display_cost = text_format_params["total_estimated_cost_user_currency"]
    final_display_currency = text_format_params["budget_currency_str"]
    original_budget_currency = "RUB"
    if route.query and route.query.parameters and isinstance(route.query.parameters, dict):
        original_budget_currency = route.query.parameters.get('budget_currency', "RUB")
        if not original_budget_currency: original_budget_currency = "RUB"
    if original_budget_currency.upper() != "RUB" and final_display_cost is not None:
        converted_display_cost = convert_currency(final_display_cost, "RUB", original_budget_currency.upper())
        if converted_display_cost is not None:
            text_format_params["total_estimated_cost_user_currency"] = round(converted_display_cost, 2)
            text_format_params["budget_currency_str"] = original_budget_currency.upper()
        else:
            text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost, 2)
            text_format_params["budget_currency_str"] = "RUB"
    elif final_display_cost is not None:
         text_format_params["total_estimated_cost_user_currency"] = round(final_display_cost, 2)
    else:
        text_format_params["total_estimated_cost_user_currency"] = 0.0
    
    updated_route_text = "Описание маршрута не удалось сформировать."
    if text_format_params["start_date_obj"] and text_format_params["trip_duration_days_total"] is not None:
        try:
            updated_route_text = format_route_text_with_days_times(
                pois_on_route=locations_on_route_list,
                **text_format_params
            )
        except Exception as e:
            print(f"Error formatting route text after add for route {route.id}: {e}")
            import traceback
            traceback.print_exc()
    elif not locations_on_route_list: 
        updated_route_text = f"Маршрут (ID: {route.id}) был обновлен." 

    return schemas.FullRouteDetailsResponse(
        query_id=route.query_id,
        route_id=route.id,
        route_text=updated_route_text,
        total_cost=text_format_params["total_estimated_cost_user_currency"],
        total_cost_currency=text_format_params["budget_currency_str"],
        duration_days=route.duration_days,
        is_finalized=route.is_finalized,
        locations_on_route=locations_on_route_list
    )