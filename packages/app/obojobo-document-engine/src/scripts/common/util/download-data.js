const API = require('../../viewer/util/api')
const download = require('downloadjs')
const toCSV = require('./csv')

const downloadAssessmentsForModule = (draftId) => {
	const url = `/api/drafts/${draftId}/assessments`

	return API.get(url, 'json')
		.then(res => res.text())
		.then(contents => {
			const formatted = toCSV(JSON.parse(contents).value)
			download(formatted, `obojobo-assessment-data-${draftId}.csv`, 'text/csv')
		})
}

module.exports = {
	downloadAssessmentsForModule
}
