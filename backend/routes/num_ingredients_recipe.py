from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/num-ingredients")
def get_recipes_by_ingredients(
    min_ingredients: int = Query(0, ge=0),
    max_ingredients: int = Query(..., ge=0),
    max_recipes: int = Query(1000, ge=1, le=10000),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    db: connection = Depends(get_db),
):
    if min_ingredients > max_ingredients:
        raise HTTPException(
            status_code=400,
            detail="min_ingredients must be less than or equal to max_ingredients",
        )

    offset = (page - 1) * page_size
    if offset >= max_recipes:
        return {
            "recipes": [],
            "pagination": {
                "page": page,
                "page_size": page_size,
                "max_recipes": max_recipes,
                "returned": 0,
            },
        }

    effective_limit = min(page_size, max_recipes - offset)

    cursor = db.cursor()
    try:
        cursor.execute(
            """
            WITH capped AS (
                SELECT r.recipe_id,
                       r.name,
                       r.link,
                       r.ingredients_count
                FROM recipes r
                WHERE r.ingredients_count >= %s
                  AND r.ingredients_count <= %s
                ORDER BY r.ingredients_count DESC, r.name
                LIMIT %s
            )
            SELECT recipe_id, name, link, ingredients_count
            FROM capped
            ORDER BY ingredients_count ASC, name
            LIMIT %s OFFSET %s
            """,
            (min_ingredients, max_ingredients, max_recipes, effective_limit, offset),
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        recipes = [dict(zip(columns, row)) for row in rows]
        return {
            "recipes": recipes,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "max_recipes": max_recipes,
                "returned": len(recipes),
            },
        }
    finally:
        cursor.close()
