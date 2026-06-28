import marimo

__generated_with = "0.23.11"
app = marimo.App(width="medium")


@app.cell
def _():
    import marimo as mo
    return (mo,)


@app.cell
def _(mo):
    mo.md(r"""# Mermaid diagram display test""")
    return


@app.cell
def _(mo):
    mo.mermaid(
        """
        graph LR
            A[Edit .py file] --> B{marimo server}
            B --> C[Render webview]
            C --> D[Obsidian tab]
            B --> E[Reactive re-run]
            E --> C
        """
    )
    return


@app.cell
def _(mo):
    mo.mermaid(
        """
        sequenceDiagram
            participant U as User
            participant P as Plugin
            participant S as marimo server
            U->>P: Open notebook
            P->>S: Start process
            S-->>P: URL ready
            P-->>U: Embed webview
        """
    )
    return


if __name__ == "__main__":
    app.run()
