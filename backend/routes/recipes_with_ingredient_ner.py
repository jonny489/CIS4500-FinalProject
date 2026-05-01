from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extensions import connection

router = APIRouter()


@router.get("/api/recipes/with-ingredient-ner")
def get_recipes_with_ingredient_ner(
    ingredient_ners: list[str] = Query(..., min_length=1),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: connection = Depends(get_db),
):
    normalized_ners = list({ner.strip().lower() for ner in ingredient_ners if ner.strip()})
    if not normalized_ners:
        raise HTTPException(status_code=400, detail="At least one ingredient NER is required")
    offset = (page - 1) * page_size

    cursor = db.cursor()
    try:
        cursor.execute(
            """
            WITH required_ners AS (
                SELECT UNNEST(%s::text[]) AS ner_label
            ),
            matching_ingredients AS (
                SELECT i.ingredient_id, rn.ner_label
                FROM ingredients i
                JOIN required_ners rn
                  ON LOWER(i.ner_label) = rn.ner_label
            )
            SELECT r.recipe_id, r.name, r.link
            FROM recipes r
            JOIN needed_for nf ON nf.recipe_id = r.recipe_id
            JOIN matching_ingredients mi ON mi.ingredient_id = nf.ingredient_id
            GROUP BY r.recipe_id, r.name, r.link
            HAVING COUNT(DISTINCT mi.ner_label) = (SELECT COUNT(*) FROM required_ners)
            ORDER BY r.name
            LIMIT %s OFFSET %s
            """,
            (normalized_ners, page_size, offset),
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
