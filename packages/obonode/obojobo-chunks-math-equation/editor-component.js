import './viewer-component.scss'
import './editor-component.scss'

import React from 'react'
import katex from 'katex'
import Common from 'obojobo-document-engine/src/scripts/common'

import MathEquationProperties from './math-equation-properties-modal'

const { ModalUtil } = Common.util
const { Button } = Common.components

const getLatexHtml = latex => {
	try {
		const html = katex.renderToString(latex, { displayMode: true })
		return { html }
	} catch (e) {
		return { error: e }
	}
}

class MathEquation extends React.Component {
	constructor(props) {
		super(props)
	}

	showMathEquationPropertiesModal() {
		ModalUtil.show(
			<MathEquationProperties
				content={this.props.node.data.get('content')}
				onConfirm={this.changeProperties.bind(this)}
			/>
		)
	}

	changeProperties(content) {
		const editor = this.props.editor

		editor.setNodeByKey(this.props.node.key, {
			data: { content }
		})
	}

	renderEmptyEquation() {
		return (
			<div className="non-editable-chunk">
				<div className="katex-display">
					<span className="placeholder align-center">No Equation</span>
				</div>
			</div>
		)
	}

	renderLatex() {
		const content = this.props.node.data.get('content')
		if (!content.latex && !content.label) return this.renderEmptyEquation()

		let katexHtml = getLatexHtml(content.latex)
		if (katexHtml.error) {
			return (
				<div className={'katex-container katex-error'}>
					<p>{katexHtml.error.message}</p>
				</div>
			)
		}

		katexHtml = katexHtml.html

		return (
			<div className="non-editable-chunk">
				<div
					className="katex-container"
					style={{ fontSize: content.size + 'em' }}
					dangerouslySetInnerHTML={{ __html: katexHtml }}
				/>
				{content.label === '' ? null : <div className="equation-label">{content.label}</div>}
			</div>
		)
	}

	render() {
		const content = this.props.node.data.get('content')
		return (
			<div
				className={
					'component obojobo-draft--chunks--math-equation pad ' +
					'align-' +
					(content.align || 'center')
				}
			>
				{this.renderLatex()}
				<Button onClick={this.showMathEquationPropertiesModal.bind(this)}>Edit</Button>
			</div>
		)
	}
}

export default MathEquation
