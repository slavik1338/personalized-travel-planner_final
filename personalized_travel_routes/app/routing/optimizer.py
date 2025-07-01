import math
from typing import List, Dict, Any, Tuple, Optional
from datetime import date, datetime, timedelta

import numpy as np 


MAX_DAILY_TRAVEL_TIME_HOURS = 3.0
ESTIMATED_DAILY_VISIT_TIME_HOURS = 5.0

def optimize_route_greedy(
    candidate_pois_data: List[Dict[str, Any]],
    travel_time_matrix_hours: np.ndarray, 
    trip_duration_days: int,
    budget_rub: Optional[float],
    start_date: date,

) -> Dict[int, List[int]]:

    num_candidates = len(candidate_pois_data)
    if num_candidates == 0:
        return {}

    visited_poi_indices = set()
    route_by_day: Dict[int, List[int]] = {}

    remaining_budget_rub = budget_rub if budget_rub is not None else math.inf

    poi_scores = [p['score'] for p in candidate_pois_data]
    poi_costs_rub = [p['cost_rub'] for p in candidate_pois_data]
    poi_visit_durations = [p['visit_duration_hours'] for p in candidate_pois_data]

    for day_num in range(1, trip_duration_days + 1):
        route_by_day[day_num] = []
        current_poi_index = None

        current_day_visit_time_hours = 0.0
        current_day_travel_time_hours = 0.0

        print(f"--- Building Day {day_num} (Remaining Budget: {remaining_budget_rub:.2f}) ---")

        while len(visited_poi_indices) < num_candidates:
            best_next_poi_index = -1
            best_score = -math.inf

            available_poi_indices = [
                i for i in range(num_candidates) if i not in visited_poi_indices
            ]

            if not available_poi_indices:
                 break

            for next_poi_index in available_poi_indices:
                poi_data = candidate_pois_data[next_poi_index]
                loc_cost = poi_costs_rub[next_poi_index]
                visit_duration = poi_visit_durations[next_poi_index]

                if remaining_budget_rub is not None and loc_cost > remaining_budget_rub:
                    continue

                time_needed_for_visit = visit_duration
                travel_time_from_current = 0.0
                if current_poi_index != None:
                     travel_time_from_current = travel_time_matrix_hours[current_poi_index, next_poi_index]
                     time_needed_for_visit += travel_time_from_current
                     if (current_day_visit_time_hours + visit_duration > ESTIMATED_DAILY_VISIT_TIME_HOURS) or \
                        (current_day_travel_time_hours + travel_time_from_current > MAX_DAILY_TRAVEL_TIME_HOURS):
                         continue

                current_score = poi_scores[next_poi_index]
                if current_score > best_score:
                     best_score = current_score
                     best_next_poi_index = next_poi_index

            if best_next_poi_index != -1:
                selected_poi_index = best_next_poi_index
                route_by_day[day_num].append(selected_poi_index)
                visited_poi_indices.add(selected_poi_index)

                remaining_budget_rub -= poi_costs_rub[selected_poi_index]
                current_day_visit_time_hours += poi_visit_durations[selected_poi_index]
                if current_poi_index != None:
                     current_day_travel_time_hours += travel_time_matrix_hours[current_poi_index, selected_poi_index]

                current_poi_index = selected_poi_index

                print(f"  Added POI {candidate_pois_data[selected_poi_index]['location'].name}")

            else:
                print(f"  No suitable POI found for the rest of Day {day_num}. Ending day.")
                break

    total_pois_in_route = sum(len(day_indices) for day_indices in route_by_day.values())
    if total_pois_in_route == 0:
        print("Greedy algorithm generated an empty route.")
        return {}

    return route_by_day