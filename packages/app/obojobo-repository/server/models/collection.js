const db = require('obojobo-express/server/db')
const logger = require('obojobo-express/server/logger')
const DraftSummary = require('./draft_summary')

class Collection {
	constructor({ id = null, title = '', user_id = 0, created_at = null }) {
		this.id = id
		this.title = title
		this.userId = user_id
		this.createdAt = created_at
	}

	static fetchById(id) {
		return db
			.one(
				`
			SELECT
				id,
				title,
				user_id,
				created_at
			FROM repository_collections
			WHERE id = $[id]
			LIMIT 1
			`,
				{ id }
			)
			.then(selectResult => {
				return new Collection(selectResult)
			})
			.catch(error => {
				logger.error('fetchById Error', error.message)
				return Promise.reject(error)
			})
	}

	static create({ title = '', user_id }) {
		return db
			.one(
				`
				INSERT INTO repository_collections
					(title, user_id)
				VALUES
					($[title], $[user_id])
				RETURNING
					id,
					title,
					user_id as userId,
					created_at as createdAt`,
				{
					title,
					user_id
				}
			)
			.then(insertResult => {
				return new Collection(insertResult)
			})
	}

	static createWithUser(userId) {
		return db
			.one(
				`
					INSERT INTO repository_collections
						(title, group_type, user_id, visibility_type)
					VALUES
						('New Collection', 'tag', $[userId], 'private')
					RETURNING *`,
				{ userId }
			)
			.then(newCollection => {
				logger.info('user created collection', { userId, collectionId: newCollection.id })
				return newCollection
			})
	}

	static rename(id, newTitle) {
		return db
			.one(
				`UPDATE repository_collections
				SET title = $[newTitle]
				WHERE id = $[id]
				RETURNING *`,
				{ id, newTitle }
			)
			.then(updatedCollection => {
				const infoObject = {
					id: updatedCollection.id,
					title: updatedCollection.title
				}
				logger.info('collection renamed', infoObject)
				return updatedCollection
			})
	}

	static addModule(collectionId, draftId, userId) {
		return db
			.none(
				`INSERT INTO repository_map_drafts_to_collections
					(draft_id, collection_id, user_id)
				VALUES
					($[draftId], $[collectionId], $[userId])
				`,
				{ collectionId, draftId, userId }
			)
			.then(() => {
				const infoObject = {
					userId,
					collectionId,
					draftId
				}
				logger.info('user added module to collection', infoObject)
			})
	}

	static removeModule(collectionId, draftId) {
		return db
			.none(
				`DELETE FROM repository_map_drafts_to_collections
				WHERE
					draft_id = $[draftId]
					AND collection_id = $[collectionId]
				`,
				{ collectionId, draftId }
			)
			.then(() => {
				const infoObject = {
					collectionId,
					draftId
				}
				logger.info('module removed from collection', infoObject)
			})
	}

	static delete(id) {
		return db
			.none(
				`UPDATE repository_collections
				SET deleted = TRUE
				WHERE id = $[id]`,
				{ id }
			)
			.then(() => {
				logger.info('collection deleted ', { id })
			})
	}

	loadRelatedDrafts() {
		const joinOn = `
			JOIN repository_map_drafts_to_collections
				ON repository_map_drafts_to_collections.draft_id = drafts.id
			JOIN repository_collections
				ON repository_collections.id = repository_map_drafts_to_collections.collection_id`

		const whereSQL = `repository_collections.id = $[collectionId]`

		return DraftSummary.fetchAndJoinWhere(joinOn, whereSQL, { collectionId: this.id })
			.then(draftSummaries => {
				this.drafts = draftSummaries
				return this
			})
			.catch(error => {
				logger.error('loadModules Error', error.message)
				return Promise.reject(error)
			})
	}
}

module.exports = Collection
