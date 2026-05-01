from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/{recipe_id:int}")
def get_recipe_details(recipe_id: int, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            SELECT recipe_id, name, link, directions
            FROM recipes
            WHERE recipe_id = %s
            """,
            (recipe_id,),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Recipe not found")

        columns = [desc[0] for desc in cursor.description]
        return dict(zip(columns, row))
    finally:
        cursor.close()
