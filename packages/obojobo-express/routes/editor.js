const express = require('express')
const router = express.Router()
const db = oboRequire('db')
const { requireCanViewEditor } = oboRequire('express_validators')

const displayEditor = (req, res) => {
	return db
		.any(
			`
			SELECT DISTINCT ON (draft_id)
				draft_id AS "draftId",
				id AS "latestVersion",
				created_at AS "createdAt",
				content,
				xml
			FROM drafts_content
			WHERE draft_id IN (
				SELECT id
				FROM drafts
				WHERE deleted = FALSE
				AND user_id = $[userId]
			)
			ORDER BY draft_id, created_at desc
			`,
			{
				userId: req.currentUser.id
			}
		)
		.then(drafts => {
			res.render('editor', { drafts: drafts })
		})
		.catch(res.unexpected)
}

// Display the Document Editor
// mounted as /editor
router
	.route('/')
	.get(requireCanViewEditor)
	.get(displayEditor)

module.exports = router