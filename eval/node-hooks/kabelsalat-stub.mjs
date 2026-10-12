// @strudel/core/repl.mjs imports SalatRepl, which the installed @kabelsalat/web lacks.
// Headless evaluation never touches it — an empty class satisfies the import.
export class SalatRepl {}
