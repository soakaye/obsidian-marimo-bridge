# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "marimo",
#     "duckdb",
#     "pandas",
# ]
# ///
import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# SQL query display test (DuckDB)""")
    return


@app.cell
def _():
    import pandas as pd

    products = pd.DataFrame(
        {
            "product": ["Apple", "Banana", "Cherry", "Date", "Elderberry"],
            "category": ["fruit", "fruit", "fruit", "fruit", "fruit"],
            "price": [120, 80, 300, 250, 400],
            "stock": [50, 120, 20, 35, 10],
        }
    )
    return (products,)


@app.cell
def _(mo, products):
    result = mo.sql(
        f"""
        SELECT product, price, stock, price * stock AS inventory_value
        FROM products
        WHERE price > 100
        ORDER BY inventory_value DESC
        """
    )
    return


if __name__ == "__main__":
    app.run()
