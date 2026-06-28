# /// script
# requires-python = ">=3.10"
# dependencies = [
#     "marimo",
#     "numpy",
#     "pillow",
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
    mo.md(r"""# Image display test""")
    return


@app.cell
def _(mo):
    mo.md("## From a remote URL")
    mo.image(
        src="https://marimo.io/logo.png",
        alt="marimo logo",
        width=200,
    )
    return


@app.cell
def _(mo):
    import numpy as np
    from PIL import Image

    gradient = np.linspace(0, 255, 256, dtype="uint8")
    array = np.tile(gradient, (128, 1))
    img = Image.fromarray(array, mode="L")

    mo.md("## From an in-memory array")
    mo.image(src=img, width=256)
    return


if __name__ == "__main__":
    app.run()
