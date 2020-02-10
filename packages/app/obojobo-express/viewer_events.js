const db = oboRequire('db')
const oboEvents = oboRequire('obo_events')
const logger = oboRequire('logger')
const viewerState = oboRequire('viewer/viewer_state')
const VisitModel = oboRequire('models/visit')

oboEvents.on('client:nav:open', event => {
	return setNavOpen(event.userId, event.draftId, event.contentId, true, event.visitId)
})

oboEvents.on('client:nav:close', event => {
	return setNavOpen(event.userId, event.draftId, event.contentId, false, event.visitId)
})

oboEvents.on('client:nav:setRedAlert', event => {
	const userId = event.userId
	const draftId = event.draftId
	const isRedAlertEnabled = event.payload.to

	return db
		.none(
			`
				INSERT INTO red_alert_status
				(user_id, draft_id, is_enabled)
				VALUES($[userId], $[draftId], $[isRedAlertEnabled])
				ON CONFLICT (user_id, draft_id) DO UPDATE
				SET is_enabled = $[isRedAlertEnabled]
				WHERE red_alert_status.user_id = $[userId] AND
				red_alert_status.draft_id = $[draftId]
			`,
			{
				userId,
				draftId,
				isRedAlertEnabled
			}
		)
		.catch(error => {
			logger.error('DB UNEXPECTED on red_alert_status.set', error, error.toString())
		})
})

const setNavOpen = (userId, draftId, contentId, value, visitId) => {
	return VisitModel.fetchById(visitId).then(visit => {
		viewerState.set(userId, draftId, contentId, 'nav:isOpen', 1, value, visit.resource_link_id)
	})
}

module.exports = (req, res, next) => {
	next()
}
