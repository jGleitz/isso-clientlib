declare module 'hasbin' {
	function first(
		executables: string[],
		callback: (foundExecutableOrError: string | false) => void
	): void;
}
