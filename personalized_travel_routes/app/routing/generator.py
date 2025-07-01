import numpy as np
import math
import os
import re
from typing import List, Dict, Any, Tuple, Optional
from datetime import date, timedelta, datetime, time 

from sqlalchemy.orm import Session 

from database.models import Location, Activity, User 
from database.models import Route as DBRoute, RouteLocationMap
from app.services.distance import calculate_distance, estimate_travel_time
from app.services.currency import convert_currency

from app import schemas

from app.nlp.processor import nlp_lemmatizer, nlp 
from app.routing.optimizer import optimize_route_greedy 


INTEREST_WEIGHT = 1.0 
RATING_WEIGHT = 0.5   
COST_WEIGHT = 0.2     

DEFAULT_VISIT_DURATIONS_HOURS: Dict[str, float] = {
    "музей": 2.0, "парк": 1.5, "ресторан": 1.5, "кафе": 1.0, "достопримечательность": 1.0,
    "экскурсия": 2.5, "активность": 1.5, "шопинг": 1.5, "ночная жизнь": 3.0, "религия": 1.0,
    "архитектура": 0.5, "искусство": 2.0, "природа": 2.0, "животные": 2.0, "фотография": 1.5,
    "пляж": 3.0, "релакс": 2.0, "спорт": 2.0, "музыка": 2.5, "культура": 2.0,
    "винный туризм": 3.0, "дегустации": 1.5, "походы": 4.0, "еда": 1.5, "история": 1.5,
}
DEFAULT_TRAVEL_SPEED_KM_H = 5.0 
MAX_DAILY_ACTIVITY_HOURS = 8.0  
DAY_START_TIME = time(9, 0)     

def lemmatize_destination_names(destinations: List[str]) -> List[str]:
     if nlp_lemmatizer is None:
          print("Warning: Lemmatizer not loaded. Cannot lemmatize destinations.")
          return [d.lower() for d in destinations if d]

     lemmatized_list = []
     for dest in destinations:
          if dest:
               doc = nlp_lemmatizer(dest)
               lemmatized_dest = " ".join([token.lemma_ for token in doc if not token.is_punct and not token.is_space]).strip()
               if lemmatized_dest:
                    lemmatized_list.append(lemmatized_dest)
     return list(set([d.lower() for d in lemmatized_list]))


def parse_opening_hours(hours_str: Optional[str]) -> List[Dict[str, Any]]:
    if not hours_str:
        return []
    hours_str_lower = hours_str.lower()
    if "круглосуточно" in hours_str_lower:
        return [{'always_open': True}]
    match = re.search(r'([-а-яА-Я, ]+)\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})', hours_str)
    if not match:
        return []
    day_part, start_time_str, end_time_str = match.groups()
    try:
        start_hour, start_minute = map(int, start_time_str.split(':'))
        end_hour, end_minute = map(int, end_time_str.split(':'))
        start_time_obj = time(start_hour, start_minute)
        end_time_obj = time(end_hour, end_minute)
    except ValueError:
        return []
    
    days_map_keys = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
    if day_part.strip().lower() == 'ежедневно':
         return [{'days': days_map_keys, 'start_time': start_time_obj, 'end_time': end_time_obj}]
    return []


def format_route_text_with_days_times(
    destination_names: List[str],
    start_date_obj: date,
    trip_duration_days_total: int,
    pois_on_route: List[schemas.RouteLocationDetail], 
    total_estimated_cost_user_currency: float,
    budget_currency_str: str
) -> str:
    route_text_parts = []
    route_text_parts.append(f"Обновленный маршрут для путешествия в {', '.join(destination_names)} ({trip_duration_days_total} дней):\n")

    if not pois_on_route:
        route_text_parts.append("В маршруте нет запланированных мест.\n")
    else:
        current_day_number = 1
        current_date_iter = start_date_obj
        current_time_in_day_dt = datetime.combine(current_date_iter, DAY_START_TIME) 
        
        daily_time_spent_total_hours = 0.0
        
        prev_poi_coords: Optional[Tuple[float, float]] = None
        days_of_week_names = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
        day_pois_text_parts = []

        for i, poi_detail in enumerate(pois_on_route):
            poi_primary_type = poi_detail.location_type.lower() if poi_detail.location_type else "достопримечательность"

            visit_duration_hours = DEFAULT_VISIT_DURATIONS_HOURS.get(poi_primary_type, 1.5)

            travel_time_from_prev_hours = 0.0
            if prev_poi_coords and poi_detail.latitude is not None and poi_detail.longitude is not None:
                distance_km = calculate_distance(
                    prev_poi_coords[0], prev_poi_coords[1],
                    poi_detail.latitude, poi_detail.longitude
                )
                travel_time_from_prev_hours = estimate_travel_time(distance_km, DEFAULT_TRAVEL_SPEED_KM_H)
            
            potential_next_poi_total_time = travel_time_from_prev_hours + visit_duration_hours
            
            if (daily_time_spent_total_hours > 0 and daily_time_spent_total_hours + potential_next_poi_total_time > MAX_DAILY_ACTIVITY_HOURS) \
               or current_day_number > trip_duration_days_total:
                
                if day_pois_text_parts:
                    day_of_week_name = days_of_week_names[current_date_iter.weekday()]
                    route_text_parts.append(f"\nДень {current_day_number} ({day_of_week_name}):")
                    route_text_parts.extend(day_pois_text_parts)
                    day_pois_text_parts = []
                
                current_day_number += 1
                if current_day_number > trip_duration_days_total:
                    if i < len(pois_on_route):
                         route_text_parts.append(f"\nОставшиеся {len(pois_on_route) - i} мест(а) не поместились в {trip_duration_days_total} дней.")
                    break 

                current_date_iter += timedelta(days=1)
                current_time_in_day_dt = datetime.combine(current_date_iter, DAY_START_TIME)
                daily_time_spent_total_hours = 0.0
                travel_time_from_prev_hours = 0.0
            
            current_time_in_day_dt += timedelta(hours=travel_time_from_prev_hours)
            arrival_time_str = current_time_in_day_dt.strftime('%H:%M')

            poi_text = f"\n- {arrival_time_str} {poi_detail.location_name}"
            if poi_detail.activity_name:
                poi_text += f" (Активность: {poi_detail.activity_name})"
            
            description_to_show = None
            if poi_detail.activity_description:
                description_to_show = poi_detail.activity_description
            elif poi_detail.location_description:
                description_to_show = poi_detail.location_description

            if description_to_show:
               snippet = description_to_show.split('.')[0] 
               if len(snippet) > 0 : snippet += '.' 
               
               max_snippet_length = 120 
               if len(snippet) > max_snippet_length:
                   snippet = snippet[:max_snippet_length] + "..."

               poi_text += f"\n    ({snippet})" 
            
            day_pois_text_parts.append(poi_text)

            current_time_in_day_dt += timedelta(hours=visit_duration_hours)
            daily_time_spent_total_hours += travel_time_from_prev_hours + visit_duration_hours
            
            if poi_detail.latitude is not None and poi_detail.longitude is not None:
                prev_poi_coords = (poi_detail.latitude, poi_detail.longitude)
            else:
                prev_poi_coords = None
        
        if day_pois_text_parts: 
            day_of_week_name = days_of_week_names[current_date_iter.weekday()]
            route_text_parts.append(f"\nДень {current_day_number} ({day_of_week_name}):")
            route_text_parts.extend(day_pois_text_parts)

        while current_day_number < trip_duration_days_total:
            current_day_number += 1
            current_date_iter += timedelta(days=1)
            day_of_week_name = days_of_week_names[current_date_iter.weekday()]
            route_text_parts.append(f"\nДень {current_day_number} ({day_of_week_name}): Свободный день или нет запланированных мест.")

    route_text_parts.append(f"\n\nОценочная стоимость маршрута: {total_estimated_cost_user_currency:.2f} {budget_currency_str}")
    route_text_parts.append(f"\nПримерная общая продолжительность: {trip_duration_days_total} дней.\n")
    
    return "".join(route_text_parts)


def generate_route(
    destinations: List[str],
    start_date: date,
    end_date: date,
    budget: Optional[float],
    budget_currency: Optional[str],
    interests: List[str],
    travel_style: Optional[str], 
    user_id: int, 
    query_id: int,
    db_session: Session
) -> Tuple[int, str, str, Optional[DBRoute]]: 

    lemmatized_destinations = lemmatize_destination_names(destinations)
    if not lemmatized_destinations:
         return 400, "Processing Error", "Не удалось обработать указанные места назначения.", None

    locations_query = db_session.query(Location)
    from sqlalchemy import or_ 
    city_country_filters = []
    if lemmatized_destinations:
         city_country_filters = [
             (Location.city.ilike(dest) | Location.country.ilike(dest)) 
             for dest in lemmatized_destinations
         ]
    if city_country_filters:
         locations_query = locations_query.filter(or_(*city_country_filters))
    all_locations = locations_query.all()
    if not all_locations:
         return 400, "No locations found", f"К сожалению, по вашему запросу в направлении '{', '.join(destinations)}' ничего не найдено.", None
    
    candidate_pois_data = []
    user_budget_rub = convert_currency(budget, budget_currency, "RUB") if budget is not None and budget_currency else math.inf

    for loc in all_locations:
        loc_type_single = loc.type.lower() if loc.type else "достопримечательность"
        visit_duration = DEFAULT_VISIT_DURATIONS_HOURS.get(loc_type_single, 1.5)
        loc_cost_rub = convert_currency(loc.cost, loc.cost_currency, "RUB") if loc.cost is not None and loc.cost_currency else 0.0
        opening_hours_p = parse_opening_hours(loc.opening_hours) 
                                                                

        candidate_pois_data.append({
            "location": loc, 
            "score": 0, 
            "visit_duration_hours": visit_duration,
            "cost_rub": loc_cost_rub,
            "opening_hours_parsed": opening_hours_p, 
        })

    candidate_pois_data.sort(key=lambda x: x["score"], reverse=True)
    trip_duration_days = (end_date - start_date).days + 1
    estimated_pois_needed = trip_duration_days * 4 
    top_n_candidates_data = candidate_pois_data[:max(estimated_pois_needed * 2, 10)]

    if not top_n_candidates_data:
         return 400, "No suitable places found", "К сожалению, по вашему запросу не удалось найти подходящие места.", None

    num_candidates = len(top_n_candidates_data)
    distance_matrix_km = np.zeros((num_candidates, num_candidates)) 
    travel_time_matrix_hours = np.zeros((num_candidates, num_candidates))


    print("Calling Greedy optimizer...")
    optimized_poi_indices_by_day: Dict[int, List[int]] = optimize_route_greedy(
       candidate_pois_data=top_n_candidates_data,
       travel_time_matrix_hours=travel_time_matrix_hours, 
       trip_duration_days=trip_duration_days,
       budget_rub=user_budget_rub if user_budget_rub != math.inf else None, 
       start_date=start_date, 
    )
    print(f"Optimizer returned: {optimized_poi_indices_by_day}")

    if not optimized_poi_indices_by_day or not any(optimized_poi_indices_by_day.values()):
         return 400, "Generation failed", "Не удалось построить маршрут из подходящих мест.", None
    
    flat_ordered_pois_for_text: List[schemas.RouteLocationDetail] = []
    global_visit_idx = 0
    for day_num in sorted(optimized_poi_indices_by_day.keys()):
        poi_indices_for_day = optimized_poi_indices_by_day[day_num]
        for candidate_list_index in poi_indices_for_day:
            poi_data_from_candidates = top_n_candidates_data[candidate_list_index]
            loc_obj: Location = poi_data_from_candidates["location"]
            

            flat_ordered_pois_for_text.append(schemas.RouteLocationDetail(
                map_id=0, 
                location_id=loc_obj.id,
                location_name=loc_obj.name,
                location_description=loc_obj.description,
                location_type=loc_obj.type,
                activity_id=None, 
                activity_name=None,
                activity_description=None,
                visit_order=global_visit_idx, 
                latitude=loc_obj.latitude,
                longitude=loc_obj.longitude,
                visit_duration_hours=poi_data_from_candidates.get("visit_duration_hours")
            ))
            global_visit_idx += 1
            
    total_cost_rub_from_optimizer = 0
    for day_pois_indices in optimized_poi_indices_by_day.values():
        for index in day_pois_indices:
            cost_val = top_n_candidates_data[index].get("cost_rub")
            if cost_val is not None:
                total_cost_rub_from_optimizer += cost_val


    total_cost_user_curr = convert_currency(
        total_cost_rub_from_optimizer, "RUB", budget_currency if budget_currency else "RUB"
    )
    if total_cost_user_curr is None: total_cost_user_curr = total_cost_rub_from_optimizer 

    
    generated_text = format_route_text_with_days_times(
        destination_names=destinations,
        start_date_obj=start_date,
        trip_duration_days_total=trip_duration_days,
        pois_on_route=flat_ordered_pois_for_text,
        total_estimated_cost_user_currency=total_cost_user_curr,
        budget_currency_str=budget_currency if budget_currency else "RUB"
    )
    
    try:
        db_route = DBRoute(
             user_id=user_id,
             query_id=query_id,
             start_date=datetime.combine(start_date, time.min),
             end_date=datetime.combine(end_date, time.max),
             total_cost=total_cost_rub_from_optimizer, 
             total_cost_currency="RUB", 
             duration_days=trip_duration_days,
             is_finalized=False
        )
        db_session.add(db_route)
        db_session.commit()
        db_session.refresh(db_route)

        global_db_visit_order = 0
        for day_num in sorted(optimized_poi_indices_by_day.keys()): 
             for candidate_list_index in optimized_poi_indices_by_day[day_num]:
                  location_obj: Location = top_n_candidates_data[candidate_list_index]["location"]
                  db_route_loc = RouteLocationMap(
                      route_id=db_route.id,
                      location_id=location_obj.id,
                      activity_id=None, 
                      visit_order=global_db_visit_order
                  )
                  db_session.add(db_route_loc)
                  global_db_visit_order += 1
        db_session.commit()
    except Exception as e:
        db_session.rollback()
        print(f"Error saving route to DB: {e}")
        import traceback
        traceback.print_exc()
        return 500, "Database Save Error", "Маршрут сгенерирован, но не удалось сохранить его.", None

    return 200, "Маршрут успешно сгенерирован", generated_text, db_route