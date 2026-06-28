import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# Progress & status display test""")
    return


@app.cell
def _(mo):
    import time

    mo.md("## Progress bar")
    for _ in mo.status.progress_bar(range(10), title="Working", subtitle="Please wait"):
        time.sleep(0.05)
    return (time,)


@app.cell
def _(mo, time):
    mo.md("## Spinner")
    with mo.status.spinner(title="Loading data...") as spinner:
        time.sleep(0.3)
        spinner.update("Almost done...")
        time.sleep(0.3)
    mo.md("Done :white_check_mark:")
    return


if __name__ == "__main__":
    app.run()
