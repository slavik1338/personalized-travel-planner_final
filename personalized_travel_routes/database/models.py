import json 
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    ForeignKey,
    CheckConstraint, 
    UniqueConstraint,
    Boolean
)
from sqlalchemy.orm import declarative_base, relationship, Session 
from sqlalchemy.sql import func 
from sqlalchemy.types import JSON 

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False) 
    interests = Column(Text) 
    travel_style = Column(String) 
    budget = Column(Float)
    budget_currency = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    queries = relationship("Query", back_populates="user")
    routes = relationship("Route", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    trips = relationship("Trip", back_populates="user")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"

class Location(Base):
    __tablename__ = 'locations'
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    city = Column(String)
    country = Column(String)
    rating = Column(Float) 
    type = Column(String) 
    description = Column(Text)
    cost = Column(Float)
    cost_currency = Column(String)
    opening_hours = Column(String) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    activities = relationship("Activity", back_populates="location")
    reviews = relationship("Review", back_populates="location")
    __table_args__ = (
        CheckConstraint('rating >= 0.0 AND rating <= 5.0', name='check_locations_rating_range'),
        CheckConstraint('latitude >= -90.0 AND latitude <= 90.0', name='check_locations_lat_range'),
        CheckConstraint('longitude >= -180.0 AND longitude <= 180.0', name='check_locations_lon_range'),
    )

    def __repr__(self):
        return f"<Location(id={self.id}, name='{self.name}', type='{self.type}')>"


class Activity(Base):
    __tablename__ = 'activities'

    id = Column(Integer, primary_key=True, index=True)
    location_id = Column(Integer, ForeignKey('locations.id'), index=True, nullable=False) 
    name = Column(String, nullable=False)
    description = Column(Text)
    cost = Column(Float)
    cost_currency = Column(String) 
    activity_type = Column(String) 
    schedule = Column(String) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    location = relationship("Location", back_populates="activities")
    reviews = relationship("Review", back_populates="activity") 

    def __repr__(self):
        return f"<Activity(id={self.id}, name='{self.name}', type='{self.activity_type}')>"


class Route(Base):
    __tablename__ = 'routes'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False)
    query_id = Column(Integer, ForeignKey('queries.id'), index=True, nullable=True)
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    total_cost = Column(Float)
    total_cost_currency = Column(String)
    duration_days = Column(Integer)
    is_finalized = Column(Boolean, default=False, nullable=False) # <--- ВОТ ОНО
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="routes")
    query = relationship("Query")
    trips = relationship("Trip", back_populates="route", uselist=False) 
    route_locations = relationship("RouteLocationMap", back_populates="route", order_by="RouteLocationMap.visit_order") 
    __table_args__ = (
        CheckConstraint('duration_days > 0', name='check_routes_duration_positive'),
        CheckConstraint('end_date >= start_date', name='check_routes_dates_order'),
    )

    def __repr__(self):
        return f"<Route(id={self.id}, user_id={self.user_id}, duration={self.duration_days} days)>"


class RouteLocationMap(Base):
    __tablename__ = 'route_location_map'

    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey('routes.id'), index=True, nullable=False)
    location_id = Column(Integer, ForeignKey('locations.id'), index=True, nullable=False) 
    activity_id = Column(Integer, ForeignKey('activities.id'), index=True, nullable=True) 
    visit_order = Column(Integer, nullable=False) 
    __table_args__ = (
        UniqueConstraint('route_id', 'visit_order', name='uq_route_order'),
    )
    route = relationship("Route", back_populates="route_locations")
    location = relationship("Location") 
    activity = relationship("Activity") 

    def __repr__(self):
        return f"<RouteLocationMap(id={self.id}, route_id={self.route_id}, location_id={self.location_id}, activity_id={self.activity_id}, order={self.visit_order})>"


class Query(Base):
    __tablename__ = 'queries'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False) 
    query_text = Column(Text, nullable=False) 
    parameters = Column(JSON) 
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    user = relationship("User", back_populates="queries")

    def __repr__(self):
        return f"<Query(id={self.id}, user_id={self.user_id})>"


class Review(Base):
    __tablename__ = 'reviews'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False) 
    location_id = Column(Integer, ForeignKey('locations.id'), index=True, nullable=True) 
    activity_id = Column(Integer, ForeignKey('activities.id'), index=True, nullable=True) 
    comment = Column(Text) 
    rating = Column(Integer, nullable=False) 
    review_date = Column(DateTime(timezone=True), server_default=func.now()) 
    user = relationship("User", back_populates="reviews")
    location = relationship("Location", back_populates="reviews")
    activity = relationship("Activity", back_populates="reviews")
    __table_args__ = (
         CheckConstraint(
             '(location_id IS NULL AND activity_id IS NOT NULL) OR (location_id IS NOT NULL AND activity_id IS NULL)',
             name='check_reviews_target'
         ),
         CheckConstraint('rating >= 1 AND rating <= 5', name='check_reviews_rating_range'),
    )


    def __repr__(self):
        return f"<Review(id={self.id}, user_id={self.user_id}, rating={self.rating})>"



class Trip(Base):
    __tablename__ = 'trips'
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id'), index=True, nullable=False) 
    route_id = Column(Integer, ForeignKey('routes.id'), index=True, nullable=True) 
    start_date = Column(DateTime) 
    end_date = Column(DateTime) 
    travelers_count = Column(Integer) 
    created_at = Column(DateTime(timezone=True), server_default=func.now()) 
    user = relationship("User", back_populates="trips")
    route = relationship("Route", back_populates="trips")
    __table_args__ = (
         CheckConstraint('travelers_count > 0', name='check_trips_travelers_positive'),
         CheckConstraint('end_date >= start_date', name='check_trips_dates_order'),
    )

    def __repr__(self):
        return f"<Trip(id={self.id}, user_id={self.user_id}, route_id={self.route_id})>"
