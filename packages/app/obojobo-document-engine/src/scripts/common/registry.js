let items
let defaults
let registeredToolbarItems
let toolbarItems
let variableHandlers

const noop = () => {}

class _Registry {
	init() {
		items = new Map()
		defaults = new Map()
		toolbarItems = []
		variableHandlers = new Map()
		registeredToolbarItems = {
			separator: { id: 'separator', type: 'separator' }
		}
	}

	loadDependency(url, onLoadCallback = () => {}) {
		const type = url.substr(url.lastIndexOf('.') + 1)

		switch (type) {
			case 'js': {
				const el = document.createElement('script')
				el.setAttribute('src', url)
				el.onload = onLoadCallback
				document.head.appendChild(el)
				break
			}

			case 'css': {
				const el = document.createElement('link')
				el.setAttribute('rel', 'stylesheet')
				el.setAttribute('href', url)
				document.head.appendChild(el)
				onLoadCallback()
				break
			}
		}

		return this
	}

	cloneBlankNode(templateObject) {
		return JSON.parse(JSON.stringify(templateObject))
	}

	registerModel(className, opts = {}) {
		const item = items.get(className)

		// combine opts with existing item if set
		if (item) opts = Object.assign(opts, item)

		// combine defaults with opts (and existing item)
		opts = Object.assign(
			{
				type: null,
				default: false,
				variables: {},
				templateObject: '',
				init: noop
			},
			opts
		)

		// bind cloneBlankNode to the combined templateObject value
		opts.cloneBlankNode = this.cloneBlankNode.bind(this, opts.templateObject)

		// save/update the final combined options on items
		items.set(className, opts)

		// if combined ops has default set to true, store it in the default for this type
		if (opts.default) {
			defaults.set(opts.type, className)
		}

		// run init if it was set
		opts.init()

		// store variable handlers
		for (const variable in opts.variables) {
			const cb = opts.variables[variable]
			variableHandlers.set(variable, cb)
		}

		// return this for chaining
		return this
	}

	getDefaultItemForModelType(modelType) {
		const type = defaults.get(modelType)
		if (!type) {
			return null
		}
		return items.get(type)
	}

	getItemForType(type) {
		return items.get(type)
	}

	registerToolbarItem(opts) {
		registeredToolbarItems[opts.id] = opts
		return this
	}

	addToolbarItem(id) {
		toolbarItems.push(Object.assign({}, registeredToolbarItems[id]))
		return this
	}

	getItems(callback) {
		return callback(items)
	}

	getTextForVariable(variable, model, viewerState) {
		const cb = variableHandlers.get(variable)
		if (!cb) {
			return null
		}

		return cb.call(null, model, viewerState)
	}

	get registeredToolbarItems() {
		return registeredToolbarItems
	}

	get toolbarItems() {
		return toolbarItems
	}
}

const Registry = new _Registry()

Registry.init()
export { Registry }
