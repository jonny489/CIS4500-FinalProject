from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extensions import connection

router = APIRouter()


# 7) FIND RECIPES BY EXCLUDED INGREDIENTS
#
# Functionality:
#   Returns recipes that do not use any of the listed ingredients.
#
# Request path:
#   GET /api/recipes/by-excluded-ingredients
#
# Query parameters:
#   ingredient_ids   string   required   Comma-separated ids to exclude
#
# SQL:
#   SELECT r.recipe_id, r.name, r.link
#   FROM recipes r
#   WHERE NOT EXISTS (
#     SELECT 1
#     FROM needed_for nf
#     WHERE nf.recipe_id = r.recipe_id
#       AND nf.ingredient_id = ANY(:ingredient_ids)
#   );
#
# Response:
#   recipes         array of object
#     recipe_id     integer
#     name          string
#     link          string
@router.get("/api/recipes/by-excluded-ingredients")
def get_recipes_by_excluded_ingredients(
    ingredient_ids: str = Query(..., description="Comma-separated ingredient ids to exclude"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: connection = Depends(get_db),
):
    # Parse and validate comma-separated ids into a list of integers
    try:
        excluded_ids = [int(id.strip()) for id in ingredient_ids.split(",") if id.strip()]
    except ValueError:
        raise HTTPException(status_code=400, detail="ingredient_ids must be comma-separated integers")

    if not excluded_ids:
        raise HTTPException(status_code=400, detail="At least one ingredient id is required")

    offset = (page - 1) * page_size

    cursor = db.cursor()
    try:
        cursor.execute(
            """
            SELECT r.recipe_id, r.name, r.link
            FROM recipes r
            WHERE NOT EXISTS (
                SELECT 1
                FROM needed_for nf
                WHERE nf.recipe_id = r.recipe_id
                  AND nf.ingredient_id = ANY(%s)
            )
            ORDER BY r.name
            LIMIT %s OFFSET %s
            """,
            (excluded_ids, page_size, offset),
        )
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        recipes = [dict(zip(columns, row)) for row in rows]
        return {
            "recipes": recipes,
            "pagination": {
                "page": page,
                "page_size": page_size,
                "returned": len(recipes),
            },
        }
    finally:
        cursor.close()
