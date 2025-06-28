# app/services/distance.py

import numpy as np

def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculates the distance between two points on the Earth using the Haversine formula.

    Args:
        lat1, lon1: Coordinates of the first point (degrees).
        lat2, lon2: Coordinates of the second point (degrees).

    Returns:
        Distance in kilometers.
    """
    R = 6371  # Radius of Earth in kilometers

    lat1_rad = np.radians(lat1)
    lon1_rad = np.radians(lon1)
    lat2_rad = np.radians(lat2)
    lon2_rad = np.radians(lon2)

    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad

    a = np.sin(dlat / 2)**2 + np.cos(lat1_rad) * np.cos(lat2_rad) * np.sin(dlon / 2)**2
    c = 2 * np.arctan2(np.sqrt(a), np.sqrt(1 - a))

    distance = R * c
    return distance

def estimate_travel_time(distance_km: float, travel_speed_km_h: float) -> float:
     """
     Estimates travel time based on distance and average speed.

     Args:
         distance_km: Distance in kilometers.
         travel_speed_km_h: Average travel speed in kilometers per hour.

     Returns:
         Estimated travel time in hours. Returns 0 if speed is 0.
     """
     if travel_speed_km_h <= 0:
         return 0
     return distance_km / travel_speed_km_h

# TODO: Add different travel speeds (walking, car, public transport)
# TODO: Consider using a map API for more accurate time estimation (complex)