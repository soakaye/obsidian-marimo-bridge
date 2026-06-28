# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "marimo",
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
    mo.md(r"""# Dataframe viewer display test""")
    return


@app.cell
def _():
    import pandas as pd

    df = pd.DataFrame(
        {
            "name": ["Alice", "Bob", "Carol", "Dave", "Erin"],
            "age": [30, 25, 35, 28, 41],
            "city": ["Tokyo", "Osaka", "Kyoto", "Nagoya", "Fukuoka"],
            "score": [88.5, 92.1, 79.0, 95.3, 84.7],
        }
    )
    return (df,)


@app.cell
def _(df, mo):
    mo.ui.table(df, selection="multi")
    return


@app.cell
def _(df, mo):
    mo.md("## Editable dataframe")
    mo.ui.data_editor(df)
    return


if __name__ == "__main__":
    app.run()
