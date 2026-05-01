from database import get_db
from fastapi import APIRouter, Depends
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/{recipe_id}/ingredients")
def get_recipe_ingredients(recipe_id: int, db: connection = Depends(get_db)):
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            SELECT nf.ingredient_id,
                   nf.ingredient_description,
                   nf.quantity,
                   nf.units,
                   i.ner_label
            FROM needed_for nf
            JOIN ingredients i ON i.ingredient_id = nf.ingredient_id
            WHERE nf.recipe_id = %s
            ORDER BY nf.ingredient_id
            """,
            (recipe_id,),
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        ingredients = [dict(zip(columns, row)) for row in rows]
        return {"ingredients": ingredients}
    finally:
        cursor.close()
