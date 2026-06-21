if (process.env.FAKE_MARIMO_STDOUT) {
	process.stdout.write(process.env.FAKE_MARIMO_STDOUT);
}

if (process.env.FAKE_MARIMO_STDERR) {
	process.stderr.write(process.env.FAKE_MARIMO_STDERR);
}

if (process.env.FAKE_MARIMO_EXIT_CODE) {
	process.exit(Number(process.env.FAKE_MARIMO_EXIT_CODE));
}

process.on("SIGTERM", () => {
	process.exit(0);
});

setInterval(() => {}, 1000);
