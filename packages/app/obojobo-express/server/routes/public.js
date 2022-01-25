const express = require('express')
const router = express.Router()
const Visit = oboRequire('server/models/visit')
const insertEvent = oboRequire('server/insert_event')
const { assetForEnv, webpackAssetPath } = oboRequire('server/asset_resolver')
const {
	checkValidationRules,
	allowAnonymousUser,
	requireCurrentDocument,
	requireVisitId,
	requireCurrentVisit,
	requireCurrentUser
} = oboRequire('server/express_validators')

// launch lti view of draft - redirects to visit route
// mounted as /public/:draftId/:page
router
	.route('/:draftId/:page?')
	.get([
		allowAnonymousUser,
		requireCurrentUser,
		requireCurrentDocument,
		checkValidationRules
	])
	.get((req, res) => {
		let createdVisitId

		return Visit.createAnonymousVisit(req.currentUser.id, req.currentDocument.draftId)
			.then(({ visitId: visitId, deactivatedVisitId }) => {
				createdVisitId = visitId
				insertEvent({
					action: 'visit:create',
					actorTime: new Date().toISOString(),
					userId: req.currentUser.id,
					ip: req.connection.remoteAddress,
					metadata: {},
					draftId: req.currentDocument.draftId,
					contentId: req.currentDocument.contentId,
					isPreview: true,
					visitId,
					payload: {
						visitId,
						deactivatedVisitId
					},
					eventVersion: '1.1.0'
				})
			})
			.then(req.saveSessionPromise)
			.then(() => {
				res.redirect(`/public/${req.params.draftId}/visit/${createdVisitId}`)
			})
			.catch(res.unexpected)
	})

// MAIN VISIT ROUTE
// mounted as /public/:draftId/visit/:visitId
router
	.route('/:draftId/visit/:visitId*')
	.get([
		allowAnonymousUser,
		requireCurrentUser,
		requireCurrentDocument,
		requireVisitId,
		requireCurrentVisit,
		checkValidationRules
	])
	.get((req, res) => {
		return req.currentDocument
			.yell('internal:sendToClient', req, res)
			.then(() => {
				return insertEvent({
					action: 'viewer:open',
					actorTime: new Date().toISOString(),
					userId: req.currentUser.id,
					ip: req.connection.remoteAddress,
					metadata: {},
					draftId: req.currentDocument.draftId,
					contentId: req.currentDocument.contentId,
					visitId: req.params.visitId,
					payload: {
						visitId: req.params.visitId,
						isScoreImportable: false
					},
					eventVersion: '1.2.0',
					isPreview: true
				})
			})
			.then(() => {
				res.render('viewer', {
					assetForEnv,
					webpackAssetPath,
					draftTitle: req.currentDocument.getTitle()
				})
			})
			.catch(res.unexpected)
	})

module.exports = router
