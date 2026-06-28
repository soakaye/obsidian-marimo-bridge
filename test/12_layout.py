import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# Layout display test (tabs, accordion, stacks)""")
    return


@app.cell
def _(mo):
    mo.md("## Tabs")
    mo.ui.tabs(
        {
            "Overview": mo.md("Content of the **Overview** tab."),
            "Details": mo.md("Content of the **Details** tab."),
            "Settings": mo.md("Content of the **Settings** tab."),
        }
    )
    return


@app.cell
def _(mo):
    mo.md("## Accordion")
    mo.accordion(
        {
            "Section 1": mo.md("First collapsible section."),
            "Section 2": mo.md("Second collapsible section."),
        }
    )
    return


@app.cell
def _(mo):
    mo.md("## Horizontal stack")
    mo.hstack(
        [mo.md("Left"), mo.md("Center"), mo.md("Right")],
        justify="space-between",
    )
    return


@app.cell
def _(mo):
    mo.md("## Vertical stack")
    mo.vstack([mo.md("Top"), mo.md("Middle"), mo.md("Bottom")])
    return


if __name__ == "__main__":
    app.run()
