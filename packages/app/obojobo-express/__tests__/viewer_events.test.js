jest.mock('../config')
jest.mock('../db')
jest.mock('../logger')
jest.mock('../viewer/viewer_state', () => ({ set: jest.fn() }))
jest.mock('../obo_events', () => ({ on: jest.fn(), emit: jest.fn() }))
jest.mock('../models/visit')

const mockEvent = {
	userId: 'mockUserId',
	draftId: 'mockDraftId',
	contentId: 'mockContentId',
	visitId: 'mockVisitId',
	payload: {
		open: 'yep'
	}
}
const mockRedAlertEvent = {
	...mockEvent,
	payload: {
		to: true
	}
}
let db
let logger
let vs
let ve
let oboEvents
let VisitModel

describe('viewer events', () => {
	beforeAll(() => {})
	afterAll(() => {})
	beforeEach(() => {
		jest.resetAllMocks()
		jest.resetModules()
		vs = oboRequire('viewer/viewer_state')
		oboEvents = oboRequire('obo_events')
		VisitModel = oboRequire('models/visit')
		db = oboRequire('db')
		logger = oboRequire('logger')
	})
	afterEach(() => {})

	test('registers expected events', () => {
		expect(oboEvents.on).not.toBeCalled()

		ve = oboRequire('viewer_events')
		expect(oboEvents.on).toBeCalledWith('client:nav:open', expect.any(Function))
		expect(oboEvents.on).toBeCalledWith('client:nav:close', expect.any(Function))
		expect(oboEvents.on).toBeCalledWith('client:nav:setRedAlert', expect.any(Function))
		expect(oboEvents.on).toHaveBeenCalledTimes(3)
	})

	test('executes next when included to support express middleware', () => {
		ve = oboRequire('viewer_events')
		const mockNext = jest.fn()
		ve({}, {}, mockNext)
		expect(mockNext).toBeCalled()
	})

	test('client:nav:open', () => {
		expect.hasAssertions()
		ve = oboRequire('viewer_events')

		const [eventName, callback] = oboEvents.on.mock.calls[0]
		expect(eventName).toBe('client:nav:open')
		expect(callback).toHaveLength(1) // callback has 1 argument

		VisitModel.fetchById.mockResolvedValueOnce({
			resource_link_id: 'mockResourceLinkId'
		})

		expect(vs.set).not.toHaveBeenCalled()
		return callback(mockEvent).then(() => {
			expect(vs.set).toBeCalledWith(
				'mockUserId',
				'mockDraftId',
				'mockContentId',
				'nav:isOpen',
				1,
				true,
				'mockResourceLinkId'
			)
		})
	})

	test('client:nav:close', () => {
		expect.hasAssertions()
		ve = oboRequire('viewer_events')

		const [eventName, callback] = oboEvents.on.mock.calls[1]
		expect(eventName).toBe('client:nav:close')
		expect(callback).toHaveLength(1) // callback has 1 argument

		VisitModel.fetchById.mockResolvedValueOnce({
			resource_link_id: 'mockResourceLinkId'
		})

		expect(vs.set).not.toHaveBeenCalled()
		return callback(mockEvent).then(() => {
			expect(vs.set).toBeCalledWith(
				'mockUserId',
				'mockDraftId',
				'mockContentId',
				'nav:isOpen',
				1,
				false,
				'mockResourceLinkId'
			)
		})
	})

	test('client:nav:setRedAlert (insert success)', () => {
		expect.hasAssertions()

		db.none.mockResolvedValue(null)

		ve = oboRequire('viewer_events')
		const [eventName, callback] = oboEvents.on.mock.calls[2]
		expect(eventName).toBe('client:nav:setRedAlert')
		expect(callback).toHaveLength(1)

		return callback(mockRedAlertEvent).then(() => {
			expect(db.none).toHaveBeenCalledTimes(1)
			expect(logger.error).toHaveBeenCalledTimes(0)
			expect(db.none).toBeCalledWith(
				expect.stringContaining('INSERT INTO red_alert_status'),
				expect.objectContaining({
					userId: mockRedAlertEvent.userId,
					draftId: mockRedAlertEvent.draftId,
					isRedAlertEnabled: true
				})
			)
		})
	})

	test('client:nav:setRedAlert (insert error)', () => {
		expect.hasAssertions()

		const message = 'error message'

		db.none.mockRejectedValue(message)

		ve = oboRequire('viewer_events')
		const [eventName, callback] = oboEvents.on.mock.calls[2]
		expect(eventName).toBe('client:nav:setRedAlert')
		expect(callback).toHaveLength(1)

		return callback(mockRedAlertEvent).then(() => {
			expect(db.none).toHaveBeenCalledTimes(1)
			expect(logger.error).toHaveBeenCalledTimes(1)
			expect(db.none).toBeCalledWith(
				expect.stringContaining('INSERT INTO red_alert_status'),
				expect.objectContaining({
					userId: mockRedAlertEvent.userId,
					draftId: mockRedAlertEvent.draftId,
					isRedAlertEnabled: true
				})
			)
			expect(logger.error).toBeCalledWith('DB UNEXPECTED on red_alert_status.set', message, message)
		})
	})
})
