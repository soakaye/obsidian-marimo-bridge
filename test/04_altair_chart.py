# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "marimo",
#     "altair",
#     "vega-datasets",
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
    mo.md(r"""# Altair interactive chart display test""")
    return


@app.cell
def _():
    import altair as alt
    from vega_datasets import data

    cars = data.cars()
    return alt, cars


@app.cell
def _(alt, cars, mo):
    chart = (
        alt.Chart(cars)
        .mark_point()
        .encode(
            x="Horsepower",
            y="Miles_per_Gallon",
            color="Origin",
        )
    )
    mo.ui.altair_chart(chart)
    return


if __name__ == "__main__":
    app.run()
