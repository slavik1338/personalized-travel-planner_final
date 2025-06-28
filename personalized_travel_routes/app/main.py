from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database.db import get_db

from app.api import users
from app.api import queries
from app.api import routes
from app.api import reviews
from app.api import recommendations
from app.api import search 

app = FastAPI()

origins = [ "http://localhost:5173", "http://127.0.0.1:5173" ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, 
    allow_credentials=True, 
    allow_methods=["*"], 
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"Hello": "World"}

app.include_router(users.router)
app.include_router(queries.router)
app.include_router(routes.router_routes)
app.include_router(reviews.router_reviews)
app.include_router(recommendations.router_recommendations)
app.include_router(search.router_search)
