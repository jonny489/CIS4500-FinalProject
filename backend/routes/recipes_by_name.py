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
    page          integer  optional   Page number (default 1)
    page_size     integer  optional   Number of results per page (default 20)

Response parameters
  recipes         array of object
    recipe_id     integer   Primary key of the recipe
    name          string    recipes.name
    link          string    recipes.link
  pagination      object
    page          integer   Current page number
    page_size     integer   Number of results per page
    returned      integer   Number of results returned on this page
'''

@router.get("/api/recipes/search")
def get_recipes(name: str, page: int = 1, page_size: int = 20, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        offset = (page - 1) * page_size
        cursor.execute(
            "SELECT * FROM recipes WHERE name ILIKE %s LIMIT %s OFFSET %s",
            (f"{name}%", page_size, offset)
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        recipes = [dict(zip(columns, row)) for row in rows]
        return {
            "recipes": recipes,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "returned": len(recipes)
            }
        }
    finally:
        cursor.close()