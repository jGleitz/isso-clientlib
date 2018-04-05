/**
 * Simple polyfill for `Object#assign`.
 */
export default function assign(target: any, ...assigned: any[]): any {
	const result = target;
	for (const object of assigned) {
		for (const prop in object) {
			if (object.hasOwnProperty(prop)) {
				result[prop] = object[prop];
			}
		}
	}
	return result;
}
