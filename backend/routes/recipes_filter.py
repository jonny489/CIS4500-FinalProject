from database import get_db
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection
from decimal import Decimal

router = APIRouter()


@router.get("/api/recipes/filter")
def filter_recipes(
    name: str | None = Query(None, description="Substring match on recipe name"),
    include_ners: list[str] = Query(default=[], description="Ingredients to include (fridge search)"),
    exclude_ners: list[str] = Query(default=[], description="Ingredients to exclude"),
    max_budget: Decimal | None = Query(None, gt=0, description="Max estimated cost in USD"),
    min_ingredients: int | None = Query(None, ge=0),
    max_ingredients: int | None = Query(None, ge=0),
    sort: str = Query("name", description="Sort order: name, price_asc, price_desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: connection = Depends(get_db),
):
    offset = (page - 1) * page_size

    normalized_include = [n.strip().lower() for n in include_ners if n.strip()]
    normalized_exclude = [n.strip().lower() for n in exclude_ners if n.strip()]

    # Always LEFT JOIN costs so estimated_total is always returned
    select_cols = "r.recipe_id, r.name, r.link, rec.estimated_total"
    joins = ["LEFT JOIN recipe_estimated_costs rec ON rec.recipe_id = r.recipe_id"]
    conditions = []
    params = []
    group_by_cols = "r.recipe_id, r.name, r.link, rec.estimated_total"
    needs_group_by = False

    if max_budget is not None:
        conditions.append("rec.estimated_total <= %s")
        params.append(max_budget)

    if normalized_include:
        joins.append("JOIN needed_for nf ON nf.recipe_id = r.recipe_id")
        joins.append("JOIN ingredients i ON i.ingredient_id = nf.ingredient_id")
        conditions.append("LOWER(i.ner_label) = ANY(%s::text[])")
        params.append(normalized_include)
        needs_group_by = True

    if name:
        conditions.append("r.name ILIKE %s")
        params.append(f"{name}%")

    if min_ingredients is not None:
        conditions.append("r.ingredients_count >= %s")
        params.append(min_ingredients)

    if max_ingredients is not None:
        conditions.append("r.ingredients_count <= %s")
        params.append(max_ingredients)

    if normalized_exclude:
        conditions.append(
            "NOT EXISTS ("
            " SELECT 1 FROM needed_for nf_ex"
            " JOIN ingredients i_ex ON i_ex.ingredient_id = nf_ex.ingredient_id"
            " WHERE nf_ex.recipe_id = r.recipe_id"
            " AND LOWER(i_ex.ner_label) = ANY(%s::text[])"
            ")"
        )
        params.append(normalized_exclude)

    sql = f"SELECT {select_cols} FROM recipes r"
    sql += " " + " ".join(joins)
    if conditions:
        sql += " WHERE " + " AND ".join(conditions)
    if needs_group_by:
        sql += f" GROUP BY {group_by_cols}"
        sql += f" HAVING COUNT(DISTINCT LOWER(i.ner_label)) = {len(normalized_include)}"

    if sort == "price_asc":
        sql += " ORDER BY rec.estimated_total ASC NULLS LAST, r.name ASC"
    elif sort == "price_desc":
        sql += " ORDER BY rec.estimated_total DESC NULLS LAST, r.name ASC"
    else:
        sql += " ORDER BY r.name ASC"

    sql += " LIMIT %s OFFSET %s"
    params.extend([page_size, offset])

    cursor = db.cursor()
    try:
        cursor.execute(sql, params)
        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        recipes = [dict(zip(columns, row)) for row in rows]
        return {
            "recipes": recipes,
            "pagination": {"page": page, "page_size": page_size, "returned": len(recipes)},
        }
    finally:
        cursor.close()
