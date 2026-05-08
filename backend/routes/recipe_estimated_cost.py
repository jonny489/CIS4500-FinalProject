from database import get_db
from fastapi import APIRouter, Depends, HTTPException
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/{recipe_id}/estimated-cost")
def get_estimated_cost(
    recipe_id: int,
    currency: str = "USD",
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM recipes WHERE recipe_id = %s", (recipe_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Recipe not found")

        cursor.execute(
            """
            WITH cheapest AS (
                SELECT
                    nf.ingredient_id,
                    MIN(wi."Price") AS price
                FROM needed_for nf
                LEFT JOIN ingredient_walmart_item iwi ON iwi.ingredient_id = nf.ingredient_id
                LEFT JOIN walmart_item wi ON wi.id = iwi.walmart_item_id
                WHERE nf.recipe_id = %s
                GROUP BY nf.ingredient_id
            )
            SELECT
                COALESCE(SUM(price), 0)                          AS estimated_total,
                COUNT(*) FILTER (WHERE price IS NULL)            AS missing_prices
            FROM cheapest
            """,
            (recipe_id,),
        )
        row = cursor.fetchone()
        return {
            "recipe_id": recipe_id,
            "estimated_total": float(row[0]),
            "currency": currency,
            "missing_prices": row[1],
        }
    finally:
        cursor.close()
