const API = require('../../viewer/util/api')
const download = require('downloadjs')
const toCSV = require('./csv')

const downloadAssessmentCompletions = draftId => {
	const url = `/api/drafts/${draftId}/assessment/completed`

	return API.get(url, 'json')
		.then(res => res.text())
		.then(contents => {
			const formatted = toCSV(JSON.parse(contents).value)
			download(formatted, `obojobo-assessment-completed-${draftId}.csv`, 'text/csv')
		})
}

const downloadAssessmentQuestionAnswers = draftId => {
	const url = `/api/drafts/${draftId}/assessment/questions`

	return API.get(url, 'json')
		.then(res => res.text())
		.then(contents => {
			const formatted = toCSV(JSON.parse(contents).value)
			download(formatted, `obojobo-assessment-questions-${draftId}.csv`, 'text/csv')
		})
}

module.exports = {
	downloadAssessmentCompletions,
	downloadAssessmentQuestionAnswers
}
