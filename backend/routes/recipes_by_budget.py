from database import get_db
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection
from decimal import Decimal

router = APIRouter()


@router.get("/api/recipes/by-budget")
def get_recipes_by_budget(
    max_total: Decimal = Query(..., gt=0, description="Maximum total ingredient cost in dollars"),
    currency: str = Query("USD", description="Display only; prices are stored in USD"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: connection = Depends(get_db),
):
    offset = (page - 1) * page_size
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            WITH cheapest_per_ingredient AS (
                SELECT nf.recipe_id, nf.ingredient_id, MIN(wi."Price") AS cheapest_price
                FROM needed_for nf
                JOIN ingredient_walmart_item iwi ON iwi.ingredient_id = nf.ingredient_id
                JOIN walmart_item wi ON wi.id = iwi.walmart_item_id
                GROUP BY nf.recipe_id, nf.ingredient_id
            ),
            recipe_totals AS (
                SELECT recipe_id, SUM(cheapest_price) AS estimated_total
                FROM cheapest_per_ingredient
                GROUP BY recipe_id
            )
            SELECT r.recipe_id, r.name, r.link, rt.estimated_total
            FROM recipes r
            JOIN recipe_totals rt ON rt.recipe_id = r.recipe_id
            WHERE rt.estimated_total <= %s
            ORDER BY rt.estimated_total ASC, r.name ASC
            LIMIT %s OFFSET %s
            """,
            (max_total, page_size, offset),
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        return {
            "recipes": [dict(zip(columns, row)) for row in rows],
            "pagination": {"page": page, "page_size": page_size, "returned": len(rows)},
        }
    finally:
        cursor.close()
