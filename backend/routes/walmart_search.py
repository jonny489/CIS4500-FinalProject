from database import get_db
from fastapi import APIRouter, Depends, Query
from psycopg2.extensions import connection

router = APIRouter()


# 10) SEARCH WALMART PRODUCTS BY KEYWORD
#
# Functionality:
#   Full-text or substring search across walmart_item.Name (and optionally
#   Department). Returns product cards for UI selection.
#
# Request path:
#   GET /api/walmart-items/search
#
# Query parameters:
#   q               string    required   Keyword(s)
#   limit           integer   optional
#   offset          integer   optional
#   department      string    optional   Filter walmart_item.Department
#
# Example SQL:
#   SELECT id, "Name", "Price", "Units", "Department", "Link"
#   FROM walmart_item
#   WHERE LOWER("Name") LIKE LOWER(:q_pattern)
#     AND (:department IS NULL OR "Department" = :department)
#   ORDER BY "Name"
#   LIMIT :limit OFFSET :offset;
#
# Response:
#   items             array of object
#     walmart_item_id   integer
#     name              string
#     price             number (decimal)
#     units             string
#     department        string
#     link              string
@router.get("/api/walmart-items/search")
def search_walmart_items(
    q: str = Query(..., description="Keyword(s) to search"),
    limit: int = Query(20, ge=1, le=200),
    offset: int = Query(0, ge=0),
    department: str | None = Query(None, description="Filter by department"),
    db: connection = Depends(get_db),
):
    cursor = db.cursor()
    try:
        if department is not None:
            cursor.execute(
                """
                SELECT id, "Name", "Price", "Units", "Department", "Link"
                FROM walmart_item
                WHERE LOWER("Name") LIKE LOWER(%s)
                  AND "Department" = %s
                ORDER BY "Name"
                LIMIT %s OFFSET %s
                """,
                (f"%{q}%", department, limit, offset),
            )
        else:
            cursor.execute(
                """
                SELECT id, "Name", "Price", "Units", "Department", "Link"
                FROM walmart_item
                WHERE LOWER("Name") LIKE LOWER(%s)
                ORDER BY "Name"
                LIMIT %s OFFSET %s
                """,
                (f"%{q}%", limit, offset),
            )

        rows = cursor.fetchall()
        columns = [desc[0] for desc in cursor.description]
        items = [dict(zip(columns, row)) for row in rows]
        return {"items": items}
    finally:
        cursor.close()
