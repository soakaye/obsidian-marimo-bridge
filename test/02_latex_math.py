import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# LaTeX / math display test""")
    return


@app.cell
def _(mo):
    mo.md(
        r"""
        Inline math such as $e^{i\pi} + 1 = 0$ renders within a sentence.

        Block math is centered on its own line:

        $$
        \int_{-\infty}^{\infty} e^{-x^2}\,dx = \sqrt{\pi}
        $$

        $$
        \begin{pmatrix}
        a & b \\
        c & d
        \end{pmatrix}
        \begin{pmatrix}
        x \\
        y
        \end{pmatrix}
        =
        \begin{pmatrix}
        ax + by \\
        cx + dy
        \end{pmatrix}
        $$
        """
    )
    return


if __name__ == "__main__":
    app.run()
