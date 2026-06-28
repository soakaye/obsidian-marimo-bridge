import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# UI input elements display test""")
    return


@app.cell
def _(mo):
    slider = mo.ui.slider(0, 100, value=42, label="Slider")
    number = mo.ui.number(0, 10, value=3, label="Number")
    text = mo.ui.text(value="hello", label="Text")
    text_area = mo.ui.text_area(value="multi\nline", label="Text area")
    return number, slider, text, text_area


@app.cell
def _(mo):
    checkbox = mo.ui.checkbox(value=True, label="Checkbox")
    switch = mo.ui.switch(value=False, label="Switch")
    dropdown = mo.ui.dropdown(["red", "green", "blue"], value="green", label="Dropdown")
    radio = mo.ui.radio(["A", "B", "C"], value="A", label="Radio")
    date = mo.ui.date(label="Date")
    return checkbox, date, dropdown, radio, switch


@app.cell
def _(
    checkbox,
    date,
    dropdown,
    mo,
    number,
    radio,
    slider,
    switch,
    text,
    text_area,
):
    mo.vstack(
        [
            slider,
            number,
            text,
            text_area,
            checkbox,
            switch,
            dropdown,
            radio,
            date,
        ]
    )
    return


@app.cell
def _(mo, slider):
    mo.md(f"**Reactive value:** the slider is at `{slider.value}`.")
    return


if __name__ == "__main__":
    app.run()
