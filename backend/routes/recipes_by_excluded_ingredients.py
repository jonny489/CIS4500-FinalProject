from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/by-excluded-ingredients")
def get_recipes_by_excluded_ingredients(
    ingredient_ners: list[str] = Query(..., description="NER labels of ingredients to exclude"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: connection = Depends(get_db),
):
    normalized = list({ner.strip().lower() for ner in ingredient_ners if ner.strip()})
    if not normalized:
        raise HTTPException(status_code=400, detail="At least one ingredient NER is required")

    offset = (page - 1) * page_size

    cursor = db.cursor()
    try:
        cursor.execute(
            """
            WITH excluded_ingredients AS (
                SELECT ingredient_id
                FROM ingredients
                WHERE LOWER(ner_label) = ANY(%s::text[])
            )
            SELECT r.recipe_id, r.name, r.link
            FROM recipes r
            WHERE NOT EXISTS (
                SELECT 1
                FROM needed_for nf
                JOIN excluded_ingredients ei ON ei.ingredient_id = nf.ingredient_id
                WHERE nf.recipe_id = r.recipe_id
            )
            ORDER BY r.name
            LIMIT %s OFFSET %s
            """,
            (normalized, page_size, offset),
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
