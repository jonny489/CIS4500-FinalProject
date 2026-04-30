from database import get_db
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection

router = APIRouter()

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