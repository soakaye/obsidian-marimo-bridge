import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(
        r"""
        # Markdown display test

        marimo renders Markdown with `mo.md`. It supports **bold**, *italic*,
        `inline code`, [links](https://marimo.io), and lists:

        - First item
        - Second item
            - Nested item
        - Third item

        1. Ordered one
        2. Ordered two
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        ## Admonitions

        /// note | Note
        This is a note admonition.
        ///

        /// tip | Tip
        This is a tip admonition.
        ///

        /// warning | Warning
        This is a warning admonition.
        ///

        /// danger | Danger
        This is a danger admonition.
        ///
        """
    )
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        ## Collapsible details

        /// details | Click to expand
        Hidden content revealed on click.
        ///
        """
    )
    return


@app.cell
def _(mo):
    name = "marimo"
    mo.md(f"## Dynamic values\n\nMarkdown can interpolate Python values: **{name}** :rocket:")
    return


if __name__ == "__main__":
    app.run()
