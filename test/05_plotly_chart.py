# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "marimo",
#     "plotly",
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
    mo.md(r"""# Plotly chart display test""")
    return


@app.cell
def _():
    import plotly.express as px

    df = px.data.iris()
    fig = px.scatter(
        df,
        x="sepal_width",
        y="sepal_length",
        color="species",
        size="petal_length",
        title="Iris dataset",
    )
    return (fig,)


@app.cell
def _(fig, mo):
    mo.ui.plotly(fig)
    return


if __name__ == "__main__":
    app.run()
