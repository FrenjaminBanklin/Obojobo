import React from 'react'
import Common from 'obojobo-document-engine/src/scripts/common'

import emptyNode from './empty-node.json'
import Icon from './icon'
import Node from './editor-component'
import Schema from './schema'
import Converter from './converter'

const HEADING_NODE = 'ObojoboDraft.Chunks.Heading'

const plugins = {
	renderPlaceholder(props, editor, next) {
		const { node } = props
		if (node.object !== 'block' || node.type !== HEADING_NODE) return next()
		if (node.text !== '') return next()

		return (
			<span
				className={'placeholder align-' + node.data.get('content').align}
				contentEditable={false}
			>
				{'Type Your Heading Here'}
			</span>
		)
	},
	renderNode(props, editor, next) {
		switch (props.node.type) {
			case HEADING_NODE:
				return <Node {...props} {...props.attributes} />
			default:
				return next()
		}
	},
	schema: Schema
}

Common.Registry.registerModel('ObojoboDraft.Chunks.Heading', {
	name: 'Heading',
	icon: Icon,
	isInsertable: true,
	templateObject: emptyNode,
	slateToObo: Converter.slateToObo,
	oboToSlate: Converter.oboToSlate,
	plugins,
	getNavItem(model) {
		switch (model.modelState.headingLevel) {
			// when 1
			// 	type: 'link',
			// 	label: model.modelState.textGroup.first.text.value,
			// 	path: [model.modelState.textGroup.first.text.value.toLowerCase().replace(/ /g, '-')],
			// 	showChildren: false

			case 1:
			case 2:
				if (model.modelState.headingLevel === 1 && model.getIndex() === 0) {
					return null
				}

				return {
					type: 'sub-link',
					label: model.modelState.textGroup.first.text,
					path: [
						model
							.toText()
							.toLowerCase()
							.replace(/ /g, '-')
					],
					showChildren: false
				}

			default:
				return null
		}
	}
})

const Heading = {
	name: HEADING_NODE,
	components: {
		Node,
		Icon
	},
	helpers: {
		slateToObo: Converter.slateToObo,
		oboToSlate: Converter.oboToSlate
	},
	plugins
}

export default Heading
