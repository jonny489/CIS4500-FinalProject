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
            SELECT r.recipe_id, r.name, r.link, rec.estimated_total
            FROM recipe_estimated_costs rec
            JOIN recipes r ON r.recipe_id = rec.recipe_id
            WHERE rec.estimated_total <= %s
            ORDER BY rec.estimated_total ASC, r.name ASC
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
