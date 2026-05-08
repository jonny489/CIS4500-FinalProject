from database import get_db
from fastapi import APIRouter, Depends, HTTPException, Query
from psycopg2.extensions import connection
from pydantic import BaseModel

router = APIRouter()


class SaveRecipeBody(BaseModel):
    recipe_id: int


@router.post("/api/users/{user_id}/saved-recipes", status_code=201)
def save_recipe(
    user_id: str,
    body: SaveRecipeBody,
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute("SELECT 1 FROM recipes WHERE recipe_id = %s", (body.recipe_id,))
        if cursor.fetchone() is None:
            raise HTTPException(status_code=404, detail="Recipe not found")

        cursor.execute(
            """
            INSERT INTO user_saved_recipe (user_id, recipe_id)
            VALUES (%s, %s)
            ON CONFLICT (user_id, recipe_id)
            DO UPDATE SET saved_at = CURRENT_TIMESTAMP
            RETURNING user_id, recipe_id, saved_at
            """,
            (user_id, body.recipe_id),
        )
        db.commit()
        row = cursor.fetchone()
        return {
            "user_id": row[0],
            "recipe_id": row[1],
            "saved": True,
            "saved_at": row[2].isoformat(),
        }
    finally:
        cursor.close()


@router.get("/api/users/{user_id}/saved-recipes/{recipe_id}")
def get_saved_recipe(
    user_id: str,
    recipe_id: int,
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            SELECT r.recipe_id, r.name, r.link, r.directions, usr.saved_at
            FROM user_saved_recipe usr
            JOIN recipes r ON r.recipe_id = usr.recipe_id
            WHERE usr.user_id = %s AND usr.recipe_id = %s
            """,
            (user_id, recipe_id),
        )
        row = cursor.fetchone()
        if row is None:
            raise HTTPException(status_code=404, detail="Saved recipe not found")
        return {
            "recipe_id": row[0],
            "name": row[1],
            "link": row[2],
            "directions": row[3],
            "saved_at": row[4].isoformat(),
        }
    finally:
        cursor.close()


@router.delete("/api/users/{user_id}/saved-recipes/{recipe_id}", status_code=200)
def unsave_recipe(
    user_id: str,
    recipe_id: int,
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            DELETE FROM user_saved_recipe
            WHERE user_id = %s AND recipe_id = %s
            RETURNING user_id, recipe_id
            """,
            (user_id, recipe_id),
        )
        row = cursor.fetchone()
        db.commit()
        if row is None:
            raise HTTPException(status_code=404, detail="Saved recipe not found")
        return {
            "user_id": row[0],
            "recipe_id": row[1],
            "saved": False,
        }
    finally:
        cursor.close()


@router.get("/api/users/{user_id}/saved-recipes")
def list_saved_recipes(
    user_id: str,
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        cursor.execute(
            """
            SELECT r.recipe_id, r.name, r.link, usr.saved_at
            FROM user_saved_recipe usr
            JOIN recipes r ON r.recipe_id = usr.recipe_id
            WHERE usr.user_id = %s
            ORDER BY usr.saved_at DESC
            LIMIT %s OFFSET %s
            """,
            (user_id, limit, offset),
        )
        rows = cursor.fetchall()
        return {
            "saved_recipes": [
                {
                    "recipe_id": r[0],
                    "name": r[1],
                    "link": r[2],
                    "saved_at": r[3].isoformat(),
                }
                for r in rows
            ],
            "limit": limit,
            "offset": offset,
        }
    finally:
        cursor.close()
