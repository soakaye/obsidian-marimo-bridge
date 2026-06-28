import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# Media display test (audio & video)""")
    return


@app.cell
def _(mo):
    mo.md("## Audio player")
    mo.audio(
        src="https://upload.wikimedia.org/wikipedia/commons/8/8e/Schiff_-_Wohltemperiertes_Klavier_I_-_Praeludium_C-Dur.ogg"
    )
    return


@app.cell
def _(mo):
    mo.md("## Video player")
    mo.video(
        src="https://upload.wikimedia.org/wikipedia/commons/c/c0/Big_Buck_Bunny_4K.webm",
        controls=True,
        width=480,
    )
    return


if __name__ == "__main__":
    app.run()
