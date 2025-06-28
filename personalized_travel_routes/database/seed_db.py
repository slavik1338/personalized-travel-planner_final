from sqlalchemy.orm import Session
from database.db import SessionLocal, engine
from database.models import Base, Location, Activity, User, Route, RouteLocationMap, Query, Review, Trip
from datetime import date, timedelta, datetime
import bcrypt

Base.metadata.create_all(bind=engine)

db: Session = SessionLocal()

try:
    if db.query(Location).count() == 0:
        print("Seeding locations...")

        # --- Москва, Россия ---
        loc_red_square = Location(
            name="Красная Площадь", latitude=55.7541, longitude=37.6202,
            city="москва", country="Россия",
            rating=4.8, type="достопримечательность", description="Главная площадь Москвы",
            cost=0.0, cost_currency="RUB", opening_hours="Круглосуточно"
        )
        loc_kremlin = Location(
            name="Московский Кремль", latitude=55.7518, longitude=37.6176,
            city="москва", country="Россия",
            rating=4.9, type="достопримечательность", description="Исторический центр Москвы",
            cost=500.0, cost_currency="RUB", opening_hours="Ежедневно 10:00-17:00"
        )
        loc_tretyakov = Location(
            name="Третьяковская галерея", latitude=55.7316, longitude=37.6201,
             city="Москва", country="Россия",
            rating=4.9, type="музей", description="Музей русского искусства",
            cost=600.0, cost_currency="RUB", opening_hours="Вт-Вс 10:00-18:00"
        )
        loc_gorky_park = Location(
            name="Парк Горького", latitude=55.7297, longitude=37.6049,
            city="Москва", country="Россия",
            rating=4.7, type="парк", description="Центральный парк культуры и отдыха",
            cost=0.0, cost_currency="RUB", opening_hours="Круглосуточно"
        )
        loc_bolshoi = Location(
            name="Большой театр", latitude=55.7611, longitude=37.6189,
            city="Москва", country="Россия",
            rating=4.8, type="музыка", description="Главный оперный и балетный театр",
            cost=2000.0, cost_currency="RUB", opening_hours="Расписание уточняйте"
        )
        loc_cafe_pushkin = Location(
            name="Кафе 'Пушкинъ'", latitude=55.7631, longitude=37.6024,
            city="Москва", country="Россия",
            rating=4.5, type="еда", description="Известное кафе-ресторан",
            cost=1500.0, cost_currency="RUB", opening_hours="Ежедневно 10:00-23:00"
        )


        # --- Санкт-Петербург, Россия ---
        loc_hermitage = Location(
            name="Эрмитаж", latitude=59.9398, longitude=30.3145,
            city="Санкт-Петербург", country="Россия",
            rating=4.9, type="музей", description="Один из крупнейших музеев мира",
            cost=700.0, cost_currency="RUB", opening_hours="Вт-Вс 11:00-18:00"
        )
        loc_petergof = Location(
            name="Петергоф", latitude=59.8854, longitude=29.9071,
            city="Петергоф", country="Россия",
            rating=4.7, type="достопримечательность", description="Дворцово-парковый ансамбль",
            cost=1000.0, cost_currency="RUB", opening_hours="Ежедневно 9:00-20:00"
        )

        # --- Рим, Италия ---
        loc_colosseum = Location(
            name="Колизей", latitude=41.8902, longitude=12.4924,
            city="Рим", country="Италия",
            rating=4.7, type="история", description="Амфитеатр Древнего Рима", 
            cost=16.0, cost_currency="EUR", opening_hours="Ежедневно 8:30-19:00"
        )


        db.add_all([
            loc_red_square, loc_kremlin, loc_tretyakov, loc_gorky_park, loc_bolshoi, loc_cafe_pushkin,
            loc_hermitage, loc_petergof,
            loc_colosseum,
        ])
        db.commit()

        print("Seeding activities...")
        act_tretyakov_tour = Activity(
            location_id=loc_tretyakov.id,
            name="Обзорная экскурсия", description="Экскурсия по основным залам",
            cost=1000.0, cost_currency="RUB", activity_type="экскурсия", schedule="Ежедневно в 11:00 и 15:00"
        )
        act_gorky_boats = Activity(
            location_id=loc_gorky_park.id,
            name="Прокат лодок", description="Прогулка на лодке по пруду",
            cost=800.0, cost_currency="RUB", activity_type="активность", schedule="10:00-20:00"
        )

        db.add_all([act_tretyakov_tour, act_gorky_boats])
        db.commit()


        print("Database seeded successfully!")
    else:
        print("Locations table is not empty, skipping seeding.")

except Exception as e:
    db.rollback()
    print(f"An error occurred during seeding: {e}")
    import traceback
    traceback.print_exc()
finally:
    db.close()