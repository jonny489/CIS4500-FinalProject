from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/{recipe_id}/ingredient-matches")
def get_ingredient_matches(
    recipe_id: int,
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM recipes WHERE recipe_id = %s", (recipe_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Recipe not found")

        cursor.execute(
            """
            SELECT
                nf.ingredient_id,
                nf.ingredient_description,
                nf.quantity,
                nf.units,
                w.id          AS walmart_item_id,
                w."Name"      AS walmart_name,
                w."Price"     AS price,
                w."Link"      AS walmart_link,
                w."Department" AS department,
                w."Units"     AS walmart_units
            FROM needed_for nf
            JOIN LATERAL (
                SELECT wi.*
                FROM ingredient_walmart_item iwi
                JOIN walmart_item wi ON wi.id = iwi.walmart_item_id
                WHERE iwi.ingredient_id = nf.ingredient_id
                ORDER BY wi."Price" ASC, wi.id ASC
                LIMIT 1
            ) w ON true
            WHERE nf.recipe_id = %s
            ORDER BY nf.ingredient_id
            """,
            (recipe_id,),
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return {"matches": [dict(zip(columns, row)) for row in rows]}
    finally:
        cursor.close()
