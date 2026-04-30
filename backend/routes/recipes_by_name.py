from database import get_db
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection

router = APIRouter()

'''
SEARCH RECIPES BY NAME

Functionality
  Returns a list of recipes whose name matches a substring or full-text
  pattern (implementation-defined). Used for autocomplete or browse flows.

Request path
  GET /api/recipes/search

Request parameters (path / body)
  (none)

Query parameters
  HTTP:
    name          string   required   Substring or search term for recipes.name
    limit         integer  optional   Max rows to return (default e.g. 20, cap 100)
    offset        integer  optional   Pagination offset (default 0)

Response parameters
  recipes         array of object
  recipe_id     integer   Primary key of the recipe
  name          string    recipes.name
  link          string    recipes.link
  total_count     integer   optional; total matches ignoring limit (if cheap to compute)
  limit           integer   Echo of applied limit
  offset          integer   Echo of applied offset
'''

@router.get("/api/recipes/search")
def get_recipes(name : str, limit: int = 10, offset: int = 0, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT * FROM recipes WHERE name ILIKE %s LIMIT %s OFFSET %s", (f"{name}%", limit, offset))
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return [dict(zip(columns, row)) for row in rows]
    finally:
        cursor.close()