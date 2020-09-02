const db = require('obojobo-express/server/db')
const Draft = require ('obojobo-express/server/models/draft')
// const logger = require('obojobo-express/server/logger')

const traverseAssessmentChildTree = (currentNode, questionStorage = []) => {
	// once we find a question node, branch off to process it
	if (currentNode.node.type === 'ObojoboDraft.Chunks.Question') {
		let questionString = ''
		const answerStorage = []

		// now start going through the question's nodes - find all the text nodes
		//  so we can generate a string representing the 'question', also find all
		//  of the answer nodes so we can compile a list of possible answers
		currentNode.children.forEach(childNode => {
			questionString = traverseQuestionChildTree(childNode, questionString, answerStorage)
		})

		questionStorage[currentNode.node.id] = {
			text: questionString,
			answers: answerStorage
		}
	} else {
		// otherwise move on to the next one
		currentNode.children.forEach(childNode => {
			traverseAssessmentChildTree(childNode, questionStorage)
		})
	}
}

const traverseQuestionChildTree = (currentNode, stringInProgress = '', answerStorage = []) => {
	if (currentNode.node.type === 'ObojoboDraft.Chunks.Heading'
	|| currentNode.node.type === 'ObojoboDraft.Chunks.Text') {
		const questionString = consolidateNodeTextString(currentNode)
		// if the question string already has something in it, add a space before appending the next part
		stringInProgress += stringInProgress ? ' ' + questionString : questionString
	}
	// this may be a bit naive right now - add an 'or' for each potential question type?
	if (currentNode.node.type === 'ObojoboDraft.Chunks.MCAssessment') {
		// luckily, we can at least assume that every child of an MCAssessment will be an MCChoice
		currentNode.children.forEach(assessmentChoice => {
			// also luckily, we can assume that an MCChoice node will only ever have one MCAnswer
			//  ... and that it will always be the first child
			if (assessmentChoice.children.length < 1
			|| assessmentChoice.children[0].node.type !== 'ObojoboDraft.Chunks.MCAssessment.MCAnswer') return

			const answerNode = assessmentChoice.children[0]

			// unluckily, the MCAnswer's text is as hard to get as a question's text is
			let answerString = ''
			answerNode.children.forEach(childNode => {
				answerString = traverseAnswerChildTree(childNode, answerString)
			})

			answerStorage[assessmentChoice.node.id] = answerString
		})
	}
	return stringInProgress
}

const consolidateNodeTextString = node => {
	let consolidatedString = ''

	node.node.content.textGroup.forEach(textGroup => {
		consolidatedString += textGroup.text.value
	})

	return consolidatedString
}

const traverseAnswerChildTree = (currentNode, stringInProgress) => {
	if (currentNode.node.type === 'ObojoboDraft.Chunks.Heading'
	|| currentNode.node.type === 'ObojoboDraft.Chunks.Text') {
		const answerString = consolidateNodeTextString(currentNode)
		// if the question string already has something in it, add a space before appending the next part
		stringInProgress += stringInProgress ? ' ' + answerString : answerString
	}

	return stringInProgress
}

const getCompletedAssessmentsForDraft = (draftId, isPreview = false) => {
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
				AND ATT.is_preview = $[isPreview]
			ORDER BY ATT.completed_at`,
			{
				draftId,
				isPreview
			}
		)
}

const getQuestionChoicesForDraft = (userId, draftId, isPreview = false) => {
	// some data will need to persist between steps in the promise chain - store it here
	let allChosenQuestionsAndAnswers

	// this will have to occur in multiple stages unless some genius can do it all in a single query
	return db
		// step one - get all of the chosen questions, answers and content IDs for all assessment attempts
		.manyOrNone(
			`
			SELECT
				a.id,
				a.draft_content_id,
				r.question_id,
				r.response -> 'ids' ->> 0 AS chosen_answer_ids
			FROM attempts a
			INNER JOIN attempts_question_responses r
				ON a.id = r.attempt_id
				AND a.state -> 'chosen' -> 0 ->> 'id' = r.question_id
			WHERE
				a.draft_id = $[draftId]
				AND a.is_preview = $[isPreview]
			ORDER BY a.completed_at`,
			{
				draftId,
				isPreview
			}
		)
		// step two - for all content IDs, get JSON content
		.then(data => {
			allChosenQuestionsAndAnswers = data

			const rawContentIDList = data.map(row => row.draft_content_id)
			const uniqueContentIDSet = new Set(rawContentIDList)
			const contentIDList = [ ...uniqueContentIDSet ]

			// fetch the content json for all content IDs
			return db
				.manyOrNone(
					`
					SELECT
						id,
						content
					FROM drafts_content
					WHERE
						draft_id = $[draftId]
						AND id IN ($[contentIds])
					`,
					{
						draftId,
						contentIds: contentIDList.join(',')
					}
				)
		})
		.then(contentTrees => {
			const contentQuestionsAnswers = []

			contentTrees.forEach(tree => {

				// create a Draft object to make traversing the assessment a lot easier
				const draftObj = new Draft(userId, tree.content)
				const assessmentObj = draftObj.getChildNodesByType('ObojoboDraft.Sections.Assessment')[0]

				const questionStorage = []

				// traverse the node trees of the assessment to find all of the questions
				assessmentObj.children.forEach(assessmentChild => {
					traverseAssessmentChildTree(assessmentChild, questionStorage)
				})

				// start keeping a record of this content ID's questions and answers
				contentQuestionsAnswers[tree.id] = {
					questions: questionStorage
				}
			})

			// extract the question/answer usage data we got before so we can compare quickly in the next step
			const condensedQuestionUsage = []
			const condensedAnswerUsage = []

			allChosenQuestionsAndAnswers.forEach(row => {
				const condensedQuestionId = `${row.draft_content_id}:${row.question_id}`
				if ( ! condensedQuestionUsage[condensedQuestionId] ) condensedQuestionUsage[condensedQuestionId] = 0
				condensedQuestionUsage[condensedQuestionId]++

				// it's possible for multiple answers to be chosen for a single question
				//  so if multiple were chosen, indicate one 'usage' for each
				const allChosenAnswers = row.chosen_answer_ids.split(',')
				allChosenAnswers.forEach(answer => {
					const condensedAnswerId = `${condensedQuestionId}:${answer}`
					if ( ! condensedAnswerUsage[condensedAnswerId] ) condensedAnswerUsage[condensedAnswerId] = 0
					condensedAnswerUsage[condensedAnswerId]++
				})
			})

			// now that we have a full list of questions and answers for this draft content, combine it
			//  with the data we previously fetched counting out the number of times each question/answer
			//  was used to generate the final data set, which needs to be two-dimensional for our CSV parser
			const twoDimensional = []

			for (const draftContentId in contentQuestionsAnswers) {
				const questionList = contentQuestionsAnswers[draftContentId].questions

				for (const questionId in questionList) {
					const condensedQuestionId = `${draftContentId}:${questionId}`
					const answerList = questionList[questionId].answers

					for (const answerId in answerList) {
						const condensedAnswerId = `${condensedQuestionId}:${answerId}`

						// console.log('sigh. troubleshooting.')
						// console.log(condensedAnswerId)
						// console.log(condensedAnswerUsage)
						// console.log(condensedAnswerUsage[condensedAnswerId])

						twoDimensional.push({
							draft_id: draftId,
							draft_content_id: draftContentId,
							question_id: questionId,
							question_text: questionList[questionId].text,
							question_choice_count: condensedQuestionUsage[condensedQuestionId] ? condensedQuestionUsage[condensedQuestionId] : 0,
							answer_id: answerId,
							answer_text: answerList[answerId],
							answer_choice_count: condensedAnswerUsage[condensedAnswerId] ? condensedAnswerUsage[condensedAnswerId] : 0
						})
					}
				}
			}

			return twoDimensional
		})
}

module.exports = {
	getCompletedAssessmentsForDraft,
	getQuestionChoicesForDraft
}