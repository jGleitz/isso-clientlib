/**
 * Helper class to deal with the browser’s location in tests.
 */
export default class Location {
	private static initial?: string;

	/**
	 * Sets the browser’s location to the provided `newLocation`.
	 *
	 * @param newLocation
	 *		The href to set the browser location to.
	 */
	public static update(newLocation: string): void {
		if (Location.initial === undefined) {
			Location.initial = location.href;
		}
		window.history.pushState({}, document.title, newLocation);
	}

	/**
	 * Resets the browser’s location to the state before the first call to
	 * {@link #update} or the first call to it after the last call to this
	 * method, respectively.
	 */
	public static reset(): void {
		if (Location.initial !== undefined) {
			Location.update(Location.initial);
			Location.initial = undefined;
		}
	}
}
