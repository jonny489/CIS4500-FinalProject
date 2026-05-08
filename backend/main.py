from fastapi import FastAPI
from routes.recipes_by_name import router as recipes_by_name_router
from routes.ingredients_for_recipe import router as ingredients_for_recipe_router
from routes.recipe_details import router as recipe_details_router
from routes.num_ingredients_recipe import router as num_ingredients_recipe_router
from routes.recipes_with_ingredient_ner import router as recipes_with_ingredient_ner_router
from routes.recipes_by_excluded_ingredients import router as recipes_by_excluded_ingredients_router
from routes.walmart_search import router as walmart_search_router
from routes.recipes_by_budget import router as recipes_by_budget_router
from routes.recipe_estimated_cost import router as recipe_estimated_cost_router
from routes.recipe_ingredient_matches import router as recipe_ingredient_matches_router
from routes.user_saved_recipes import router as user_saved_recipes_router
app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.get("/items/{item_id}")
def read_item(item_id: int, q: str | None = None):
    return {"item_id": item_id, "q": q}

app.include_router(recipes_by_name_router)
app.include_router(ingredients_for_recipe_router)
app.include_router(recipe_details_router)
app.include_router(num_ingredients_recipe_router)
app.include_router(recipes_with_ingredient_ner_router)
app.include_router(recipes_by_excluded_ingredients_router)
app.include_router(walmart_search_router)
app.include_router(recipes_by_budget_router)
app.include_router(recipe_estimated_cost_router)
app.include_router(recipe_ingredient_matches_router)
app.include_router(user_saved_recipes_router)