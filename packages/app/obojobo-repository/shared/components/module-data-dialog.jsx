require('./module-data-dialog.scss')

const React = require('react')
const ModuleImage = require('./module-image')
const Button = require('./button')

const {
	downloadAssessmentCompletions,
	downloadAssessmentQuestionAnswers
} = require('obojobo-document-engine/src/scripts/common/util/download-module-data')

const ModuleDataDialog = props => (
	<div className="module-data-dialog">
		<div className="top-bar">
			<ModuleImage id={props.draftId} />
			<div className="module-title" title={props.title}>
				{props.title}
			</div>
			<Button className="close-button" onClick={props.onClose}>
				×
			</Button>
		</div>
		<div className="wrapper">
			<h1 className="title">Module Data</h1>
			<div className="sub-title">Raw data exports for various statistics pertaining to this module.</div>
			<div className="option-list">
				<span>
					<Button
						onClick={() => {
							downloadAssessmentCompletions(props.draftId)
						}}
					>
						Completed Assessments
					</Button>
					<div className="label">List completed assessments for this module.</div>
				</span>
				<span>
					<Button
						onClick={() => {
							downloadAssessmentQuestionAnswers(props.draftId)
						}}
					>
						Assessment Questions
					</Button>
					<div className="label">List various statistics for the assessment questions for this module.</div>
				</span>
			</div>
		</div>
		<div className="wrapper">
			<Button className="done-button secondary-button" onClick={props.onClose}>
				Close
			</Button>
		</div>
	</div>
)

module.exports = ModuleDataDialog
