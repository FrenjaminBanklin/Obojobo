/**
 * @param {Object[]} raw      Array of objects to be converted
 * @param {string[]=} headings Optional list of headings to include - if null, all keys will be used
 */
const toCSV = (raw, headings = null) => {
	const NEWLINE = `\n`

	if ( ! headings) {
		// generate headings from the first element's key names
		// this way we can make sure everything stays in the right order
		headings = Object.keys(raw[0])
	}

	let csvString = headings.join() + NEWLINE

	for (const itemIndex in raw) {
		const item = raw[itemIndex]

		// store each object as an array of strings that we can join together as a row string
		const newLine = []

		for (const headingIndex in headings) {
			const targetKey = headings[headingIndex]

			// take any existing double quotation marks and double them so they persist in the csv
			const valueString = `${item[targetKey]}`.replace(/"/g, '""')

			// wrap each 'cell' in double quotes so commas don't interrupt column order
			newLine.push(`"${valueString}"`)
		}

		csvString += newLine.join() + NEWLINE
	}

	return csvString
}
module.exports = toCSV
