const db = require('obojobo-express/server/db')
// const logger = require('obojobo-express/server/logger')


const getAttemptsForDraft = (draftId, isPreview = false, optionalAssessmentId = null) => {
	return db
		.manyOrNone(
			`
			SELECT
				ATT.id AS "attempt_id",
				ATT.user_id AS "student_id",
				CONCAT(U.last_name, ', ', U.first_name) AS "student_name",
				ATT.created_at,
				ATT.updated_at,
				ATT.completed_at,
				SCO.score AS "assessment_score",
				SCO.score_details -> 'attemptNumber' AS "student_attempt_number"
			FROM attempts ATT
			LEFT JOIN assessment_scores SCO
				ON ATT.id = SCO.attempt_id
			INNER JOIN users U
				ON U.id = ATT.user_id
			WHERE
				ATT.draft_id = $[draftId]
				${optionalAssessmentId !== null ? 'AND ATT.assessment_id = $[optionalAssessmentId]' : ''}
				AND ATT.is_preview = $[isPreview]
			ORDER BY ATT.completed_at`,
			{
				draftId,
				optionalAssessmentId,
				isPreview
			}
		)
}


module.exports = {
	getAttemptsForDraft
}